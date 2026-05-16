import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SystemConfig } from './system-config.entity'

@Injectable()
export class SystemConfigService {
  constructor(
    @InjectRepository(SystemConfig)
    private systemConfigRepository: Repository<SystemConfig>,
  ) {}

  async seed() {
    const presets = [
      { key: 'system_name', value: 'MiMo TTS 语音合成平台', description: '系统名称' },
      { key: 'default_base_url', value: 'https://api.xiaomimimo.com/v1', description: '默认 Base URL' },
      { key: 'allow_register', value: 'true', description: '是否允许用户注册' },
    ]

    for (const preset of presets) {
      const exists = await this.systemConfigRepository.findOne({ where: { key: preset.key } })
      if (!exists) {
        const config = this.systemConfigRepository.create(preset)
        await this.systemConfigRepository.save(config)
      }
    }
  }

  async findAll(): Promise<SystemConfig[]> {
    return this.systemConfigRepository.find({ order: { id: 'ASC' } })
  }

  async findByKey(key: string): Promise<SystemConfig | null> {
    return this.systemConfigRepository.findOne({ where: { key } })
  }

  async update(key: string, value: string): Promise<SystemConfig | null> {
    const config = await this.findByKey(key)
    if (!config) {
      throw new NotFoundException('配置项不存在')
    }
    await this.systemConfigRepository.update(config.id, { value })
    return this.findByKey(key)
  }
}
