import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GrowthController } from './growth.controller';
import { GrowthGoalsService } from './growth-goals.service';
import { GrowthReflectionService } from './growth-reflection.service';
import { GrowthService } from './growth.service';

@Module({
  imports: [AuthModule],
  controllers: [GrowthController],
  providers: [GrowthService, GrowthGoalsService, GrowthReflectionService],
})
export class GrowthModule {}
