import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  subDays,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // ======================
  // 1) Doanh thu
  // ======================
  async getStats() {
    const now = new Date();

    // ---- Hôm nay ----
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const today = await this.getRevenue(todayStart, todayEnd);

    // ---- Hôm qua ----
    const yesterdayStart = startOfDay(subDays(now, 1));
    const yesterdayEnd = endOfDay(subDays(now, 1));

    const yesterday = await this.getRevenue(yesterdayStart, yesterdayEnd);

    // ---- Tuần trước ----
    const lastWeekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 }); // Monday
    const lastWeekEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });

    const lastWeek = await this.getRevenue(lastWeekStart, lastWeekEnd);

    // ---- Tháng trước ----
    const lastMonthStart = startOfMonth(subDays(now, 30));
    const lastMonthEnd = endOfMonth(subDays(now, 30));

    const lastMonth = await this.getRevenue(lastMonthStart, lastMonthEnd);

    return { today, yesterday, lastWeek, lastMonth };
  }

  // Function lấy doanh thu trong khoảng thời gian
  private async getRevenue(start: Date, end: Date) {
    const receipts = await this.prisma.receipt.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: 'PAID',
      },
      select: {
        totalPrice: true,
      },
    });

    const revenue = receipts.reduce((sum, r) => sum + Number(r.totalPrice), 0);
    const orders = receipts.length;

    return { revenue, orders };
  }

  // ======================
  // 2) Top sản phẩm bán chạy tháng này
  // ======================
  async getTopProducts() {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    const items = await this.prisma.receiptItem.groupBy({
      by: ['productId'],
      _sum: { qty: true },
      where: {
        receipt: {
          createdAt: { gte: monthStart, lte: monthEnd },
          status: 'PAID',
        },
      },
      orderBy: {
        _sum: { qty: 'desc' },
      },
      take: 10,
    });

    if (items.length === 0) return [];

    // Lấy thông tin sản phẩm
    const productIds = items.map((i) => i.productId);

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true },
    });

    // merge
    return items.map((i) => ({
      name: products.find((p) => p.id === i.productId)?.name ?? 'Unknown',
      sku: products.find((p) => p.id === i.productId)?.sku ?? 'N/A',
      sold: i._sum.qty ?? 0,
    }));
  }
}
