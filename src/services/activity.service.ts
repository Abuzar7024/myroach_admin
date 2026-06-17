import { getOrders } from "./order.service";
import { getCustomers } from "./customer.service";
import { getProducts } from "./product.service";
import { getReviews } from "./review.service";
import type { ActivityItem } from "@/types";

export async function getRecentActivity(): Promise<ActivityItem[]> {
  const [orders, customers, products, reviews] = await Promise.all([
    getOrders(),
    getCustomers(),
    getProducts(),
    getReviews(),
  ]);

  const items: ActivityItem[] = [];

  orders.slice(0, 10).forEach((o) => {
    items.push({
      id: `order-${o.id}`,
      type: "order",
      message: `Order ${o.id.slice(0, 8)}… — ${o.status} — ₹${o.total}`,
      timestamp: o.createdAt,
      link: `/dashboard/orders/${o.id}`,
    });
  });

  customers.slice(0, 5).forEach((c) => {
    items.push({
      id: `cust-${c.uid}`,
      type: "customer",
      message: `New customer: ${c.name}`,
      timestamp: c.createdAt,
      link: `/dashboard/customers/${c.uid}`,
    });
  });

  products.filter((p) => p.stock <= 5).slice(0, 5).forEach((p) => {
    items.push({
      id: `prod-${p.id}`,
      type: "product",
      message: `Low stock: ${p.title} (${p.stock} left)`,
      timestamp: p.updatedAt,
      link: `/dashboard/products/${p.id}/edit`,
    });
  });

  reviews.filter((r) => !r.approved).slice(0, 5).forEach((r) => {
    items.push({
      id: `rev-${r.id}`,
      type: "review",
      message: `Review pending: ${r.author} — ${r.rating}★`,
      timestamp: r.createdAt,
      link: "/dashboard/reviews",
    });
  });

  return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 20);
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportOrdersCsv(): Promise<string> {
  const orders = await getOrders();
  const header = "id,customer,email,total,status,payment,date";
  const rows = orders.map((o) =>
    [o.id, o.customerName, o.customerEmail, o.total, o.status, o.paymentStatus, o.createdAt.toISOString()]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header, ...rows].join("\n");
}

export async function exportProductsCsv(): Promise<string> {
  const products = await getProducts();
  const header = "id,title,sku,price,stock,active,featured";
  const rows = products.map((p) =>
    [p.id, p.title, p.sku, p.price, p.stock, p.active, p.featured]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header, ...rows].join("\n");
}
