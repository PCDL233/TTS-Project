import { Injectable, Logger } from '@nestjs/common';
import { McpClientManager, McpClientEntry } from './mcp-client-manager.service';
import { McpServerConfig } from './mcp-server-config.entity';

@Injectable()
export class McpToolService {
  private readonly logger = new Logger(McpToolService.name);

  constructor(private readonly clientManager: McpClientManager) {}

  /**
   * 获取用户所有启用且已连接的 MCP 服务器工具，转换为 MiMo function calling 格式
   */
  async getFunctionToolsForUser(
    configs: McpServerConfig[],
  ): Promise<Array<{ type: 'function'; function: any }>> {
    const tools: Array<{ type: 'function'; function: any }> = [];

    for (const config of configs.filter((c) => c.enabled)) {
      const entry = await this.clientManager.getOrCreateClient(config);
      if (!entry || entry.status !== 'connected') {
        this.logger.warn(`[McpToolService] 跳过未连接服务器 ${config.name} (${config.id})`);
        continue;
      }

      for (const tool of entry.tools) {
        tools.push({
          type: 'function',
          function: {
            name: `mcp_${config.id}_${tool.name}`,
            description: `[${config.name}] ${tool.description || ''}`.slice(0, 1024),
            parameters: tool.inputSchema,
          },
        });
      }
    }

    return tools;
  }

  parseToolName(fullName: string): { configId: number; toolName: string } | null {
    const match = fullName.match(/^mcp_(\d+)_(.+)$/);
    if (!match) return null;
    return { configId: parseInt(match[1], 10), toolName: match[2] };
  }

  async callTool(
    entry: McpClientEntry,
    toolName: string,
    args: Record<string, any>,
  ): Promise<{ content: any[]; isError?: boolean }> {
    this.logger.log(`[McpToolService] 调用工具 ${toolName}: ${JSON.stringify(args).slice(0, 500)}`);
    return entry.client.callTool({ name: toolName, arguments: args });
  }
}
