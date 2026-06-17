"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getOrder, updateOrderStatus } from "@/services/order.service";
import type { Order, OrderStatus } from "@/types";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getOrder(id).then((o) => { setOrder(o); setLoading(false); }); }, [id]);

  async function handleStatusChange(status: OrderStatus) {
    await updateOrderStatus(id, status);
    setOrder((prev) => prev ? { ...prev, status } : null);
    toast.success("Order status updated");
  }

  function printInvoice() {
    window.print();
  }

  if (loading) return <PageLoader />;
  if (!order) return <p>Order not found</p>;

const STATUS_FLOW: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"];

  const currentIdx = STATUS_FLOW.indexOf(order.status);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <DashboardHeader title={`Order ${order.id}`} description={`Created ${formatDate(order.createdAt)}`} />
        <div className="flex gap-2">
          <Select value={order.status} onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}>
            {["pending","confirmed","processing","shipped","delivered","cancelled","refunded"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Button variant="outline" onClick={printInvoice}>Print Invoice</Button>
        </div>
      </div>

      <Card className="mb-6 no-print">
        <CardHeader><CardTitle>Order Timeline</CardTitle></CardHeader>
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
          <CardHeader><CardTitle>Order Items</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>Item</TH><TH>Qty</TH><TH>Price</TH></TR></THead>
              <TBody>
                {order.items.map((item, i) => (
                  <TR key={i}><TD>{item.title}</TD><TD>{item.quantity}</TD><TD>{formatCurrency(item.price)}</TD></TR>
                ))}
              </TBody>
            </Table>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(order.tax)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(order.shippingCharge)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(order.discount)}</span></div>
              <div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Name:</strong> {order.customerName}</p>
              <p><strong>Email:</strong> {order.customerEmail}</p>
              <p><strong>Payment:</strong> <Badge variant={statusBadge(order.paymentStatus)}>{order.paymentStatus}</Badge></p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Shipping Address</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <p>{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.address}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
              <p>{order.shippingAddress.phone}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
