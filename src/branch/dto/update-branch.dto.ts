import { PartialType } from '@nestjs/swagger';
import { CreateBranchDto } from './create-branch.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateBranchDto extends PartialType(CreateBranchDto) {
  @ApiPropertyOptional({
    description: 'Trạng thái hoạt động (true: hoạt động, false: tạm dừng)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
