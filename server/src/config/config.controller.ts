import { Controller, Get, Body, Put, Logger } from '@nestjs/common';
import { ConfigService } from './config.service';
import { Config } from './config.entity';

@Controller('config')
export class ConfigController {
  private readonly logger = new Logger(ConfigController.name);

  constructor(private readonly configService: ConfigService) {}

  @Get()
  async getConfig(): Promise<Config> {
    this.logger.log('[getConfig] 读取配置');
    const config = await this.configService.getConfig();
    this.logger.log(`[getConfig] 当前 baseUrlPreset=${config.baseUrlPreset}`);
    return config;
  }

  @Put()
  async updateConfig(@Body() body: Partial<Config>): Promise<Config> {
    this.logger.log(`[updateConfig] 更新配置: ${JSON.stringify(body)}`);
    const config = await this.configService.updateConfig(body);
    this.logger.log('[updateConfig] 配置已更新');
    return config;
  }
}
