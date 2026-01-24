import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  create(createUserDto: Record<string, unknown>) {
    return { message: 'Create user - to be implemented', data: createUserDto };
  }

  findAll() {
    return { message: 'Find all users - to be implemented', data: [] };
  }

  findOne(id: string) {
    return { message: `Find user #${id} - to be implemented` };
  }

  update(id: string, updateUserDto: Record<string, unknown>) {
    return {
      message: `Update user #${id} - to be implemented`,
      data: updateUserDto,
    };
  }

  remove(id: string) {
    return { message: `Remove user #${id} - to be implemented` };
  }
}
