import { NestFactory, Reflector } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { ValidationPipe, Logger } from '@nestjs/common'
import type { Request, Response, NextFunction } from 'express'
import { join } from 'path'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import { OperationLogService } from './log/operation-log.service'
import { RoleService } from './role/role.service'
import { getClientIp } from './common/utils/ip.util'

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

  // 信任代理，使 req.ip 能正确获取真实客户端 IP
  app.set('trust proxy', true)

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
    const ip = getClientIp(req) || 'unknown'
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
  const reflector = app.get(Reflector)
  app.useGlobalInterceptors(new LoggingInterceptor(operationLogService, reflector))

  // 角色种子数据
  const roleService = app.get(RoleService)
  await roleService.seed()

  const port = process.env.PORT ?? 3001
  await app.listen(port)
  logger.log(`Server running on http://localhost:${port}`)
}
bootstrap()
