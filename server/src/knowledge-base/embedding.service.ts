import { Injectable, Logger } from '@nestjs/common';
import { pipeline, FeatureExtractionPipeline, env } from '@huggingface/transformers';

const EMBEDDING_MODEL_CONFIG: Record<string, number> = {
  'Xenova/all-MiniLM-L6-v2': 384,
  'Xenova/all-mpnet-base-v2': 768,
  'Xenova/bge-small-en-v1.5': 384,
  'Xenova/gte-small': 384,
  'Xenova/multilingual-e5-small': 384,
};

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly pipelines = new Map<string, FeatureExtractionPipeline>();
  private readonly loadingPromises = new Map<string, Promise<void>>();
  private initialized = false;

  constructor() {
    this.initConfig();
  }

  private initConfig() {
    if (this.initialized) return;
    env.cacheDir = process.env.TRANSFORMERS_CACHE || './models/transformers';
    if (process.env.HF_ENDPOINT) {
      let endpoint = process.env.HF_ENDPOINT.trim();
      if (!endpoint.endsWith('/')) endpoint += '/';
      env.remoteHost = endpoint;
    }
    this.initialized = true;
    this.logger.log(`EmbeddingService 配置完成，缓存目录: ${env.cacheDir}`);
  }

  static getSupportedModels(): Array<{ name: string; dimension: number }> {
    return Object.entries(EMBEDDING_MODEL_CONFIG).map(([name, dimension]) => ({ name, dimension }));
  }

  static getModelDimension(modelName: string): number {
    const dim = EMBEDDING_MODEL_CONFIG[modelName];
    if (!dim) throw new Error(`不支持的嵌入模型: ${modelName}`);
    return dim;
  }

  private async loadModel(modelName: string): Promise<FeatureExtractionPipeline> {
    const existing = this.pipelines.get(modelName);
    if (existing) return existing;

    const loadingPromise = this.loadingPromises.get(modelName);
    if (loadingPromise) {
      await loadingPromise;
      return this.pipelines.get(modelName)!;
    }

    const promise = this.loadModelWithRetry(modelName);
    this.loadingPromises.set(modelName, promise);

    try {
      await promise;
    } catch (err) {
      this.loadingPromises.delete(modelName);
      throw err;
    }

    return this.pipelines.get(modelName)!;
  }

  private async loadModelWithRetry(modelName: string, maxRetries = 3): Promise<void> {
    let lastError: Error | undefined;
    const fallbackHosts: { host: string; retries: number }[] = process.env.HF_ENDPOINT
      ? [{ host: env.remoteHost, retries: maxRetries }]
      : [
          { host: env.remoteHost, retries: 1 },
          { host: 'https://hf-mirror.com/', retries: maxRetries },
        ];

    for (const { host, retries } of fallbackHosts) {
      env.remoteHost = host;
      this.logger.log(`加载模型 ${modelName}，源: ${host}`);

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          this.logger.log(`模型 ${modelName} 加载尝试 ${attempt}/${retries}...`);
          const pipeline_ = await pipeline('feature-extraction', modelName);
          this.pipelines.set(modelName, pipeline_);
          this.logger.log(`模型 ${modelName} 加载完成`);
          return;
        } catch (err) {
          lastError = err as Error;
          const cause = (err as any).cause;
          const detail = cause ? ` (cause: ${cause.message || cause})` : '';
          this.logger.error(
            `模型 ${modelName} 加载尝试 ${attempt}/${retries} 失败: ${lastError.message}${detail}`,
          );
          if (attempt < retries) {
            const delay = attempt * 2000;
            this.logger.log(`${delay}ms 后重试...`);
            await new Promise((r) => setTimeout(r, delay));
          }
        }
      }
    }
    throw lastError || new Error(`加载模型 ${modelName} 失败`);
  }

  private async ensureModelLoaded(modelName: string): Promise<FeatureExtractionPipeline> {
    const pipeline_ = this.pipelines.get(modelName);
    if (pipeline_) return pipeline_;
    return this.loadModel(modelName);
  }

  async embed(text: string, modelName = 'Xenova/all-MiniLM-L6-v2'): Promise<Float32Array> {
    const pipeline_ = await this.ensureModelLoaded(modelName);
    const output = await pipeline_(text, { pooling: 'mean', normalize: true });
    return new Float32Array(output.data as number[]);
  }

  async embedBatch(texts: string[], modelName = 'Xenova/all-MiniLM-L6-v2', batchSize = 8): Promise<Float32Array[]> {
    const pipeline_ = await this.ensureModelLoaded(modelName);
    const results: Float32Array[] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (text) => {
          const output = await pipeline_(text, { pooling: 'mean', normalize: true });
          return new Float32Array(output.data as number[]);
        }),
      );
      results.push(...batchResults);
    }
    return results;
  }
}
