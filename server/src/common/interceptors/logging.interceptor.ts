import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { OperationLogService } from '../../log/operation-log.service'
import { getClientIp } from '../utils/ip.util'
import { LOG_OPERATION_KEY, LogOperationOptions } from '../decorators/log-operation.decorator'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name)

  constructor(
    private readonly operationLogService: OperationLogService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const logOptions = this.reflector.get<LogOperationOptions>(
      LOG_OPERATION_KEY,
      context.getHandler(),
    )

    // 没有 @LogOperation 装饰器的请求不记录
    if (!logOptions) {
      return next.handle()
    }

    const req = context.switchToHttp().getRequest()
    const res = context.switchToHttp().getResponse()
    const start = Date.now()

    const path = req.originalUrl || req.url
    const method = req.method
    const user = req.user
    const ip = getClientIp(req)
    const userAgent = req.headers['user-agent'] || ''

    const { module, action } = logOptions

    // 脱敏处理参数
    let params = ''
    try {
      const body = { ...req.body }
      if (body.data) body.data = '[encrypted]'
      if (body.password) body.password = '***'
      if (body.oldPassword) body.oldPassword = '***'
      if (body.newPassword) body.newPassword = '***'
      params = JSON.stringify(body)
      if (params.length > 2000) params = params.slice(0, 2000) + '...[truncated]'
    } catch {
      params = ''
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start
          this.operationLogService.create({
            userId: user?.userId || null,
            username: user?.username || '',
            module,
            action,
            method,
            path,
            params,
            ip,
            userAgent,
            duration,
            status: res.statusCode >= 400 ? 'fail' : 'success',
            message: '',
          }).catch((logErr) => {
            this.logger.warn(`操作日志写入失败: ${logErr.message}`)
          })
        },
        error: (err) => {
          const duration = Date.now() - start
          this.operationLogService.create({
            userId: user?.userId || null,
            username: user?.username || '',
            module,
            action,
            method,
            path,
            params,
            ip,
            userAgent,
            duration,
            status: 'fail',
            message: err.message || String(err),
          }).catch((logErr) => {
            this.logger.warn(`操作日志写入失败: ${logErr.message}`)
          })
        },
      }),
    )
  }
}
