import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatConversation } from './chat-conversation.entity';
import { ChatMessage } from './chat-message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatConfigPublicController } from './chat-config-public.controller';
import { ConfigModule } from '../config/config.module';
import { ChatConfigModule } from '../chat-config/chat-config.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChatConversation, ChatMessage]), ConfigModule, ChatConfigModule],
  providers: [ChatService],
  controllers: [ChatController, ChatConfigPublicController],
})
export class ChatModule {}
