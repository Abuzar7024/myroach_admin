"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/skeleton";
import { MultiImageUpload } from "@/components/ui/image-upload";
import { SizePicker } from "@/components/ui/size-picker";
import { PriceInput } from "@/components/ui/price-input";
import { normalizePrice } from "@/lib/money";
import {
  GENDER_OPTIONS,
  DEFAULT_MAX_ORDER_QTY,
  DEFAULT_MIN_ORDER_QTY,
  DEFAULT_RETURN_POLICY,
} from "@/lib/catalog";
import { runSave } from "@/lib/save-action";
import { getProduct, updateProduct } from "@/services/product.service";
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

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm<FormData>();

  const postTo = watch("gender");
  const isFeatured = watch("featured");

  useEffect(() => {
    Promise.all([getProduct(id), getCategories()]).then(([product, cats]) => {
      if (!product) {
        router.push("/dashboard/products");
        return;
      }
      setCategories(cats.filter((c) => c.active));
      setImages(product.images);
      setSizes(product.sizes?.length ? product.sizes : ["M", "L", "XL"]);
      reset({
        title: product.title,
        description: product.description,
        shortDescription: product.shortDescription,
        price: product.price,
        salePrice: product.salePrice,
        stock: product.stock,
        minOrderQty: product.minOrderQty ?? DEFAULT_MIN_ORDER_QTY,
        maxOrderQty: product.maxOrderQty ?? DEFAULT_MAX_ORDER_QTY,
        returnPolicy: product.returnPolicy ?? DEFAULT_RETURN_POLICY,
        categoryId: product.categoryId,
        gender: product.gender ?? "unisex",
        tags: product.tags.join(", "),
        featured: product.featured,
        featuredDisplaySeconds: product.featuredDisplaySeconds ?? 5,
        active: product.active,
      });
      setLoading(false);
    });
  }, [id, reset, router]);

  const filteredCategories = useMemo(() => {
    if (!postTo || postTo === "unisex") return categories;
    return categories.filter((c) => c.gender === postTo || c.gender === "unisex");
  }, [categories, postTo]);

  async function onSubmit(data: FormData) {
    if (images.length === 0) {
      toast.error("Add at least one product image");
      return;
    }
    if (sizes.length === 0) {
      toast.error("Select at least one size");
      return;
    }
    const price = normalizePrice(data.price);
    if (price <= 0) {
      toast.error("Enter a price greater than zero");
      return;
    }
    const minQty = Math.max(1, data.minOrderQty || DEFAULT_MIN_ORDER_QTY);
    const maxQty = Math.max(minQty, data.maxOrderQty || DEFAULT_MAX_ORDER_QTY);
    const salePrice =
      data.salePrice != null && data.salePrice !== ("" as unknown as number)
        ? normalizePrice(data.salePrice)
        : undefined;

    const category = categories.find((c) => c.id === data.categoryId);
    const saved = await runSave(
      () =>
        updateProduct(id, {
          title: data.title,
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
      { successMessage: "Product updated" }
    );
    if (saved !== null) router.push("/dashboard/products");
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <DashboardHeader title="Edit Product" />
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Post to (audience)</Label>
              <Select {...register("gender")}>
                {GENDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select {...register("categoryId")}>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.gender})</option>
                ))}
              </Select>
            </div>
            <MultiImageUpload values={images} onChange={setImages} storageBase={`products/${id}`} />
            <div className="space-y-2"><Label>Title</Label><Input {...register("title")} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Short Description</Label><Input {...register("shortDescription")} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea {...register("description")} /></div>
            <div className="md:col-span-2">
              <SizePicker value={sizes} onChange={setSizes} />
            </div>
            <PriceInput
              label="Price (₹) *"
              {...register("price", { valueAsNumber: true, required: true, min: 0 })}
            />
            <PriceInput
              label="Sale Price (₹)"
              {...register("salePrice", {
                setValueAs: (v) => (v === "" || v == null ? undefined : normalizePrice(v)),
              })}
            />
            <div className="space-y-2">
              <Label>Inventory (stock)</Label>
              <Input type="number" min={0} {...register("stock", { valueAsNumber: true })} />
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
              <Label>Return policy</Label>
              <Input {...register("returnPolicy")} />
            </div>
            <div className="space-y-2 md:col-span-2"><Label>Tags</Label><Input {...register("tags")} /></div>
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
              <Button type="submit" disabled={isSubmitting}>Save Changes</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
