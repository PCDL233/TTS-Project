import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { pipeline, FeatureExtractionPipeline, env } from '@xenova/transformers';

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);
  private embedder: FeatureExtractionPipeline | null = null;
  private readonly modelName = 'Xenova/all-MiniLM-L6-v2';
  private loadingPromise: Promise<void> | null = null;

  async onModuleInit() {
    // 配置 transformers.js 使用项目内的缓存目录和可选的镜像
    env.cacheDir = process.env.TRANSFORMERS_CACHE || './models/transformers';
    if (process.env.HF_ENDPOINT) {
      // 确保 remoteHost 以 / 结尾，否则 URL 拼接会出错
      let endpoint = process.env.HF_ENDPOINT.trim();
      if (!endpoint.endsWith('/')) {
        endpoint += '/';
      }
      env.remoteHost = endpoint;
    }

    this.logger.log(`正在加载 Embedding 模型: ${this.modelName}...`);
    this.logger.log(`模型缓存目录: ${env.cacheDir}`);
    this.logger.log(`模型下载地址: ${env.remoteHost || 'https://huggingface.co/ (默认)'}`);

    // 异步加载，不阻塞应用启动
    this.loadingPromise = this.loadModelWithRetry();
    this.loadingPromise.catch((err) => {
      this.logger.error(`Embedding 模型加载失败: ${(err as Error).message}`);
      this.logger.warn('知识库文档处理和 RAG 检索功能暂时不可用。');
      this.logger.warn('解决建议：');
      this.logger.warn('  1) 设置环境变量 HF_ENDPOINT=https://hf-mirror.com/ 后重启服务');
      this.logger.warn('  2) 将模型预下载到缓存目录后设置 allowRemoteModels=false');
      this.logger.warn('  3) 检查系统代理设置（HTTP_PROXY / HTTPS_PROXY）');
    });
  }

  private async loadModelWithRetry(maxRetries = 3): Promise<void> {
    let lastError: Error | undefined;
    // 如果没有配置 HF_ENDPOINT，失败时自动回退到国内镜像
    // 默认源只重试 1 次，失败后立即切换到镜像
    const fallbackHosts: { host: string; retries: number }[] = process.env.HF_ENDPOINT
      ? [{ host: env.remoteHost, retries: maxRetries }]
      : [
          { host: env.remoteHost, retries: 1 },
          { host: 'https://hf-mirror.com/', retries: maxRetries },
        ];

    for (const { host, retries } of fallbackHosts) {
      env.remoteHost = host;
      this.logger.log(`当前使用模型源: ${host}`);

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          this.logger.log(`模型加载尝试 ${attempt}/${retries} (源: ${host})...`);
          this.embedder = await pipeline('feature-extraction', this.modelName, {
            quantized: false,
          });
          this.logger.log('Embedding 模型加载完成');
          return;
        } catch (err) {
          lastError = err as Error;
          // 打印更详细的错误信息（包括 fetch 的 cause）
          const cause = (err as any).cause;
          const detail = cause ? ` (cause: ${cause.message || cause})` : '';
          this.logger.error(
            `模型加载尝试 ${attempt}/${retries} 失败: ${lastError.message}${detail}`,
          );
          if (attempt < retries) {
            const delay = attempt * 2000;
            this.logger.log(`${delay}ms 后进行下一次重试...`);
            await new Promise((r) => setTimeout(r, delay));
          }
        }
      }
    }
    throw lastError;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.embedder) return;
    if (this.loadingPromise) {
      await this.loadingPromise;
    }
    if (!this.embedder) {
      throw new Error(
        'Embedding 模型未加载。可能原因：1) 网络问题导致模型下载失败；' +
        '2) 模型缓存目录不可写。建议设置 HF_ENDPOINT=https://hf-mirror.com 或预下载模型到缓存目录。',
      );
    }
  }

  async embed(text: string): Promise<Float32Array> {
    await this.ensureLoaded();
    const output = await this.embedder!(text, { pooling: 'mean', normalize: true });
    return new Float32Array(output.data as number[]);
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    await this.ensureLoaded();
    const results: Float32Array[] = [];
    for (const text of texts) {
      const output = await this.embedder!(text, { pooling: 'mean', normalize: true });
      results.push(new Float32Array(output.data as number[]));
    }
    return results;
  }
}
