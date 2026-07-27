import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Config } from './config.entity';
import { CryptoService } from '../common/crypto.service';
import {
  BASE_URL_PRESETS,
  DEFAULT_MIMO_BASE_URL,
  MIMO_PRESETS,
  TOKEN_PLAN_PRESETS,
  ApiAuthType,
  buildAuthHeaders,
  normalizeBaseUrl,
  normalizePreset,
  resolveAuthType,
  resolvePresetByBaseUrl,
} from './llm-provider.util';

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

    config.baseUrlPreset = normalizePreset(config.baseUrlPreset);

    // 解密 API Key
    if (config.apiKey) {
      try {
        config.apiKey = this.cryptoService.aesDecrypt(config.apiKey);
      } catch {
        // 密文格式为 iv:authTag:ciphertext 或旧版 iv:ciphertext，如果不包含分隔符则判定为明文旧数据
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

    const next: Partial<Config> = { ...partial };
    if (next.baseUrlPreset) {
      next.baseUrlPreset = normalizePreset(next.baseUrlPreset);
    }
    if (next.baseUrlCustom !== undefined) {
      next.baseUrlCustom = normalizeBaseUrl(next.baseUrlCustom);
    }

    // 加密 API Key。允许传空字符串清空 Key。
    if (next.apiKey !== undefined) {
      next.apiKey = next.apiKey ? this.cryptoService.aesEncrypt(next.apiKey) : '';
    }

    Object.assign(config, next);
    const saved = await this.configRepository.save(config);
    this.logger.log(
      `[updateConfig] 用户 ${userId} 配置已更新: baseUrlPreset=${saved.baseUrlPreset}, apiAuthType=${saved.apiAuthType}`,
    );
    return saved;
  }

  getEffectiveBaseUrl(config: { baseUrlPreset: string; baseUrlCustom: string }): string {
    const preset = normalizePreset(config.baseUrlPreset);
    if (preset === 'custom') {
      return normalizeBaseUrl(config.baseUrlCustom) || DEFAULT_MIMO_BASE_URL;
    }
    return BASE_URL_PRESETS[preset]?.url || DEFAULT_MIMO_BASE_URL;
  }

  getEffectiveApiAuthType(config: { baseUrlPreset: string; apiAuthType?: string }): ApiAuthType {
    return resolveAuthType(config.baseUrlPreset, config.apiAuthType);
  }

  buildApiHeaders(config: { baseUrlPreset: string; apiAuthType?: string; apiKey: string }): Record<string, string> {
    const authType = this.getEffectiveApiAuthType(config);
    return {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(config.apiKey, authType),
    };
  }

  isMimoApi(config: { baseUrlPreset: string }): boolean {
    return MIMO_PRESETS.has(config.baseUrlPreset);
  }

  isTokenPlanApi(config: { baseUrlPreset: string }): boolean {
    return TOKEN_PLAN_PRESETS.has(config.baseUrlPreset);
  }

  resolveBaseUrlPresetFromUrl(baseUrl: string): { baseUrlPreset: string; baseUrlCustom: string } {
    return resolvePresetByBaseUrl(baseUrl);
  }

  async createConfig(userId: number, defaults?: Partial<Config>): Promise<Config> {
    const config = this.configRepository.create({
      userId,
      ...defaults,
    });
    return this.configRepository.save(config);
  }

  async updateAllUsersBaseUrlPreset(preset: string): Promise<void> {
    await this.configRepository
      .createQueryBuilder()
      .update()
      .set({ baseUrlPreset: normalizePreset(preset) })
      .where('baseUrlPreset != :custom', { custom: 'custom' })
      .execute();
  }

  async updateAllUsersBaseUrl(baseUrl: string): Promise<void> {
    const resolved = this.resolveBaseUrlPresetFromUrl(baseUrl);
    await this.configRepository
      .createQueryBuilder()
      .update()
      .set(resolved)
      .where('baseUrlPreset != :custom', { custom: 'custom' })
      .execute();
  }
}
