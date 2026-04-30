import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Config } from './config.entity';

@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(Config)
    private configRepository: Repository<Config>,
  ) {}

  async getConfig(): Promise<Config> {
    const configs = await this.configRepository.find();
    if (configs.length === 0) {
      const config = this.configRepository.create();
      return this.configRepository.save(config);
    }
    return configs[0];
  }

  async updateConfig(partial: Partial<Config>): Promise<Config> {
    const config = await this.getConfig();
    Object.assign(config, partial);
    return this.configRepository.save(config);
  }
}
