import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './agent.entity';
import { AgentVersion } from './agent-version.entity';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentWorkflowExecutor } from './agent-workflow-executor.service';
import { KnowledgeBase } from '../knowledge-base/knowledge-base.entity';
import { McpServerConfig } from '../mcp/mcp-server-config.entity';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { McpModule } from '../mcp/mcp.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Agent,
      AgentVersion,
      KnowledgeBase,
      McpServerConfig,
    ]),
    KnowledgeBaseModule,
    McpModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [AgentController],
  providers: [AgentService, AgentWorkflowExecutor],
  exports: [AgentService, AgentWorkflowExecutor],
})
export class AgentModule {}
