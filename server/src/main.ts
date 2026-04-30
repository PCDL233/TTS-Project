import { NestFactory, Reflector } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { ValidationPipe, Logger } from '@nestjs/common'
import type { Request, Response, NextFunction } from 'express'
import { join } from 'path'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import { OperationLogService } from './log/operation-log.service'
import { RoleService } from './role/role.service'

async function bootstrap() {
  const logger = new Logger('HTTP')
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  })

  app.useBodyParser('json', { limit: '50mb' })
  app.useBodyParser('urlencoded', { limit: '50mb', extended: true })

  app.enableCors({
    origin: true,
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )

  // 静态资源
  app.useStaticAssets(join(__dirname, '..', 'public'))

  // 全局请求日志中间件
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now()
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    res.on('finish', () => {
      const duration = Date.now() - start
      const message = `[${ip}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
      if (res.statusCode >= 500) {
        logger.error(message)
      } else if (res.statusCode >= 400) {
        logger.warn(message)
      } else {
        logger.log(message)
      }
    })
    next()
  })

  app.setGlobalPrefix('api')

  // 注册全局拦截器
  const operationLogService = app.get(OperationLogService)
  app.useGlobalInterceptors(new LoggingInterceptor(operationLogService))

  // 角色种子数据
  const roleService = app.get(RoleService)
  await roleService.seed()

  const port = process.env.PORT ?? 3001
  await app.listen(port)
  logger.log(`Server running on http://localhost:${port}`)
}
bootstrap()
