import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { KnowledgeBase } from './knowledge-base.entity';
import { KnowledgeDocument } from './knowledge-document.entity';
import { KnowledgeChunk } from './knowledge-chunk.entity';
import { VectorDbService } from './vector-db.service';
import { DocumentProcessingService } from './document-processing.service';

const KB_UPLOAD_DIR = './public/uploads/knowledge-base';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    @InjectRepository(KnowledgeBase)
    private kbRepository: Repository<KnowledgeBase>,
    @InjectRepository(KnowledgeDocument)
    private documentRepository: Repository<KnowledgeDocument>,
    @InjectRepository(KnowledgeChunk)
    private chunkRepository: Repository<KnowledgeChunk>,
    private readonly vectorDbService: VectorDbService,
    private readonly documentProcessingService: DocumentProcessingService,
  ) {
    if (!existsSync(KB_UPLOAD_DIR)) {
      mkdirSync(KB_UPLOAD_DIR, { recursive: true });
    }
  }

  // ========== 知识库 CRUD ==========

  async create(userId: number, data: { name: string; description?: string }): Promise<KnowledgeBase> {
    const kb = this.kbRepository.create({
      userId,
      name: data.name,
      description: data.description || '',
    });
    const saved = await this.kbRepository.save(kb);
    // 创建向量表
    this.vectorDbService.createTable(saved.id);
    return saved;
  }

  async findAll(userId: number): Promise<KnowledgeBase[]> {
    return this.kbRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(userId: number, id: number): Promise<KnowledgeBase> {
    const kb = await this.kbRepository.findOne({
      where: { id, userId },
    });
    if (!kb) throw new NotFoundException('知识库不存在');
    return kb;
  }

  async remove(userId: number, id: number): Promise<void> {
    const kb = await this.findOne(userId, id);

    // 删除向量表
    this.vectorDbService.dropTable(id);

    // 删除关联数据（级联）
    await this.chunkRepository.delete({ knowledgeBaseId: id });
    await this.documentRepository.delete({ knowledgeBaseId: id });
    await this.kbRepository.delete({ id });

    this.logger.log(`用户 ${userId} 删除知识库 ${id}`);
  }

  // ========== 文档管理 ==========

  async uploadDocument(
    userId: number,
    knowledgeBaseId: number,
    file: Express.Multer.File,
  ): Promise<KnowledgeDocument> {
    await this.findOne(userId, knowledgeBaseId);

    // Multer 对非 ASCII 文件名默认使用 latin1 编码，需要转回 utf8
    const decodedOriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

    const doc = this.documentRepository.create({
      knowledgeBaseId,
      filename: file.filename,
      originalName: decodedOriginalName,
      mimetype: file.mimetype,
      size: file.size,
      status: 'pending',
    });
    const saved = await this.documentRepository.save(doc);

    // 更新知识库状态
    await this.kbRepository.update(knowledgeBaseId, { status: 'processing' });

    // 异步处理文档
    const filePath = join(KB_UPLOAD_DIR, file.filename);
    this.documentProcessingService
      .processDocument(filePath, file.mimetype, saved.id, knowledgeBaseId)
      .catch((err) => {
        this.logger.error(`文档异步处理异常: ${(err as Error).message}`);
      });

    return saved;
  }

  async getDocuments(knowledgeBaseId: number): Promise<KnowledgeDocument[]> {
    return this.documentRepository.find({
      where: { knowledgeBaseId },
      order: { createdAt: 'DESC' },
    });
  }

  async removeDocument(
    userId: number,
    knowledgeBaseId: number,
    documentId: number,
  ): Promise<void> {
    await this.findOne(userId, knowledgeBaseId);

    const doc = await this.documentRepository.findOne({
      where: { id: documentId, knowledgeBaseId },
    });
    if (!doc) throw new NotFoundException('文档不存在');

    // 删除 chunks
    await this.chunkRepository.delete({ documentId });

    // 删除文档记录
    await this.documentRepository.delete({ id: documentId });

    // 更新知识库统计
    await this.updateKnowledgeBaseStats(knowledgeBaseId);

    this.logger.log(`用户 ${userId} 从知识库 ${knowledgeBaseId} 删除文档 ${documentId}`);
  }

  async getDocumentStatus(
    knowledgeBaseId: number,
    documentId: number,
  ): Promise<KnowledgeDocument | null> {
    return this.documentRepository.findOne({
      where: { id: documentId, knowledgeBaseId },
    });
  }

  async getChunks(knowledgeBaseId: number, documentId: number): Promise<KnowledgeChunk[]> {
    return this.chunkRepository.find({
      where: { knowledgeBaseId, documentId },
      order: { chunkIndex: 'ASC' },
    });
  }

  // ========== 私有方法 ==========

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

    await this.kbRepository.update(knowledgeBaseId, {
      documentCount: documents.length,
      chunkCount: totalChunks,
      status,
    });
  }
}
