import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { KnowledgeDocument } from './knowledge-document.entity';
import { KnowledgeChunk } from './knowledge-chunk.entity';
import { KnowledgeBase } from './knowledge-base.entity';
import { EmbeddingService } from './embedding.service';
import { VectorDbService } from './vector-db.service';

@Injectable()
export class DocumentProcessingService {
  private readonly logger = new Logger(DocumentProcessingService.name);

  constructor(
    @InjectRepository(KnowledgeDocument)
    private documentRepository: Repository<KnowledgeDocument>,
    @InjectRepository(KnowledgeChunk)
    private chunkRepository: Repository<KnowledgeChunk>,
    @InjectRepository(KnowledgeBase)
    private knowledgeBaseRepository: Repository<KnowledgeBase>,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorDbService: VectorDbService,
  ) {}

  async processDocument(
    filePath: string,
    mimetype: string,
    documentId: number,
    knowledgeBaseId: number,
  ): Promise<void> {
    this.logger.log(`开始处理文档 ${documentId}: ${filePath}`);

    // 更新状态为处理中
    await this.documentRepository.update(documentId, { status: 'processing' });

    try {
      // 1. 提取文本
      const text = await this.extractText(filePath, mimetype);
      if (!text || text.trim().length === 0) {
        throw new Error('文档内容为空或无法提取文本');
      }

      // 2. 分块
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 100,
      });
      const docs = await splitter.createDocuments([text]);

      // 3. 存储 chunks（使用底层 better-sqlite3 连接确保获取正确的自增 ID）
      // 注意：TypeORM 的 Repository.save() 在 better-sqlite3 驱动下对 INSERT
      // 操作有时无法正确回填 id（last_insert_rowid 为 bigint 但未被转换），
      // 因此直接使用底层连接插入并读取 lastInsertRowid。
      const driver = (this.chunkRepository.manager.connection.driver as any);
      const db = driver.databaseConnection;
      const insertStmt = db.prepare(
        `INSERT INTO knowledge_chunk(documentId, knowledgeBaseId, content, chunkIndex, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
      );

      const savedChunks: Array<{ id: number; content: string }> = [];
      for (let i = 0; i < docs.length; i++) {
        const result = insertStmt.run(
          documentId,
          knowledgeBaseId,
          docs[i].pageContent,
          i,
          JSON.stringify(docs[i].metadata || {}),
          new Date().toISOString(),
        );
        const chunkId = Number(result.lastInsertRowid);
        if (!Number.isInteger(chunkId) || chunkId <= 0) {
          throw new Error(
            `chunk ID 无效: ${result.lastInsertRowid} (type=${typeof result.lastInsertRowid})`,
          );
        }
        savedChunks.push({ id: chunkId, content: docs[i].pageContent });
      }

      // 4. 批量 Embedding
      const embeddings = await this.embeddingService.embedBatch(
        savedChunks.map((c) => c.content),
      );

      // 5. 存储向量
      for (let i = 0; i < savedChunks.length; i++) {
        this.vectorDbService.insert(knowledgeBaseId, savedChunks[i].id, embeddings[i]);
      }

      // 6. 更新 document 状态
      await this.documentRepository.update(documentId, {
        status: 'completed',
        chunkCount: savedChunks.length,
      });

      // 7. 更新 knowledgeBase 统计
      await this.updateKnowledgeBaseStats(knowledgeBaseId);

      this.logger.log(`文档 ${documentId} 处理完成，共 ${savedChunks.length} 个 chunks`);
    } catch (err) {
      this.logger.error(`文档 ${documentId} 处理失败: ${(err as Error).message}`);
      await this.documentRepository.update(documentId, {
        status: 'failed',
        errorMessage: (err as Error).message,
      });
      // 刷新知识库聚合状态，避免卡在"处理中"
      await this.updateKnowledgeBaseStats(knowledgeBaseId);
    } finally {
      // 清理临时文件
      try {
        unlinkSync(filePath);
      } catch {
        // ignore
      }
    }
  }

  private async extractText(filePath: string, mimetype: string): Promise<string> {
    const fullPath = resolve(filePath);

    if (mimetype === 'application/pdf') {
      const { PDFParse } = await import('pdf-parse');
      const buffer = readFileSync(fullPath);
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      await parser.destroy();
      return result.text;
    }

    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ path: fullPath });
      return result.value;
    }

    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimetype === 'application/vnd.ms-excel' ||
      mimetype === 'text/csv'
    ) {
      const xlsx = await import('xlsx');
      const workbook = xlsx.readFile(fullPath);
      let text = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        text += jsonData.map((row: any) => row.join('\t')).join('\n') + '\n';
      }
      return text;
    }

    if (mimetype.startsWith('text/')) {
      return readFileSync(fullPath, 'utf-8');
    }

    // 尝试作为文本读取
    try {
      return readFileSync(fullPath, 'utf-8');
    } catch {
      throw new Error(`不支持的文件类型: ${mimetype}`);
    }
  }

  private async updateKnowledgeBaseStats(knowledgeBaseId: number): Promise<void> {
    const documents = await this.documentRepository.find({
      where: { knowledgeBaseId },
    });
    const totalChunks = documents.reduce((sum, d) => sum + d.chunkCount, 0);
    const hasCompleted = documents.some((d) => d.status === 'completed');
    const hasProcessing = documents.some((d) => d.status === 'processing');

    let status: 'empty' | 'processing' | 'ready' = 'empty';
    if (hasProcessing) {
      status = 'processing';
    } else if (hasCompleted) {
      status = 'ready';
    }

    await this.knowledgeBaseRepository.update(knowledgeBaseId, {
      documentCount: documents.length,
      chunkCount: totalChunks,
      status,
    });
  }
}
