"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MultiImageUpload } from "@/components/ui/image-upload";
import { slugify } from "@/lib/utils";
import { createProduct } from "@/services/product.service";
import { getCategories } from "@/services/category.service";
import type { Category } from "@/types";

interface FormData {
  title: string;
  description: string;
  shortDescription: string;
  price: number;
  salePrice?: number;
  stock: number;
  sku: string;
  categoryId: string;
  tags?: string;
  featured: boolean;
  active: boolean;
}

export default function CreateProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: { featured: false, active: true, stock: 0, price: 0 },
  });

  useEffect(() => { getCategories().then(setCategories); }, []);

  async function onSubmit(data: FormData) {
    if (images.length === 0) {
      toast.error("Add at least one product image");
      return;
    }
    await createProduct({
      title: data.title,
      slug: slugify(data.title),
      description: data.description,
      shortDescription: data.shortDescription,
      price: data.price,
      salePrice: data.salePrice,
      stock: data.stock,
      sku: data.sku,
      categoryId: data.categoryId,
      tags: data.tags ? data.tags.split(",").map((t) => t.trim()) : [],
      images,
      variants: [],
      featured: data.featured,
      active: data.active,
    });
    toast.success("Product created — images synced to storefront via `products.images`");
    router.push("/dashboard/products");
  }

  return (
    <div>
      <DashboardHeader title="Create Product" />
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
            <MultiImageUpload values={images} onChange={setImages} storageBase="products/new" />
            <div className="space-y-2"><Label>Title</Label><Input {...register("title")} /></div>
            <div className="space-y-2"><Label>SKU</Label><Input {...register("sku")} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Short Description</Label><Input {...register("shortDescription")} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea {...register("description")} /></div>
            <div className="space-y-2"><Label>Price</Label><Input type="number" step="0.01" {...register("price")} /></div>
            <div className="space-y-2"><Label>Sale Price</Label><Input type="number" step="0.01" {...register("salePrice")} /></div>
            <div className="space-y-2"><Label>Stock</Label><Input type="number" {...register("stock")} /></div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select {...register("categoryId")}>
                <option value="">Select...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2"><Label>Tags (comma separated)</Label><Input {...register("tags")} placeholder="bestseller, cotton" /></div>
            <div className="flex gap-4 md:col-span-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("featured")} /> Featured</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("active")} /> Active</label>
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
