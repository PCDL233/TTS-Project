import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);

  constructor(private readonly configService: ConfigService) {}

  async generate(dto: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    audio: { format: string; voice?: string };
  }): Promise<string> {
    const config = await this.configService.getConfig();
    if (!config.apiKey) {
      this.logger.warn('[generate] API Key 未配置');
      throw new BadRequestException('API Key 未配置，请先在「API 设置」中填写有效的 API Key');
    }
    const baseUrl = this.getEffectiveBaseUrl(config);
    this.logger.log(`[generate] 请求 MiMo API: ${baseUrl}/chat/completions`);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey,
      },
      body: JSON.stringify({
        model: dto.model,
        messages: dto.messages,
        audio: dto.audio,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`[generate] MiMo API 返回 ${response.status}: ${text}`);
      throw new BadRequestException(`TTS API error: ${response.status} - ${text}`);
    }

    const data = await response.json();
    const audioData = data.choices?.[0]?.message?.audio?.data;
    if (!audioData) {
      this.logger.error('[generate] 响应中不包含音频数据');
      throw new BadRequestException('Response does not contain audio data');
    }
    this.logger.log(`[generate] 成功获取音频数据，长度 ${audioData.length}`);
    return audioData;
  }

  async *generateStream(dto: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    audio: { format: string; voice?: string };
  }): AsyncGenerator<string, void, unknown> {
    const config = await this.configService.getConfig();
    if (!config.apiKey) {
      this.logger.warn('[generateStream] API Key 未配置');
      throw new BadRequestException('API Key 未配置，请先在「API 设置」中填写有效的 API Key');
    }
    const baseUrl = this.getEffectiveBaseUrl(config);
    this.logger.log(`[generateStream] 请求 MiMo API (流式): ${baseUrl}/chat/completions`);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey,
      },
      body: JSON.stringify({
        model: dto.model,
        messages: dto.messages,
        audio: dto.audio,
        stream: true,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`[generateStream] MiMo API 返回 ${response.status}: ${text}`);
      throw new BadRequestException(`TTS API error: ${response.status} - ${text}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      this.logger.error('[generateStream] 无法读取响应流');
      throw new BadRequestException('Unable to read response stream');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') continue;

          try {
            const data = JSON.parse(dataStr);
            const audioData = data.choices?.[0]?.delta?.audio?.data;
            if (audioData) {
              yield audioData;
              chunkCount++;
            }
          } catch {
            // ignore parse errors
          }
        }
      }
      this.logger.log(`[generateStream] 流式完成，共 ${chunkCount} 个音频块`);
    } finally {
      reader.releaseLock();
    }
  }

  private getEffectiveBaseUrl(config: { baseUrlPreset: string; baseUrlCustom: string }): string {
    if (config.baseUrlPreset === 'custom') {
      return config.baseUrlCustom || 'https://api.xiaomimimo.com/v1';
    }
    const presets: Record<string, string> = {
      default: 'https://api.xiaomimimo.com/v1',
      'token-plan-cn': 'https://token-plan-cn.xiaomimimo.com/v1',
      'token-plan-sgp': 'https://token-plan-sgp.xiaomimimo.com/v1',
      'token-plan-ams': 'https://token-plan-ams.xiaomimimo.com/v1',
    };
    const url = presets[config.baseUrlPreset] || 'https://api.xiaomimimo.com/v1';
    return url;
  }
}
