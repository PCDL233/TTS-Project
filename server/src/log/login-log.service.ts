import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { LoginLog } from './login-log.entity'
import { escapeLike } from '../common/utils/escape-like.util'

@Injectable()
export class LoginLogService {
  constructor(
    @InjectRepository(LoginLog)
    private loginLogRepository: Repository<LoginLog>,
  ) {}

  async create(data: Partial<LoginLog>): Promise<LoginLog> {
    const log = this.loginLogRepository.create(data)
    return this.loginLogRepository.save(log)
  }

  async findAll(
    page = 1,
    pageSize = 20,
    username?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<[LoginLog[], number]> {
    const query = this.loginLogRepository.createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    if (username) {
      query.andWhere('log.username LIKE :username ESCAPE \'\\\'', { username: `%${escapeLike(username)}%` })
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

  async delete(id: number): Promise<void> {
    await this.loginLogRepository.delete(id)
  }

  async deleteMany(ids: number[]): Promise<void> {
    await this.loginLogRepository.delete(ids)
  }
}
