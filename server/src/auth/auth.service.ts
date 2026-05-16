import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { UserService } from '../user/user.service'
import { CryptoService } from '../common/crypto.service'
import { SystemConfigService } from '../system-config/system-config.service'
import { ConfigService } from '../config/config.service'
import { Request } from 'express'

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private cryptoService: CryptoService,
    private systemConfigService: SystemConfigService,
    private configService: ConfigService,
  ) {}

  async register(encryptedPayload: string) {
    const allowRegister = await this.systemConfigService.findByKey('allow_register')
    if (allowRegister && allowRegister.value === 'false') {
      throw new ForbiddenException('注册功能已关闭')
    }
    let payload: { username: string; password: string }
    try {
      const decrypted = this.cryptoService.aesDecrypt(encryptedPayload)
      payload = JSON.parse(decrypted)
    } catch {
      throw new BadRequestException('请求数据解密失败')
    }

    const { username, password } = payload
    if (!username || !password) {
      throw new BadRequestException('用户名和密码不能为空')
    }
    if (username.length < 3 || username.length > 20) {
      throw new BadRequestException('用户名长度应为3-20个字符')
    }
    if (password.length < 6 || password.length > 50) {
      throw new BadRequestException('密码长度应为6-50个字符')
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await this.userService.create(username, passwordHash)

    // 创建用户配置，使用系统默认值
    const [defaultBaseUrl, defaultModel, defaultAudioFormat, defaultStyleMode] = await Promise.all([
      this.systemConfigService.findByKey('default_base_url'),
      this.systemConfigService.findByKey('default_model'),
      this.systemConfigService.findByKey('default_audio_format'),
      this.systemConfigService.findByKey('default_style_mode'),
    ])

    const baseUrlPresetMap: Record<string, string> = {
      'https://api.xiaomimimo.com/v1': 'default',
      'https://token-plan-cn.xiaomimimo.com/v1': 'token-plan-cn',
      'https://token-plan-sgp.xiaomimimo.com/v1': 'token-plan-sgp',
      'https://token-plan-ams.xiaomimimo.com/v1': 'token-plan-ams',
    }
    const baseUrlValue = defaultBaseUrl?.value || 'https://api.xiaomimimo.com/v1'

    await this.configService.createConfig(user.id, {
      baseUrlPreset: baseUrlPresetMap[baseUrlValue] || 'default',
      model: defaultModel?.value || 'mimo-v2.5-pro',
      audioFormat: defaultAudioFormat?.value || 'wav',
      styleMode: defaultStyleMode?.value || 'natural',
    })

    const token = this.jwtService.sign({ sub: user.id, username: user.username })
    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role
          ? { id: user.role.id, name: user.role.name, code: user.role.code }
          : null,
      },
    }
  }

  async login(encryptedPayload: string, _req: Request) {
    let payload: { username: string; password: string }
    try {
      const decrypted = this.cryptoService.aesDecrypt(encryptedPayload)
      payload = JSON.parse(decrypted)
    } catch {
      throw new BadRequestException('请求数据解密失败')
    }

    const { username, password } = payload
    if (!username || !password) {
      throw new BadRequestException('用户名和密码不能为空')
    }

    const user = await this.userService.findByUsername(username)
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误')
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      throw new UnauthorizedException('用户名或密码错误')
    }

    const token = this.jwtService.sign({ sub: user.id, username: user.username })
    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role
          ? { id: user.role.id, name: user.role.name, code: user.role.code }
          : null,
      },
    }
  }
}
