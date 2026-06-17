"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Input, Select } from "@/components/ui/input";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getOrders } from "@/services/order.service";
import type { Order } from "@/types";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { getOrders().then((o) => { setOrders(o); setLoading(false); }); }, []);

  const filtered = useMemo(() => orders.filter((o) => {
    const matchSearch = !search || o.id.includes(search) || o.customerName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  }), [orders, search, statusFilter]);

  if (loading) return <PageLoader />;

  return (
    <div>
      <DashboardHeader title="Orders" description="Manage customer orders" />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input className="pl-9" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {["pending","confirmed","processing","shipped","delivered","cancelled","refunded"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>
      <div className="rounded-lg border bg-white">
        <Table>
          <THead><TR><TH>Order</TH><TH>Customer</TH><TH>Date</TH><TH>Total</TH><TH>Status</TH><TH>Payment</TH></TR></THead>
          <TBody>
            {filtered.map((o) => (
              <TR key={o.id}>
                <TD><Link href={`/dashboard/orders/${o.id}`} className="text-blue-600 hover:underline">{o.id}</Link></TD>
                <TD>{o.customerName}</TD>
                <TD>{formatDate(o.createdAt)}</TD>
                <TD>{formatCurrency(o.total)}</TD>
                <TD><Badge variant={statusBadge(o.status)}>{o.status}</Badge></TD>
                <TD><Badge variant={statusBadge(o.paymentStatus)}>{o.paymentStatus}</Badge></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
