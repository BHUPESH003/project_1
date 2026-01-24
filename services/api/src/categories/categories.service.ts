import { Injectable } from '@nestjs/common';

@Injectable()
export class CategoriesService {
  findAll() {
    // TODO: Return static category list from config/database
    // Example: [{ id: "printing", name: "Printing", status: "ACTIVE" }]
    return { message: 'Find all categories - to be implemented', data: [] };
  }
}
