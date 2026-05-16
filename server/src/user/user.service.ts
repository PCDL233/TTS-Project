import { Injectable, ConflictException, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './user.entity'
import { RoleService } from '../role/role.service'
import { escapeLike } from '../common/utils/escape-like.util'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private roleService: RoleService,
  ) {}

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username }, relations: ['role'] })
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id }, relations: ['role'] })
  }

  async findAll(page = 1, pageSize = 10, username?: string, roleId?: number): Promise<[User[], number]> {
    const query = this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .orderBy('user.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    if (username) {
      query.andWhere('user.username LIKE :username ESCAPE \'\\\'', { username: `%${escapeLike(username)}%` })
    }
    if (roleId) {
      query.andWhere('user.roleId = :roleId', { roleId })
    }

    return query.getManyAndCount()
  }

  async create(username: string, passwordHash: string): Promise<User> {
    const existing = await this.findByUsername(username)
    if (existing) {
      throw new ConflictException('用户名已存在')
    }

    const userCount = await this.userRepository.count()
    const roleCode = userCount === 0 ? 'admin' : 'user'
    const role = await this.roleService.findByCode(roleCode)

    const user = this.userRepository.create({
      username,
      passwordHash,
      roleId: role?.id ?? undefined,
    } as any)
    const saved = await this.userRepository.save(user)
    return Array.isArray(saved) ? saved[0] : saved
  }

  async updateProfile(userId: number, data: Partial<Pick<User, 'nickname' | 'email' | 'phone' | 'avatar'>>): Promise<User | null> {
    await this.userRepository.update(userId, data)
    return this.findById(userId)
  }

  async updateAvatar(userId: number, avatar: string): Promise<void> {
    await this.userRepository.update(userId, { avatar })
  }

  async updateRole(userId: number, roleId: number): Promise<void> {
    const user = await this.findById(userId)
    if (!user) throw new NotFoundException('用户不存在')
    const role = await this.roleService.findById(roleId)
    if (!role) throw new NotFoundException('角色不存在')
    await this.userRepository.update(userId, { roleId })
  }

  async updatePassword(userId: number, passwordHash: string): Promise<void> {
    await this.userRepository.update(userId, { passwordHash })
  }

  async delete(userId: number): Promise<void> {
    await this.userRepository.delete(userId)
  }
}
