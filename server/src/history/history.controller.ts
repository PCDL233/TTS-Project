import { Controller, Get, Post, Body, Delete, Param, Logger } from '@nestjs/common';
import { HistoryService } from './history.service';
import { History } from './history.entity';

@Controller('history')
export class HistoryController {
  private readonly logger = new Logger(HistoryController.name);

  constructor(private readonly historyService: HistoryService) {}

  @Get()
  async findAll(): Promise<History[]> {
    this.logger.log('[findAll] 查询历史记录');
    const result = await this.historyService.findAll();
    this.logger.log(`[findAll] 返回 ${result.length} 条记录`);
    return result;
  }

  @Post()
  async create(@Body() body: Omit<History, 'id' | 'createdAt'>): Promise<History> {
    this.logger.log(`[create] 保存新记录: ${body.text?.slice(0, 30) ?? 'untitled'}`);
    const result = await this.historyService.create(body);
    this.logger.log(`[create] 记录已保存，ID=${result.id}`);
    return result;
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.log(`[remove] 删除记录 ID=${id}`);
    await this.historyService.remove(Number(id));
    this.logger.log(`[remove] 记录 ID=${id} 已删除`);
  }

  @Delete()
  async clear(): Promise<void> {
    this.logger.warn('[clear] 清空所有历史记录');
    await this.historyService.clear();
    this.logger.warn('[clear] 所有历史记录已清空');
  }
}
