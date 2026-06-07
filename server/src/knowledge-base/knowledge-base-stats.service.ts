import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeDocument } from './knowledge-document.entity';
import { KnowledgeBase } from './knowledge-base.entity';

@Injectable()
export class KnowledgeBaseStatsService {
  private readonly logger = new Logger(KnowledgeBaseStatsService.name);

  constructor(
    @InjectRepository(KnowledgeDocument)
    private documentRepository: Repository<KnowledgeDocument>,
    @InjectRepository(KnowledgeBase)
    private knowledgeBaseRepository: Repository<KnowledgeBase>,
  ) {}

  async updateStats(knowledgeBaseId: number): Promise<void> {
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
