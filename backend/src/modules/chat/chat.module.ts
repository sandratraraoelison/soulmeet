import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatGateway } from './chat.gateway';
import { ChatRealtimeService } from './chat-realtime.service';
import { ChatService } from './chat.service';
import { ConversationsController } from './conversations.controller';
import { MessagesController } from './messages.controller';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [ConversationsController, MessagesController],
  providers: [ChatService, ChatGateway, ChatRealtimeService, WsJwtGuard],
  exports: [ChatService],
})
export class ChatModule {}
