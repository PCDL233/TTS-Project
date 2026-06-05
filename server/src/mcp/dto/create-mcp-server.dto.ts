import { IsString, IsOptional, IsIn, IsNotEmpty, IsArray, IsBoolean, IsObject, Matches } from 'class-validator';

export class CreateMcpServerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsIn(['stdio', 'sse'])
  transportType: 'stdio' | 'sse';

  // stdio fields
  @IsString()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9_\-/.\\]+$/, {
    message: '命令只能包含字母、数字、下划线、横线、斜线和点',
  })
  command?: string;

  @IsArray()
  @IsOptional()
  args?: string[];

  @IsObject()
  @IsOptional()
  env?: Record<string, string>;

  // sse fields
  @IsString()
  @IsOptional()
  url?: string;

  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
