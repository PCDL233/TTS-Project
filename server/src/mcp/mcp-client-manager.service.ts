import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { McpServerConfig } from './mcp-server-config.entity';

// MCP SDK is ESM — import dynamically to avoid top-level await issues
let Client: any;
let StdioClientTransport: any;
let SseClientTransport: any;

async function loadMcpSdk() {
  if (!Client) {
    const sdk = await import('@modelcontextprotocol/sdk/client/index.js');
    Client = sdk.Client;
  }
  if (!StdioClientTransport) {
    const stdio = await import('@modelcontextprotocol/sdk/client/stdio.js');
    StdioClientTransport = stdio.StdioClientTransport;
  }
  if (!SseClientTransport) {
    const sse = await import('@modelcontextprotocol/sdk/client/sse.js');
    SseClientTransport = sse.SSEClientTransport;
  }
}

export interface McpToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface McpClientEntry {
  client: any;
  transport: any;
  tools: McpToolInfo[];
  status: 'connected' | 'connecting' | 'error' | 'disconnected';
  lastError?: string;
  connectTime?: Date;
}

@Injectable()
export class McpClientManager implements OnModuleDestroy {
  private readonly logger = new Logger(McpClientManager.name);
  private clients = new Map<string, McpClientEntry>();
  private reconnectAttempts = new Map<string, number>();

  private getKey(userId: number, configId: number): string {
    return `${userId}:${configId}`;
  }

  async getOrCreateClient(config: McpServerConfig): Promise<McpClientEntry | null> {
    const key = this.getKey(config.userId, config.id);
    const existing = this.clients.get(key);
    if (existing?.status === 'connected') return existing;

    try {
      return await this.connect(config);
    } catch (err) {
      this.logger.error(`[McpClientManager] 无法连接 MCP 服务器 ${key}: ${(err as Error).message}`);
      return null;
    }
  }

  private async connect(config: McpServerConfig): Promise<McpClientEntry> {
    await loadMcpSdk();

    const key = this.getKey(config.userId, config.id);
    this.logger.log(`[McpClientManager] 正在连接 ${key} (${config.transport.type})`);

    let transport: any;

    if (config.transport.type === 'stdio') {
      transport = new StdioClientTransport({
        command: config.transport.command!,
        args: config.transport.args || [],
        env: config.transport.env,
      });
    } else {
      transport = new SseClientTransport({
        url: new URL(config.transport.url!),
        headers: config.transport.headers,
      });
    }

    const client = new Client({ name: `mcp-client-${key}`, version: '1.0.0' });

    try {
      await client.connect(transport);
      const toolsResult = await client.listTools();

      const entry: McpClientEntry = {
        client,
        transport,
        tools: toolsResult.tools || [],
        status: 'connected',
        connectTime: new Date(),
      };

      this.clients.set(key, entry);
      this.reconnectAttempts.set(key, 0);
      this.logger.log(`[McpClientManager] 连接成功 ${key}，发现 ${entry.tools.length} 个工具`);

      // stdio 进程退出监听
      if (config.transport.type === 'stdio') {
        const proc = (transport as any).process;
        if (proc) {
          proc.on('exit', (code: number | null) => {
            this.logger.warn(`[McpClientManager] stdio 进程退出 ${key}, code=${code}`);
            this.handleDisconnect(key, config);
          });
          proc.on('error', (err: Error) => {
            this.logger.error(`[McpClientManager] stdio 进程错误 ${key}: ${err.message}`);
            this.handleDisconnect(key, config);
          });
        }
      }

      return entry;
    } catch (err) {
      await client.close().catch(() => {});
      const entry: McpClientEntry = {
        client,
        transport,
        tools: [],
        status: 'error',
        lastError: (err as Error).message,
      };
      this.clients.set(key, entry);
      throw err;
    }
  }

  private async handleDisconnect(key: string, config: McpServerConfig) {
    const entry = this.clients.get(key);
    if (entry) {
      entry.status = 'disconnected';
      try { await entry.client.close(); } catch {}
    }

    const attempts = (this.reconnectAttempts.get(key) || 0) + 1;
    if (attempts > 3) {
      this.logger.error(`[McpClientManager] ${key} 重连次数超过上限`);
      this.reconnectAttempts.set(key, attempts);
      return;
    }

    const delay = Math.pow(2, attempts - 1) * 1000;
    this.logger.log(`[McpClientManager] ${delay}ms 后尝试第 ${attempts} 次重连 ${key}...`);

    setTimeout(() => {
      this.connect(config).catch(() => {});
    }, delay);
  }

  async disconnect(userId: number, configId: number) {
    const key = this.getKey(userId, configId);
    const entry = this.clients.get(key);
    if (entry) {
      try { await entry.client.close(); } catch {}
      this.clients.delete(key);
      this.reconnectAttempts.delete(key);
      this.logger.log(`[McpClientManager] 已断开 ${key}`);
    }
  }

  async disconnectAllForUser(userId: number) {
    for (const [key, entry] of this.clients.entries()) {
      if (key.startsWith(`${userId}:`)) {
        try { await entry.client.close(); } catch {}
        this.clients.delete(key);
        this.reconnectAttempts.delete(key);
      }
    }
    this.logger.log(`[McpClientManager] 已断开用户 ${userId} 的所有 MCP 连接`);
  }

  async onModuleDestroy() {
    for (const [key, entry] of this.clients.entries()) {
      try { await entry.client.close(); } catch {}
      this.clients.delete(key);
    }
    this.logger.log('[McpClientManager] 应用关闭，所有 MCP 连接已清理');
  }
}
