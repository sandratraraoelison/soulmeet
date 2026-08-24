import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatGateway } from './chat.gateway';
import { ChatRateLimiter } from './chat-rate-limiter.service';
import { ChatRealtimeService } from './chat-realtime.service';
import { ChatService } from './chat.service';
import { ConversationsController } from './conversations.controller';
import { MessagesController } from './messages.controller';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatMediaService } from './chat-media.service';
import { ChatMediaController } from './chat-media.controller';
import { SoulprintModule } from '../soulprint/soulprint.module';

@Module({
  imports: [forwardRef(() => AuthModule), NotificationsModule, forwardRef(() => SoulprintModule)],
  controllers: [ConversationsController, MessagesController, ChatMediaController],
  providers: [ChatService, ChatGateway, ChatRateLimiter, ChatRealtimeService, ChatMediaService, WsJwtGuard],
  exports: [ChatService],
})
export class ChatModule {}
