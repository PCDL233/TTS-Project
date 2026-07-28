import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { KnowledgeChunk } from './knowledge-chunk.entity';
import { KnowledgeBase } from './knowledge-base.entity';
import type { AgentCitation } from '../agent/agent.types';
import { EmbeddingService } from './embedding.service';
import { VectorDbService } from './vector-db.service';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly maxContextLength = 12000;

  constructor(
    @InjectRepository(KnowledgeChunk)
    private chunkRepository: Repository<KnowledgeChunk>,
    @InjectRepository(KnowledgeBase)
    private knowledgeBaseRepository: Repository<KnowledgeBase>,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorDbService: VectorDbService,
  ) {}

  async retrieveContext(
    query: string,
    knowledgeBaseId: number,
    topK: number = 5,
    modelName?: string,
  ): Promise<string> {
    this.logger.log(
      `RAG 检索: knowledgeBaseId=${knowledgeBaseId}, query="${query.slice(0, 50)}..."`,
    );

    // 1. 向量化 query
    const queryEmbedding = await this.embeddingService.embed(
      query,
      modelName || 'Xenova/all-MiniLM-L6-v2',
    );

    // 2. 搜索相似 chunks
    const results = this.vectorDbService.search(
      knowledgeBaseId,
      queryEmbedding,
      topK,
    );
    if (results.length === 0) {
      this.logger.warn('RAG 检索未找到相似内容');
      return '';
    }

    // 3. 获取 chunk 内容
    const chunkIds = results.map((r) => r.chunkId);
    const chunks = await this.chunkRepository.find({
      where: { id: In(chunkIds) },
      order: { chunkIndex: 'ASC' },
    });

    // 按搜索结果顺序排列
    const chunkMap = new Map(chunks.map((c) => [c.id, c]));
    const orderedChunks = chunkIds
      .map((id) => chunkMap.get(id))
      .filter((c): c is KnowledgeChunk => !!c);

    // 4. 拼接上下文
    let context = '';
    for (const chunk of orderedChunks) {
      const source = chunk.metadata?.source || chunk.documentId;
      const entry = `[来源: 文档片段 ${chunk.chunkIndex + 1}]\n${chunk.content}\n\n`;
      if (context.length + entry.length > this.maxContextLength) {
        break;
      }
      context += entry;
    }

    this.logger.log(`RAG 检索完成，共 ${orderedChunks.length} 个相关片段`);
    return context.trim();
  }

  async retrieveWithCitations(
    query: string,
    knowledgeBaseId: number,
    topK: number = 5,
    userId?: number,
  ): Promise<{ context: string; citations: AgentCitation[] }> {
    const knowledgeBase = await this.knowledgeBaseRepository.findOne({
      where: userId ? { id: knowledgeBaseId, userId } : { id: knowledgeBaseId },
    });
    if (!knowledgeBase) throw new Error('知识库不存在或无权访问');

    const queryEmbedding = await this.embeddingService.embed(
      query,
      knowledgeBase.embeddingModel,
    );
    const results = this.vectorDbService.search(
      knowledgeBaseId,
      queryEmbedding,
      topK,
    );
    if (results.length === 0) return { context: '', citations: [] };

    const chunkIds = results.map((result) => result.chunkId);
    const chunks = await this.chunkRepository.find({
      where: { id: In(chunkIds), knowledgeBaseId },
      relations: { document: true },
    });
    const chunkMap = new Map(chunks.map((chunk) => [chunk.id, chunk]));
    const citations: AgentCitation[] = [];
    let context = '';
    for (const chunkId of chunkIds) {
      const chunk = chunkMap.get(chunkId);
      if (!chunk) continue;
      const source =
        chunk.metadata?.source ||
        chunk.document?.originalName ||
        `文档 ${chunk.documentId}`;
      const entry = `[来源: ${source}，片段 ${chunk.chunkIndex + 1}]\n${chunk.content}\n\n`;
      if (context.length + entry.length > this.maxContextLength) break;
      context += entry;
      citations.push({
        documentId: chunk.documentId,
        documentName: chunk.document?.originalName || source,
        chunkId: chunk.id,
        chunkIndex: chunk.chunkIndex,
        source,
        content: chunk.content.slice(0, 500),
      });
    }
    return { context: context.trim(), citations };
  }
  buildAugmentedMessages(
    originalMessages: Array<{
      role: string;
      content?: string;
      contentParts?: any[];
    }>,
    context: string,
  ): Array<{ role: string; content?: string; contentParts?: any[] }> {
    if (!context) return originalMessages;

    const systemMessage = {
      role: 'system',
      content: `你是基于知识库的 AI 助手。以下是与用户问题相关的知识库内容，请基于这些信息回答用户问题。如果知识库中没有相关信息，请明确告知用户。\n\n--- 知识库内容 ---\n${context}\n--- 知识库内容结束 ---`,
    };

    return [systemMessage, ...originalMessages];
  }
}
