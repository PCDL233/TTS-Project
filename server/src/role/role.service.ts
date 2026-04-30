import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Role } from './role.entity'

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async seed() {
    const presets = [
      { name: '管理员', code: 'admin', description: '系统管理员，拥有所有权限' },
      { name: '普通用户', code: 'user', description: '普通用户，仅拥有基础权限' },
    ]

    for (const preset of presets) {
      const exists = await this.roleRepository.findOne({ where: { code: preset.code } })
      if (!exists) {
        const role = this.roleRepository.create(preset)
        await this.roleRepository.save(role)
      }
    }
  }

  async findAll(): Promise<Role[]> {
    return this.roleRepository.find({ order: { id: 'ASC' } })
  }

  async findByCode(code: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { code } })
  }

  async findById(id: number): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { id } })
  }

  async create(data: Partial<Role>): Promise<Role> {
    const role = this.roleRepository.create(data)
    return this.roleRepository.save(role)
  }

  async update(id: number, data: Partial<Role>): Promise<Role | null> {
    await this.roleRepository.update(id, data)
    return this.roleRepository.findOne({ where: { id } })
  }

  async delete(id: number): Promise<void> {
    await this.roleRepository.delete(id)
  }
}
