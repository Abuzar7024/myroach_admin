"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, ExternalLink } from "lucide-react";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PageLoader, EmptyState } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency, storeProductUrl } from "@/lib/utils";
import { runSave } from "@/lib/save-action";
import { getProducts, deleteProduct, updateProduct } from "@/services/product.service";
import { getCategories } from "@/services/category.service";
import { useCachedResource } from "@/hooks/use-cached-resource";

export default function ProductsPage() {
  const { data: productData, loading, error, refresh: refreshProducts } =
    useCachedResource("products", getProducts);
  const { data: categoryData } = useCachedResource("categories", getCategories);
  const products = useMemo(() => productData ?? [], [productData]);
  const categories = categoryData ?? [];
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.sizes?.some((s) => s.toLowerCase().includes(search.toLowerCase()));
      const matchCat = !categoryFilter || p.categoryId === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [products, search, categoryFilter]);

  async function handleDelete(id: string) {
    await runSave(
      () => deleteProduct(id),
      {
        successMessage: "Product deleted",
        onSuccess: async () => {
          await refreshProducts();
        },
      }
    );
  }

  async function toggleActive(id: string, active: boolean) {
    await runSave(
      () => updateProduct(id, { active: !active }),
      {
        successMessage: "Product updated",
        onSuccess: async () => {
          await refreshProducts();
        },
      }
    );
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <DashboardHeader title="Products" description={`${products.length} products from Firebase`} />
        <Link href="/dashboard/products/create">
          <Button className="gap-2"><Plus size={16} /> Add Product</Button>
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input className="pl-9" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No products found" description="Products from your Firebase project will appear here" />
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <THead>
              <TR>
                <TH>Product</TH><TH>Sizes</TH><TH>Price</TH><TH>Stock</TH><TH>Status</TH><TH>Actions</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      {p.images[0] && (
                        <Image src={p.images[0]} alt="" width={40} height={40} className="rounded object-cover" unoptimized />
                      )}
                      <div>
                        <p className="font-medium">{p.title}</p>
                        <div className="flex gap-1 mt-0.5">
                          {p.featured && <Badge variant="secondary">Featured</Badge>}
                        </div>
                      </div>
                    </div>
                  </TD>
                  <TD className="text-xs text-zinc-600">{p.sizes?.join(", ") || "—"}</TD>
                  <TD>{formatCurrency(p.salePrice ?? p.price)}</TD>
                  <TD>
                    <Badge variant={p.stock <= 10 ? "warning" : "default"}>{p.stock}</Badge>
                  </TD>
                  <TD>
                    <Badge variant={p.active ? "success" : "destructive"}>{p.active ? "Active" : "Disabled"}</Badge>
                  </TD>
                  <TD>
                    <div className="flex flex-wrap gap-2">
                      <a href={storeProductUrl(p.slug)} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="gap-1">
                          <ExternalLink size={14} /> Store
                        </Button>
                      </a>
                      <Link href={`/dashboard/products/${p.id}/edit`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                      <Button variant="outline" size="sm" onClick={() => toggleActive(p.id, p.active)}>
                        {p.active ? "Disable" : "Enable"}
                      </Button>
                      <ConfirmDialog title="Delete product?" description="This cannot be undone." onConfirm={() => handleDelete(p.id)} />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}
