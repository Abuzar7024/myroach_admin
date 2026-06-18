"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Input, Select } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  OrderRequestPanel,
  OrderRequestListItem,
} from "@/components/orders/order-request-panel";
import { subscribeOrderRequests } from "@/services/order-request.service";
import { requestTypeLabel, type OrderRequest } from "@/lib/order-request";

export default function OrderRequestsPage() {
  const [requests, setRequests] = useState<OrderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [activeRespond, setActiveRespond] = useState<OrderRequest | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeOrderRequests(
      (data) => {
        setRequests(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        r.orderNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        (r.customerEmail ?? "").toLowerCase().includes(q);
      const matchStatus = !statusFilter || r.status === statusFilter;
      const matchType = !typeFilter || r.type === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [requests, search, statusFilter, typeFilter]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  if (loading) return <PageLoader />;

  return (
    <div>
      <DashboardHeader
        title="Order requests"
        description={
          pendingCount > 0
            ? `${pendingCount} refund/exchange request${pendingCount === 1 ? "" : "s"} waiting for review`
            : "Review customer cancellation, refund, and exchange requests from the storefront"
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          className="max-w-sm flex-1"
          placeholder="Search order #, customer, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Declined</option>
        </Select>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          <option value="refund">Refund</option>
          <option value="exchange">Exchange</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border bg-white px-6 py-12 text-center text-sm text-zinc-500">
          No requests match your filters.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => (
            <OrderRequestListItem key={req.id} req={req} onRespond={setActiveRespond} />
          ))}
        </div>
      )}

      {activeRespond && (
        <div className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-medium">
              Respond to {requestTypeLabel(activeRespond.type).toLowerCase()} request
            </h2>
            <Badge variant="warning">{activeRespond.orderNumber}</Badge>
          </div>
          <OrderRequestPanel
            orderId={activeRespond.orderId}
            orderTotal={activeRespond.orderTotal}
            initialActiveRequestId={activeRespond.id}
          />
        </div>
      )}
    </div>
  );
}
