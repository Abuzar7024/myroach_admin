export type CatalogGender = "male" | "female" | "unisex";

export const GENDER_OPTIONS: { value: CatalogGender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "unisex", label: "Unisex / All" },
];

export function genderLabel(gender: CatalogGender | string | undefined): string {
  return GENDER_OPTIONS.find((o) => o.value === gender)?.label ?? "Unisex / All";
}

export const PRODUCT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export const DEFAULT_RETURN_POLICY = "10 days easy return";

export const DEFAULT_MIN_ORDER_QTY = 1;
export const DEFAULT_MAX_ORDER_QTY = 10;
