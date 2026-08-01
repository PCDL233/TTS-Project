import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AdminController } from './admin.controller'
import { UserModule } from '../user/user.module'
import { LogModule } from '../log/log.module'
import { History } from '../history/history.entity'
import { User } from '../user/user.entity'
import { LoginLog } from '../log/login-log.entity'
import { ChatConversation } from '../chat/chat-conversation.entity'
import { ChatMessage } from '../chat/chat-message.entity'
import { Agent } from '../agent/agent.entity'
import { AgentVersion } from '../agent/agent-version.entity'
import { McpServerConfig } from '../mcp/mcp-server-config.entity'
import { KnowledgeBase } from '../knowledge-base/knowledge-base.entity'
import { KnowledgeDocument } from '../knowledge-base/knowledge-document.entity'
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      History, User, LoginLog, ChatConversation, ChatMessage, Agent, AgentVersion,
      McpServerConfig, KnowledgeBase, KnowledgeDocument,
    ]),
    UserModule,
    LogModule,
    KnowledgeBaseModule,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
