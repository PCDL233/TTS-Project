import { Controller, Get, Body, Put, Logger, UseGuards, Req } from '@nestjs/common';
import { ConfigService } from './config.service';
import { Config } from './config.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: { userId: number; username: string };
}

@Controller('config')
@UseGuards(JwtAuthGuard)
export class ConfigController {
  private readonly logger = new Logger(ConfigController.name);

  constructor(private readonly configService: ConfigService) {}

  @Get()
  async getConfig(@Req() req: RequestWithUser): Promise<Config> {
    this.logger.log(`[getConfig] 用户 ${req.user.userId} 读取配置`);
    const config = await this.configService.getConfig(req.user.userId);
    this.logger.log(`[getConfig] 当前 baseUrlPreset=${config.baseUrlPreset}`);
    return config;
  }

  @Put()
  async updateConfig(@Req() req: RequestWithUser, @Body() body: Partial<Config>): Promise<Config> {
    this.logger.log(`[updateConfig] 用户 ${req.user.userId} 更新配置`);
    const config = await this.configService.updateConfig(req.user.userId, body);
    this.logger.log('[updateConfig] 配置已更新');
    return config;
  }
}
