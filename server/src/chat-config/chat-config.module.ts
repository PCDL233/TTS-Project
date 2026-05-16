import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatConfig } from './chat-config.entity';
import { ChatConfigService } from './chat-config.service';
import { ChatConfigController } from './chat-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChatConfig])],
  controllers: [ChatConfigController],
  providers: [ChatConfigService],
  exports: [ChatConfigService],
})
export class ChatConfigModule implements OnModuleInit {
  constructor(private readonly chatConfigService: ChatConfigService) {}

  async onModuleInit() {
    await this.chatConfigService.seed();
  }
}
