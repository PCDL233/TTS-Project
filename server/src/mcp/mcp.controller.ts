import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LogOperation } from '../common/decorators/log-operation.decorator';
import { McpService } from './mcp.service';
import { McpClientManager } from './mcp-client-manager.service';
import { CreateMcpServerDto } from './dto/create-mcp-server.dto';
import { UpdateMcpServerDto } from './dto/update-mcp-server.dto';
import { McpServerConfig } from './mcp-server-config.entity';

@Controller('mcp')
@UseGuards(JwtAuthGuard)
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(
    private readonly mcpService: McpService,
    private readonly clientManager: McpClientManager,
  ) {}

  @Get('servers')
  async getServers(@Req() req: RequestWithUser) {
    const configs = await this.mcpService.findAll(req.user.userId);
    // 脱敏：敏感字段不返回给前端
    return configs.map((c) => ({
      ...c,
      transport: this.redactTransport(c.transport),
    }));
  }

  @Post('servers')
  @LogOperation('mcp', 'create-server')
  async createServer(@Req() req: RequestWithUser, @Body() dto: CreateMcpServerDto) {
    this.logger.log(`[createServer] 用户 ${req.user.userId} 创建 MCP 服务器: ${dto.name}`);
    const config = await this.mcpService.create(req.user.userId, dto);
    return { ...config, transport: this.redactTransport(config.transport) };
  }

  @Patch('servers/:id')
  @LogOperation('mcp', 'update-server')
  async updateServer(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateMcpServerDto,
  ) {
    this.logger.log(`[updateServer] 用户 ${req.user.userId} 更新 MCP 服务器 ${id}`);
    const config = await this.mcpService.update(req.user.userId, Number(id), dto);
    // 断开旧连接，下次使用时重新连接
    await this.clientManager.disconnect(req.user.userId, Number(id));
    return { ...config, transport: this.redactTransport(config.transport) };
  }

  @Delete('servers/:id')
  @LogOperation('mcp', 'delete-server')
  async deleteServer(@Req() req: RequestWithUser, @Param('id') id: string) {
    this.logger.log(`[deleteServer] 用户 ${req.user.userId} 删除 MCP 服务器 ${id}`);
    await this.clientManager.disconnect(req.user.userId, Number(id));
    await this.mcpService.remove(req.user.userId, Number(id));
    return { success: true };
  }

  @Post('servers/:id/refresh')
  @LogOperation('mcp', 'refresh-tools')
  async refreshTools(@Req() req: RequestWithUser, @Param('id') id: string) {
    this.logger.log(`[refreshTools] 用户 ${req.user.userId} 刷新 MCP 服务器 ${id} 工具列表`);
    const config = await this.mcpService.getDecryptedConfig(req.user.userId, Number(id));
    if (!config) throw new NotFoundException('MCP 服务器配置不存在');

    // 强制断开并重新连接以刷新工具
    await this.clientManager.disconnect(req.user.userId, Number(id));
    const entry = await this.clientManager.getOrCreateClient(config);
    if (!entry) {
      throw new NotFoundException('无法连接到 MCP 服务器');
    }

    await this.mcpService.updateCachedTools(req.user.userId, Number(id), entry.tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      updatedAt: new Date().toISOString(),
    })));

    return { success: true, toolCount: entry.tools.length };
  }

  @Get('servers/:id/health')
  async getHealth(@Req() req: RequestWithUser, @Param('id') id: string) {
    const config = await this.mcpService.getDecryptedConfig(req.user.userId, Number(id));
    if (!config) throw new NotFoundException('MCP 服务器配置不存在');

    const entry = await this.clientManager.getOrCreateClient(config);
    return {
      connected: entry?.status === 'connected',
      status: entry?.status || 'disconnected',
      toolCount: entry?.tools?.length || 0,
      lastError: entry?.lastError || null,
    };
  }

  private redactTransport(transport: McpServerConfig['transport']) {
    const t = { ...transport };
    if (t.env) {
      t.env = Object.fromEntries(
        Object.entries(t.env).map(([k, v]) => {
          const isSensitive = ['key', 'token', 'secret', 'password', 'api', 'auth', 'credential', 'private'].some(
            (sk) => k.toLowerCase().includes(sk),
          );
          return [k, isSensitive ? '***' : v];
        }),
      );
    }
    if (t.headers) {
      t.headers = Object.fromEntries(
        Object.entries(t.headers).map(([k, v]) => {
          const isSensitive = ['key', 'token', 'secret', 'password', 'api', 'auth', 'credential', 'private'].some(
            (sk) => k.toLowerCase().includes(sk),
          );
          return [k, isSensitive ? '***' : v];
        }),
      );
    }
    return t;
  }
}
