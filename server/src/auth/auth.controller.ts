import { Controller, Post, Body, Get, UseGuards, Req, Logger, Put } from '@nestjs/common'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import type { Request } from 'express'
import { UserService } from '../user/user.service'
import * as bcrypt from 'bcryptjs'
import { CryptoService } from '../common/crypto.service'
import { LoginLogService } from '../log/login-log.service'
import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import { getClientIp } from '../common/utils/ip.util'

interface RequestWithUser extends Request {
  user: { userId: number; username: string; roleCode: string }
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name)

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly cryptoService: CryptoService,
    private readonly loginLogService: LoginLogService,
  ) {}

  @Post('register')
  async register(@Body('data') data: string, @Req() req: Request) {
    this.logger.log('[register] 收到注册请求')
    const result = await this.authService.register(data)
    this.logger.log(`[register] 用户 ${result.user.username} 注册成功`)
    await this.loginLogService.create({
      userId: result.user.id,
      username: result.user.username,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
      status: 'success',
      message: '注册成功',
    })
    return result
  }

  @Post('login')
  async login(@Body('data') data: string, @Req() req: Request) {
    this.logger.log('[login] 收到登录请求')
    let result
    try {
      result = await this.authService.login(data, req)
      this.logger.log(`[login] 用户 ${result.user.username} 登录成功`)
      await this.loginLogService.create({
        userId: result.user.id,
        username: result.user.username,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'] || '',
        status: 'success',
        message: '登录成功',
      })
      return result
    } catch (error) {
      let username = ''
      try {
        const decrypted = this.cryptoService.aesDecrypt(data)
        const payload = JSON.parse(decrypted)
        username = payload.username || ''
      } catch {}
      await this.loginLogService.create({
        username,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'] || '',
        status: 'fail',
        message: error.message || '登录失败',
      })
      throw error
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: RequestWithUser) {
    const user = await this.userService.findById(req.user.userId)
    if (!user) {
      throw new UnauthorizedException('用户不存在')
    }
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      email: user.email,
      phone: user.phone,
      role: user.role
        ? { id: user.role.id, name: user.role.name, code: user.role.code }
        : null,
    }
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Req() req: RequestWithUser,
    @Body('data') data: string,
  ) {
    let payload: { nickname?: string; email?: string; phone?: string; avatar?: string }
    try {
      const decrypted = this.cryptoService.aesDecrypt(data)
      payload = JSON.parse(decrypted)
    } catch {
      throw new BadRequestException('请求数据解密失败')
    }

    const updateData: Partial<{ nickname: string; email: string; phone: string; avatar: string }> = {}
    if (payload.nickname !== undefined) updateData.nickname = payload.nickname
    if (payload.email !== undefined) updateData.email = payload.email
    if (payload.phone !== undefined) updateData.phone = payload.phone
    if (payload.avatar !== undefined) updateData.avatar = payload.avatar

    const updated = await this.userService.updateProfile(req.user.userId, updateData)

    if (!updated) {
      throw new BadRequestException('用户不存在')
    }

    return {
      id: updated.id,
      username: updated.username,
      nickname: updated.nickname,
      avatar: updated.avatar,
      email: updated.email,
      phone: updated.phone,
      role: updated.role
        ? { id: updated.role.id, name: updated.role.name, code: updated.role.code }
        : null,
    }
  }

  @Put('password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() req: RequestWithUser,
    @Body('data') data: string,
  ) {
    let payload: { oldPassword: string; newPassword: string }
    try {
      const decrypted = this.cryptoService.aesDecrypt(data)
      payload = JSON.parse(decrypted)
    } catch {
      throw new BadRequestException('请求数据解密失败')
    }

    const user = await this.userService.findById(req.user.userId)
    if (!user) {
      throw new UnauthorizedException('用户不存在')
    }

    const isMatch = await bcrypt.compare(payload.oldPassword, user.passwordHash)
    if (!isMatch) {
      throw new BadRequestException('原密码错误')
    }

    if (!payload.newPassword || payload.newPassword.length < 6 || payload.newPassword.length > 50) {
      throw new BadRequestException('新密码长度应为6-50个字符')
    }

    const newHash = await bcrypt.hash(payload.newPassword, 10)
    await this.userService.updatePassword(req.user.userId, newHash)

    return { success: true }
  }
}
