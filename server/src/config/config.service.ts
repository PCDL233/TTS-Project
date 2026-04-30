import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Config } from './config.entity';

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  constructor(
    @InjectRepository(Config)
    private configRepository: Repository<Config>,
  ) {}

  async getConfig(userId: number): Promise<Config> {
    const config = await this.configRepository.findOne({ where: { userId } });
    if (!config) {
      this.logger.log(`[getConfig] 用户 ${userId} 无配置记录，创建默认配置`);
      const newConfig = this.configRepository.create({ userId });
      return this.configRepository.save(newConfig);
    }
    return config;
  }

  async updateConfig(userId: number, partial: Partial<Config>): Promise<Config> {
    const config = await this.getConfig(userId);
    Object.assign(config, partial);
    const saved = await this.configRepository.save(config);
    this.logger.log(`[updateConfig] 用户 ${userId} 配置已更新: baseUrlPreset=${saved.baseUrlPreset}`);
    return saved;
  }
}
