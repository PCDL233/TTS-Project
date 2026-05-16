import { ExtractJwt, Strategy } from 'passport-jwt'
import { PassportStrategy } from '@nestjs/passport'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { UserService } from '../user/user.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    })
  }

  async validate(payload: { sub: number; username: string }) {
    const user = await this.userService.findById(payload.sub)
    if (!user) {
      throw new UnauthorizedException('用户不存在')
    }
    return {
      userId: user.id,
      username: user.username,
      roleCode: user.role?.code || 'user',
    }
  }
}
