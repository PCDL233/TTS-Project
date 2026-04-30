import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { AudioTagService } from './audio-tag.service'
import { AudioTag } from './audio-tag.entity'

@Controller('audio-tags')
export class AudioTagController {
  constructor(private readonly audioTagService: AudioTagService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('name') name?: string,
    @Query('code') code?: string,
    @Query('group') group?: string,
  ): Promise<[AudioTag[], number]> {
    return this.audioTagService.findAll(
      Number(page) || 1,
      Number(pageSize) || 10,
      { name, code, group },
    )
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async create(@Body() data: Partial<AudioTag>): Promise<AudioTag> {
    return this.audioTagService.create(data)
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Body() data: Partial<AudioTag>): Promise<AudioTag | null> {
    return this.audioTagService.update(Number(id), data)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async delete(@Param('id') id: string): Promise<void> {
    return this.audioTagService.delete(Number(id))
  }
}
