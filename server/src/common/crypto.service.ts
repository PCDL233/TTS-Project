import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

@Injectable()
export class CryptoService {
  private readonly secret: string;

  constructor(private configService: ConfigService) {
    this.secret = this.configService.getOrThrow<string>('AES_SECRET_KEY');
  }

  private getKey(): Buffer {
    return createHash('sha256').update(this.secret).digest();
  }

  aesEncrypt(data: string): string {
    const key = this.getKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    return iv.toString('base64') + ':' + encrypted.toString('base64');
  }

  aesDecrypt(encrypted: string): string {
    const key = this.getKey();
    const parts = encrypted.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted format');
    }
    const iv = Buffer.from(parts[0], 'base64');
    const ciphertext = Buffer.from(parts[1], 'base64');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
