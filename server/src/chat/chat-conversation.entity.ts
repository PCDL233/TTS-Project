import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';

@Entity()
export class ChatConversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ default: '新对话' })
  title: string;

  @Column({ default: 'mimo-v2.5-pro' })
  model: string;

  @Column({ type: 'simple-json', default: '{}' })
  features: {
    thinking?: boolean;
    webSearch?: boolean;
    functionCall?: boolean;
  };

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @Column({ nullable: true })
  knowledgeBaseId: number;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
