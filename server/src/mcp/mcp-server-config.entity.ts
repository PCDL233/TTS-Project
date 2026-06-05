import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type McpTransportType = 'stdio' | 'sse';

export interface McpCachedTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  updatedAt: string;
}

@Entity()
export class McpServerConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  userId: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-json' })
  transport: {
    type: McpTransportType;
    // stdio
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    // sse
    url?: string;
    headers?: Record<string, string>;
  };

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'simple-json', nullable: true })
  cachedTools: McpCachedTool[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
