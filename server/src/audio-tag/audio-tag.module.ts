import { Module, OnModuleInit } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AudioTag } from './audio-tag.entity'
import { AudioTagService } from './audio-tag.service'
import { AudioTagController } from './audio-tag.controller'

@Module({
  imports: [TypeOrmModule.forFeature([AudioTag])],
  providers: [AudioTagService],
  controllers: [AudioTagController],
  exports: [AudioTagService],
})
export class AudioTagModule implements OnModuleInit {
  constructor(private readonly audioTagService: AudioTagService) {}

  async onModuleInit() {
    await this.audioTagService.seed()
  }
}
