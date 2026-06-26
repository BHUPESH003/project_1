import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/common/guards';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

/**
 * Users Controller - Profile, addresses, notification preferences (Phase 4G)
 * GET/PATCH /users/me, GET/POST/DELETE /users/me/addresses, GET/PATCH /users/me/notification-preferences
 */
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my profile' })
  @ApiResponse({ status: 200, description: 'Profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@Request() req: { user: { id: string } }) {
    return this.usersService.getMe(req.user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my profile' })
  @ApiResponse({ status: 200, description: 'Updated profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateMe(
    @Request() req: { user: { id: string } },
    @Body() body: { name?: string; email?: string },
  ) {
    return this.usersService.updateMe(req.user.id, body);
  }

  @Get('me/addresses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my saved addresses' })
  @ApiResponse({ status: 200, description: 'List of addresses' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyAddresses(@Request() req: { user: { id: string } }) {
    return this.usersService.getMyAddresses(req.user.id);
  }

  @Post('me/addresses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a saved address' })
  @ApiResponse({ status: 201, description: 'Address created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  addAddress(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateAddressDto,
  ) {
    return this.usersService.addAddress(req.user.id, dto);
  }

  @Patch('me/addresses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a saved address (receiver info, address line)' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Address updated' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  updateAddress(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(req.user.id, id, dto);
  }

  @Delete('me/addresses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a saved address' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Address deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  deleteAddress(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.usersService.deleteAddress(req.user.id, id);
  }

  @Get('me/notification-preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getNotificationPreferences(@Request() req: { user: { id: string } }) {
    return this.usersService.getNotificationPreferences(req.user.id);
  }

  @Patch('me/notification-preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Updated preferences' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateNotificationPreferences(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.usersService.updateNotificationPreferences(req.user.id, dto);
  }

  @Post('me/push-subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register browser web push subscription (VAPID)' })
  @ApiResponse({ status: 201, description: 'Subscription registered' })
  registerPushSubscription(
    @Request() req: { user: { id: string } },
    @Body() body: { endpoint: string; p256dhKey: string; authKey: string },
  ) {
    return this.usersService.registerWebPushSubscription(
      req.user.id,
      body.endpoint,
      body.p256dhKey,
      body.authKey,
    );
  }

  @Delete('me/push-subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unregister browser web push subscription' })
  @ApiResponse({ status: 200, description: 'Subscription removed' })
  unregisterPushSubscription(
    @Request() req: { user: { id: string } },
    @Body() body: { endpoint: string },
  ) {
    return this.usersService.unregisterWebPushSubscription(
      req.user.id,
      body.endpoint,
    );
  }
}

/**
 * MVP CHECK:
 * Q: Does every remaining endpoint directly support the MVP order flow or ops safety?
 * A: N/A - No endpoints remain. User management is handled via auth module.
 */
