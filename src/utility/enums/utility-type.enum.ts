/**
 * @enum UtilityType
 * @description Phân loại một tiện ích là tiện nghi có sẵn tại sân hoặc là một sản phẩm để bán.
 */
export enum UtilityType {
  /**
   * @member AMENITY
   * @description Dành cho các tiện nghi có sẵn, không tính phí. Ví dụ: Wi-Fi, ghế chờ, phòng thay đồ.
   */
  AMENITY = 'amenity',

  /**
   * @member PRODUCT
   * @description Dành cho các sản phẩm có bán, có giá và cần thống kê doanh thu. Ví dụ: Nước uống, đồ ăn nhẹ.
   */
  PRODUCT = 'product',
}
