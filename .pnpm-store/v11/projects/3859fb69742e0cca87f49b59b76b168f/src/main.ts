import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  const config = app.get(ConfigService);
  app.use(helmet());
  app.enableCors({
    origin: config
      .getOrThrow<string>('CORS_ORIGIN')
      .split(',')
      .map((v) => v.trim()),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  const swagger = new DocumentBuilder()
    .setTitle('Soulmeet API')
    .setDescription(`
API technique de Soulmeet pour l'application mobile Expo.

### Authentification
Les routes privées utilisent un access token JWT dans \`Authorization: Bearer <token>\`.
Utilisez **Authorize** après \`POST /api/v1/auth/login\`. Le refresh token sert uniquement aux routes refresh/logout.

### Temps réel et streaming
- Le chat privé utilise Socket.IO sur le même serveur avec un bearer token lors de la connexion.
- Guidance expose aussi un flux Server-Sent Events (SSE).

### Confidentialité
Les entrées Soulprint possèdent séparément un statut, une visibilité et une sensibilité. Les données privées ne sont pas exposées au matching.
`)
    .setVersion('1.0.0')
    .addServer('http://localhost:3000', 'Développement local')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Access token retourné par login, register, Google, Apple ou refresh' })
    .addTag('system', 'Santé et disponibilité de l’API')
    .addTag('auth', 'Inscription, connexion, OAuth, sessions et mots de passe')
    .addTag('profile', 'Profil et onboarding')
    .addTag('coach', 'Configuration du coach IA')
    .addTag('guidance', 'Conversations et mémoires du coach IA')
    .addTag('soulprint', 'Portrait structuré, extraction, confidentialité et historique')
    .addTag('growth', 'Objectifs, exercices, journal et progression')
    .addTag('users', 'Découverte, profils publics et compatibilité')
    .addTag('conversations', 'Conversations privées et historique paginé')
    .addTag('messages', 'Modification et suppression des messages privés')
    .addTag('notifications', 'Appareils push et préférences de notifications')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger), {
    customSiteTitle: 'Soulmeet API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
  });
  app.enableShutdownHooks();
  await app.listen(config.get<number>('PORT', 3000));
}
void bootstrap();
