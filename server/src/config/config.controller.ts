import { Controller, Get, Body, Put } from '@nestjs/common';
import { ConfigService } from './config.service';
import { Config } from './config.entity';

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getConfig(): Promise<Config> {
    return this.configService.getConfig();
  }

  @Put()
  updateConfig(@Body() body: Partial<Config>): Promise<Config> {
    return this.configService.updateConfig(body);
  }
}
