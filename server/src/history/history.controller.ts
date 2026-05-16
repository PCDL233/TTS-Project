import { Controller, Get, Post, Body, Delete, Param, Query, Logger, UseGuards, Req } from '@nestjs/common';
import { HistoryService } from './history.service';
import { History } from './history.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  private readonly logger = new Logger(HistoryController.name);

  constructor(private readonly historyService: HistoryService) {}

  @Get()
  async findAll(
    @Req() req: RequestWithUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(100, Math.max(1, Number(pageSize) || 50));
    this.logger.log(`[findAll] 用户 ${req.user.userId} 查询历史记录, page=${p}, pageSize=${ps}`);
    const result = await this.historyService.findAll(req.user.userId, p, ps);
    this.logger.log(`[findAll] 返回 ${result.items.length} 条记录，共 ${result.total} 条`);
    return result;
  }

  @Post()
  async create(@Req() req: RequestWithUser, @Body() body: Omit<History, 'id' | 'createdAt' | 'userId'>): Promise<History> {
    this.logger.log(`[create] 用户 ${req.user.userId} 保存新记录: ${body.text?.slice(0, 30) ?? 'untitled'}`);
    const result = await this.historyService.create(req.user.userId, body);
    this.logger.log(`[create] 记录已保存，ID=${result.id}`);
    return result;
  }

  @Delete(':id')
  async remove(@Req() req: RequestWithUser, @Param('id') id: string): Promise<void> {
    this.logger.log(`[remove] 用户 ${req.user.userId} 删除记录 ID=${id}`);
    await this.historyService.remove(req.user.userId, Number(id));
    this.logger.log(`[remove] 记录 ID=${id} 已删除`);
  }

  @Delete()
  async clear(@Req() req: RequestWithUser): Promise<void> {
    this.logger.warn(`[clear] 用户 ${req.user.userId} 清空历史记录`);
    await this.historyService.clear(req.user.userId);
    this.logger.warn('[clear] 历史记录已清空');
  }
}
