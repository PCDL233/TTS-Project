import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

@Injectable()
export class TtsService {
  constructor(private readonly configService: ConfigService) {}

  async generate(dto: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    audio: { format: string; voice?: string };
  }): Promise<string> {
    const config = await this.configService.getConfig();
    const baseUrl = this.getEffectiveBaseUrl(config);

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
      throw new BadRequestException(`TTS API error: ${response.status} - ${text}`);
    }

    const data = await response.json();
    const audioData = data.choices?.[0]?.message?.audio?.data;
    if (!audioData) {
      throw new BadRequestException('Response does not contain audio data');
    }
    return audioData;
  }

  async *generateStream(dto: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    audio: { format: string; voice?: string };
  }): AsyncGenerator<string, void, unknown> {
    const config = await this.configService.getConfig();
    const baseUrl = this.getEffectiveBaseUrl(config);

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
      throw new BadRequestException(`TTS API error: ${response.status} - ${text}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new BadRequestException('Unable to read response stream');
    }

    const decoder = new TextDecoder();
    let buffer = '';

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
            }
          } catch {
            // ignore parse errors
          }
        }
      }
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
    return presets[config.baseUrlPreset] || 'https://api.xiaomimimo.com/v1';
  }
}
