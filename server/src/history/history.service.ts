import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { History } from './history.entity';

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  constructor(
    @InjectRepository(History)
    private historyRepository: Repository<History>,
  ) {}

  async findAll(): Promise<History[]> {
    this.logger.debug('[findAll] 查询数据库');
    return this.historyRepository.find({
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async create(data: Omit<History, 'id' | 'createdAt'>): Promise<History> {
    const item = this.historyRepository.create({
      ...data,
      createdAt: Date.now(),
    });
    const saved = await this.historyRepository.save(item);
    this.logger.log(`[create] 已保存记录 ID=${saved.id}`);
    return saved;
  }

  async remove(id: number): Promise<void> {
    const result = await this.historyRepository.delete(id);
    this.logger.log(`[remove] 删除 ID=${id}, affected=${result.affected ?? 0}`);
  }

  async clear(): Promise<void> {
    await this.historyRepository.clear();
    this.logger.warn('[clear] 数据库已清空');
  }
}
