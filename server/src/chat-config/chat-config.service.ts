import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatConfig } from './chat-config.entity';

@Injectable()
export class ChatConfigService {
  constructor(
    @InjectRepository(ChatConfig)
    private chatConfigRepository: Repository<ChatConfig>,
  ) {}

  async seed() {
    const presets = [
      {
        key: 'available_models',
        value: JSON.stringify([
          'mimo-v2.5-pro',
          'mimo-v2.5',
          'mimo-v2-pro',
        ]),
        description: '可用模型列表',
      },
      {
        key: 'default_model',
        value: 'mimo-v2.5-pro',
        description: '默认AI模型',
      },
      {
        key: 'feature_thinking',
        value: 'true',
        description: '思考模式开关',
      },
      {
        key: 'feature_web_search',
        value: 'true',
        description: '联网搜索开关',
      },
      {
        key: 'feature_function_call',
        value: 'true',
        description: '函数调用开关',
      },
      {
        key: 'feature_knowledge_base',
        value: 'true',
        description: '知识库开关',
      },

    ];

    for (const preset of presets) {
      const exists = await this.chatConfigRepository.findOne({
        where: { key: preset.key },
      });
      if (!exists) {
        const config = this.chatConfigRepository.create(preset);
        await this.chatConfigRepository.save(config);
      }
    }
  }

  async findByKey(key: string): Promise<ChatConfig | null> {
    return this.chatConfigRepository.findOne({ where: { key } });
  }

  async findByKeys(keys: string[]): Promise<Record<string, string>> {
    const configs = await this.chatConfigRepository.find({
      where: keys.map((key) => ({ key })),
    });
    const result: Record<string, string> = {};
    for (const config of configs) {
      result[config.key] = config.value;
    }
    return result;
  }

  async update(key: string, value: string): Promise<ChatConfig | null> {
    const config = await this.findByKey(key);
    if (!config) {
      throw new NotFoundException('配置项不存在');
    }
    await this.chatConfigRepository.update(config.id, { value });
    return this.findByKey(key);
  }

  async updateMultiple(data: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      const config = await this.findByKey(key);
      if (config) {
        await this.chatConfigRepository.update(config.id, { value });
      }
    }
  }

  async getModels(): Promise<{ models: string[]; defaultModel: string }> {
    const configs = await this.findByKeys([
      'available_models',
      'default_model',
    ]);
    return {
      models: JSON.parse(configs.available_models || '[]'),
      defaultModel: configs.default_model || 'mimo-v2.5-pro',
    };
  }

  async getFeatures(): Promise<Record<string, boolean>> {
    const configs = await this.findByKeys([
      'feature_thinking',
      'feature_web_search',
      'feature_function_call',
      'feature_knowledge_base',
    ]);
    return {
      thinking: configs.feature_thinking === 'true',
      webSearch: configs.feature_web_search === 'true',
      functionCall: configs.feature_function_call === 'true',
      knowledgeBase: configs.feature_knowledge_base === 'true',
    };
  }
}
