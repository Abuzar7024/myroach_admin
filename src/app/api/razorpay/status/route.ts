import { NextResponse } from "next/server";
import {
  getRazorpayKeyId,
  getRazorpayKeySecret,
  isRazorpayConfigured,
  maskRazorpayKeyId,
  getRazorpayMode,
} from "@/lib/razorpay/config";

export async function GET() {
  const keyId = getRazorpayKeyId();
  return NextResponse.json({
    configured: isRazorpayConfigured(),
    mode: getRazorpayMode(keyId),
    keyId: maskRazorpayKeyId(keyId),
  });
}

export async function POST() {
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: "Razorpay is not configured" }, { status: 503 });
  }

  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  try {
    const res = await fetch("https://api.razorpay.com/v1/payments?count=1", {
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ connected: false, error: "Invalid Razorpay credentials" }, { status: 400 });
    }

    return NextResponse.json({
      connected: true,
      mode: getRazorpayMode(keyId),
      keyId: maskRazorpayKeyId(keyId),
    });
  } catch {
    return NextResponse.json({ connected: false, error: "Could not reach Razorpay" }, { status: 500 });
  }
}
