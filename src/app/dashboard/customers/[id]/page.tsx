"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getCustomer, updateCustomer } from "@/services/customer.service";
import { getOrders } from "@/services/order.service";
import type { User, Order } from "@/types";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getCustomer(id), getOrders()]).then(([c, allOrders]) => {
      setCustomer(c);
      setOrders(allOrders.filter((o) => o.userId === id));
      setLoading(false);
    });
  }, [id]);

  async function toggleActive() {
    if (!customer) return;
    await updateCustomer(id, { active: !customer.active });
    setCustomer({ ...customer, active: !customer.active });
    toast.success("Customer updated");
  }

  if (loading) return <PageLoader />;
  if (!customer) return <p>Customer not found</p>;

  const totalSpent = orders.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <DashboardHeader title={customer.name} description={customer.email} />
        <Button variant="outline" onClick={toggleActive}>
          {customer.active ? "Disable Customer" : "Enable Customer"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Email:</strong> {customer.email}</p>
            <p><strong>Joined:</strong> {formatDate(customer.createdAt)}</p>
            <p><strong>Status:</strong> <Badge variant={customer.active ? "success" : "destructive"}>{customer.active ? "Active" : "Disabled"}</Badge></p>
            <p><strong>Total Spent:</strong> {formatCurrency(totalSpent)}</p>
            <p><strong>Orders:</strong> {orders.length}</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Order History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>Order</TH><TH>Date</TH><TH>Total</TH><TH>Status</TH></TR></THead>
              <TBody>
                {orders.map((o) => (
                  <TR key={o.id}>
                    <TD>{o.id}</TD>
                    <TD>{formatDate(o.createdAt)}</TD>
                    <TD>{formatCurrency(o.total)}</TD>
                    <TD><Badge variant={statusBadge(o.status)}>{o.status}</Badge></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
