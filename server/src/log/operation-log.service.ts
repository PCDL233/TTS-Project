import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { OperationLog } from './operation-log.entity'
import { escapeLike } from '../common/utils/escape-like.util'

@Injectable()
export class OperationLogService {
  constructor(
    @InjectRepository(OperationLog)
    private operationLogRepository: Repository<OperationLog>,
  ) {}

  async create(data: Partial<OperationLog>): Promise<OperationLog> {
    const log = this.operationLogRepository.create(data)
    return this.operationLogRepository.save(log)
  }

  async findAll(
    page = 1,
    pageSize = 20,
    username?: string,
    module?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<[OperationLog[], number]> {
    const query = this.operationLogRepository.createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    if (username) {
      query.andWhere('log.username LIKE :username ESCAPE \'\\\'', { username: `%${escapeLike(username)}%` })
    }
    if (module) {
      query.andWhere('log.module = :module', { module })
    }
    if (status) {
      query.andWhere('log.status = :status', { status })
    }
    if (startDate) {
      query.andWhere('log.createdAt >= :startDate', { startDate: new Date(startDate) })
    }
    if (endDate) {
      query.andWhere('log.createdAt <= :endDate', { endDate: new Date(endDate) })
    }

    return query.getManyAndCount()
  }
}
