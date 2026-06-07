import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '@/common/guards';
import { DiscoveryService } from './discovery.service';
import { GetDiscoverySellersDto } from './dto/get-discovery-sellers.dto';

@ApiTags('Discovery')
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  /**
   * GET /discovery/sellers
   *
   * Combined seller discovery: returns onboarded (verified) sellers from the DB
   * alongside nearby unverified sellers sourced from Google Places.
   *
   * - Verified sellers are ranked first and support ordering + messaging.
   * - Unverified sellers support messaging only (WhatsApp relay via Phase 4).
   * - Google Places results are cached per H3 zone (TTL 24h) to minimize API calls.
   * - Auth is optional — userId used to enrich isFavorited when present.
   */
  @Get('sellers')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Discover nearby sellers (verified + unverified from Google Places)',
  })
  discoverSellers(
    @Query() query: GetDiscoverySellersDto,
    @Request() req: { user?: { id: string } },
  ) {
    return this.discoveryService.discoverSellers(query, req.user?.id);
  }
}
