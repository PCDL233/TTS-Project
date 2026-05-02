import { IsString, IsOptional, IsBoolean, IsArray, IsObject, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class ChatMessageDto {
  @IsString()
  role: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsArray()
  @IsOptional()
  contentParts?: Array<{
    type: string;
    text?: string;
    image_url?: { url: string };
    input_audio?: { data: string; format: string };
    video_url?: { url: string; fps?: number; media_resolution?: string };
  }>;
}

class ThinkingDto {
  @IsString()
  type: 'enabled' | 'disabled';
}

class ResponseFormatDto {
  @IsString()
  type: 'text' | 'json_object';
}

class ToolFunctionDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  parameters?: Record<string, unknown>;
}

class UserLocationDto {
  @IsString()
  type: 'approximate';

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  city?: string;
}

class ToolDto {
  @IsString()
  type: 'function' | 'web_search';

  @ValidateNested()
  @IsOptional()
  @Type(() => ToolFunctionDto)
  function?: ToolFunctionDto;

  @IsNumber()
  @IsOptional()
  max_keyword?: number;

  @IsBoolean()
  @IsOptional()
  force_search?: boolean;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @ValidateNested()
  @IsOptional()
  @Type(() => UserLocationDto)
  user_location?: UserLocationDto;
}

export class ChatCompletionDto {
  @IsString()
  model: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @IsBoolean()
  @IsOptional()
  stream?: boolean;

  @ValidateNested()
  @IsOptional()
  @Type(() => ThinkingDto)
  thinking?: ThinkingDto;

  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => ToolDto)
  tools?: ToolDto[];

  @IsString()
  @IsOptional()
  tool_choice?: string;

  @ValidateNested()
  @IsOptional()
  @Type(() => ResponseFormatDto)
  response_format?: ResponseFormatDto;

  @IsNumber()
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @IsOptional()
  max_completion_tokens?: number;

  @IsNumber()
  @IsOptional()
  conversationId?: number;
}
