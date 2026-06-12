import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatConversation } from './chat-conversation.entity';
import { ChatMessage } from './chat-message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatConfigPublicController } from './chat-config-public.controller';
import { ConfigModule } from '../config/config.module';
import { ChatConfigModule } from '../chat-config/chat-config.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { McpModule } from '../mcp/mcp.module';
import { McpServerConfig } from '../mcp/mcp-server-config.entity';
import { AgentChatService } from './agent-chat.service';
import { KnowledgeBase } from '../knowledge-base/knowledge-base.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChatConversation, ChatMessage, McpServerConfig, KnowledgeBase]), ConfigModule, ChatConfigModule, KnowledgeBaseModule, McpModule],
  providers: [ChatService, AgentChatService],
  controllers: [ChatController, ChatConfigPublicController],
})
export class ChatModule {}
