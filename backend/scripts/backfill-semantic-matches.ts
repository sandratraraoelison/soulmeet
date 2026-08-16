import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { UsersService } from '../src/modules/users/users.service';
import { ConfigService } from '@nestjs/config';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const prisma = app.get(PrismaService);
    const users = app.get(UsersService);
    const config = app.get(ConfigService);
    if (!config.get<boolean>('SEMANTIC_MATCHING_ENABLED', false) || !config.get<string>('LLM_API_KEY', '')) throw new Error('Enable SEMANTIC_MATCHING_ENABLED and configure LLM_API_KEY before running the semantic backfill.');
    const rows = await prisma.user.findMany({ where: { isActive: true, profile: { isNot: null }, soulprint: { isNot: null } }, select: { id: true }, orderBy: { createdAt: 'asc' } });
    let completed = 0;
    for (const row of rows) {
      await users.matches(row.id);
      completed++;
      if (completed % 25 === 0) process.stdout.write(`Analyzed ${completed}/${rows.length}\n`);
    }
    process.stdout.write(`Semantic backfill complete: ${completed} users analyzed.\n`);
  } finally {
    await app.close();
  }
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
