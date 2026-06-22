"use client";

import { useEffect, useState } from "react";
import { CreditCard, RefreshCw, Radio, CheckCircle2, XCircle } from "lucide-react";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/skeleton";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  fetchRazorpayPayments,
  fetchRazorpayStatus,
  subscribeRazorpayEvents,
  type RazorpayPaymentEvent,
} from "@/services/razorpay.service";

type RazorpayApiPayment = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  email?: string;
  contact?: string;
  orderId?: string;
  createdAt?: number;
};

const statusVariant = (status: string) => {
  if (status === "captured" || status === "paid") return "default" as const;
  if (status === "failed") return "destructive" as const;
  return "secondary" as const;
};

export default function PaymentsPage() {
  const [status, setStatus] = useState<{
    configured: boolean;
    mode: string;
    keyId: string;
  } | null>(null);
  const [events, setEvents] = useState<RazorpayPaymentEvent[]>([]);
  const [apiPayments, setApiPayments] = useState<RazorpayApiPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadApiPayments() {
    try {
      const data = await fetchRazorpayPayments();
      setApiPayments(data.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load Razorpay payments");
    }
  }

  useEffect(() => {
    fetchRazorpayStatus()
      .then(setStatus)
      .catch(() => setStatus({ configured: false, mode: "unknown", keyId: "" }));

    const unsub = subscribeRazorpayEvents(setEvents, (err) => {
      console.warn("[razorpay-events]", err.message);
    });

    Promise.all([loadApiPayments()]).finally(() => setLoading(false));

    const interval = setInterval(loadApiPayments, 30000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await loadApiPayments();
    setRefreshing(false);
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <DashboardHeader
        title="Razorpay Payments"
        description="Live payment activity from your storefront and Razorpay account"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Account</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            {status?.configured ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <div>
              <p className="font-medium text-zinc-900">
                {status?.configured ? "Connected" : "Not configured"}
              </p>
              <p className="text-xs text-zinc-500">
                {status?.mode === "live" ? "Live mode" : status?.mode || "—"} · {status?.keyId || "No key"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Store events</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Radio className="h-5 w-5 text-cyan-600" />
            <div>
              <p className="font-medium text-zinc-900">{events.length} synced events</p>
              <p className="text-xs text-zinc-500">Real-time from checkout & webhooks</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Razorpay API</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-zinc-600" />
              <div>
                <p className="font-medium text-zinc-900">{apiPayments.length} recent payments</p>
                <p className="text-xs text-zinc-500">Refreshes every 30s</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`mr-1 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Live store events</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                No payment events yet. Events appear when customers pay on the storefront.
              </p>
            ) : (
              <ul className="divide-y">
                {events.map((event) => (
                  <li key={event.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{event.message}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {formatDate(event.createdAt)} · {event.source} · {event.eventType}
                        </p>
                        {event.customerEmail && (
                          <p className="mt-1 text-xs text-zinc-500">{event.customerEmail}</p>
                        )}
                        {event.razorpayPaymentId && (
                          <p className="mt-1 font-mono text-xs text-zinc-400">{event.razorpayPaymentId}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
                        <p className="mt-2 text-sm font-medium">{formatCurrency(event.amount)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Razorpay account payments</CardTitle>
          </CardHeader>
          <CardContent>
            {apiPayments.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">No payments returned from Razorpay yet.</p>
            ) : (
              <ul className="divide-y">
                {apiPayments.map((payment) => (
                  <li key={payment.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm text-zinc-900">{payment.id}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {payment.createdAt
                            ? formatDate(new Date(payment.createdAt * 1000))
                            : "—"}
                          {payment.method ? ` · ${payment.method}` : ""}
                        </p>
                        {payment.email && <p className="mt-1 text-xs text-zinc-500">{payment.email}</p>}
                      </div>
                      <div className="text-right">
                        <Badge variant={statusVariant(payment.status)}>{payment.status}</Badge>
                        <p className="mt-2 text-sm font-medium">{formatCurrency(payment.amount)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
