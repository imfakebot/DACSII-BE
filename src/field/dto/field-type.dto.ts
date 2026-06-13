import { ApiProperty } from '@nestjs/swagger';

export class FieldTypeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Sân 5' })
  name!: string;

  @ApiProperty({ required: false })
  description?: string;
}
