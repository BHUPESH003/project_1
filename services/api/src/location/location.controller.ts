import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { LocationService } from './location.service';
import { ReverseGeocodeQueryDto } from './dto/reverse-geocode.dto';

/**
 * Location API – reverse geocode for home screen "Current Location".
 * GET /location/address?lat=28.61&lng=77.20
 */
@ApiTags('Location')
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('address')
  @ApiOperation({ summary: 'Get address from coordinates' })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lng', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Address details' })
  getAddress(@Query() query: ReverseGeocodeQueryDto) {
    return this.locationService.getAddressFromCoordinates(query.lat, query.lng);
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Search for location suggestions' })
  @ApiQuery({ name: 'query', required: true, type: String })
  @ApiResponse({ status: 200, description: 'List of suggestions' })
  getAutocomplete(@Query('query') query: string) {
    return this.locationService.getAutocomplete(query);
  }
}
