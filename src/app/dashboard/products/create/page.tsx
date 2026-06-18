"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { Card, CardContent } from "@/components/ui/card";
import { MultiImageUpload } from "@/components/ui/image-upload";
import { SizePicker } from "@/components/ui/size-picker";
import { PageLoader } from "@/components/ui/skeleton";
import { slugify } from "@/lib/utils";
import {
  GENDER_OPTIONS,
  DEFAULT_MAX_ORDER_QTY,
  DEFAULT_MIN_ORDER_QTY,
  DEFAULT_RETURN_POLICY,
} from "@/lib/catalog";
import { normalizePrice } from "@/lib/money";
import { runSave } from "@/lib/save-action";
import { useFormDraft } from "@/hooks/use-form-draft";
import { createProduct } from "@/services/product.service";
import { getCategories } from "@/services/category.service";
import type { CatalogGender, Category } from "@/types";

interface FormData {
  title: string;
  description: string;
  shortDescription: string;
  price: number;
  salePrice?: number;
  stock: number;
  minOrderQty: number;
  maxOrderQty: number;
  returnPolicy: string;
  categoryId: string;
  gender: CatalogGender;
  tags?: string;
  featured: boolean;
  featuredDisplaySeconds?: number;
  active: boolean;
}

export default function CreateProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>(["M", "L", "XL"]);
  const form = useForm<FormData>({
    defaultValues: {
      featured: false,
      featuredDisplaySeconds: 5,
      active: true,
      stock: 0,
      price: 0,
      gender: "unisex",
      minOrderQty: DEFAULT_MIN_ORDER_QTY,
      maxOrderQty: DEFAULT_MAX_ORDER_QTY,
      returnPolicy: DEFAULT_RETURN_POLICY,
    },
  });
  const { register, handleSubmit, watch, formState: { isSubmitting } } = form;

  const { clearDraft } = useFormDraft("product-create", form, { images, setImages });

  const postTo = watch("gender");
  const isFeatured = watch("featured");

  useEffect(() => {
    getCategories().then((cats) => {
      setCategories(cats.filter((c) => c.active));
      setLoadingCategories(false);
    });
  }, []);

  const filteredCategories = useMemo(() => {
    if (!postTo || postTo === "unisex") return categories;
    return categories.filter((c) => c.gender === postTo || c.gender === "unisex");
  }, [categories, postTo]);

  async function onSubmit(data: FormData) {
    if (!data.categoryId) {
      toast.error("Select a category first");
      return;
    }
    if (images.length === 0) {
      toast.error("Add at least one product image");
      return;
    }
    if (sizes.length === 0) {
      toast.error("Select at least one size");
      return;
    }
    if (data.stock < 0) {
      toast.error("Stock cannot be negative");
      return;
    }
    const minQty = Math.max(1, data.minOrderQty || DEFAULT_MIN_ORDER_QTY);
    const maxQty = Math.max(minQty, data.maxOrderQty || DEFAULT_MAX_ORDER_QTY);
    const price = normalizePrice(data.price);
    if (price <= 0) {
      toast.error("Enter a price greater than zero");
      return;
    }
    const salePrice =
      data.salePrice != null && data.salePrice !== ("" as unknown as number)
        ? normalizePrice(data.salePrice)
        : undefined;

    const category = categories.find((c) => c.id === data.categoryId);
    const saved = await runSave(
      () =>
        createProduct({
          title: data.title,
          slug: slugify(data.title),
          description: data.description,
          shortDescription: data.shortDescription,
          price,
          salePrice: salePrice && salePrice > 0 ? salePrice : undefined,
          stock: data.stock,
          categoryId: data.categoryId,
          categorySlug: category?.slug ?? "",
          gender: data.gender,
          tags: data.tags ? data.tags.split(",").map((t) => t.trim()) : [],
          images,
          sizes,
          variants: sizes.map((value) => ({ type: "size" as const, value })),
          minOrderQty: minQty,
          maxOrderQty: maxQty,
          returnPolicy: data.returnPolicy.trim() || DEFAULT_RETURN_POLICY,
          featured: data.featured,
          featuredDisplaySeconds: data.featured
            ? Math.max(3, Math.min(60, data.featuredDisplaySeconds ?? 5))
            : undefined,
          active: data.active,
        }),
      { successMessage: "Product created — live on storefront via Firestore `products`" }
    );
    if (saved) {
      clearDraft();
      router.push("/dashboard/products");
    }
  }

  if (loadingCategories) return <PageLoader />;

  if (categories.length === 0) {
    return (
      <div>
        <DashboardHeader title="Create Product" />
        <Card>
          <CardContent className="space-y-4 p-8 text-center">
            <p className="text-zinc-600">
              Create at least one <strong>category</strong> (Male / Female / Unisex) before adding products.
            </p>
            <Link
              href="/dashboard/categories"
              className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Go to Categories
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader
        title="Create Product"
        description="Category → sizes → images → inventory. Draft auto-saves in this browser."
      />
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Post to (audience) *</Label>
              <Select {...register("gender", { required: true })}>
                {GENDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select {...register("categoryId", { required: true })}>
                <option value="">Select category...</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.gender})
                  </option>
                ))}
              </Select>
            </div>
            <MultiImageUpload values={images} onChange={setImages} storageBase="products/new" />
            <div className="space-y-2"><Label>Title</Label><Input {...register("title", { required: true })} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Short Description</Label><Input {...register("shortDescription")} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea {...register("description")} /></div>
            <div className="md:col-span-2">
              <SizePicker value={sizes} onChange={setSizes} />
            </div>
            <PriceInput
              label="Price (₹) *"
              hint="Whole number or decimal — shown as ₹ on storefront"
              {...register("price", { valueAsNumber: true, required: true, min: 0 })}
            />
            <PriceInput
              label="Sale Price (₹)"
              hint="Optional discounted price"
              {...register("salePrice", {
                setValueAs: (v) => (v === "" || v == null ? undefined : normalizePrice(v)),
              })}
            />
            <div className="space-y-2">
              <Label>Inventory (stock) *</Label>
              <Input type="number" min={0} {...register("stock", { valueAsNumber: true })} />
              <p className="text-xs text-zinc-500">Total units — update anytime in Inventory</p>
            </div>
            <div className="space-y-2">
              <Label>Min qty per order</Label>
              <Input type="number" min={1} {...register("minOrderQty", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Max qty per order</Label>
              <Input type="number" min={1} {...register("maxOrderQty", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Return policy (shown on product page)</Label>
              <Input {...register("returnPolicy")} placeholder={DEFAULT_RETURN_POLICY} />
            </div>
            <div className="space-y-2 md:col-span-2"><Label>Tags (comma separated)</Label><Input {...register("tags")} placeholder="bestseller, cotton" /></div>
            <div className="flex flex-wrap items-center gap-4 md:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("featured")} /> Featured on homepage
              </label>
              {isFeatured && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">Display time (seconds)</Label>
                  <Input
                    type="number"
                    min={3}
                    max={60}
                    className="w-24"
                    {...register("featuredDisplaySeconds", { valueAsNumber: true })}
                  />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("active")} /> Active
              </label>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Create Product"}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
