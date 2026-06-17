"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, TrendingUp, ShoppingBag, Users, Package, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, STORE_URL } from "@/lib/utils";
import { getDashboardStats, getAnalytics, getTopProducts } from "@/services/dashboard.service";
import { getOrders } from "@/services/order.service";
import { getCustomers } from "@/services/customer.service";
import { getLowStockProducts } from "@/services/product.service";
import type { AnalyticsPeriod, Order, User } from "@/types";

type Stats = Awaited<ReturnType<typeof getDashboardStats>>;

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsPeriod[]>([]);
  const [topProducts, setTopProducts] = useState<{ title: string; sales: number; revenue: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<User[]>([]);
  const [lowStock, setLowStock] = useState<Awaited<ReturnType<typeof getLowStockProducts>>>([]);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("weekly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [s, orders, customers, low, top, anal] = await Promise.all([
          getDashboardStats(),
          getOrders(),
          getCustomers(),
          getLowStockProducts(),
          getTopProducts(),
          getAnalytics(period),
        ]);
        if (cancelled) return;
        setStats(s);
        setRecentOrders(orders.slice(0, 5));
        setRecentCustomers(customers.slice(0, 5));
        setLowStock(low);
        setTopProducts(top);
        setAnalytics(anal);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dashboard data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [period]);

  if (loading) return <PageLoader />;
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-800">Failed to load data</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
        <p className="mt-2 text-xs text-red-500">Ensure Firebase rules allow admin read access and you are logged in.</p>
      </div>
    );
  }
  if (!stats) return null;

  const statCards = [
    { label: "Total Revenue", value: formatCurrency(stats.totalRevenue), icon: TrendingUp, sub: `Today: ${formatCurrency(stats.revenueToday)}` },
    { label: "Total Orders", value: stats.totalOrders, icon: ShoppingBag, sub: `Today: ${stats.ordersToday}` },
    { label: "Customers", value: stats.totalCustomers, icon: Users, sub: `AOV: ${formatCurrency(stats.averageOrderValue)}` },
    { label: "Active Products", value: stats.totalProducts, icon: Package, sub: `${stats.conversionRate.toFixed(1)}% conversion` },
    { label: "Pending Orders", value: stats.pendingOrders, icon: AlertTriangle, sub: "Needs action", warn: stats.pendingOrders > 0 },
    { label: "Low Stock", value: stats.lowStockProducts, icon: Package, sub: "≤10 units", warn: stats.lowStockProducts > 0 },
  ];

  return (
    <div>
      <DashboardHeader
        title="Dashboard"
        description="Live store performance from Firebase"
        actions={
          <a href={STORE_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2">
              <ExternalLink size={16} /> View Store
            </Button>
          </a>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((s) => (
          <Card key={s.label} className={s.warn ? "border-amber-200" : ""}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-500">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold">{s.value}</p>
                  <p className="mt-1 text-xs text-zinc-400">{s.sub}</p>
                </div>
                <s.icon className="h-5 w-5 text-zinc-400" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex gap-2">
        {(["daily", "weekly", "monthly", "yearly"] as const).map((p) => (
          <Button key={p} variant={period === p ? "default" : "outline"} size="sm" onClick={() => setPeriod(p)}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </Button>
        ))}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue Trends</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Line type="monotone" dataKey="revenue" stroke="#18181b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Orders Trends</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="orders" fill="#52525b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Link href="/dashboard/orders"><Button variant="ghost" size="sm">View all</Button></Link>
          </CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>Order</TH><TH>Customer</TH><TH>Total</TH><TH>Status</TH></TR></THead>
              <TBody>
                {recentOrders.length === 0 ? (
                  <TR><TD colSpan={4} className="text-center text-zinc-500">No orders yet</TD></TR>
                ) : recentOrders.map((o) => (
                  <TR key={o.id}>
                    <TD><Link href={`/dashboard/orders/${o.id}`} className="text-blue-600 hover:underline">{o.id.slice(0, 12)}…</Link></TD>
                    <TD>{o.customerName || "—"}</TD>
                    <TD>{formatCurrency(o.total)}</TD>
                    <TD><Badge variant={statusBadge(o.status)}>{o.status}</Badge></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top Products</CardTitle>
            <Link href="/dashboard/products"><Button variant="ghost" size="sm">View all</Button></Link>
          </CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>Product</TH><TH>Sales</TH><TH>Revenue</TH></TR></THead>
              <TBody>
                {topProducts.length === 0 ? (
                  <TR><TD colSpan={3} className="text-center text-zinc-500">No sales data</TD></TR>
                ) : topProducts.map((p) => (
                  <TR key={p.title}><TD>{p.title}</TD><TD>{p.sales}</TD><TD>{formatCurrency(p.revenue)}</TD></TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent Customers</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>Name</TH><TH>Email</TH><TH>Joined</TH></TR></THead>
              <TBody>
                {recentCustomers.map((c) => (
                  <TR key={c.uid}>
                    <TD><Link href={`/dashboard/customers/${c.uid}`} className="text-blue-600 hover:underline">{c.name}</Link></TD>
                    <TD>{c.email}</TD>
                    <TD>{formatDate(c.createdAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Low Stock Alerts</CardTitle>
            <Link href="/dashboard/inventory"><Button variant="ghost" size="sm">Manage</Button></Link>
          </CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>Product</TH><TH>Stock</TH><TH>SKU</TH></TR></THead>
              <TBody>
                {lowStock.length === 0 ? (
                  <TR><TD colSpan={3} className="text-center text-zinc-500">All stock levels healthy</TD></TR>
                ) : lowStock.map((p) => (
                  <TR key={p.id}><TD>{p.title}</TD><TD><Badge variant="warning">{p.stock}</Badge></TD><TD>{p.sku}</TD></TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
