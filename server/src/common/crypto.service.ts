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
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return (
      iv.toString('base64') +
      ':' +
      authTag.toString('base64') +
      ':' +
      encrypted.toString('base64')
    );
  }

  aesDecrypt(encrypted: string): string {
    const parts = encrypted.split(':');
    if (parts.length === 3) {
      return this.decryptGcm(parts);
    }
    if (parts.length === 2) {
      return this.decryptCbc(parts);
    }
    throw new Error('Invalid encrypted format');
  }

  private decryptGcm(parts: string[]): string {
    const key = this.getKey();
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const ciphertext = Buffer.from(parts[2], 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  }

  private decryptCbc(parts: string[]): string {
    const key = this.getKey();
    const iv = Buffer.from(parts[0], 'base64');
    const ciphertext = Buffer.from(parts[1], 'base64');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
