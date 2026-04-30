import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { RoleService } from './role.service'
import { Role } from './role.entity'

@Controller('admin/roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  async findAll(): Promise<Role[]> {
    return this.roleService.findAll()
  }

  @Post()
  async create(@Body() data: Partial<Role>): Promise<Role> {
    return this.roleService.create(data)
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: Partial<Role>): Promise<Role | null> {
    return this.roleService.update(Number(id), data)
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.roleService.delete(Number(id))
  }
}
