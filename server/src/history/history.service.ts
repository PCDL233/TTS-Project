import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { History } from './history.entity';

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(History)
    private historyRepository: Repository<History>,
  ) {}

  async findAll(): Promise<History[]> {
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
    return this.historyRepository.save(item);
  }

  async remove(id: number): Promise<void> {
    await this.historyRepository.delete(id);
  }

  async clear(): Promise<void> {
    await this.historyRepository.clear();
  }
}
