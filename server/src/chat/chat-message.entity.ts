import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export interface MessagePart {
  type: 'text' | 'image_url' | 'input_audio';
  text?: string;
  image_url?: { url: string };
  input_audio?: { data: string; format: string };
}

@Entity()
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  conversationId: number;

  @Column()
  role: 'system' | 'user' | 'assistant' | 'tool';

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-json', nullable: true })
  contentParts: MessagePart[];

  @Column({ type: 'text', nullable: true })
  reasoningContent: string;

  @Column({ type: 'simple-json', nullable: true })
  toolCalls: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }>;

  @Column({ type: 'simple-json', nullable: true })
  annotations: Array<{
    type: string;
    url: string;
    title: string;
    summary: string;
    site_name: string;
    logo_url: string;
    publish_time: string;
  }>;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
