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

  async findAll(userId: number): Promise<History[]> {
    this.logger.debug(`[findAll] 查询用户 ${userId} 的数据库记录`);
    return this.historyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async create(userId: number, data: Omit<History, 'id' | 'createdAt' | 'userId'>): Promise<History> {
    const item = this.historyRepository.create({
      ...data,
      userId,
      createdAt: Date.now(),
    });
    const saved = await this.historyRepository.save(item);
    this.logger.log(`[create] 用户 ${userId} 已保存记录 ID=${saved.id}`);
    return saved;
  }

  async remove(userId: number, id: number): Promise<void> {
    const result = await this.historyRepository.delete({ id, userId });
    this.logger.log(`[remove] 用户 ${userId} 删除 ID=${id}, affected=${result.affected ?? 0}`);
  }

  async clear(userId: number): Promise<void> {
    await this.historyRepository.delete({ userId });
    this.logger.warn(`[clear] 用户 ${userId} 的历史记录已清空`);
  }
}
