/** React Hook Form setValueAs — empty number fields stay empty (not 0). */
export function setValueAsOptionalNumber(value: unknown): number | undefined {
  if (value === "" || value == null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function setValueAsRequiredNumber(value: unknown): number | undefined {
  return setValueAsOptionalNumber(value);
}
