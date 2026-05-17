import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Config } from './config.entity';
import { CryptoService } from '../common/crypto.service';

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  constructor(
    @InjectRepository(Config)
    private configRepository: Repository<Config>,
    private readonly cryptoService: CryptoService,
  ) {}

  async getConfig(userId: number): Promise<Config> {
    const config = await this.configRepository.findOne({ where: { userId } });
    if (!config) {
      this.logger.log(`[getConfig] 用户 ${userId} 无配置记录，创建默认配置`);
      const newConfig = this.configRepository.create({ userId });
      return this.configRepository.save(newConfig);
    }
    // 解密 API Key
    if (config.apiKey) {
      try {
        config.apiKey = this.cryptoService.aesDecrypt(config.apiKey);
      } catch {
        // 密文格式为 iv:ciphertext，如果不包含分隔符则判定为明文旧数据
        if (config.apiKey.includes(':')) {
          this.logger.warn(`[getConfig] 用户 ${userId} API Key 解密失败，密文格式异常`);
        } else {
          // 明文存储的旧数据，自动加密迁移
          const encrypted = this.cryptoService.aesEncrypt(config.apiKey);
          await this.configRepository.update(config.id, { apiKey: encrypted });
          this.logger.log(`[getConfig] 用户 ${userId} 明文 API Key 已自动加密`);
        }
      }
    }
    return config;
  }

  async updateConfig(userId: number, partial: Partial<Config>): Promise<Config> {
    const config = await this.getConfig(userId);
    // 加密 API Key
    if (partial.apiKey) {
      partial.apiKey = this.cryptoService.aesEncrypt(partial.apiKey);
    }
    Object.assign(config, partial);
    const saved = await this.configRepository.save(config);
    this.logger.log(`[updateConfig] 用户 ${userId} 配置已更新: baseUrlPreset=${saved.baseUrlPreset}`);
    return saved;
  }

  getEffectiveBaseUrl(config: { baseUrlPreset: string; baseUrlCustom: string }): string {
    if (config.baseUrlPreset === 'custom') {
      return config.baseUrlCustom || 'https://api.xiaomimimo.com/v1';
    }
    const presets: Record<string, string> = {
      default: 'https://api.xiaomimimo.com/v1',
      'token-plan-cn': 'https://token-plan-cn.xiaomimimo.com/v1',
      'token-plan-sgp': 'https://token-plan-sgp.xiaomimimo.com/v1',
      'token-plan-ams': 'https://token-plan-ams.xiaomimimo.com/v1',
    };
    return presets[config.baseUrlPreset] || 'https://api.xiaomimimo.com/v1';
  }

  async createConfig(userId: number, defaults?: Partial<Config>): Promise<Config> {
    const config = this.configRepository.create({
      userId,
      ...defaults,
    })
    return this.configRepository.save(config)
  }

  async updateAllUsersBaseUrlPreset(preset: string): Promise<void> {
    await this.configRepository
      .createQueryBuilder()
      .update()
      .set({ baseUrlPreset: preset })
      .where('baseUrlPreset != :custom', { custom: 'custom' })
      .execute()
  }
}
