import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../user/user.entity';
import { KnowledgeDocument } from './knowledge-document.entity';

export type KnowledgeBaseStatus = 'empty' | 'processing' | 'ready';

@Entity()
export class KnowledgeBase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 0 })
  documentCount: number;

  @Column({ default: 0 })
  chunkCount: number;

  @Column({ type: 'varchar', default: 'empty' })
  status: KnowledgeBaseStatus;

  @Column({ type: 'varchar', default: 'Xenova/all-MiniLM-L6-v2' })
  embeddingModel: string;

  @Column({ default: 500 })
  chunkSize: number;

  @Column({ default: 100 })
  chunkOverlap: number;

  @Column({ default: 8 })
  embeddingBatchSize: number;

  @OneToMany(() => KnowledgeDocument, (doc) => doc.knowledgeBase, { cascade: true })
  documents: KnowledgeDocument[];

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
