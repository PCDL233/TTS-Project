import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatConfigService } from '../chat-config/chat-config.service';

@Controller('chat/config')
@UseGuards(JwtAuthGuard)
export class ChatConfigPublicController {
  constructor(private readonly chatConfigService: ChatConfigService) {}

  @Get('models')
  async getModels() {
    return this.chatConfigService.getModels();
  }

  @Get('features')
  async getFeatures() {
    return this.chatConfigService.getFeatures();
  }
}
