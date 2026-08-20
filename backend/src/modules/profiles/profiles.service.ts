import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProfileDto, UpdateProfileDto } from './dto/profile.dto';
import { SoulprintService } from '../soulprint/services/soulprint.service';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService, @Optional() private readonly soulprints?: SoulprintService) {}
  async get(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }
  async createOrUpdate(
    userId: string,
    dto: CreateProfileDto | UpdateProfileDto,
  ) {
    if (dto.birthDate) {
      const birthDate = new Date(dto.birthDate);
      const today = new Date();
      const minimumAgeCutoff = new Date(
        Date.UTC(
          today.getUTCFullYear() - 19,
          today.getUTCMonth(),
          today.getUTCDate(),
        ),
      );
      if (Number.isNaN(birthDate.getTime()) || birthDate > minimumAgeCutoff)
        throw new BadRequestException('You must be at least 19 years old');
    }
    const data = {
      ...dto,
      ...(dto.occupation !== undefined
        ? { occupation: dto.occupation.trim() || null }
        : {}),
      ...(dto.birthDate ? { birthDate: new Date(dto.birthDate) } : {}),
    };
    const existing = await this.prisma.profile.findUnique({
      where: { userId },
    });
    if (existing)
      return this.prisma.profile.update({ where: { userId }, data });
    const required = [
      'firstName',
      'birthDate',
      'gender',
      'sexualOrientation',
      'country',
      'city',
    ] as const;
    if (required.some((key) => !dto[key]))
      throw new ConflictException(
        'All profile fields are required on creation',
      );
    return this.prisma.profile.create({
      data: { ...(data as CreateProfileDto & { birthDate: Date }), userId },
    });
  }
  async complete(userId: string) {
    await this.get(userId);
    const profile = await this.prisma.profile.update({
      where: { userId },
      data: { onboardingCompleted: true },
    });
    await this.soulprints?.ensure(userId);
    return profile;
  }
}
