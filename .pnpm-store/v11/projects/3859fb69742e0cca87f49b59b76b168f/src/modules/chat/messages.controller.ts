import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ChatService } from './chat.service';
import { UpdateMessageBodyDto } from './dto/chat.dto';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly chat: ChatService) {}

  @Patch(':messageId')
  @ApiOperation({ summary: 'Edit an owned message within 15 minutes' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('messageId') messageId: string,
    @Body() dto: UpdateMessageBodyDto,
  ) {
    return this.chat.update(user.sub, messageId, dto.content);
  }

  @Delete(':messageId')
  @ApiOperation({ summary: 'Soft-delete an owned message within 15 minutes' })
  delete(
    @CurrentUser() user: JwtPayload,
    @Param('messageId') messageId: string,
  ) {
    return this.chat.delete(user.sub, messageId);
  }
}
