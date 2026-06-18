/** Parse admin price input — whole numbers (999) or decimals (999.50). */
export function normalizePrice(value: unknown): number {
  if (value === "" || value === null || value === undefined) return 0;
  const n = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

export function formatRupeePreview(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "";
  const whole = Math.abs(Math.round(amount * 100) % 100) === 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `₹${formatted}`;
}
