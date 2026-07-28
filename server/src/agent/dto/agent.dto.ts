import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type { AgentGraphV1 } from '../agent.types';

export class CreateAgentDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

export class UpdateAgentDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

export class SaveAgentDraftDto {
  @IsObject()
  graph: AgentGraphV1;
}

export class DebugAgentDto {
  @IsString()
  @MaxLength(10000)
  query: string;
}
