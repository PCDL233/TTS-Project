import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AudioTag } from './audio-tag.entity'

@Injectable()
export class AudioTagService {
  constructor(
    @InjectRepository(AudioTag)
    private audioTagRepository: Repository<AudioTag>,
  ) {}

  async seed() {
    const presets = [
      { name: '开心', code: 'happy', description: '开心愉悦的语气', sort: 1 },
      { name: '难过', code: 'sad', description: '悲伤难过的语气', sort: 2 },
      { name: '生气', code: 'angry', description: '愤怒生气的语气', sort: 3 },
      { name: '惊讶', code: 'surprised', description: '惊讶意外的语气', sort: 4 },
      { name: '温柔', code: 'gentle', description: '温柔平和的语气', sort: 5 },
      { name: '东北话', code: 'dongbei', description: '东北方言', sort: 6 },
      { name: '唱歌', code: 'sing', description: '唱歌模式', sort: 7 },
    ]

    for (const preset of presets) {
      const exists = await this.audioTagRepository.findOne({ where: { code: preset.code } })
      if (!exists) {
        const tag = this.audioTagRepository.create(preset)
        await this.audioTagRepository.save(tag)
      }
    }
  }

  async findAll(): Promise<AudioTag[]> {
    return this.audioTagRepository.find({ order: { sort: 'ASC' } })
  }

  async create(data: Partial<AudioTag>): Promise<AudioTag> {
    const tag = this.audioTagRepository.create(data)
    return this.audioTagRepository.save(tag)
  }

  async update(id: number, data: Partial<AudioTag>): Promise<AudioTag | null> {
    await this.audioTagRepository.update(id, data)
    return this.audioTagRepository.findOne({ where: { id } })
  }

  async delete(id: number): Promise<void> {
    await this.audioTagRepository.delete(id)
  }
}
