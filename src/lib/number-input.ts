/** Display value for controlled number inputs — empty string instead of 0 when unset. */
export function formatNumberField(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  return String(value);
}

/** Parse controlled number input; empty field stays empty (not 0). */
export function parseNumberField(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseRequiredNumberField(value: string): number | undefined {
  return parseNumberField(value);
}
