import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const AUDIO_TYPES = new Set(['audio/m4a', 'audio/mp4', 'audio/aac', 'audio/mpeg', 'audio/webm', 'audio/x-m4a']);

@Injectable()
export class ChatMediaService {
  private readonly logger = new Logger(ChatMediaService.name);

  constructor(private readonly config: ConfigService) {}

  async upload(userId: string, type: 'IMAGE' | 'AUDIO', file: Express.Multer.File) {
    const mimeType = file.mimetype.toLowerCase().split(';')[0].trim();
    const allowed = type === 'IMAGE' ? IMAGE_TYPES : AUDIO_TYPES;
    if (!allowed.has(mimeType)) throw new BadRequestException(`Unsupported ${type.toLowerCase()} format`);
    const maxBytes = type === 'IMAGE' ? 10 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxBytes) throw new BadRequestException(`${type === 'IMAGE' ? 'Image' : 'Audio'} is too large`);

    const configuredUrl = this.clean(this.config.get<string>('SUPABASE_URL'));
    const baseUrl = this.projectOrigin(configuredUrl);
    const serviceKey = this.clean(
      this.config.get<string>('SUPABASE_SECRET_KEY') ||
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY'),
    );
    const bucket = this.clean(this.config.get<string>('SUPABASE_MEDIA_BUCKET')) || 'chat-media';
    const extension = this.extension(mimeType, type);
    const path = `${userId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
    if (!baseUrl || !serviceKey) {
      if (this.config.get<string>('NODE_ENV') === 'production')
        throw new ServiceUnavailableException('Media storage is not configured');
      const relativePath = `chat/${path}`;
      const destination = join(process.cwd(), 'uploads', ...relativePath.split('/'));
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, file.buffer);
      const publicBaseUrl = this.config.get<string>('PUBLIC_BASE_URL', 'http://localhost:3000').replace(/\/$/, '');
      return { url: `${publicBaseUrl}/uploads/${relativePath}`, mimeType, size: file.size };
    }
    const headers: Record<string, string> = {
      apikey: serviceKey,
      'Content-Type': mimeType,
      'x-upsert': 'false',
    };
    if (!serviceKey.startsWith('sb_secret_'))
      headers.Authorization = `Bearer ${serviceKey}`;
    const objectUrl = `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${path
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`;
    const response = await fetch(objectUrl, {
      method: 'POST',
      headers,
      body: file.buffer as unknown as BodyInit,
    });
    if (!response.ok) {
      const providerBody = await response.text();
      let providerMessage = providerBody;
      try {
        const parsed = JSON.parse(providerBody) as { message?: string; error?: string };
        providerMessage = parsed.message || parsed.error || providerBody;
      } catch {
        // Supabase can return a plain-text gateway response.
      }
      this.logger.warn({
        code: 'SUPABASE_STORAGE_UPLOAD_FAILED',
        status: response.status,
        message: providerMessage.slice(0, 300),
        bucket,
      });
      if ([401, 403].includes(response.status))
        throw new ServiceUnavailableException('Media storage credentials were rejected');
      if (response.status === 404)
        throw new ServiceUnavailableException('Media storage endpoint or bucket was not found');
      throw new ServiceUnavailableException(`Unable to store this attachment (storage ${response.status})`);
    }
    return {
      url: `${baseUrl}/storage/v1/object/public/${bucket}/${path}`,
      mimeType,
      size: file.size,
    };
  }

  private extension(mimeType: string, type: 'IMAGE' | 'AUDIO') {
    const known: Record<string, string> = {
      'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif',
      'audio/m4a': 'm4a', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/mpeg': 'mp3', 'audio/webm': 'webm',
    };
    return known[mimeType] ?? (type === 'IMAGE' ? 'jpg' : 'm4a');
  }

  private clean(value?: string) {
    return value?.trim().replace(/^(['"])(.*)\1$/, '$2');
  }

  private projectOrigin(value?: string) {
    if (!value) return undefined;
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) return undefined;
      return url.origin;
    } catch {
      return undefined;
    }
  }
}
