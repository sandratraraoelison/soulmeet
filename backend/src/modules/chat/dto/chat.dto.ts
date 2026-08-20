import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CHAT_CONFIG } from '../constants/chat-config.constants';

export class CreatePrivateConversationDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() participantId!: string;
}
export class ConversationDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() conversationId!: string;
}
export class SendMessageDto extends ConversationDto {
  @ApiProperty({ maxLength: CHAT_CONFIG.maxMessageLength })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(CHAT_CONFIG.maxMessageLength)
  content!: string;

  @ApiProperty({ format: 'uuid' }) @IsUUID() clientMessageId!: string;
}
export class SendMessageBodyDto {
  @ApiProperty({ maxLength: CHAT_CONFIG.maxMessageLength })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(CHAT_CONFIG.maxMessageLength)
  content!: string;

  @ApiProperty({ format: 'uuid' }) @IsUUID() clientMessageId!: string;
}
export class SendAttachmentDto {
  @ApiProperty({ enum: ['IMAGE', 'AUDIO'] })
  @IsIn(['IMAGE', 'AUDIO'])
  type!: 'IMAGE' | 'AUDIO';

  @ApiProperty({ format: 'uuid' }) @IsUUID() clientMessageId!: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 300000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(300000)
  durationMs?: number;
}
export class UpdateMessageDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() messageId!: string;
  @ApiProperty({ maxLength: CHAT_CONFIG.maxMessageLength })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(CHAT_CONFIG.maxMessageLength)
  content!: string;
}
export class UpdateMessageBodyDto {
  @ApiProperty({ maxLength: CHAT_CONFIG.maxMessageLength })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(CHAT_CONFIG.maxMessageLength)
  content!: string;
}
export class DeleteMessageDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() messageId!: string;
}
export class ReadMessagesDto extends ConversationDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  messageIds!: string[];
}
export class GetMessagesQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  cursor?: string;
  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
