import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Config } from './config.entity';
import { ConfigService } from './config.service';
import { ConfigController } from './config.controller';
import { CryptoModule } from '../common/crypto.module';

@Module({
  imports: [TypeOrmModule.forFeature([Config]), CryptoModule],
  providers: [ConfigService],
  controllers: [ConfigController],
  exports: [ConfigService],
})
export class ConfigModule {}
