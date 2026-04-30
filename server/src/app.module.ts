import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ConfigModule as AppConfigModule } from './config/config.module'
import { HistoryModule } from './history/history.module'
import { TtsModule } from './tts/tts.module'
import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { RoleModule } from './role/role.module'
import { LogModule } from './log/log.module'
import { AdminModule } from './admin/admin.module'
import { SystemConfigModule } from './system-config/system-config.module'
import { AudioTagModule } from './audio-tag/audio-tag.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'data.sqlite',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
