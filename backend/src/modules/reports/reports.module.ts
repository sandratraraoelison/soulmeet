import { Module } from '@nestjs/common'; import { JwtModule } from '@nestjs/jwt'; import { JwtAuthGuard } from '../auth/jwt-auth.guard'; import { ReportsController } from './reports.controller';
@Module({imports:[JwtModule.register({})],controllers:[ReportsController],providers:[JwtAuthGuard]}) export class ReportsModule {}
