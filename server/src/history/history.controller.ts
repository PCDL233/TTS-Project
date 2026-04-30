import { Controller, Get, Post, Body, Delete, Param } from '@nestjs/common';
import { HistoryService } from './history.service';
import { History } from './history.entity';

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  findAll(): Promise<History[]> {
    return this.historyService.findAll();
  }

  @Post()
  create(@Body() body: Omit<History, 'id' | 'createdAt'>): Promise<History> {
    return this.historyService.create(body);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.historyService.remove(Number(id));
  }

  @Delete()
  clear(): Promise<void> {
    return this.historyService.clear();
  }
}
