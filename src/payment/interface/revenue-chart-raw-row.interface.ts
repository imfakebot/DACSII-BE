/**
 * @interface RevenueChartRawRow
 * @description Định nghĩa cấu trúc dữ liệu thô trả về từ query thống kê doanh thu theo tháng.
 */
export interface RevenueChartRawRow {
  month: string;
  revenue: string;
}
