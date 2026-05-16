import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { ChatConfigService } from './chat-config.service'

@Controller('admin/chat-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ChatConfigController {
  constructor(private readonly chatConfigService: ChatConfigService) {}

  @Get('models')
  async getModels() {
    return this.chatConfigService.getModels()
  }

  @Put('models')
  async updateModels(@Body() body: { defaultModel: string }) {
    await this.chatConfigService.update('default_model', body.defaultModel)
    return { success: true }
  }

  @Get('features')
  async getFeatures() {
    return this.chatConfigService.getFeatures()
  }

  @Put('features')
  async updateFeatures(@Body() body: Record<string, boolean>) {
    const updates: Record<string, string> = {}
    for (const [key, value] of Object.entries(body)) {
      updates[`feature_${key}`] = String(value)
    }
    await this.chatConfigService.updateMultiple(updates)
    return { success: true }
  }
}
