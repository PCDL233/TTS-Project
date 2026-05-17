import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { KnowledgeDocument } from './knowledge-document.entity';

@Entity()
export class KnowledgeChunk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  documentId: number;

  @ManyToOne(() => KnowledgeDocument, (doc) => doc.chunks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document: KnowledgeDocument;

  @Column()
  knowledgeBaseId: number;

  @Column({ type: 'text' })
  content: string;

  @Column()
  chunkIndex: number;

  @Column({ type: 'simple-json', nullable: true })
  metadata: {
    page?: number;
    source?: string;
    [key: string]: any;
  };

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
