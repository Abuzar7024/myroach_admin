"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchRazorpayStatus } from "@/services/razorpay.service";
import { STORE_URL } from "@/lib/config";

export function RazorpayIntegrationCard() {
  const [status, setStatus] = useState<{
    configured: boolean;
    mode: string;
    keyId: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetchRazorpayStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  async function testConnection() {
    setTesting(true);
    try {
      const res = await fetch("/api/razorpay/status", { method: "POST" });
      const data = (await res.json()) as { connected?: boolean };
      setConnected(Boolean(data.connected));
    } catch {
      setConnected(false);
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          Razorpay Integration
          {status?.configured ? (
            <Badge variant="default">{status.mode === "live" ? "Live" : status.mode}</Badge>
          ) : (
            <Badge variant="secondary">Not configured</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-start gap-3">
          {status?.configured ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
          ) : (
            <XCircle className="mt-0.5 h-5 w-5 text-red-500" />
          )}
          <div>
            <p className="font-medium text-zinc-900">
              {status?.configured ? "API keys detected" : "Add Razorpay env vars on Vercel"}
            </p>
            <p className="mt-1 text-zinc-500">
              Key ID: <span className="font-mono">{status?.keyId || "—"}</span>
            </p>
            <p className="mt-2 text-zinc-500">
              Storefront checkout uses Razorpay for UPI and cards. COD stays separate.
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-zinc-50 p-3 text-xs text-zinc-600">
          <p className="font-medium text-zinc-800">Webhook URL (optional)</p>
          <p className="mt-1 break-all font-mono">{STORE_URL}/api/razorpay/webhook</p>
          <p className="mt-2">
            Add this in Razorpay Dashboard → Webhooks for payment.captured, payment.failed, and
            order.paid events.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={testConnection} disabled={testing}>
            {testing ? "Testing…" : "Test connection"}
          </Button>
          <Link
            href="/dashboard/payments"
            className="inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium transition-colors hover:bg-zinc-50"
          >
            View live payments
            <ExternalLink className="ml-1 h-3.5 w-3.5" />
          </Link>
        </div>

        {connected != null && (
          <p className={connected ? "text-emerald-700" : "text-red-600"}>
            {connected
              ? "Razorpay API connection successful."
              : "Could not connect to Razorpay — check key ID and secret in environment variables."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
