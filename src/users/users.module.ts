import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { Role } from './entities/role.entity';
import { UserProfile } from './entities/users-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Account, Role, UserProfile])],
  providers: [UsersService]
})
export class UsersModule { }
