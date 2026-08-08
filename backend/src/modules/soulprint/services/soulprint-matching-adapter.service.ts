import { Injectable } from '@nestjs/common';
import {
  SoulprintCategory,
  SoulprintEntryStatus,
  SoulprintSensitivity,
  SoulprintVisibility,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { SoulprintMatchingProfile } from '../interfaces/soulprint.interfaces';
@Injectable()
export class SoulprintMatchingAdapterService {
  constructor(private readonly prisma: PrismaService) {}
  async build(userId: string): Promise<SoulprintMatchingProfile> {
    const entries = await this.prisma.soulprintEntry.findMany({
      where: {
        soulprint: { userId },
        visibility: SoulprintVisibility.MATCHING_ALLOWED,
        status: {
          in: [SoulprintEntryStatus.ACTIVE, SoulprintEntryStatus.CONFIRMED],
        },
        sensitivity: { not: SoulprintSensitivity.HIGHLY_SENSITIVE },
      },
      orderBy: { matchingWeight: 'desc' },
    });
    const values = (category: SoulprintCategory) =>
      entries
        .filter((entry) => entry.category === category)
        .map((entry) => entry.value);
    return {
      userId,
      relationshipGoals: values(SoulprintCategory.RELATIONSHIP_GOAL),
      coreValues: values(SoulprintCategory.CORE_VALUE),
      interests: values(SoulprintCategory.INTEREST),
      communicationStyles: values(SoulprintCategory.COMMUNICATION_STYLE),
      partnerPreferences: values(SoulprintCategory.PARTNER_PREFERENCE),
      boundaries: values(SoulprintCategory.BOUNDARY),
      dealBreakers: values(SoulprintCategory.DEAL_BREAKER),
      lifestylePreferences: values(SoulprintCategory.LIFESTYLE),
      locationPreferences: values(SoulprintCategory.LOCATION_PREFERENCE),
    };
  }
}
