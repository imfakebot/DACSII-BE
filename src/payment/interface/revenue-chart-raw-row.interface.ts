/**
 * @interface RevenueChartRawRow
 * @description Định nghĩa cấu trúc dữ liệu thô trả về từ một query SQL/TypeORM `.getRawMany()`
 * để thống kê doanh thu theo tháng. Các giá trị thường là chuỗi và cần được chuyển đổi.
 */
export interface RevenueChartRawRow {
  /**
   * Tháng trong năm, dưới dạng chuỗi.
   * @example '1', '12'
   */
  month: string;
  /**
   * Tổng doanh thu của tháng đó, dưới dạng chuỗi.
   * @example '15000000.00'
   */
  revenue: string;
}
