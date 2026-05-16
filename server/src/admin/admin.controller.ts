import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { UserService } from '../user/user.service'
import { LoginLogService } from '../log/login-log.service'
import { OperationLogService } from '../log/operation-log.service'
import { History } from '../history/history.entity'
import { User } from '../user/user.entity'
import { LoginLog } from '../log/login-log.entity'
import { ChatConversation } from '../chat/chat-conversation.entity'
import { ChatMessage } from '../chat/chat-message.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between } from 'typeorm'
import type { RequestWithUser } from '../common/interfaces/request-with-user.interface'

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly userService: UserService,
    private readonly loginLogService: LoginLogService,
    private readonly operationLogService: OperationLogService,
    @InjectRepository(History)
    private historyRepository: Repository<History>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(LoginLog)
    private loginLogRepository: Repository<LoginLog>,
    @InjectRepository(ChatConversation)
    private conversationRepository: Repository<ChatConversation>,
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
  ) {}

  // ========== 用户管理 ==========
  @Get('users')
  async findAllUsers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('username') username?: string,
    @Query('roleId') roleId?: string,
  ) {
    return this.userService.findAll(
      Number(page) || 1,
      Number(pageSize) || 10,
      username,
      roleId ? Number(roleId) : undefined,
    )
  }

  @Get('users/:id')
  async findUserById(@Param('id') id: string) {
    const user = await this.userService.findById(Number(id))
    if (!user) throw new BadRequestException('用户不存在')
    const { passwordHash, ...rest } = user as any
    return rest
  }

  @Put('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body('roleId') roleId: number,
  ) {
    await this.userService.updateRole(Number(id), roleId)
    return { success: true }
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string, @Req() req: RequestWithUser) {
    if (Number(id) === req.user.userId) {
      throw new BadRequestException('不能删除自己')
    }
    await this.userService.delete(Number(id))
    return { success: true }
  }

  // ========== 日志查询 ==========
  @Get('login-logs')
  async findLoginLogs(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('username') username?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.loginLogService.findAll(
      Number(page) || 1,
      Number(pageSize) || 20,
      username,
      status,
      startDate,
      endDate,
    )
  }

  @Get('operation-logs')
  async findOperationLogs(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('username') username?: string,
    @Query('module') module?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.operationLogService.findAll(
      Number(page) || 1,
      Number(pageSize) || 20,
      username,
      module,
      status,
      startDate,
      endDate,
    )
  }

  @Delete('login-logs/:id')
  async deleteLoginLog(@Param('id') id: string) {
    await this.loginLogService.delete(Number(id))
    return { success: true }
  }

  @Delete('login-logs')
  async deleteLoginLogs(@Body('ids') ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('ids 不能为空')
    }
    await this.loginLogService.deleteMany(ids)
    return { success: true }
  }

  @Delete('operation-logs/:id')
  async deleteOperationLog(@Param('id') id: string) {
    await this.operationLogService.delete(Number(id))
    return { success: true }
  }

  @Delete('operation-logs')
  async deleteOperationLogs(@Body('ids') ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('ids 不能为空')
    }
    await this.operationLogService.deleteMany(ids)
    return { success: true }
  }

  // ========== 统计 API ==========
  @Get('stats/overview')
  async getOverview() {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    const totalUsers = await this.userRepository.count()
    const todayUsers = await this.userRepository.count({
      where: { createdAt: Between(todayStart, todayEnd) },
    })
    const totalTts = await this.historyRepository.count()
    const todayTts = await this.historyRepository.count({
      where: { createdAt: Between(todayStart.getTime(), todayEnd.getTime()) },
    })

    return { totalUsers, todayUsers, totalTts, todayTts }
  }

  @Get('stats/user-trend')
  async getUserTrend(@Query('days') days?: string) {
    const d = Number(days) || 30
    const result: { date: string; count: number }[] = []
    const now = new Date()

    for (let i = d - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000)
      const count = await this.userRepository.count({
        where: { createdAt: Between(date, nextDate) },
      })
      result.push({
        date: date.toISOString().slice(0, 10),
        count,
      })
    }
    return result
  }

  @Get('stats/tts-trend')
  async getTtsTrend(@Query('days') days?: string) {
    const d = Number(days) || 30
    const result: { date: string; count: number }[] = []
    const now = new Date()

    for (let i = d - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000)
      const count = await this.historyRepository.count({
        where: { createdAt: Between(date.getTime(), nextDate.getTime()) },
      })
      result.push({
        date: date.toISOString().slice(0, 10),
        count,
      })
    }
    return result
  }

  @Get('stats/login-trend')
  async getLoginTrend(@Query('days') days?: string) {
    const d = Number(days) || 30
    const result: { date: string; count: number }[] = []
    const now = new Date()

    for (let i = d - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000)
      const count = await this.loginLogRepository.count({
        where: { createdAt: Between(date, nextDate) },
      })
      result.push({
        date: date.toISOString().slice(0, 10),
        count,
      })
    }
    return result
  }

  @Get('stats/role-distribution')
  async getRoleDistribution() {
    const users = await this.userRepository.find({ relations: ['role'] })
    const map = new Map<string, number>()
    for (const user of users) {
      const code = user.role?.code || 'unknown'
      map.set(code, (map.get(code) || 0) + 1)
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }

  @Get('stats/tts-by-mode')
  async getTtsByMode() {
    const histories = await this.historyRepository.find()
    const map = new Map<string, number>()
    for (const h of histories) {
      map.set(h.mode, (map.get(h.mode) || 0) + 1)
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }

  // ========== 智能助手统计 ==========

  @Get('stats/chat-overview')
  async getChatOverview() {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    const totalConversations = await this.conversationRepository.count()
    const todayConversations = await this.conversationRepository.count({
      where: { createdAt: Between(todayStart, todayEnd) },
    })
    const totalMessages = await this.messageRepository.count()
    const todayMessages = await this.messageRepository.count({
      where: { createdAt: Between(todayStart, todayEnd) },
    })

    const activeUsersResult = await this.conversationRepository
      .createQueryBuilder('conv')
      .select('COUNT(DISTINCT conv.userId)', 'count')
      .where('conv.createdAt BETWEEN :start AND :end', { start: todayStart, end: todayEnd })
      .getRawOne()
    const activeUsers = Number(activeUsersResult?.count || 0)

    return { totalConversations, todayConversations, totalMessages, todayMessages, activeUsers }
  }

  @Get('stats/chat-conversation-trend')
  async getChatConversationTrend(@Query('days') days?: string) {
    const d = Number(days) || 30
    const result: { date: string; count: number }[] = []
    const now = new Date()

    for (let i = d - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000)
      const count = await this.conversationRepository.count({
        where: { createdAt: Between(date, nextDate) },
      })
      result.push({
        date: date.toISOString().slice(0, 10),
        count,
      })
    }
    return result
  }

  @Get('stats/chat-message-trend')
  async getChatMessageTrend(@Query('days') days?: string) {
    const d = Number(days) || 30
    const result: { date: string; count: number }[] = []
    const now = new Date()

    for (let i = d - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000)
      const count = await this.messageRepository.count({
        where: { createdAt: Between(date, nextDate) },
      })
      result.push({
        date: date.toISOString().slice(0, 10),
        count,
      })
    }
    return result
  }

  @Get('stats/chat-model-distribution')
  async getChatModelDistribution() {
    const conversations = await this.conversationRepository.find()
    const map = new Map<string, number>()
    for (const c of conversations) {
      map.set(c.model, (map.get(c.model) || 0) + 1)
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }

  @Get('stats/chat-feature-distribution')
  async getChatFeatureDistribution() {
    const conversations = await this.conversationRepository.find()
    const map = new Map<string, number>([
      ['thinking', 0],
      ['webSearch', 0],
      ['functionCall', 0],
    ])
    for (const c of conversations) {
      const f = c.features || {}
      if (f.thinking) map.set('thinking', (map.get('thinking') || 0) + 1)
      if (f.webSearch) map.set('webSearch', (map.get('webSearch') || 0) + 1)
      if (f.functionCall) map.set('functionCall', (map.get('functionCall') || 0) + 1)
    }
    const labelMap: Record<string, string> = {
      thinking: '深度思考',
      webSearch: '联网搜索',
      functionCall: 'Function Call',
    }
    return Array.from(map.entries()).map(([key, value]) => ({ name: labelMap[key] || key, value }))
  }

  @Get('stats/chat-role-distribution')
  async getChatRoleDistribution() {
    const messages = await this.messageRepository.find()
    const map = new Map<string, number>()
    for (const m of messages) {
      map.set(m.role, (map.get(m.role) || 0) + 1)
    }
    const labelMap: Record<string, string> = {
      user: '用户消息',
      assistant: '助手消息',
      system: '系统消息',
      tool: '工具消息',
    }
    return Array.from(map.entries()).map(([key, value]) => ({ name: labelMap[key] || key, value }))
  }

  // ========== 智能助手管理 ==========
  @Get('chat/conversations')
  async getChatConversations(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('username') username?: string,
  ) {
    const pageNum = Number(page) || 1
    const pageSizeNum = Number(pageSize) || 20

    const qb = this.conversationRepository.createQueryBuilder('conv')
      .leftJoinAndSelect('conv.user', 'user')
      .orderBy('conv.updatedAt', 'DESC')
      .skip((pageNum - 1) * pageSizeNum)
      .take(pageSizeNum)

    if (username) {
      qb.andWhere('user.username LIKE :username', { username: `%${username}%` })
    }

    const [items, total] = await qb.getManyAndCount()
    return [items, total]
  }

  @Get('chat/conversations/:id/messages')
  async getChatMessages(@Param('id') id: string) {
    return this.messageRepository.find({
      where: { conversationId: Number(id) },
      order: { createdAt: 'ASC' },
    })
  }

  @Delete('chat/conversations/:id')
  async deleteChatConversation(@Param('id') id: string) {
    await this.messageRepository.delete({ conversationId: Number(id) })
    await this.conversationRepository.delete(Number(id))
    return { success: true }
  }
}
