import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class ChatConversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  userId: number;

  @Column({ default: '新对话' })
  title: string;

  @Column({ default: 'mimo-v2.5-pro' })
  model: string;

  @Column({ type: 'simple-json', default: '{}' })
  features: {
    thinking?: boolean;
    webSearch?: boolean;
    functionCall?: boolean;
    jsonMode?: boolean;
  };

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
