export function getRazorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
}

export function getRazorpayKeySecret() {
  return process.env.RAZORPAY_KEY_SECRET || "";
}

export function isRazorpayConfigured() {
  return Boolean(getRazorpayKeyId() && getRazorpayKeySecret());
}

export function maskRazorpayKeyId(keyId: string) {
  if (!keyId) return "";
  if (keyId.length <= 12) return keyId;
  return `${keyId.slice(0, 8)}…${keyId.slice(-4)}`;
}

export function getRazorpayMode(keyId: string) {
  if (keyId.startsWith("rzp_live_")) return "live" as const;
  if (keyId.startsWith("rzp_test_")) return "test" as const;
  return "unknown" as const;
}
