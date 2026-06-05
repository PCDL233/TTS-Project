import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { McpServerConfig } from './mcp-server-config.entity';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { McpClientManager } from './mcp-client-manager.service';
import { McpToolService } from './mcp-tool.service';

import { CryptoModule } from '../common/crypto.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([McpServerConfig]),
    CryptoModule,
  ],
  controllers: [McpController],
  providers: [McpService, McpClientManager, McpToolService],
  exports: [McpService, McpClientManager, McpToolService],
})
export class McpModule {}
