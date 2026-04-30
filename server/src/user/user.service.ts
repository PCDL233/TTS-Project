import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async create(username: string, passwordHash: string): Promise<User> {
    const existing = await this.findByUsername(username);
    if (existing) {
      throw new ConflictException('用户名已存在');
    }
    const user = this.userRepository.create({ username, passwordHash });
    return this.userRepository.save(user);
  }
}
