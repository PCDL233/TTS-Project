import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { SystemConfigService } from './system-config.service'
import { SystemConfig } from './system-config.entity'

@Controller('admin/system-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get()
  async findAll(): Promise<SystemConfig[]> {
    return this.systemConfigService.findAll()
  }

  @Put(':key')
  async update(
    @Param('key') key: string,
    @Body('value') value: string,
  ): Promise<SystemConfig | null> {
    return this.systemConfigService.update(key, value)
  }
}
