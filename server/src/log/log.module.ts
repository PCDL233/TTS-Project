import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { LoginLog } from './login-log.entity'
import { LoginLogService } from './login-log.service'
import { OperationLog } from './operation-log.entity'
import { OperationLogService } from './operation-log.service'

@Module({
  imports: [TypeOrmModule.forFeature([LoginLog, OperationLog])],
  providers: [LoginLogService, OperationLogService],
  exports: [LoginLogService, OperationLogService],
})
export class LogModule {}
