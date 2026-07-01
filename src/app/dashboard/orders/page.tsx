"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { AlertCircle, Search } from "lucide-react";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Input, Select } from "@/components/ui/input";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { subscribeOrders, updateOrderStatus } from "@/services/order.service";
import { subscribeOrderRequests } from "@/services/order-request.service";
import type { Order, OrderStatus } from "@/types";
import type { OrderRequest } from "@/lib/order-request";
import { toast } from "sonner";

const STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

function orderLabel(o: Order) {
  return o.orderNumber || o.id;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<OrderRequest[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    const unsub = subscribeOrders(
      (o) => {
        setOrders(o);
        setLoading(false);
        setLoadError(null);
      },
      (err) => {
        setLoading(false);
        setLoadError(
          err.message.includes("permission")
            ? "Cannot load orders — sign in with your admin account and deploy Firestore rules (firebase deploy --only firestore:rules)."
            : err.message || "Failed to load orders from Firestore."
        );
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeOrderRequests(setRequests);
    return unsub;
  }, []);

  const pendingByOrder = useMemo(() => {
    const map = new Map<string, number>();
    requests
      .filter((r) => r.status === "pending")
      .forEach((r) => map.set(r.orderId, (map.get(r.orderId) ?? 0) + 1));
    return map;
  }, [requests]);

  const pendingTotal = useMemo(
    () => requests.filter((r) => r.status === "pending").length,
    [requests]
  );

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        const q = search.toLowerCase();
        const matchSearch =
          !search ||
          o.id.toLowerCase().includes(q) ||
          o.orderNumber?.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          o.customerEmail?.toLowerCase().includes(q);
        const matchStatus = !statusFilter || o.status === statusFilter;
        return matchSearch && matchStatus;
      }),
    [orders, search, statusFilter]
  );

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    // Optimistic update — the live subscription confirms/corrects it.
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    try {
      await updateOrderStatus(orderId, status);
      toast.success(`Order status updated to ${status}`);
    } catch {
      toast.error("Couldn't update the order status. Try again.");
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <DashboardHeader
        title="Orders"
        description={
          pendingTotal > 0
            ? `Manage customer orders — ${pendingTotal} cancel/refund request${pendingTotal === 1 ? "" : "s"} need attention`
            : "Manage customer orders — updates live when customers checkout"
        }
      />

      {loadError && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{loadError}</p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            className="pl-9"
            placeholder="Search by order #, name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-lg border bg-white">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            {orders.length === 0 && !loadError ? (
              <>
                <p className="font-medium text-zinc-700">No orders yet</p>
                <p className="mt-2">
                  Orders appear here when a signed-in customer completes checkout on the storefront.
                  If you already placed a test order, check that Firestore rules are deployed and the customer was logged in.
                </p>
              </>
            ) : (
              <p>No orders match your filters.</p>
            )}
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Order</TH>
                <TH>Customer</TH>
                <TH>Date</TH>
                <TH>Total</TH>
                <TH>Status</TH>
                <TH>Payment</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((o) => (
                <TR key={o.id}>
                  <TD>
                    <Link href={`/dashboard/orders/${o.id}`} className="text-blue-600 hover:underline">
                      {orderLabel(o)}
                    </Link>
                    {(pendingByOrder.get(o.id) ?? 0) > 0 && (
                      <Badge variant="warning" className="ml-2">
                        {pendingByOrder.get(o.id)} request
                      </Badge>
                    )}
                  </TD>
                  <TD>{o.customerName || o.customerEmail || "—"}</TD>
                  <TD>{formatDate(o.createdAt)}</TD>
                  <TD>{formatCurrency(o.total)}</TD>
                  <TD>
                    {o.status === "refunded" || o.status === "cancelled" ? (
                      <div>
                        <Badge variant={statusBadge(o.status)}>{o.status}</Badge>
                        <p className="mt-1 text-[10px] text-zinc-400">Final — can&apos;t be changed</p>
                      </div>
                    ) : (
                      <Select
                        aria-label={`Status for ${orderLabel(o)}`}
                        value={o.status}
                        onChange={(e) => handleStatusChange(o.id, e.target.value as OrderStatus)}
                        className="h-8 py-0 text-xs capitalize"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    )}
                  </TD>
                  <TD>
                    <Badge variant={statusBadge(o.paymentStatus)}>{o.paymentStatus}</Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  );
}
