"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, FileSpreadsheet } from "lucide-react";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { getDashboardStats } from "@/services/dashboard.service";
import { downloadCsv, exportOrdersCsv, exportProductsCsv } from "@/services/activity.service";
import { exportSubscribersCsv } from "@/services/subscriber.service";

export default function ReportsPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getDashboardStats>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then((s) => { setStats(s); setLoading(false); });
  }, []);

  async function exportOrders() {
    const csv = await exportOrdersCsv();
    downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  async function exportProducts() {
    const csv = await exportProductsCsv();
    downloadCsv(`products-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  async function exportSubs() {
    const csv = await exportSubscribersCsv();
    downloadCsv(`subscribers-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  if (loading || !stats) return <PageLoader />;

  return (
    <div>
      <DashboardHeader title="Reports & Export" description="Download store data for analysis" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card><CardContent className="p-5"><p className="text-sm text-zinc-500">Revenue</p><p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-zinc-500">Orders</p><p className="text-2xl font-bold">{stats.totalOrders}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-zinc-500">AOV</p><p className="text-2xl font-bold">{formatCurrency(stats.averageOrderValue)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-zinc-500">Conversion</p><p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p></CardContent></Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet size={18} /> Orders</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-zinc-500">Export all orders with status, payment, and totals.</p>
            <Button className="gap-2" onClick={exportOrders}><Download size={16} /> Export Orders CSV</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet size={18} /> Products</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-zinc-500">Export product catalog with stock and pricing.</p>
            <Button className="gap-2" onClick={exportProducts}><Download size={16} /> Export Products CSV</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet size={18} /> Subscribers</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-zinc-500">Export newsletter email list.</p>
            <Button className="gap-2" onClick={exportSubs}><Download size={16} /> Export Subscribers CSV</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Quick Links</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/dashboard/analytics"><Button variant="outline">Analytics</Button></Link>
          <Link href="/dashboard/inventory"><Button variant="outline">Inventory</Button></Link>
          <Link href="/dashboard/orders"><Button variant="outline">Orders</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
}
