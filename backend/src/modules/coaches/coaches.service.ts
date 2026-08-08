import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCoachDto, UpdateCoachDto } from './dto/coach.dto';
@Injectable()
export class CoachesService {
  constructor(private readonly prisma: PrismaService) {}
  async create(userId: string, dto: CreateCoachDto) {
    if (await this.prisma.coach.findUnique({ where: { userId } }))
      throw new ConflictException('A coach already exists');
    return this.prisma.coach.create({ data: { ...dto, userId } });
  }
  async get(userId: string) {
    const coach = await this.prisma.coach.findUnique({ where: { userId } });
    if (!coach) throw new NotFoundException('Coach not found');
    return coach;
  }
  async update(userId: string, dto: UpdateCoachDto) {
    await this.get(userId);
    return this.prisma.coach.update({ where: { userId }, data: dto });
  }
}
