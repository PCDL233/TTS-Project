import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { KnowledgeBase } from './knowledge-base.entity';
import { KnowledgeDocument } from './knowledge-document.entity';
import { KnowledgeChunk } from './knowledge-chunk.entity';
import { KnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { VectorDbService } from './vector-db.service';
import { EmbeddingService } from './embedding.service';
import { DocumentProcessingService } from './document-processing.service';
import { RagService } from './rag.service';

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeBase, KnowledgeDocument, KnowledgeChunk]), ConfigModule],
  providers: [KnowledgeBaseService, VectorDbService, EmbeddingService, DocumentProcessingService, RagService],
  controllers: [KnowledgeBaseController],
  exports: [KnowledgeBaseService, RagService],
})
export class KnowledgeBaseModule {}
