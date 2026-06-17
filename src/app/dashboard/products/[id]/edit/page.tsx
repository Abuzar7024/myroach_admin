"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/skeleton";
import { MultiImageUpload } from "@/components/ui/image-upload";
import { getProduct, updateProduct } from "@/services/product.service";
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

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>();

  useEffect(() => {
    Promise.all([getProduct(id), getCategories()]).then(([product, cats]) => {
      if (!product) { router.push("/dashboard/products"); return; }
      setCategories(cats);
      setImages(product.images);
      reset({
        title: product.title,
        description: product.description,
        shortDescription: product.shortDescription,
        price: product.price,
        salePrice: product.salePrice,
        stock: product.stock,
        sku: product.sku,
        categoryId: product.categoryId,
        tags: product.tags.join(", "),
        featured: product.featured,
        active: product.active,
      });
      setLoading(false);
    });
  }, [id, reset, router]);

  async function onSubmit(data: FormData) {
    if (images.length === 0) {
      toast.error("Add at least one product image");
      return;
    }
    await updateProduct(id, {
      title: data.title,
      description: data.description,
      shortDescription: data.shortDescription,
      price: data.price,
      salePrice: data.salePrice,
      stock: data.stock,
      sku: data.sku,
      categoryId: data.categoryId,
      tags: data.tags ? data.tags.split(",").map((t) => t.trim()) : [],
      images,
      featured: data.featured,
      active: data.active,
    });
    toast.success("Product updated");
    router.push("/dashboard/products");
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <DashboardHeader title="Edit Product" />
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
            <MultiImageUpload values={images} onChange={setImages} storageBase={`products/${id}`} />
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
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2"><Label>Tags</Label><Input {...register("tags")} /></div>
            <div className="flex gap-4 md:col-span-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("featured")} /> Featured</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("active")} /> Active</label>
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
