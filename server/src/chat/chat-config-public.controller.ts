import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatConfigService } from '../chat-config/chat-config.service';
import type { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { ProviderModelService } from './provider-model.service';

@Controller('chat/config')
@UseGuards(JwtAuthGuard)
export class ChatConfigPublicController {
  constructor(
    private readonly chatConfigService: ChatConfigService,
    private readonly providerModelService: ProviderModelService,
  ) {}

  @Get('models')
  async getModels() {
    return this.chatConfigService.getModels();
  }

  @Get('provider-models')
  async getProviderModels(@Req() req: RequestWithUser) {
    return this.providerModelService.listModelsForUser(req.user.userId);
  }

  @Get('features')
  async getFeatures() {
    return this.chatConfigService.getFeatures();
  }
}
