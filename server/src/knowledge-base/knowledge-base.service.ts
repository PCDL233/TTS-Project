import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { existsSync, mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { KnowledgeBase } from './knowledge-base.entity';
import { KnowledgeDocument } from './knowledge-document.entity';
import { KnowledgeChunk } from './knowledge-chunk.entity';
import { VectorDbService } from './vector-db.service';
import { DocumentProcessingService } from './document-processing.service';
import { KnowledgeBaseStatsService } from './knowledge-base-stats.service';
import { EmbeddingService } from './embedding.service';

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
    private readonly statsService: KnowledgeBaseStatsService,
  ) {
    if (!existsSync(KB_UPLOAD_DIR)) {
      mkdirSync(KB_UPLOAD_DIR, { recursive: true });
    }
  }

  async create(
    userId: number,
    data: {
      name: string;
      description?: string;
      embeddingModel?: string;
      chunkSize?: number;
      chunkOverlap?: number;
      embeddingBatchSize?: number;
    },
  ): Promise<KnowledgeBase> {
    const modelName = data.embeddingModel || 'Xenova/all-MiniLM-L6-v2';
    const dimension = EmbeddingService.getModelDimension(modelName);

    const kb = this.kbRepository.create({
      userId,
      name: data.name,
      description: data.description || '',
      embeddingModel: modelName,
      chunkSize: data.chunkSize ?? 500,
      chunkOverlap: data.chunkOverlap ?? 100,
      embeddingBatchSize: data.embeddingBatchSize ?? 8,
    });
    const saved = await this.kbRepository.save(kb);
    this.vectorDbService.createTable(saved.id, dimension);
    return saved;
  }

  async switchModel(
    userId: number,
    knowledgeBaseId: number,
    newModel: string,
  ): Promise<KnowledgeBase> {
    const kb = await this.findOne(userId, knowledgeBaseId);

    const dimension = EmbeddingService.getModelDimension(newModel);

    const documents = await this.documentRepository.find({
      where: { knowledgeBaseId },
    });
    const completedDocs = documents.filter((d) => d.status === 'completed');

    if (completedDocs.length > 0) {
      this.logger.log(
        `知识库 ${knowledgeBaseId} 切换模型到 ${newModel}，将重新处理 ${completedDocs.length} 个已完成文档`,
      );

      this.vectorDbService.dropTable(knowledgeBaseId);
      await this.chunkRepository.delete({ knowledgeBaseId });

      this.vectorDbService.createTable(knowledgeBaseId, dimension);

      await this.kbRepository.update(knowledgeBaseId, {
        embeddingModel: newModel,
        status: 'processing',
      });

      for (const doc of completedDocs) {
        await this.documentRepository.update(doc.id, {
          status: 'pending',
          chunkCount: 0,
        });
      }

      for (const doc of completedDocs) {
        const filePath = join(KB_UPLOAD_DIR, doc.filename);
        this.documentProcessingService
          .processDocument(
            filePath, doc.mimetype, doc.id, knowledgeBaseId,
            newModel, kb.chunkSize, kb.chunkOverlap, kb.embeddingBatchSize,
          )
          .catch((err) => {
            this.logger.error(`重新处理文档 ${doc.id} 失败: ${(err as Error).message}`);
          });
      }
    } else {
      this.vectorDbService.dropTable(knowledgeBaseId);
      this.vectorDbService.createTable(knowledgeBaseId, dimension);
      await this.kbRepository.update(knowledgeBaseId, {
        embeddingModel: newModel,
      });
    }

    await this.statsService.updateStats(knowledgeBaseId);

    return (await this.findOne(userId, knowledgeBaseId))!;
  }

  async updateSettings(
    userId: number,
    knowledgeBaseId: number,
    data: {
      chunkSize?: number;
      chunkOverlap?: number;
      embeddingBatchSize?: number;
    },
  ): Promise<KnowledgeBase & { reprocessRequired: boolean }> {
    const kb = await this.findOne(userId, knowledgeBaseId);

    const updates: Partial<KnowledgeBase> = {};
    let reprocessRequired = false;

    if (data.chunkSize !== undefined && data.chunkSize !== kb.chunkSize) {
      updates.chunkSize = data.chunkSize;
      reprocessRequired = true;
    }
    if (data.chunkOverlap !== undefined && data.chunkOverlap !== kb.chunkOverlap) {
      updates.chunkOverlap = data.chunkOverlap;
      reprocessRequired = true;
    }
    if (data.embeddingBatchSize !== undefined && data.embeddingBatchSize !== kb.embeddingBatchSize) {
      updates.embeddingBatchSize = data.embeddingBatchSize;
    }

    if (Object.keys(updates).length === 0) {
      return { ...kb, reprocessRequired: false };
    }

    await this.kbRepository.update(knowledgeBaseId, updates);

    if (reprocessRequired) {
      const documents = await this.documentRepository.find({
        where: { knowledgeBaseId },
      });
      const completedDocs = documents.filter((d) => d.status === 'completed');

      this.vectorDbService.dropTable(knowledgeBaseId);
      await this.chunkRepository.delete({ knowledgeBaseId });

      const dimension = EmbeddingService.getModelDimension(kb.embeddingModel);
      this.vectorDbService.createTable(knowledgeBaseId, dimension);

      await this.kbRepository.update(knowledgeBaseId, { status: 'processing' });

      for (const doc of completedDocs) {
        await this.documentRepository.update(doc.id, {
          status: 'pending',
          chunkCount: 0,
        });
      }

      const newChunkSize = data.chunkSize ?? kb.chunkSize;
      const newChunkOverlap = data.chunkOverlap ?? kb.chunkOverlap;
      const newBatchSize = data.embeddingBatchSize ?? kb.embeddingBatchSize;

      for (const doc of completedDocs) {
        const filePath = join(KB_UPLOAD_DIR, doc.filename);
        this.documentProcessingService
          .processDocument(
            filePath, doc.mimetype, doc.id, knowledgeBaseId,
            kb.embeddingModel, newChunkSize, newChunkOverlap, newBatchSize,
          )
          .catch((err) => {
            this.logger.error(`重新处理文档 ${doc.id} 失败: ${(err as Error).message}`);
          });
      }

      await this.statsService.updateStats(knowledgeBaseId);
    }

    const updated = await this.findOne(userId, knowledgeBaseId);
    return { ...updated!, reprocessRequired };
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

    const documents = await this.documentRepository.find({
      where: { knowledgeBaseId: id },
    });

    const queryRunner = this.kbRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      this.vectorDbService.dropTable(id);

      await queryRunner.manager.delete(KnowledgeChunk, { knowledgeBaseId: id });
      await queryRunner.manager.delete(KnowledgeDocument, { knowledgeBaseId: id });
      await queryRunner.manager.delete(KnowledgeBase, { id });

      await queryRunner.commitTransaction();
      this.logger.log(`用户 ${userId} 删除知识库 ${id}`);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`删除知识库 ${id} 失败，已回滚: ${(err as Error).message}`);
      throw err;
    } finally {
      await queryRunner.release();
    }

    for (const doc of documents) {
      const filePath = join(KB_UPLOAD_DIR, doc.filename);
      try {
        if (existsSync(filePath)) {
          await unlink(filePath);
        }
      } catch (err) {
        this.logger.warn(`删除知识库 ${id} 的文件失败: ${(err as Error).message}`);
      }
    }
  }

  async uploadDocument(
    userId: number,
    knowledgeBaseId: number,
    file: Express.Multer.File,
  ): Promise<KnowledgeDocument> {
    const kb = await this.findOne(userId, knowledgeBaseId);

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

    await this.kbRepository.update(knowledgeBaseId, { status: 'processing' });

    const filePath = join(KB_UPLOAD_DIR, file.filename);
    this.documentProcessingService
      .processDocument(
        filePath, file.mimetype, saved.id, knowledgeBaseId,
        kb.embeddingModel, kb.chunkSize, kb.chunkOverlap, kb.embeddingBatchSize,
      )
      .catch((err) => {
        this.logger.error(`文档异步处理异常: ${(err as Error).message}`);
      });

    return saved;
  }

  async getDocuments(userId: number, knowledgeBaseId: number): Promise<KnowledgeDocument[]> {
    await this.findOne(userId, knowledgeBaseId);
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

    await this.chunkRepository.delete({ documentId });
    await this.documentRepository.delete({ id: documentId });
    await this.statsService.updateStats(knowledgeBaseId);

    const filePath = join(KB_UPLOAD_DIR, doc.filename);
    try {
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    } catch (err) {
      this.logger.warn(`删除文档 ${documentId} 的文件失败: ${(err as Error).message}`);
    }

    this.logger.log(`用户 ${userId} 从知识库 ${knowledgeBaseId} 删除文档 ${documentId}`);
  }

  async getDocumentStatus(
    userId: number,
    knowledgeBaseId: number,
    documentId: number,
  ): Promise<KnowledgeDocument | null> {
    await this.findOne(userId, knowledgeBaseId);
    return this.documentRepository.findOne({
      where: { id: documentId, knowledgeBaseId },
    });
  }

  async getChunks(
    userId: number,
    knowledgeBaseId: number,
    documentId: number,
  ): Promise<KnowledgeChunk[]> {
    await this.findOne(userId, knowledgeBaseId);
    return this.chunkRepository.find({
      where: { knowledgeBaseId, documentId },
      order: { chunkIndex: 'ASC' },
    });
  }
}
