import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

/**
 * @class GeocodeAddressDto
 * @description DTO để nhận dữ liệu địa chỉ cho việc geocoding.
 */
export class GeocodeAddressDto {
    /**
     * @property {string} street - Địa chỉ cụ thể của sân (số nhà, tên đường).
     * @description Bắt buộc, không được để trống.
     */
    @ApiProperty({ description: 'Số nhà, tên đường', example: '123 Võ Văn Ngân' })
    @IsString()
    @IsNotEmpty()
    street!: string;

    /**
     * @property {number} wardId - ID của Phường/Xã nơi sân bóng tọa lạc.
     * @description Bắt buộc, phải là một số.
     */
    @ApiProperty({ description: 'ID của Phường/Xã' })
    @IsNumber()
    @IsNotEmpty()
    wardId!: number;

    /**
     * @property {number} cityId - ID của Tỉnh/Thành phố nơi sân bóng tọa lạc.
     * @description Bắt buộc, phải là một số.
     */
    @ApiProperty({ description: 'ID của Tỉnh/Thành phố' })
    @IsNumber()
    @IsNotEmpty()
    cityId!: number;
}