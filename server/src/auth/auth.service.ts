import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserService } from '../user/user.service';
import { CryptoService } from '../common/crypto.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private cryptoService: CryptoService,
  ) {}

  async register(encryptedPayload: string) {
    let payload: { username: string; password: string };
    try {
      const decrypted = this.cryptoService.aesDecrypt(encryptedPayload);
      payload = JSON.parse(decrypted);
    } catch {
      throw new BadRequestException('请求数据解密失败');
    }

    const { username, password } = payload;
    if (!username || !password) {
      throw new BadRequestException('用户名和密码不能为空');
    }
    if (username.length < 3 || username.length > 20) {
      throw new BadRequestException('用户名长度应为3-20个字符');
    }
    if (password.length < 6 || password.length > 50) {
      throw new BadRequestException('密码长度应为6-50个字符');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userService.create(username, passwordHash);

    const token = this.jwtService.sign({ sub: user.id, username: user.username });
    return { token, user: { id: user.id, username: user.username } };
  }

  async login(encryptedPayload: string) {
    let payload: { username: string; password: string };
    try {
      const decrypted = this.cryptoService.aesDecrypt(encryptedPayload);
      payload = JSON.parse(decrypted);
    } catch {
      throw new BadRequestException('请求数据解密失败');
    }

    const { username, password } = payload;
    if (!username || !password) {
      throw new BadRequestException('用户名和密码不能为空');
    }

    const user = await this.userService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const token = this.jwtService.sign({ sub: user.id, username: user.username });
    return { token, user: { id: user.id, username: user.username } };
  }
}
