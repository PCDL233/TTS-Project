import { Controller, Get, Post, Body, Delete, Param, Logger, UseGuards, Req } from '@nestjs/common';
import { HistoryService } from './history.service';
import { History } from './history.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: { userId: number; username: string };
}

@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  private readonly logger = new Logger(HistoryController.name);

  constructor(private readonly historyService: HistoryService) {}

  @Get()
  async findAll(@Req() req: RequestWithUser): Promise<History[]> {
    this.logger.log(`[findAll] 用户 ${req.user.userId} 查询历史记录`);
    const result = await this.historyService.findAll(req.user.userId);
    this.logger.log(`[findAll] 返回 ${result.length} 条记录`);
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
