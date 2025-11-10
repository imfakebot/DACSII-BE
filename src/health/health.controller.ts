import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('api/health')
export class HealthController {
  constructor(private dataSource: DataSource) {}

  @Get()
  async check() {
    try {
      // Thử một query đơn giản để kiểm tra kết nối DB
      await this.dataSource.query('SELECT 1');
      return {
        status: 'ok',
        db: 'connected',
      };
    } catch (e) {
      return {
        status: 'error',
        db: 'disconnected',
        error: (e && e.message) ? e.message : String(e),
      };
    }
  }
}
