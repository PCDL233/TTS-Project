import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { KnowledgeBase } from './knowledge-base.entity';
import { KnowledgeChunk } from './knowledge-chunk.entity';

export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';

@Entity()
export class KnowledgeDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  knowledgeBaseId: number;

  @ManyToOne(() => KnowledgeBase, (kb) => kb.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'knowledgeBaseId' })
  knowledgeBase: Relation<KnowledgeBase>;

  @Column()
  filename: string;

  @Column()
  originalName: string;

  @Column()
  mimetype: string;

  @Column()
  size: number;

  @Column({ type: 'varchar', default: 'pending' })
  status: DocumentStatus;

  @Column({ default: 0 })
  chunkCount: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @OneToMany(() => KnowledgeChunk, (chunk) => chunk.document, { cascade: true })
  chunks: Relation<KnowledgeChunk[]>;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
