import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from './users.service';

@Injectable()
export class MatchmakingSearchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MatchmakingSearchService.name);
  private timer?: ReturnType<typeof setInterval>;
  private polling = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (!this.config.get<boolean>('MATCHMAKING_SEARCH_ENABLED', true)) return;
    const interval = this.config.get<number>('MATCHMAKING_SEARCH_INTERVAL_MS', 300_000);
    this.timer = setInterval(() => void this.poll(), interval);
    void this.poll();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async poll() {
    if (this.polling) return;
    this.polling = true;
    try {
      const states = await this.prisma.matchmakingState.findMany({
        where: { enabledAt: { not: null }, user: { isActive: true } },
        orderBy: { lastSearchedAt: { sort: 'asc', nulls: 'first' } },
        take: 100,
        select: { userId: true },
      });
      for (const state of states) {
        await this.users.refreshMatchmaking(state.userId).catch((error: unknown) => {
          this.logger.warn(`Matchmaking refresh failed for ${state.userId}: ${error instanceof Error ? error.message : 'unknown error'}`);
        });
      }
    } finally {
      this.polling = false;
    }
  }
}
