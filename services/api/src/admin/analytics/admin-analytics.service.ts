import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@repo/types';
import { PrismaService } from '@/prisma/prisma.service';
import {
  GetOrdersAnalyticsDto,
  AnalyticsGranularity,
} from './dto/get-orders-analytics.dto';
import { GetSellersAnalyticsDto } from './dto/get-sellers-analytics.dto';

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prismaService: PrismaService) {}

  async getOverview() {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      ordersByStatus,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      activeSellers,
      totalSellers,
      activeUsers,
    ] = await Promise.all([
      this.prismaService.prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prismaService.prisma.order.aggregate({
        where: {
          status: OrderStatus.DELIVERED,
          completedAt: { gte: todayStart },
        },
        _sum: { totalAmount: true },
      }),
      this.prismaService.prisma.order.aggregate({
        where: {
          status: OrderStatus.DELIVERED,
          completedAt: { gte: weekStart },
        },
        _sum: { totalAmount: true },
      }),
      this.prismaService.prisma.order.aggregate({
        where: {
          status: OrderStatus.DELIVERED,
          completedAt: { gte: monthStart },
        },
        _sum: { totalAmount: true },
      }),
      this.prismaService.prisma.seller.count({ where: { status: 'ONLINE' } }),
      this.prismaService.prisma.seller.count(),
      this.prismaService.prisma.user.count({
        where: { orders: { some: {} } },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const row of ordersByStatus) {
      statusMap[row.status] = row._count.id;
    }

    return {
      orders: {
        total: Object.values(statusMap).reduce((a, b) => a + b, 0),
        byStatus: statusMap,
      },
      revenue: {
        today:
          todayRevenue._sum.totalAmount != null
            ? Number(todayRevenue._sum.totalAmount)
            : 0,
        thisWeek:
          weekRevenue._sum.totalAmount != null
            ? Number(weekRevenue._sum.totalAmount)
            : 0,
        thisMonth:
          monthRevenue._sum.totalAmount != null
            ? Number(monthRevenue._sum.totalAmount)
            : 0,
      },
      sellers: {
        active: activeSellers,
        total: totalSellers,
      },
      users: {
        withOrders: activeUsers,
      },
    };
  }

  async getOrdersAnalytics(dto: GetOrdersAnalyticsDto) {
    const now = new Date();
    const endDate = dto.endDate ? new Date(dto.endDate) : now;
    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);

    const granularity = dto.granularity ?? AnalyticsGranularity.DAILY;
    const truncUnit =
      { daily: 'day', weekly: 'week', monthly: 'month' }[granularity] ?? 'day';

    const [
      ordersOverTime,
      avgResult,
      totalOrders,
      cancelledOrders,
      assignedOrders,
      rejectedOrders,
    ] = await Promise.all([
      this.prismaService.prisma.$queryRaw<
        { period: Date; count: number; revenue: number }[]
      >`
        SELECT date_trunc(${truncUnit}, created_at) AS period,
               COUNT(*)::int                        AS count,
               COALESCE(SUM(total_amount), 0)::float AS revenue
        FROM orders
        WHERE created_at BETWEEN ${startDate} AND ${endDate}
        GROUP BY period
        ORDER BY period ASC
      `,
      this.prismaService.prisma.order.aggregate({
        where: {
          status: OrderStatus.DELIVERED,
          completedAt: { gte: startDate, lte: endDate },
        },
        _avg: { totalAmount: true },
      }),
      this.prismaService.prisma.order.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prismaService.prisma.order.count({
        where: {
          status: {
            in: [OrderStatus.USER_CANCELLED, OrderStatus.ORDER_EXPIRED],
          },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prismaService.prisma.order.count({
        where: {
          sellerId: { not: null },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prismaService.prisma.order.count({
        where: {
          status: OrderStatus.SELLER_REJECTED,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    return {
      ordersOverTime: ordersOverTime.map((r) => ({
        period: r.period,
        count: Number(r.count),
        revenue: Number(r.revenue),
      })),
      averageOrderValue:
        avgResult._avg.totalAmount != null
          ? Number(avgResult._avg.totalAmount)
          : 0,
      cancellationRate: totalOrders > 0 ? cancelledOrders / totalOrders : 0,
      sellerRejectionRate:
        assignedOrders > 0 ? rejectedOrders / assignedOrders : 0,
    };
  }

  async getSellersAnalytics(dto: GetSellersAnalyticsDto) {
    const limit = dto.limit ?? 10;

    const [byRevenue, byOrderCount, fulfillmentTime, acceptanceStats] =
      await Promise.all([
        // Top sellers by revenue (DELIVERED orders)
        this.prismaService.prisma.order.groupBy({
          by: ['sellerId'],
          where: { status: OrderStatus.DELIVERED, sellerId: { not: null } },
          _sum: { totalAmount: true },
          orderBy: { _sum: { totalAmount: 'desc' } },
          take: limit,
        }),
        // Top sellers by order count (all statuses)
        this.prismaService.prisma.order.groupBy({
          by: ['sellerId'],
          where: { sellerId: { not: null } },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: limit,
        }),
        // Average minutes from order creation to delivery per seller
        this.prismaService.prisma.$queryRaw<
          { seller_id: string; avg_minutes: number }[]
        >`
          SELECT seller_id,
                 ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60))::float AS avg_minutes
          FROM orders
          WHERE status = 'DELIVERED'
            AND completed_at IS NOT NULL
            AND seller_id IS NOT NULL
          GROUP BY seller_id
          ORDER BY avg_minutes ASC
          LIMIT ${limit}
        `,
        // Acceptance rate: (assigned - rejected) / assigned per seller
        this.prismaService.prisma.$queryRaw<
          { seller_id: string; total_assigned: number; rejected: number }[]
        >`
          SELECT seller_id,
                 COUNT(*)::int AS total_assigned,
                 SUM(CASE WHEN status = 'SELLER_REJECTED' THEN 1 ELSE 0 END)::int AS rejected
          FROM orders
          WHERE seller_id IS NOT NULL
          GROUP BY seller_id
          HAVING COUNT(*) > 0
        `,
      ]);

    // Batch-load seller names for all returned IDs
    const sellerIds = [
      ...new Set([
        ...byRevenue.map((r) => r.sellerId).filter(Boolean),
        ...byOrderCount.map((r) => r.sellerId).filter(Boolean),
        ...fulfillmentTime.map((r) => r.seller_id),
        ...acceptanceStats.map((r) => r.seller_id),
      ]),
    ] as string[];

    const sellers = await this.prismaService.prisma.seller.findMany({
      where: { id: { in: sellerIds } },
      select: { id: true, shopName: true },
    });
    const sellerMap = new Map(sellers.map((s) => [s.id, s.shopName]));

    return {
      byRevenue: byRevenue.map((r) => ({
        sellerId: r.sellerId,
        shopName: sellerMap.get(r.sellerId!) ?? null,
        revenue: r._sum.totalAmount != null ? Number(r._sum.totalAmount) : 0,
      })),
      byOrderCount: byOrderCount.map((r) => ({
        sellerId: r.sellerId,
        shopName: sellerMap.get(r.sellerId!) ?? null,
        orderCount: r._count.id,
      })),
      fulfillmentTime: fulfillmentTime.map((r) => ({
        sellerId: r.seller_id,
        shopName: sellerMap.get(r.seller_id) ?? null,
        avgMinutes: Number(r.avg_minutes),
      })),
      acceptanceRate: acceptanceStats.map((r) => ({
        sellerId: r.seller_id,
        shopName: sellerMap.get(r.seller_id) ?? null,
        rate:
          r.total_assigned > 0
            ? Math.round(
                ((r.total_assigned - r.rejected) / r.total_assigned) * 100,
              ) / 100
            : 1,
        totalAssigned: r.total_assigned,
        rejected: r.rejected,
      })),
    };
  }
}
