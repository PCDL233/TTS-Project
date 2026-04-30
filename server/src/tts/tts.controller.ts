import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { TtsService } from './tts.service';
import { GenerateTtsDto } from './dto/generate-tts.dto';

@Controller('tts')
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  @Post('generate')
  async generate(@Body() dto: GenerateTtsDto): Promise<{ data: string }> {
    const data = await this.ttsService.generate(dto);
    return { data };
  }

  @Post('generate-stream')
  async generateStream(@Body() dto: GenerateTtsDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.status(HttpStatus.OK);

    try {
      for await (const chunk of this.ttsService.generateStream(dto)) {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`);
    } finally {
      res.end();
    }
  }
}
