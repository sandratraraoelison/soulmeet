import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SemanticMatchService } from '../src/modules/users/semantic-match.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const semantic = app.get(SemanticMatchService);
    const mine = [
      { category: 'CORE_VALUE', key: 'honesty', normalizedValue: null, value: 'Je valorise une communication honnête, calme et directe.', matchingWeight: 90 },
      { category: 'INTEREST', key: 'slow-travel', normalizedValue: null, value: 'J’aime voyager lentement pour découvrir les cultures locales.', matchingWeight: 90 },
      { category: 'DEAL_BREAKER', key: 'no-smoking', normalizedValue: null, value: 'Je refuse une relation avec une personne qui fume ; le tabagisme est un critère éliminatoire.', matchingWeight: 100 },
    ];
    const candidates = [{
      id: 'candidate-smoker',
      baseScore: 85,
      entries: [
        { category: 'CORE_VALUE', key: 'candor', normalizedValue: null, value: 'I value candid, peaceful conversations, including during disagreements.', matchingWeight: 90 },
        { category: 'INTEREST', key: 'local-culture', normalizedValue: null, value: 'I prefer slow travel and learning how local people live.', matchingWeight: 90 },
        { category: 'HABIT', key: 'daily-smoking', normalizedValue: null, value: 'I smoke cigarettes every day and I do not intend to stop.', matchingWeight: 100 },
      ],
    }];
    const started = Date.now();
    const evaluations = await semantic.evaluate('00000000-0000-4000-8000-000000000001', mine, candidates);
    console.log(JSON.stringify({ durationMs: Date.now() - started, evaluation: evaluations?.get('candidate-smoker') ?? null }, null, 2));
    if (!evaluations?.get('candidate-smoker')) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();
