import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class FieldsService {
  constructor(private dataSource: DataSource) {}

  async findAll() {
    // Trả về danh sách sân với tên loại sân, thành phố và giá giờ (lấy MIN price từ time_slots)
    // Kết quả: { id, name, description, status, fieldType, city, pricePerHour }
    const fields = await this.dataSource.query(
      `SELECT f.id, f.name, f.description, f.status,
              ft.name AS fieldType,
              c.name AS city,
                (SELECT MIN(ts.price) FROM time_slots ts WHERE ts.field_type_id = f.field_type_id) AS pricePerHour,
                (SELECT AVG(r.rating) FROM reviews r WHERE r.field_id = f.id) AS avgRating
       FROM fields f
       LEFT JOIN field_types ft ON ft.id = f.field_type_id
       LEFT JOIN addresses a ON a.id = f.address_id
       LEFT JOIN cities c ON c.id = a.city_id`
    );

    // Gắn mảng ảnh cho mỗi field
    for (const f of fields) {
      const imgs = await this.dataSource.query(
        `SELECT image_url, is_cover FROM field_images WHERE field_id = ? ORDER BY is_cover DESC`,
        [f.id],
      );
      f.images = imgs.map((r: any) => r.image_url);
      f.pricePerHour = f.pricePerHour !== null && f.pricePerHour !== undefined ? Number(f.pricePerHour) : null;
    }

    return fields;
  }

  async findOne(id: string) {
    const rows = await this.dataSource.query(
      `SELECT f.id, f.name, f.description, f.status,
              ft.name AS fieldType,
              c.name AS city,
              (SELECT MIN(ts.price) FROM time_slots ts WHERE ts.field_type_id = f.field_type_id) AS pricePerHour
       FROM fields f
       LEFT JOIN field_types ft ON ft.id = f.field_type_id
       LEFT JOIN addresses a ON a.id = f.address_id
       LEFT JOIN cities c ON c.id = a.city_id
       WHERE f.id = ? LIMIT 1`,
      [id],
    );

    if (!rows || rows.length === 0) return null;
    const f = rows[0];
    const imgs = await this.dataSource.query(
      `SELECT image_url, is_cover FROM field_images WHERE field_id = ? ORDER BY is_cover DESC`,
      [f.id],
    );
    f.images = imgs.map((r: any) => r.image_url);
    f.pricePerHour = f.pricePerHour !== null && f.pricePerHour !== undefined ? Number(f.pricePerHour) : null;
    return f;
  }
}
