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
import { LogOperation } from '../common/decorators/log-operation.decorator'
import { escapeLike } from '../common/utils/escape-like.util'
import { UserService } from '../user/user.service'
import { LoginLogService } from '../log/login-log.service'
import { OperationLogService } from '../log/operation-log.service'
import { History } from '../history/history.entity'
import { User } from '../user/user.entity'
import { LoginLog } from '../log/login-log.entity'
import { ChatConversation } from '../chat/chat-conversation.entity'
import { ChatMessage } from '../chat/chat-message.entity'
import { Agent } from '../agent/agent.entity'
import { AgentVersion } from '../agent/agent-version.entity'
import { McpServerConfig } from '../mcp/mcp-server-config.entity'
import { redactMcpTransport } from '../mcp/mcp-redaction.util'
import { KnowledgeBase } from '../knowledge-base/knowledge-base.entity'
import { KnowledgeDocument } from '../knowledge-base/knowledge-document.entity'
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between, In } from 'typeorm'
import type { RequestWithUser } from '../common/interfaces/request-with-user.interface'

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly userService: UserService,
    private readonly loginLogService: LoginLogService,
    private readonly operationLogService: OperationLogService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
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
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    @InjectRepository(AgentVersion)
    private agentVersionRepository: Repository<AgentVersion>,
    @InjectRepository(McpServerConfig)
    private mcpServerRepository: Repository<McpServerConfig>,
    @InjectRepository(KnowledgeBase)
    private knowledgeBaseRepository: Repository<KnowledgeBase>,
    @InjectRepository(KnowledgeDocument)
    private knowledgeDocumentRepository: Repository<KnowledgeDocument>,
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
    const cutoff = new Date(Date.now() - d * 24 * 60 * 60 * 1000)
    const rows = await this.userRepository
      .createQueryBuilder('u')
      .select("strftime('%Y-%m-%d', u.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('u.createdAt >= :cutoff', { cutoff })
      .groupBy("strftime('%Y-%m-%d', u.createdAt)")
      .getRawMany()
    return this.fillTrend(rows, d)
  }

  @Get('stats/tts-trend')
  async getTtsTrend(@Query('days') days?: string) {
    const d = Number(days) || 30
    const cutoff = Date.now() - d * 24 * 60 * 60 * 1000
    const rows = await this.historyRepository
      .createQueryBuilder('h')
      .select("strftime('%Y-%m-%d', h.createdAt / 1000, 'unixepoch')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('h.createdAt >= :cutoff', { cutoff })
      .groupBy("strftime('%Y-%m-%d', h.createdAt / 1000, 'unixepoch')")
      .getRawMany()
    return this.fillTrend(rows, d)
  }

  @Get('stats/login-trend')
  async getLoginTrend(@Query('days') days?: string) {
    const d = Number(days) || 30
    const cutoff = new Date(Date.now() - d * 24 * 60 * 60 * 1000)
    const rows = await this.loginLogRepository
      .createQueryBuilder('l')
      .select("strftime('%Y-%m-%d', l.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('l.createdAt >= :cutoff', { cutoff })
      .groupBy("strftime('%Y-%m-%d', l.createdAt)")
      .getRawMany()
    return this.fillTrend(rows, d)
  }

  @Get('stats/role-distribution')
  async getRoleDistribution() {
    return this.userRepository
      .createQueryBuilder('u')
      .leftJoin('u.role', 'r')
      .select("COALESCE(r.code, 'unknown')", 'name')
      .addSelect('COUNT(*)', 'value')
      .groupBy('r.code')
      .getRawMany()
  }

  @Get('stats/tts-by-mode')
  async getTtsByMode() {
    return this.historyRepository
      .createQueryBuilder('h')
      .select('h.mode', 'name')
      .addSelect('COUNT(*)', 'value')
      .groupBy('h.mode')
      .getRawMany()
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
    const cutoff = new Date(Date.now() - d * 24 * 60 * 60 * 1000)
    const rows = await this.conversationRepository
      .createQueryBuilder('c')
      .select("strftime('%Y-%m-%d', c.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('c.createdAt >= :cutoff', { cutoff })
      .groupBy("strftime('%Y-%m-%d', c.createdAt)")
      .getRawMany()
    return this.fillTrend(rows, d)
  }

  @Get('stats/chat-message-trend')
  async getChatMessageTrend(@Query('days') days?: string) {
    const d = Number(days) || 30
    const cutoff = new Date(Date.now() - d * 24 * 60 * 60 * 1000)
    const rows = await this.messageRepository
      .createQueryBuilder('m')
      .select("strftime('%Y-%m-%d', m.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('m.createdAt >= :cutoff', { cutoff })
      .groupBy("strftime('%Y-%m-%d', m.createdAt)")
      .getRawMany()
    return this.fillTrend(rows, d)
  }

  @Get('stats/chat-model-distribution')
  async getChatModelDistribution() {
    return this.conversationRepository
      .createQueryBuilder('c')
      .select('c.model', 'name')
      .addSelect('COUNT(*)', 'value')
      .groupBy('c.model')
      .getRawMany()
  }

  @Get('stats/chat-feature-distribution')
  async getChatFeatureDistribution() {
    const labelMap: Record<string, string> = {
      thinking: '深度思考',
      webSearch: '联网搜索',
      functionCall: 'Function Call',
    }
    const features = ['thinking', 'webSearch', 'functionCall']
    const result: { name: string; value: number }[] = []
    for (const f of features) {
      const row = await this.conversationRepository
        .createQueryBuilder('c')
        .select('COUNT(*)', 'count')
        .where(`json_extract(c.features, '$.${f}') = 1`)
        .getRawOne()
      result.push({ name: labelMap[f] || f, value: Number(row?.count || 0) })
    }
    return result
  }

  @Get('stats/chat-role-distribution')
  async getChatRoleDistribution() {
    const labelMap: Record<string, string> = {
      user: '用户消息',
      assistant: '助手消息',
      system: '系统消息',
      tool: '工具消息',
    }
    const rows = await this.messageRepository
      .createQueryBuilder('m')
      .select('m.role', 'key')
      .addSelect('COUNT(*)', 'value')
      .groupBy('m.role')
      .getRawMany()
    return rows.map((r: { key: string; value: number }) => ({
      name: labelMap[r.key] || r.key,
      value: Number(r.value),
    }))
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
      qb.andWhere('user.username LIKE :username ESCAPE \'\\\'', { username: `%${escapeLike(username)}%` })
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

  // ========== 资源审计管理 ==========
  @Get('agents')
  async getAgents(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('username') username?: string,
    @Query('published') published?: string,
  ) {
    const pageNum = this.normalizePage(page)
    const pageSizeNum = this.normalizePageSize(pageSize)
    const qb = this.agentRepository
      .createQueryBuilder('agent')
      .withDeleted()
      .orderBy('agent.updatedAt', 'DESC')
      .skip((pageNum - 1) * pageSizeNum)
      .take(pageSizeNum)

    if (username) {
      qb.andWhere(
        "agent.userId IN (SELECT id FROM user WHERE username LIKE :username ESCAPE '\\')",
        { username: `%${escapeLike(username)}%` },
      )
    }
    if (published === 'true') qb.andWhere('agent.publishedVersionId IS NOT NULL')
    if (published === 'false') qb.andWhere('agent.publishedVersionId IS NULL')

    const [items, total] = await qb.getManyAndCount()
    const owners = await this.getUserSummaries(items.map((item) => item.userId))
    return [
      items.map((item) => ({
        id: item.id,
        userId: item.userId,
        owner: owners.get(item.userId) || null,
        name: item.name,
        description: item.description,
        publishedVersionId: item.publishedVersionId,
        archivedAt: item.archivedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      total,
    ]
  }

  @Get('agents/:id')
  async getAgent(@Param('id') id: string) {
    const agent = await this.agentRepository
      .createQueryBuilder('agent')
      .withDeleted()
      .where('agent.id = :id', { id: Number(id) })
      .getOne()
    if (!agent) throw new BadRequestException('智能体不存在')

    const publishedVersion = agent.publishedVersionId
      ? await this.agentVersionRepository.findOne({ where: { id: agent.publishedVersionId } })
      : null
    const owners = await this.getUserSummaries([agent.userId])
    return {
      ...agent,
      owner: owners.get(agent.userId) || null,
      publishedVersion: publishedVersion
        ? { id: publishedVersion.id, version: publishedVersion.version, publishedAt: publishedVersion.publishedAt }
        : null,
    }
  }

  @Delete('agents/:id')
  @LogOperation('智能体审计', '归档智能体')
  async deleteAgent(@Param('id') id: string) {
    const agent = await this.agentRepository.findOne({ where: { id: Number(id) } })
    if (!agent) throw new BadRequestException('智能体不存在或已归档')
    await this.agentRepository.softDelete(agent.id)
    return { success: true }
  }

  @Get('mcp/servers')
  async getMcpServers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('username') username?: string,
    @Query('enabled') enabled?: string,
  ) {
    const pageNum = this.normalizePage(page)
    const pageSizeNum = this.normalizePageSize(pageSize)
    const qb = this.mcpServerRepository
      .createQueryBuilder('server')
      .orderBy('server.updatedAt', 'DESC')
      .skip((pageNum - 1) * pageSizeNum)
      .take(pageSizeNum)

    if (username) {
      qb.andWhere(
        "server.userId IN (SELECT id FROM user WHERE username LIKE :username ESCAPE '\\')",
        { username: `%${escapeLike(username)}%` },
      )
    }
    if (enabled === 'true') qb.andWhere('server.enabled = :enabled', { enabled: true })
    if (enabled === 'false') qb.andWhere('server.enabled = :enabled', { enabled: false })

    const [items, total] = await qb.getManyAndCount()
    const owners = await this.getUserSummaries(items.map((item) => item.userId))
    return [items.map((item) => this.toMcpAuditItem(item, owners.get(item.userId))), total]
  }

  @Get('mcp/servers/:id')
  async getMcpServer(@Param('id') id: string) {
    const server = await this.mcpServerRepository.findOne({ where: { id: Number(id) } })
    if (!server) throw new BadRequestException('MCP 服务不存在')
    const owners = await this.getUserSummaries([server.userId])
    return this.toMcpAuditItem(server, owners.get(server.userId))
  }

  @Delete('mcp/servers/:id')
  @LogOperation('MCP 审计', '删除 MCP 服务')
  async deleteMcpServer(@Param('id') id: string) {
    const server = await this.mcpServerRepository.findOne({ where: { id: Number(id) } })
    if (!server) throw new BadRequestException('MCP 服务不存在')
    await this.mcpServerRepository.delete(server.id)
    return { success: true }
  }

  @Get('knowledge-bases')
  async getKnowledgeBases(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('username') username?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = this.normalizePage(page)
    const pageSizeNum = this.normalizePageSize(pageSize)
    const qb = this.knowledgeBaseRepository
      .createQueryBuilder('kb')
      .orderBy('kb.updatedAt', 'DESC')
      .skip((pageNum - 1) * pageSizeNum)
      .take(pageSizeNum)

    if (username) {
      qb.andWhere(
        "kb.userId IN (SELECT id FROM user WHERE username LIKE :username ESCAPE '\\')",
        { username: `%${escapeLike(username)}%` },
      )
    }
    if (status) qb.andWhere('kb.status = :status', { status })

    const [items, total] = await qb.getManyAndCount()
    const owners = await this.getUserSummaries(items.map((item) => item.userId))
    return [
      items.map((item) => ({
        ...item,
        owner: owners.get(item.userId) || null,
      })),
      total,
    ]
  }

  @Get('knowledge-bases/:id/documents')
  async getKnowledgeBaseDocuments(@Param('id') id: string) {
    const knowledgeBaseId = Number(id)
    const kb = await this.knowledgeBaseRepository.findOne({ where: { id: knowledgeBaseId } })
    if (!kb) throw new BadRequestException('知识库不存在')
    return this.knowledgeDocumentRepository.find({
      where: { knowledgeBaseId },
      order: { createdAt: 'DESC' },
    })
  }

  @Delete('knowledge-bases/:id')
  @LogOperation('知识库审计', '删除知识库')
  async deleteKnowledgeBase(@Param('id') id: string) {
    const kb = await this.knowledgeBaseRepository.findOne({ where: { id: Number(id) } })
    if (!kb) throw new BadRequestException('知识库不存在')
    await this.knowledgeBaseService.remove(kb.userId, kb.id)
    return { success: true }
  }

  @Get('tts/history')
  async getTtsHistory(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('username') username?: string,
    @Query('mode') mode?: string,
  ) {
    const pageNum = this.normalizePage(page)
    const pageSizeNum = this.normalizePageSize(pageSize)
    const qb = this.historyRepository
      .createQueryBuilder('history')
      .orderBy('history.createdAt', 'DESC')
      .skip((pageNum - 1) * pageSizeNum)
      .take(pageSizeNum)

    if (username) {
      qb.andWhere(
        "history.userId IN (SELECT id FROM user WHERE username LIKE :username ESCAPE '\\')",
        { username: `%${escapeLike(username)}%` },
      )
    }
    if (mode) qb.andWhere('history.mode = :mode', { mode })

    const [items, total] = await qb.getManyAndCount()
    const owners = await this.getUserSummaries(items.map((item) => item.userId).filter((userId): userId is number => userId !== null))
    return [
      items.map(({ audioBase64, ...item }) => ({
        ...item,
        owner: item.userId ? owners.get(item.userId) || null : null,
        hasAudio: Boolean(audioBase64),
      })),
      total,
    ]
  }

  @Delete('tts/history/:id')
  @LogOperation('语音生成历史', '删除生成历史')
  async deleteTtsHistory(@Param('id') id: string) {
    const history = await this.historyRepository.findOne({ where: { id: Number(id) } })
    if (!history) throw new BadRequestException('生成历史不存在')
    await this.historyRepository.delete(history.id)
    return { success: true }
  }

  private normalizePage(page?: string): number {
    return Math.max(1, Number(page) || 1)
  }

  private normalizePageSize(pageSize?: string): number {
    return Math.min(100, Math.max(1, Number(pageSize) || 20))
  }

  private async getUserSummaries(userIds: number[]): Promise<Map<number, { id: number; username: string; nickname: string }>> {
    const uniqueIds = [...new Set(userIds)]
    if (uniqueIds.length === 0) return new Map()
    const users = await this.userRepository.find({
      select: { id: true, username: true, nickname: true },
      where: { id: In(uniqueIds) },
    })
    return new Map(users.map((user) => [user.id, { id: user.id, username: user.username, nickname: user.nickname }]))
  }

  private toMcpAuditItem(
    server: McpServerConfig,
    owner: { id: number; username: string; nickname: string } | undefined,
  ) {
    return {
      ...server,
      owner: owner || null,
      transport: redactMcpTransport(server.transport),
    }
  }

  private fillTrend(rows: { date: string; count: string | number }[], days: number): { date: string; count: number }[] {
    const map = new Map<string, number>()
    for (const r of rows) {
      map.set(r.date, Number(r.count))
    }
    const result: { date: string; count: number }[] = []
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      result.push({ date: key, count: map.get(key) || 0 })
    }
    return result
  }
}
