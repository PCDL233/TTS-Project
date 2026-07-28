import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { AgentGraphV1 } from './agent.types';

@Entity()
export class Agent {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  userId: number;

  @Column()
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'simple-json' })
  draftGraph: AgentGraphV1;

  @Column({ type: 'integer', nullable: true })
  publishedVersionId: number | null;

  @DeleteDateColumn({ type: 'datetime', nullable: true })
  archivedAt: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
