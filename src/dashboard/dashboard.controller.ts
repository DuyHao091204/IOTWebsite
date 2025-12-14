import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('stats')
  stats() {
    return this.service.getStats();
  }

  @Get('top-products')
  topProducts() {
    return this.service.getTopProducts();
  }
}
