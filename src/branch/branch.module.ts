import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from './entities/branch.entity';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { LocationModule } from '@/location/locations.module';
import { AuthModule } from '@/auth/auth.module';
import { UsersModule } from '@/user/users.module';
import { UserProfile } from '@/user/entities/users-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Branch, UserProfile]),
    LocationModule,
    forwardRef(() => UsersModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [BranchController],
  providers: [BranchService],
  exports: [TypeOrmModule, BranchService],
})
export class BranchModule { }
