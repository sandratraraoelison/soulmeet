import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import type { AddressInfo } from 'net';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import { DailyCoachCheckInService } from '../src/modules/guidance/daily-coach-check-in.service';
import { SoulprintExtractionQueueService } from '../src/modules/soulprint/services/soulprint-extraction-queue.service';
import { AppModule } from '../src/app.module';

/**
 * End-to-end test booting the real application module and exercising the HTTP
 * pipeline (global prefix, validation pipe, exception filter) against a live
 * server. Prisma is not available in CI, so the AppModule must only be
 * instantiated — the health route does not touch the database.
 */
describe('App (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      // The health route never touches the database, so replace Prisma with a
      // stub and disable the background workers to keep the e2e hermetic.
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(SoulprintExtractionQueueService)
      .useValue({})
      .overrideProvider(DailyCoachCheckInService)
      .useValue({})
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(
      (
        req: { id?: string },
        res: { setHeader: (name: string, value: string) => void },
        next: () => void,
      ) => {
        res.setHeader('x-request-id', req.id ?? randomUUID());
        next();
      },
    );
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    await app.listen(0);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns ok through the full pipeline', async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });

  it('adds a correlation id header to every response', async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    expect(response.headers.get('x-request-id')).toBeTruthy();
  });
});
