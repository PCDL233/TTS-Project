import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SystemConfig } from './system-config.entity'
import { ConfigService } from '../config/config.service'

@Injectable()
export class SystemConfigService {
  constructor(
    @InjectRepository(SystemConfig)
    private systemConfigRepository: Repository<SystemConfig>,
    private readonly configService: ConfigService,
  ) {}

  async seed() {
    const presets = [
      { key: 'system_name', value: 'MiMo TTS 语音合成平台', description: '系统名称' },
      { key: 'default_base_url', value: 'https://api.xiaomimimo.com/v1', description: '默认 Base URL' },
      { key: 'allow_register', value: 'true', description: '是否允许用户注册' },
      { key: 'default_model', value: 'mimo-v2.5-pro', description: '默认AI模型' },
      { key: 'default_audio_format', value: 'wav', description: '默认音频格式' },
      { key: 'default_style_mode', value: 'natural', description: '默认风格控制方式' },
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

    // 同步到用户配置
    if (key === 'default_base_url') {
      await this.syncBaseUrlToUsers(value)
    }

    return this.findByKey(key)
  }

  private async syncBaseUrlToUsers(baseUrl: string) {
    const presetMap: Record<string, string> = {
      'https://api.xiaomimimo.com/v1': 'default',
      'https://token-plan-cn.xiaomimimo.com/v1': 'token-plan-cn',
      'https://token-plan-sgp.xiaomimimo.com/v1': 'token-plan-sgp',
      'https://token-plan-ams.xiaomimimo.com/v1': 'token-plan-ams',
    }
    const preset = presetMap[baseUrl] || 'default'
    await this.configService.updateAllUsersBaseUrlPreset(preset)
  }
}
