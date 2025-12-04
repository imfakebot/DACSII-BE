import { Module, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Account } from './entities/account.entity';
import { Role } from './entities/role.entity';
import { UserProfile } from './entities/users-profile.entity';
import { Address } from '../location/entities/address.entity';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Account, Role, UserProfile, Address]), MulterModule.registerAsync({
    useFactory: () => ({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const extension = extname(file.originalname);
          const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
          callback(null, filename);
        },
      }),

      limits: {
        fileSize: 5 * 1024 * 1024, // Giới hạn kích thước file tối đa 5MB
      },

      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return callback(new BadRequestException('Chỉ cho phép tải lên file ảnh!'), false);
        }
        callback(null, true);
      },
    }),
  }),],
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule { }
