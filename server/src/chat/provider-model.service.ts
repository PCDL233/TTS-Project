import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

export interface ProviderModelOption {
  value: string;
  label: string;
  description: string;
  ownedBy?: string;
}

export interface ProviderModelsResponse {
  models: ProviderModelOption[];
  defaultModel: string;
  baseUrlPreset: string;
  baseUrl: string;
  fetchedAt: string;
}

@Injectable()
export class ProviderModelService {
  private readonly logger = new Logger(ProviderModelService.name);
  private readonly timeoutMs = 15_000;

  constructor(private readonly configService: ConfigService) {}

  async listModelsForUser(userId: number): Promise<ProviderModelsResponse> {
    const config = await this.configService.getConfig(userId);
    const baseUrl = this.configService.getEffectiveBaseUrl(config);
    const authType = this.configService.getEffectiveApiAuthType(config);
    const headers: Record<string, string> = { Accept: 'application/json' };

    // 模型列表通过当前厂商的官方 OpenAI-compatible /models 接口获取。
    // 如果厂商公开该接口，即使未配置 Key 也允许尝试；配置了 Key 时才补鉴权头。
    if (authType === 'none' || config.apiKey) {
      Object.assign(headers, this.configService.buildApiHeaders(config));
    }

    const url = `${baseUrl}/models`;
    let response: Response;
    try {
      response = await this.fetchWithTimeout(url, { method: 'GET', headers });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new BadRequestException('获取厂商模型列表超时，请检查 Base URL 或稍后重试');
      }
      const message = error instanceof Error ? error.message : '未知错误';
      this.logger.warn(`[listModelsForUser] 请求模型列表失败: ${message}`);
      throw new BadRequestException(`获取厂商模型列表失败：${message}`);
    }

    if (!response.ok) {
      const text = await this.safeReadText(response);
      const hint = response.status === 401 || response.status === 403
        ? '请检查 API Key 与鉴权方式是否匹配。'
        : '请确认所选厂商支持 /models 官方接口。';
      this.logger.warn(`[listModelsForUser] ${url} 返回 ${response.status}: ${text}`);
      throw new BadRequestException(`获取厂商模型列表失败（${response.status}）：${text || response.statusText} ${hint}`.trim());
    }

    const payload = await response.json();
    const models = this.normalizeModels(payload);
    if (models.length === 0) {
      throw new BadRequestException('厂商模型接口未返回可识别的模型列表');
    }

    return {
      models,
      defaultModel: models[0]?.value || '',
      baseUrlPreset: config.baseUrlPreset,
      baseUrl,
      fetchedAt: new Date().toISOString(),
    };
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private async safeReadText(response: Response): Promise<string> {
    try {
      return (await response.text()).slice(0, 500);
    } catch {
      return '';
    }
  }

  private normalizeModels(payload: unknown): ProviderModelOption[] {
    const rawModels = this.extractModelArray(payload);
    const seen = new Set<string>();
    const models: ProviderModelOption[] = [];

    for (const item of rawModels) {
      const model = this.normalizeModelItem(item);
      if (!model || seen.has(model.value)) continue;
      seen.add(model.value);
      models.push(model);
    }

    return models.sort((a, b) => a.value.localeCompare(b.value));
  }

  private extractModelArray(payload: unknown): unknown[] {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];

    const data = (payload as Record<string, unknown>).data;
    if (Array.isArray(data)) return data;

    const models = (payload as Record<string, unknown>).models;
    if (Array.isArray(models)) return models;

    return [];
  }

  private normalizeModelItem(item: unknown): ProviderModelOption | null {
    if (typeof item === 'string') {
      const value = item.trim();
      return value ? { value, label: value, description: '' } : null;
    }
    if (!item || typeof item !== 'object') return null;

    const record = item as Record<string, unknown>;
    const value = this.firstString(record, ['id', 'model', 'model_name', 'name']);
    if (!value) return null;

    const displayName = this.firstString(record, ['display_name', 'displayName', 'name', 'label']);
    const description = this.firstString(record, ['description', 'desc', 'summary']);
    const ownedBy = this.firstString(record, ['owned_by', 'ownedBy', 'owner', 'provider']);

    return {
      value,
      label: displayName && displayName !== value ? `${displayName} (${value})` : value,
      description,
      ownedBy: ownedBy || undefined,
    };
  }

  private firstString(record: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return '';
  }
}
