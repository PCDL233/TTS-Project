import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { TtsService } from './tts.service';
import { GenerateTtsDto } from './dto/generate-tts.dto';

@Controller('tts')
export class TtsController {
  private readonly logger = new Logger(TtsController.name);

  constructor(private readonly ttsService: TtsService) {}

  @Post('generate')
  async generate(@Body() dto: GenerateTtsDto): Promise<{ data: string }> {
    this.logger.log(`[generate] model=${dto.model} voice=${dto.audio?.voice ?? 'default'}`);
    const data = await this.ttsService.generate(dto);
    this.logger.log(`[generate] 成功返回音频数据`);
    return { data };
  }

  @Post('generate-stream')
  async generateStream(@Body() dto: GenerateTtsDto, @Res() res: Response) {
    this.logger.log(`[generate-stream] model=${dto.model} voice=${dto.audio?.voice ?? 'default'}`);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.status(HttpStatus.OK);

    try {
      let chunkCount = 0;
      for await (const chunk of this.ttsService.generateStream(dto)) {
        res.write(`data: ${JSON.stringify({ chunk }) }\n\n`);
        chunkCount++;
      }
      res.write('data: [DONE]\n\n');
      this.logger.log(`[generate-stream] 完成，共 ${chunkCount} 个音频块`);
    } catch (err) {
      this.logger.error(`[generate-stream] 错误: ${(err as Error).message}`);
      res.write(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`);
    } finally {
      res.end();
    }
  }
}
