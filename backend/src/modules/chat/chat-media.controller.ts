import { Controller, Get, Param, ParseUUIDPipe, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ChatMediaService } from './chat-media.service';

@ApiTags('media')
@Controller('media')
export class ChatMediaController {
  constructor(private readonly media: ChatMediaService) {}

  @Get(':mediaId')
  @ApiOperation({ summary: 'Read an immutable chat attachment' })
  async get(@Param('mediaId', ParseUUIDPipe) mediaId: string, @Res() response: Response) {
    const media = await this.media.get(mediaId);
    response.status(200);
    response.setHeader('Content-Type', media.mimeType);
    response.setHeader('Content-Length', String(media.size));
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    response.send(Buffer.from(media.data));
  }
}
