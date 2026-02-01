import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRepository } from './repositories/user.repository';
import { UserAddressRepository } from './repositories/user-address.repository';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [UsersController],
  providers: [UsersService, UserRepository, UserAddressRepository],
  exports: [UsersService, UserRepository, UserAddressRepository],
})
export class UsersModule {}
