import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { OperationLogService } from '../../log/operation-log.service'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly operationLogService: OperationLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest()
    const res = context.switchToHttp().getResponse()
    const start = Date.now()

    const path = req.originalUrl || req.url
    const method = req.method
    const user = req.user
    const ip = req.ip || req.socket?.remoteAddress || ''
    const userAgent = req.headers['user-agent'] || ''

    // 推断模块名
    const controllerName = context.getClass().name
    let module = 'unknown'
    if (controllerName.includes('Auth')) module = 'auth'
    else if (controllerName.includes('User')) module = 'user'
    else if (controllerName.includes('Config')) module = 'config'
    else if (controllerName.includes('History')) module = 'history'
    else if (controllerName.includes('Tts')) module = 'tts'
    else if (controllerName.includes('Admin')) module = 'admin'
    else if (controllerName.includes('Role')) module = 'role'
    else if (controllerName.includes('SystemConfig')) module = 'system-config'
    else if (controllerName.includes('AudioTag')) module = 'audio-tag'

    // 推断动作
    const handlerName = context.getHandler().name
    let action = 'unknown'
    if (handlerName.startsWith('create') || handlerName.startsWith('add')) action = 'create'
    else if (handlerName.startsWith('update') || handlerName.startsWith('edit')) action = 'update'
    else if (handlerName.startsWith('delete') || handlerName.startsWith('remove')) action = 'delete'
    else if (handlerName.startsWith('find') || handlerName.startsWith('get') || handlerName.startsWith('list')) action = 'query'
    else if (handlerName.startsWith('login')) action = 'login'
    else if (handlerName.startsWith('register')) action = 'register'
    else action = handlerName

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

    // 跳过不需要记录的操作
    const skipPaths = ['/api/auth/login', '/api/auth/register']
    const shouldSkip = skipPaths.some((p) => path.startsWith(p))

    return next.handle().pipe(
      tap({
        next: () => {
          if (shouldSkip) return
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
          }).catch(() => {})
        },
        error: (err) => {
          if (shouldSkip) return
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
          }).catch(() => {})
        },
      }),
    )
  }
}
