import { Controller, Post, Body, Get, UseGuards, Req, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: { userId: number; username: string };
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body('data') data: string) {
    this.logger.log('[register] 收到注册请求');
    const result = await this.authService.register(data);
    this.logger.log(`[register] 用户 ${result.user.username} 注册成功`);
    return result;
  }

  @Post('login')
  async login(@Body('data') data: string) {
    this.logger.log('[login] 收到登录请求');
    const result = await this.authService.login(data);
    this.logger.log(`[login] 用户 ${result.user.username} 登录成功`);
    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: RequestWithUser) {
    return { id: req.user.userId, username: req.user.username };
  }
}
