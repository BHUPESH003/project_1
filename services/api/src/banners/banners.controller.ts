import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BannersService } from './banners.service';

/**
 * Public banners API – home screen carousel.
 * GET /banners
 */
@ApiTags('Banners')
@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  @ApiOperation({ summary: 'List active banners for carousel' })
  @ApiResponse({
    status: 200,
    description: 'Active banners sorted by displayOrder',
  })
  list() {
    return this.bannersService.findActive();
  }
}
