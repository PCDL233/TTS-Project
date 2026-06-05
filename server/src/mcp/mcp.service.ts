import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { McpServerConfig } from './mcp-server-config.entity';
import { CreateMcpServerDto } from './dto/create-mcp-server.dto';
import { UpdateMcpServerDto } from './dto/update-mcp-server.dto';
import { CryptoService } from '../common/crypto.service';

const SENSITIVE_KEYS = ['key', 'token', 'secret', 'password', 'api', 'auth', 'credential', 'private'];

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);

  constructor(
    @InjectRepository(McpServerConfig)
    private readonly mcpConfigRepository: Repository<McpServerConfig>,
    private readonly cryptoService: CryptoService,
  ) {}

  async findAll(userId: number): Promise<McpServerConfig[]> {
    return this.mcpConfigRepository.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findOne(userId: number, id: number): Promise<McpServerConfig | null> {
    return this.mcpConfigRepository.findOne({ where: { id, userId } });
  }

  async create(userId: number, dto: CreateMcpServerDto): Promise<McpServerConfig> {
    const transport = this.buildTransport(dto);
    const encryptedTransport = this.encryptTransportSecrets(transport);

    const config = this.mcpConfigRepository.create({
      userId,
      name: dto.name,
      description: dto.description || '',
      transport: encryptedTransport,
      enabled: dto.enabled ?? true,
      cachedTools: null,
    });

    const saved = await this.mcpConfigRepository.save(config);
    this.logger.log(`[McpService] 用户 ${userId} 创建 MCP 服务器: ${saved.name}`);
    return saved;
  }

  async update(userId: number, id: number, dto: UpdateMcpServerDto): Promise<McpServerConfig> {
    const config = await this.findOne(userId, id);
    if (!config) throw new NotFoundException('MCP 服务器配置不存在');

    if (dto.name !== undefined) config.name = dto.name;
    if (dto.description !== undefined) config.description = dto.description || '';
    if (dto.enabled !== undefined) config.enabled = dto.enabled;

    if (dto.transportType) {
      const transport = this.buildTransport(dto as CreateMcpServerDto);
      config.transport = this.encryptTransportSecrets(transport);
    }

    const saved = await this.mcpConfigRepository.save(config);
    this.logger.log(`[McpService] 用户 ${userId} 更新 MCP 服务器: ${saved.name}`);
    return saved;
  }

  async remove(userId: number, id: number): Promise<void> {
    const config = await this.findOne(userId, id);
    if (!config) throw new NotFoundException('MCP 服务器配置不存在');

    await this.mcpConfigRepository.delete({ id, userId });
    this.logger.log(`[McpService] 用户 ${userId} 删除 MCP 服务器: ${config.name}`);
  }

  async updateCachedTools(userId: number, id: number, tools: McpServerConfig['cachedTools']): Promise<void> {
    await this.mcpConfigRepository.update({ id, userId }, { cachedTools: tools });
  }

  /** 解密后的配置（用于连接 MCP 服务器） */
  async getDecryptedConfig(userId: number, id: number): Promise<McpServerConfig | null> {
    const config = await this.findOne(userId, id);
    if (!config) return null;
    config.transport = this.decryptTransportSecrets(config.transport);
    return config;
  }

  private buildTransport(dto: CreateMcpServerDto): McpServerConfig['transport'] {
    if (dto.transportType === 'stdio') {
      if (!dto.command) {
        throw new BadRequestException('stdio 传输类型必须提供 command');
      }
      return {
        type: 'stdio',
        command: dto.command,
        args: dto.args || [],
        env: dto.env || {},
      };
    }
    if (!dto.url) {
      throw new BadRequestException('sse 传输类型必须提供 url');
    }
    return {
      type: 'sse',
      url: dto.url,
      headers: dto.headers || {},
    };
  }

  private encryptTransportSecrets(transport: McpServerConfig['transport']): McpServerConfig['transport'] {
    const result = { ...transport };
    if (result.env) {
      result.env = Object.fromEntries(
        Object.entries(result.env).map(([k, v]) => [
          k,
          SENSITIVE_KEYS.some((sk) => k.toLowerCase().includes(sk))
            ? this.cryptoService.aesEncrypt(v)
            : v,
        ]),
      );
    }
    if (result.headers) {
      result.headers = Object.fromEntries(
        Object.entries(result.headers).map(([k, v]) => [
          k,
          SENSITIVE_KEYS.some((sk) => k.toLowerCase().includes(sk))
            ? this.cryptoService.aesEncrypt(v)
            : v,
        ]),
      );
    }
    return result;
  }

  private decryptTransportSecrets(transport: McpServerConfig['transport']): McpServerConfig['transport'] {
    const result = { ...transport };
    if (result.env) {
      result.env = Object.fromEntries(
        Object.entries(result.env).map(([k, v]) => [
          k,
          SENSITIVE_KEYS.some((sk) => k.toLowerCase().includes(sk)) && v && v.includes(':')
            ? this.cryptoService.aesDecrypt(v)
            : v,
        ]),
      );
    }
    if (result.headers) {
      result.headers = Object.fromEntries(
        Object.entries(result.headers).map(([k, v]) => [
          k,
          SENSITIVE_KEYS.some((sk) => k.toLowerCase().includes(sk)) && v && v.includes(':')
            ? this.cryptoService.aesDecrypt(v)
            : v,
        ]),
      );
    }
    return result;
  }
}
