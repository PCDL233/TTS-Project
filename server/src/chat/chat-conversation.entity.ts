import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity()
export class ChatConversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ nullable: true })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ default: '新对话' })
  title: string;

  @Column({ default: '' })
  model: string;

  @Column({ type: 'simple-json', default: '{}' })
  features: {
    thinking?: boolean;
    webSearch?: boolean;
    functionCall?: boolean;
  };

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @Index()
  @Column({ type: 'integer', nullable: true })
  knowledgeBaseId: number | null;

  @Index()
  @Column({ type: 'integer', nullable: true })
  agentId: number | null;

  @Index()
  @Column({ type: 'integer', nullable: true })
  agentVersionId: number | null;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
