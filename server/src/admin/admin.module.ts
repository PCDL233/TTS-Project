import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AdminController } from './admin.controller'
import { UserModule } from '../user/user.module'
import { LogModule } from '../log/log.module'
import { History } from '../history/history.entity'
import { User } from '../user/user.entity'
import { LoginLog } from '../log/login-log.entity'

@Module({
  imports: [TypeOrmModule.forFeature([History, User, LoginLog]), UserModule, LogModule],
  controllers: [AdminController],
})
export class AdminModule {}
