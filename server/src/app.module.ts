import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { HistoryModule } from './history/history.module';
import { TtsModule } from './tts/tts.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { RoleModule } from './role/role.module';
import { LogModule } from './log/log.module';
import { AdminModule } from './admin/admin.module';
import { SystemConfigModule } from './system-config/system-config.module';
import { AudioTagModule } from './audio-tag/audio-tag.module';
import { UploadModule } from './common/upload/upload.module';
import { ChatModule } from './chat/chat.module';
import { ChatConfigModule } from './chat-config/chat-config.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { AudioTag } from './audio-tag/audio-tag.entity';
import { Config } from './config/config.entity';
import { History } from './history/history.entity';
import { LoginLog } from './log/login-log.entity';
import { OperationLog } from './log/operation-log.entity';
import { Role } from './role/role.entity';
import { SystemConfig } from './system-config/system-config.entity';
import { User } from './user/user.entity';
import { ChatConversation } from './chat/chat-conversation.entity';
import { ChatMessage } from './chat/chat-message.entity';
import { ChatConfig } from './chat-config/chat-config.entity';
import { KnowledgeBase } from './knowledge-base/knowledge-base.entity';
import { KnowledgeDocument } from './knowledge-base/knowledge-document.entity';
import { KnowledgeChunk } from './knowledge-base/knowledge-chunk.entity';

const entities = [
  AudioTag,
  Config,
  History,
  LoginLog,
  OperationLog,
  Role,
  SystemConfig,
  User,
  ChatConversation,
  ChatMessage,
  ChatConfig,
  KnowledgeBase,
  KnowledgeDocument,
  KnowledgeChunk,
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'data.sqlite',
      entities,
      synchronize: true,
    }),
    UserModule,
    AuthModule,
    RoleModule,
    AppConfigModule,
    HistoryModule,
    TtsModule,
    LogModule,
    AdminModule,
    SystemConfigModule,
    AudioTagModule,
    UploadModule,
    ChatModule,
    ChatConfigModule,
    KnowledgeBaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
