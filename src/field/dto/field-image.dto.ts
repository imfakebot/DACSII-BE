import { ApiProperty } from '@nestjs/swagger';

export class FieldImageDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  image_url!: string;

  @ApiProperty()
  isCover!: boolean;
}
