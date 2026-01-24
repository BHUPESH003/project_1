import { Injectable } from '@nestjs/common';

@Injectable()
export class SellersService {
  findAvailableSellers() {
    // TODO: Filter by category, location, and ONLINE status
    // Expected query params: category, lat, lng
    // Return only sellers with status = ONLINE
    return { message: 'Find available sellers - to be implemented', data: [] };
  }

  findOne(id: string) {
    // TODO: Get seller profile by ID
    return { message: `Find seller #${id} - to be implemented` };
  }

  setStatus(statusDto: Record<string, unknown>) {
    // TODO: Update seller availability status
    // Expected payload: { status: "ONLINE" | "OFFLINE" }
    return { message: 'Set seller status - to be implemented' };
  }
}
