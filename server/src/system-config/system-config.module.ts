import { Module, OnModuleInit } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SystemConfig } from './system-config.entity'
import { SystemConfigService } from './system-config.service'
import { SystemConfigController } from './system-config.controller'
import { ConfigModule } from '../config/config.module'

@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig]), ConfigModule],
  providers: [SystemConfigService],
  controllers: [SystemConfigController],
  exports: [SystemConfigService],
})
export class SystemConfigModule implements OnModuleInit {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  async onModuleInit() {
    await this.systemConfigService.seed()
  }
}
