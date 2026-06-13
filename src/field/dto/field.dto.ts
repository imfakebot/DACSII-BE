import { ApiProperty } from '@nestjs/swagger';
import { BranchResponseDto } from '@/branch/dto/branch-response.dto';
import { Utility } from '@/utility/entities/utility.entity';
import { FieldTypeDto } from './field-type.dto';
import { FieldImageDto } from './field-image.dto';

export class FieldDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Sân 5A' })
  name!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  status!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: () => FieldTypeDto })
  fieldType!: FieldTypeDto;

  @ApiProperty({ type: () => BranchResponseDto })
  branch!: BranchResponseDto;

  @ApiProperty({ type: [FieldImageDto] })
  images!: FieldImageDto[];

  @ApiProperty({ type: [Utility] })
  utilities!: Utility[];

  @ApiProperty({ required: false })
  averageRating?: number;

  @ApiProperty({ required: false })
  reviewCount?: number;

  @ApiProperty({required:false,description:'Khoảng cách đến người dùng (km)'})
  distance?:number
}
