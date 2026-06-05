import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { SystemConfigService } from './system-config.service'
import { SystemConfig } from './system-config.entity'

@Controller('admin/system-config')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findAll(): Promise<SystemConfig[]> {
    return this.systemConfigService.findAll()
  }

  @Get('public')
  async findAllPublic(): Promise<SystemConfig[]> {
    return this.systemConfigService.findAll()
  }

  @Put(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async update(
    @Param('key') key: string,
    @Body('value') value: string,
  ): Promise<SystemConfig | null> {
    return this.systemConfigService.update(key, value)
  }
}
