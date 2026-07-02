"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { runSave } from "@/lib/save-action";
import { subscribeOrder, updateOrderStatus, updateOrderTracking } from "@/services/order.service";
import { OrderRequestPanel } from "@/components/orders/order-request-panel";
import type { Order, OrderStatus } from "@/types";

const STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

const STATUS_FLOW: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<OrderStatus>("pending");
  const [savingStatus, setSavingStatus] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    const unsub = subscribeOrder(
      id,
      (o) => {
        setOrder(o);
        if (o) {
          setStatusDraft(o.status);
          setTrackingInput(o.trackingNumber ?? "");
        }
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        setLoadError(err.message);
      }
    );
    return unsub;
  }, [id]);

  async function saveStatus() {
    if (!order || statusDraft === order.status) return;
    setSavingStatus(true);
    await runSave(() => updateOrderStatus(id, statusDraft), {
      successMessage: `Order status set to ${statusDraft}`,
      liveOnStorefront: false,
    });
    setOrder((prev) => (prev ? { ...prev, status: statusDraft } : null));
    setSavingStatus(false);
  }

  async function saveTracking() {
    if (!trackingInput.trim()) {
      toast.error("Enter a tracking number");
      return;
    }
    setSavingTracking(true);
    await runSave(() => updateOrderTracking(id, trackingInput.trim()), {
      successMessage: "Tracking saved — customer can see it in their orders",
      liveOnStorefront: false,
    });
    setSavingTracking(false);
  }

  function printInvoice() {
    window.print();
  }

  if (loading) return <PageLoader />;
  if (loadError) {
    return (
      <div>
        <DashboardHeader title="Order" description="Could not load order" />
        <p className="text-sm text-red-600">{loadError}</p>
      </div>
    );
  }
  if (!order) return <p>Order not found</p>;

  const currentIdx = STATUS_FLOW.indexOf(order.status);
  const statusDirty = statusDraft !== order.status;
  const isTerminal = order.status === "cancelled" || order.status === "refunded";
  const displayId = order.orderNumber || order.id;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <DashboardHeader
          title={`Order ${displayId}`}
          description={`Created ${formatDate(order.createdAt)} · Firestore ID: ${order.id}`}
        />
        <Button variant="outline" onClick={printInvoice}>
          Print Invoice
        </Button>
      </div>

      <OrderRequestPanel orderId={order.id} orderTotal={order.total} />

      <Card className="mb-6 no-print">
        <CardHeader>
          <CardTitle>Update order status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          {isTerminal ? (
            <p className="text-sm text-zinc-500">
              This order is <Badge variant="destructive">{order.status}</Badge> — a final state,
              so its status can no longer be changed.
            </p>
          ) : (
            <>
              <div className="min-w-[200px] flex-1">
                <label className="mb-1 block text-xs font-medium text-zinc-500">Status</label>
                <Select
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value as OrderStatus)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              <Button onClick={saveStatus} disabled={!statusDirty || savingStatus}>
                {savingStatus ? "Saving..." : "Save status"}
              </Button>
              {statusDirty && (
                <p className="w-full text-xs text-zinc-500">
                  Current live status: <Badge variant={statusBadge(order.status)}>{order.status}</Badge>
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6 no-print">
        <CardHeader>
          <CardTitle>Order Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {STATUS_FLOW.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <Badge variant={order.status === s ? "secondary" : i <= currentIdx ? "success" : "default"}>
                  {s}
                </Badge>
                {i < STATUS_FLOW.length - 1 && <span className="text-zinc-300">→</span>}
              </div>
            ))}
            {(order.status === "cancelled" || order.status === "refunded") && (
              <Badge variant="destructive">{order.status}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH>Item</TH>
                  <TH>Qty</TH>
                  <TH>Price</TH>
                </TR>
              </THead>
              <TBody>
                {order.items.map((item, i) => (
                  <TR key={i}>
                    <TD>
                      {item.title}
                      {item.printSide && (
                        <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-600">
                          {item.printSide} print
                        </span>
                      )}
                    </TD>
                    <TD>{item.quantity}</TD>
                    <TD>{formatCurrency(item.price)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{formatCurrency(order.shippingCharge)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>Name:</strong> {order.customerName || order.shippingAddress.name || "—"}
              </p>
              <p>
                <strong>Email:</strong> {order.customerEmail || order.shippingAddress.email || "—"}
              </p>
              <p>
                <strong>Phone:</strong> {order.customerPhone || order.shippingAddress.phone || "—"}
              </p>
              <p>
                <strong>User ID:</strong> {order.userId || "—"}
              </p>
              <p>
                <strong>Payment:</strong>{" "}
                <Badge variant={statusBadge(order.paymentStatus)}>{order.paymentStatus}</Badge>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.address}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}
              </p>
              <p>{order.shippingAddress.country}</p>
              {order.shippingAddress.phone && (
                <p className="pt-2">
                  <strong>Phone:</strong> {order.shippingAddress.phone}
                </p>
              )}
              {order.shippingAddress.email && (
                <p>
                  <strong>Email:</strong> {order.shippingAddress.email}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="no-print">
            <CardHeader>
              <CardTitle>Shipment Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-zinc-500">
                Add a courier tracking number when you ship. Customers see it under Account → Orders.
              </p>
              <Input
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                placeholder="e.g. DTDC123456789IN"
              />
              {order.trackingNumber && (
                <p className="text-sm text-zinc-600">
                  Current: <span className="font-mono">{order.trackingNumber}</span>
                </p>
              )}
              <Button onClick={saveTracking} disabled={savingTracking}>
                {savingTracking ? "Saving..." : "Save tracking & mark shipped"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
