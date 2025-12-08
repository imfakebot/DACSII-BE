import { PartialType } from '@nestjs/swagger';
import { CreateUtilityDto } from './create-utility.dto';

/**
 * @class UpdateUtilityDto
 * @description Data Transfer Object (DTO) để cập nhật một tiện ích/sản phẩm.
 * Kế thừa từ `CreateUtilityDto` và sử dụng `PartialType` để làm cho tất cả các trường trở nên tùy chọn.
 */
export class UpdateUtilityDto extends PartialType(CreateUtilityDto) {}
