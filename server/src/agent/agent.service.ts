import {
  BadRequestException,
  Inject,
  Injectable,
  forwardRef,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Agent } from './agent.entity';
import { AgentVersion } from './agent-version.entity';
import { KnowledgeBase } from '../knowledge-base/knowledge-base.entity';
import { McpServerConfig } from '../mcp/mcp-server-config.entity';
import type { AgentGraphV1, AgentValidationIssue } from './agent.types';
import {
  DEFAULT_AGENT_GRAPH,
  validateAgentDraftSafety,
  validateAgentGraph,
  validateMcpArgumentBindings,
} from './agent-graph.util';
import type { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';
import { ProviderModelService } from '../chat/provider-model.service';
import { ChatConversation } from '../chat/chat-conversation.entity';
import { ChatMessage } from '../chat/chat-message.entity';

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(AgentVersion)
    private readonly versionRepository: Repository<AgentVersion>,
    @InjectRepository(KnowledgeBase)
    private readonly kbRepository: Repository<KnowledgeBase>,
    @InjectRepository(McpServerConfig)
    private readonly mcpRepository: Repository<McpServerConfig>,
    @Inject(forwardRef(() => ProviderModelService))
    private readonly providerModelService: ProviderModelService,
  ) {}

  async list(
    userId: number,
  ): Promise<Array<Agent & { publishedVersion?: number }>> {
    const agents = await this.agentRepository.find({
      where: { userId, archivedAt: IsNull() },
      order: { updatedAt: 'DESC' },
    });
    const versionIds = agents
      .map((agent) => agent.publishedVersionId)
      .filter((id): id is number => !!id);
    const versions =
      versionIds.length > 0
        ? await this.versionRepository.findByIds(versionIds)
        : [];
    const versionMap = new Map(
      versions.map((version) => [version.id, version.version]),
    );
    return agents.map((agent) =>
      Object.assign(agent, {
        publishedVersion: agent.publishedVersionId
          ? versionMap.get(agent.publishedVersionId)
          : undefined,
      }),
    );
  }

  async findOwned(
    userId: number,
    id: number,
    includeArchived = false,
  ): Promise<Agent> {
    const agent = await this.agentRepository.findOne({
      where: { id, userId },
      withDeleted: includeArchived,
    });
    if (!agent || (!includeArchived && agent.archivedAt)) {
      throw new NotFoundException('智能体不存在');
    }
    return agent;
  }

  async create(userId: number, dto: CreateAgentDto): Promise<Agent> {
    return this.agentRepository.save(
      this.agentRepository.create({
        userId,
        name: dto.name.trim(),
        description: dto.description?.trim() || '',
        draftGraph: structuredClone(DEFAULT_AGENT_GRAPH),
        publishedVersionId: null,
        archivedAt: null,
      }),
    );
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateAgentDto,
  ): Promise<Agent> {
    const agent = await this.findOwned(userId, id);
    if (dto.name !== undefined) agent.name = dto.name.trim();
    if (dto.description !== undefined)
      agent.description = dto.description.trim();
    return this.agentRepository.save(agent);
  }

  async saveDraft(
    userId: number,
    id: number,
    graph: AgentGraphV1,
  ): Promise<Agent> {
    const agent = await this.findOwned(userId, id);
    const safetyIssues = validateAgentDraftSafety(graph);
    if (safetyIssues.length > 0) {
      throw new BadRequestException({
        message: '工作流草稿格式无效',
        issues: safetyIssues,
      });
    }
    agent.draftGraph = structuredClone(graph);
    return this.agentRepository.save(agent);
  }

  async validate(
    userId: number,
    id: number,
    graph?: AgentGraphV1,
  ): Promise<AgentValidationIssue[]> {
    const agent = await this.findOwned(userId, id);
    const target = graph || agent.draftGraph;
    const issues = validateAgentGraph(target);
    const llmNodes = target.nodes.filter(
      (node) => node.type === 'llm' && node.data.model,
    );
    if (llmNodes.length > 0) {
      try {
        const providerModels =
          await this.providerModelService.listModelsForUser(userId);
        const availableModels = new Set(
          providerModels.models.map((model) => model.value),
        );
        for (const node of llmNodes) {
          if (!availableModels.has(node.data.model!)) {
            issues.push({
              nodeId: node.id,
              message: `所选模型 ${node.data.model} 当前不可用`,
            });
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '未知错误';
        for (const node of llmNodes) {
          issues.push({
            nodeId: node.id,
            message: `无法校验模型可用性：${message}`,
          });
        }
      }
    }

    const kbIds = new Set(
      target.nodes
        .filter((node) => node.type === 'knowledge')
        .map((node) => node.data.knowledgeBaseId)
        .filter((value): value is number => !!value),
    );
    for (const kbId of kbIds) {
      const kb = await this.kbRepository.findOne({
        where: { id: kbId, userId },
      });
      if (!kb) {
        for (const node of target.nodes.filter(
          (item) => item.data.knowledgeBaseId === kbId,
        )) {
          issues.push({
            nodeId: node.id,
            message: '所选知识库不存在或不属于当前用户',
          });
        }
      }
    }

    const mcpIds = new Set(
      target.nodes
        .filter((node) => node.type === 'mcpTool')
        .map((node) => node.data.mcpServerId)
        .filter((value): value is number => !!value),
    );
    for (const mcpId of mcpIds) {
      const config = await this.mcpRepository.findOne({
        where: { id: mcpId, userId, enabled: true },
      });
      for (const node of target.nodes.filter(
        (item) => item.data.mcpServerId === mcpId,
      )) {
        if (!config) {
          issues.push({
            nodeId: node.id,
            message: '所选 MCP 服务器不存在、已禁用或不属于当前用户',
          });
        } else {
          const tool = config.cachedTools?.find(
            (item) => item.name === node.data.toolName,
          );
          if (!tool) {
            issues.push({ nodeId: node.id, message: '所选 MCP 工具已不存在' });
          } else {
            for (const message of validateMcpArgumentBindings(
              node.data.arguments,
              tool.inputSchema,
            )) {
              issues.push({ nodeId: node.id, message });
            }
          }
        }
      }
    }
    return issues;
  }

  async publish(userId: number, id: number): Promise<AgentVersion> {
    const agent = await this.findOwned(userId, id);
    const issues = await this.validate(userId, id);
    if (issues.length > 0) {
      throw new BadRequestException({ message: '工作流校验失败', issues });
    }
    return this.agentRepository.manager.transaction(async (manager) => {
      const latest = await manager.getRepository(AgentVersion).findOne({
        where: { agentId: agent.id },
        order: { version: 'DESC' },
      });
      const version = await manager.getRepository(AgentVersion).save({
        agentId: agent.id,
        version: (latest?.version || 0) + 1,
        graphSnapshot: structuredClone(agent.draftGraph),
      });
      await manager
        .getRepository(Agent)
        .update(agent.id, { publishedVersionId: version.id });
      return version;
    });
  }

  async remove(userId: number, id: number): Promise<void> {
    await this.findOwned(userId, id);
    await this.agentRepository.manager.transaction(async (manager) => {
      const conversationRepository = manager.getRepository(ChatConversation);
      const messageRepository = manager.getRepository(ChatMessage);
      const conversations = await conversationRepository.find({
        select: { id: true },
        where: { userId, agentId: id },
      });
      const conversationIds = conversations.map(
        (conversation) => conversation.id,
      );
      if (conversationIds.length > 0) {
        await messageRepository.delete({
          conversationId: In(conversationIds),
        });
        await conversationRepository.delete({
          id: In(conversationIds),
          userId,
        });
      }
      await manager.getRepository(AgentVersion).delete({ agentId: id });
      await manager.getRepository(Agent).delete({ id, userId });
    });
  }

  async getVersionDescriptors(
    userId: number,
    versionIds: number[],
  ): Promise<Map<number, { agentName: string; agentVersion: number }>> {
    const uniqueIds = [...new Set(versionIds)];
    if (uniqueIds.length === 0) return new Map();
    const versions = await this.versionRepository.find({
      where: { id: In(uniqueIds) },
    });
    const agentIds = [...new Set(versions.map((version) => version.agentId))];
    const agents = await this.agentRepository.find({
      where: { id: In(agentIds), userId },
      withDeleted: true,
    });
    const agentNames = new Map(agents.map((agent) => [agent.id, agent.name]));
    return new Map(
      versions
        .filter((version) => agentNames.has(version.agentId))
        .map((version) => [
          version.id,
          {
            agentName: agentNames.get(version.agentId)!,
            agentVersion: version.version,
          },
        ]),
    );
  }

  async getPublishedVersion(
    userId: number,
    agentId: number,
  ): Promise<{ agent: Agent; version: AgentVersion }> {
    const agent = await this.findOwned(userId, agentId);
    if (!agent.publishedVersionId)
      throw new BadRequestException('智能体尚未发布');
    const version = await this.versionRepository.findOne({
      where: { id: agent.publishedVersionId, agentId },
    });
    if (!version) throw new BadRequestException('智能体发布版本不存在');
    return { agent, version };
  }

  async getVersionForConversation(
    userId: number,
    versionId: number,
  ): Promise<{ agent: Agent; version: AgentVersion }> {
    const version = await this.versionRepository.findOne({
      where: { id: versionId },
    });
    if (!version) throw new BadRequestException('智能体版本不存在');
    const agent = await this.findOwned(userId, version.agentId, true);
    return { agent, version };
  }
}
