import type { CatalogGender } from "@/types";

export function assertNonEmptyName(name: string, label = "Name"): void {
  if (!name.trim()) {
    throw new Error(`${label} is required`);
  }
}

export function isPersistedImageUrl(url: string): boolean {
  return url.startsWith("https://") || url.startsWith("data:image/");
}

export function assertPersistedImageUrl(url: string, label = "Image"): void {
  if (!url?.trim()) {
    throw new Error(`${label} is required — upload must complete first`);
  }
  if (url.startsWith("blob:")) {
    throw new Error(`${label} upload did not finish — wait for upload success before saving`);
  }
  if (!isPersistedImageUrl(url)) {
    throw new Error(`${label} must be uploaded before saving`);
  }
}

export function assertPersistedImageUrls(urls: string[]): void {
  if (!urls.length) {
    throw new Error("Add at least one product image before saving");
  }
  urls.forEach((url, i) => assertPersistedImageUrl(url, `Image ${i + 1}`));
}

export function assertCategoryPayload(data: { name: string; slug: string; gender?: CatalogGender }): void {
  assertNonEmptyName(data.name, "Category name");
  if (!data.slug.trim()) {
    throw new Error("Category slug is invalid");
  }
}

export function assertProductPayload(data: {
  title: string;
  slug: string;
  categoryId: string;
  price: number;
  stock: number;
  images: string[];
}): void {
  assertNonEmptyName(data.title, "Product title");
  if (!data.slug.trim()) throw new Error("Product slug is invalid");
  if (!data.categoryId) throw new Error("Select a category before saving");
  if (typeof data.price !== "number" || Number.isNaN(data.price) || data.price < 0) {
    throw new Error("Enter a valid price");
  }
  if (typeof data.stock !== "number" || Number.isNaN(data.stock) || data.stock < 0) {
    throw new Error("Stock cannot be negative");
  }
  assertPersistedImageUrls(data.images);
}

export function assertBannerPayload(data: { title: string; image: string }): void {
  assertNonEmptyName(data.title, "Banner title");
  assertPersistedImageUrl(data.image, "Banner image");
}

export function assertCouponPayload(data: { code: string; discountValue: number }): void {
  if (!data.code.trim()) throw new Error("Coupon code is required");
  if (!data.discountValue || data.discountValue <= 0) {
    throw new Error("Discount value must be greater than zero");
  }
}
