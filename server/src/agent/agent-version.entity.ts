import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { AgentGraphV1 } from './agent.types';

@Entity()
@Unique(['agentId', 'version'])
export class AgentVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  agentId: number;

  @Column()
  version: number;

  @Column({ type: 'simple-json' })
  graphSnapshot: AgentGraphV1;

  @CreateDateColumn({ type: 'datetime' })
  publishedAt: Date;
}
