import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard, RolesGuard, Roles } from '@/common/guards';
import { UserRole } from '@repo/types';
import { MessagingService } from './messaging.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Messaging')
@Controller('messaging')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // ─── WhatsApp webhook (public — no JWT) ──────────────────────────────────

  /** GET /messaging/webhook — WhatsApp verification challenge */
  @Get('webhook')
  @ApiOperation({ summary: 'WhatsApp webhook verification' })
  webhookVerify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const result = this.messagingService.verifyWebhook(mode, token, challenge);
    if (result !== null) {
      res.status(200).send(result);
    } else {
      res.status(403).send('Forbidden');
    }
  }

  /** POST /messaging/webhook — incoming WhatsApp messages */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'WhatsApp incoming message webhook' })
  async webhookReceive(@Body() payload: any) {
    await this.messagingService.handleWebhook(payload);
    return { status: 'ok' };
  }

  // ─── Conversations ────────────────────────────────────────────────────────

  /** POST /messaging/conversations — start a conversation with a seller */
  @Post('conversations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a conversation with a seller' })
  createConversation(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateConversationDto,
  ) {
    return this.messagingService.createConversation(req.user.id, dto);
  }

  /** GET /messaging/conversations — list conversations for the authenticated user/seller */
  @Get('conversations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List conversations for the current user or seller',
  })
  @ApiQuery({ name: 'as', enum: ['user', 'seller'], required: false })
  listConversations(
    @Request() req: { user: { id: string; role: string } },
    @Query('as') actorType?: 'user' | 'seller',
  ) {
    const type: 'user' | 'seller' =
      actorType ?? (req.user.role === 'SELLER' ? 'seller' : 'user');
    return this.messagingService.listConversations(req.user.id, type);
  }

  /** GET /messaging/conversations/:id/messages — paginated messages */
  @Get('conversations/:id/messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get messages for a conversation' })
  getMessages(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.messagingService.getMessages(
      id,
      req.user.id,
      Number(page),
      Number(limit),
    );
  }

  /** POST /messaging/conversations/:id/send — send a message */
  @Post('conversations/:id/send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.SELLER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send a message in a conversation (relayed via WhatsApp)',
  })
  @ApiQuery({ name: 'as', enum: ['user', 'seller'], required: false })
  sendMessage(
    @Param('id') id: string,
    @Request() req: { user: { id: string; role: string } },
    @Body() dto: SendMessageDto,
    @Query('as') actorType?: 'user' | 'seller',
  ) {
    const type: 'user' | 'seller' =
      actorType ?? (req.user.role === 'SELLER' ? 'seller' : 'user');
    return this.messagingService.sendMessage(req.user.id, type, id, dto);
  }
}
