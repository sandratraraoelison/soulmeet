import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const AUDIO_TYPES = new Set(['audio/m4a', 'audio/mp4', 'audio/aac', 'audio/mpeg', 'audio/webm', 'audio/x-m4a']);

@Injectable()
export class ChatMediaService {
  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {}

  async upload(userId: string, type: 'IMAGE' | 'AUDIO', file: Express.Multer.File) {
    const mimeType = file.mimetype.toLowerCase().split(';')[0].trim();
    const allowed = type === 'IMAGE' ? IMAGE_TYPES : AUDIO_TYPES;
    if (!allowed.has(mimeType)) throw new BadRequestException(`Unsupported ${type.toLowerCase()} format`);
    const maxBytes = type === 'IMAGE' ? 10 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxBytes) throw new BadRequestException(`${type === 'IMAGE' ? 'Image' : 'Audio'} is too large`);

    const media = await this.prisma.chatMedia.create({
      data: { ownerId: userId, mimeType, size: file.size, data: Uint8Array.from(file.buffer) },
      select: { id: true },
    });
    const publicBaseUrl = this.config.get<string>('PUBLIC_BASE_URL', 'http://localhost:3000').replace(/\/$/, '');
    return { url: `${publicBaseUrl}/api/v1/media/${media.id}`, mimeType, size: file.size };
  }

  async get(mediaId: string) {
    const media = await this.prisma.chatMedia.findUnique({
      where: { id: mediaId },
      select: { data: true, mimeType: true, size: true },
    });
    if (!media) throw new NotFoundException('Attachment not found');
    return media;
  }
}
