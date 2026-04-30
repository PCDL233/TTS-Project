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

  async getConfig(): Promise<Config> {
    const configs = await this.configRepository.find();
    if (configs.length === 0) {
      this.logger.log('[getConfig] 无配置记录，创建默认配置');
      const config = this.configRepository.create();
      return this.configRepository.save(config);
    }
    return configs[0];
  }

  async updateConfig(partial: Partial<Config>): Promise<Config> {
    const config = await this.getConfig();
    Object.assign(config, partial);
    const saved = await this.configRepository.save(config);
    this.logger.log(`[updateConfig] 配置已更新: baseUrlPreset=${saved.baseUrlPreset}`);
    return saved;
  }
}
