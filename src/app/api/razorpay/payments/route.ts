import { NextResponse } from "next/server";
import { getRazorpayKeyId, getRazorpayKeySecret, isRazorpayConfigured } from "@/lib/razorpay/config";

export async function GET() {
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: "Razorpay is not configured" }, { status: 503 });
  }

  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  try {
    const res = await fetch("https://api.razorpay.com/v1/payments?count=50", {
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[razorpay/payments]", body);
      return NextResponse.json({ error: "Could not fetch Razorpay payments" }, { status: 502 });
    }

    const payload = (await res.json()) as {
      items?: Array<{
        id: string;
        amount: number;
        currency: string;
        status: string;
        method?: string;
        email?: string;
        contact?: string;
        order_id?: string;
        created_at?: number;
      }>;
    };

    return NextResponse.json({
      items: (payload.items || []).map((payment) => ({
        id: payment.id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        orderId: payment.order_id,
        createdAt: payment.created_at,
      })),
    });
  } catch (error) {
    console.error("[razorpay/payments]", error);
    return NextResponse.json({ error: "Could not fetch Razorpay payments" }, { status: 500 });
  }
}
