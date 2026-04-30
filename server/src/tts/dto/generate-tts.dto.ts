import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TTSMessageDto {
  @IsString()
  role: string;

  @IsString()
  content: string;
}

class TTSAudioDto {
  @IsString()
  format: string;

  @IsString()
  @IsOptional()
  voice?: string;
}

export class GenerateTtsDto {
  @IsString()
  model: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TTSMessageDto)
  messages: TTSMessageDto[];

  @ValidateNested()
  @Type(() => TTSAudioDto)
  audio: TTSAudioDto;

  @IsBoolean()
  @IsOptional()
  stream?: boolean;
}
