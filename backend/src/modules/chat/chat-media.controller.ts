import { Controller, Get, Header, Param, ParseUUIDPipe, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ChatMediaService } from './chat-media.service';

@ApiTags('media')
@Controller('media')
export class ChatMediaController {
  constructor(private readonly media: ChatMediaService) {}

  @Get(':mediaId')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: 'Read an immutable chat attachment' })
  async get(@Param('mediaId', ParseUUIDPipe) mediaId: string, @Res({ passthrough: true }) response: Response) {
    const media = await this.media.get(mediaId);
    response.type(media.mimeType);
    response.setHeader('Content-Length', String(media.size));
    return Buffer.from(media.data);
  }
}
