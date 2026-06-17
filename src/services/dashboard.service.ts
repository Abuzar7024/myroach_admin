import { getOrders } from "./order.service";
import { getProducts } from "./product.service";
import { getCustomers } from "./customer.service";
import type { AnalyticsPeriod, DashboardStats } from "@/types";

export async function getDashboardStats(): Promise<DashboardStats & {
  revenueToday: number;
  ordersToday: number;
  averageOrderValue: number;
  conversionRate: number;
}> {
  const [orders, products, customers] = await Promise.all([
    getOrders(),
    getProducts(),
    getCustomers(),
  ]);

  const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter((o) => new Date(o.createdAt) >= today);
  const todayPaid = todayOrders.filter((o) => o.paymentStatus === "paid");
  const revenueToday = todayPaid.reduce((s, o) => s + o.total, 0);

  const averageOrderValue = paidOrders.length ? totalRevenue / paidOrders.length : 0;
  const conversionRate = customers.length ? (paidOrders.length / customers.length) * 100 : 0;

  return {
    totalRevenue,
    totalOrders: orders.length,
    totalCustomers: customers.length,
    totalProducts: products.filter((p) => p.active).length,
    pendingOrders: orders.filter((o) => o.status === "pending").length,
    lowStockProducts: products.filter((p) => p.stock <= 10 && p.active).length,
    revenueToday,
    ordersToday: todayOrders.length,
    averageOrderValue,
    conversionRate,
  };
}

export async function getAnalytics(period: "daily" | "weekly" | "monthly" | "yearly"): Promise<AnalyticsPeriod[]> {
  const orders = await getOrders();
  const paid = orders.filter((o) => o.paymentStatus === "paid");
  const now = new Date();
  const buckets: AnalyticsPeriod[] = [];

  if (period === "daily") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString("en-IN", { weekday: "short" });
      const dayOrders = paid.filter((o) => {
        const od = new Date(o.createdAt);
        return od.toDateString() === d.toDateString();
      });
      buckets.push({
        label,
        revenue: dayOrders.reduce((s, o) => s + o.total, 0),
        orders: dayOrders.length,
      });
    }
  } else if (period === "weekly") {
    for (let i = 3; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(start.getDate() - (i + 1) * 7);
      const end = new Date(now);
      end.setDate(end.getDate() - i * 7);
      const label = `W${4 - i}`;
      const weekOrders = paid.filter((o) => {
        const od = new Date(o.createdAt);
        return od >= start && od <= end;
      });
      buckets.push({
        label,
        revenue: weekOrders.reduce((s, o) => s + o.total, 0),
        orders: weekOrders.length,
      });
    }
  } else if (period === "monthly") {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-IN", { month: "short" });
      const monthOrders = paid.filter((o) => {
        const od = new Date(o.createdAt);
        return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
      });
      buckets.push({
        label,
        revenue: monthOrders.reduce((s, o) => s + o.total, 0),
        orders: monthOrders.length,
      });
    }
  } else {
    for (let i = 2; i >= 0; i--) {
      const year = now.getFullYear() - i;
      const yearOrders = paid.filter((o) => new Date(o.createdAt).getFullYear() === year);
      buckets.push({
        label: String(year),
        revenue: yearOrders.reduce((s, o) => s + o.total, 0),
        orders: yearOrders.length,
      });
    }
  }

  return buckets;
}

export async function getTopProducts(): Promise<{ title: string; sales: number; revenue: number }[]> {
  const orders = await getOrders();
  const map = new Map<string, { title: string; sales: number; revenue: number }>();

  for (const order of orders) {
    if (order.paymentStatus !== "paid") continue;
    for (const item of order.items) {
      const existing = map.get(item.productId) ?? { title: item.title, sales: 0, revenue: 0 };
      existing.sales += item.quantity;
      existing.revenue += item.price * item.quantity;
      map.set(item.productId, existing);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.sales - a.sales).slice(0, 10);
}

export async function getOrderStatusBreakdown(): Promise<Record<string, number>> {
  const orders = await getOrders();
  const breakdown: Record<string, number> = {};
  for (const o of orders) {
    breakdown[o.status] = (breakdown[o.status] ?? 0) + 1;
  }
  return breakdown;
}

export async function getRevenueByCategory(): Promise<{ name: string; revenue: number }[]> {
  const [orders, products, categories] = await Promise.all([
    getOrders(),
    getProducts(),
    import("./category.service").then((m) => m.getCategories()),
  ]);

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const productCat = new Map(products.map((p) => [p.id, p.categoryId]));
  const revenue: Record<string, number> = {};

  for (const order of orders) {
    if (order.paymentStatus !== "paid") continue;
    for (const item of order.items) {
      const catId = productCat.get(item.productId) ?? "other";
      const catName = catMap.get(catId) ?? "Other";
      revenue[catName] = (revenue[catName] ?? 0) + item.price * item.quantity;
    }
  }

  return Object.entries(revenue)
    .map(([name, rev]) => ({ name, revenue: rev }))
    .sort((a, b) => b.revenue - a.revenue);
}
