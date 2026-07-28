import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import type { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LogOperation } from '../common/decorators/log-operation.decorator';
import { AgentService } from './agent.service';
import { AgentWorkflowExecutor } from './agent-workflow-executor.service';
import {
  CreateAgentDto,
  DebugAgentDto,
  SaveAgentDraftDto,
  UpdateAgentDto,
} from './dto/agent.dto';

@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly executor: AgentWorkflowExecutor,
  ) {}

  @Get()
  list(@Req() req: RequestWithUser) {
    return this.agentService.list(req.user.userId);
  }

  @Post()
  @LogOperation('agent', 'create')
  create(@Req() req: RequestWithUser, @Body() dto: CreateAgentDto) {
    return this.agentService.create(req.user.userId, dto);
  }

  @Get(':id')
  get(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.agentService.findOwned(req.user.userId, Number(id));
  }

  @Patch(':id')
  @LogOperation('agent', 'update')
  update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateAgentDto,
  ) {
    return this.agentService.update(req.user.userId, Number(id), dto);
  }

  @Delete(':id')
  @LogOperation('agent', 'delete')
  async remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    await this.agentService.remove(req.user.userId, Number(id));
    return { success: true };
  }

  @Put(':id/draft')
  saveDraft(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: SaveAgentDraftDto,
  ) {
    return this.agentService.saveDraft(req.user.userId, Number(id), dto.graph);
  }

  @Post(':id/validate')
  async validate(@Req() req: RequestWithUser, @Param('id') id: string) {
    const issues = await this.agentService.validate(
      req.user.userId,
      Number(id),
    );
    return { valid: issues.length === 0, issues };
  }

  @Post(':id/publish')
  @LogOperation('agent', 'publish')
  publish(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.agentService.publish(req.user.userId, Number(id));
  }

  @Post(':id/debug')
  async debug(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: DebugAgentDto,
    @Res() res: Response,
  ) {
    const agent = await this.agentService.findOwned(
      req.user.userId,
      Number(id),
    );
    const issues = await this.agentService.validate(req.user.userId, agent.id);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.status(HttpStatus.OK);
    if (issues.length > 0) {
      res.write(
        `data: ${JSON.stringify({ type: 'validation_error', issues })}\n\n`,
      );
      res.end();
      return;
    }
    const abortController = new AbortController();
    let disconnected = false;
    res.on('close', () => {
      disconnected = true;
      abortController.abort();
    });
    const heartbeat = setInterval(() => {
      if (!disconnected) res.write(': heartbeat\n\n');
    }, 15_000);
    try {
      for await (const event of this.executor.execute(
        req.user.userId,
        agent.draftGraph,
        {
          query: dto.query,
          history: [],
          debug: true,
          signal: abortController.signal,
        },
      )) {
        if (disconnected) break;
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      if (!disconnected) res.write('data: [DONE]\n\n');
    } finally {
      clearInterval(heartbeat);
      if (!disconnected) res.end();
    }
  }
}
