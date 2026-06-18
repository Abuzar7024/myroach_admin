"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PackagePlus, Plus } from "lucide-react";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { runSave } from "@/lib/save-action";
import { getProducts, updateProduct } from "@/services/product.service";
import type { Product } from "@/types";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [threshold, setThreshold] = useState(10);
  const [loading, setLoading] = useState(true);
  const [draftStock, setDraftStock] = useState<Record<string, string>>({});

  useEffect(() => {
    getProducts().then((p) => {
      setProducts(p);
      setLoading(false);
    });
  }, []);

  const noInventory = products.filter((p) => p.stock <= 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= threshold);

  async function updateStock(id: string, stock: number) {
    if (stock < 0) {
      toast.error("Stock cannot be negative");
      return;
    }
    await runSave(
      () => updateProduct(id, { stock }),
      {
        successMessage: stock === 0 ? "Stock cleared" : `Stock set to ${stock}`,
        onSuccess: async () => {
          setProducts(await getProducts());
          setDraftStock((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        },
      }
    );
  }

  function applyDraft(id: string, current: number) {
    const raw = draftStock[id];
    if (raw === undefined || raw === "") return;
    const val = Number(raw);
    if (Number.isNaN(val) || val === current) return;
    void updateStock(id, val);
  }

  if (loading) return <PageLoader />;

  if (products.length === 0) {
    return (
      <div>
        <DashboardHeader title="Inventory" description="Track and add stock for your products" />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <PackagePlus className="h-12 w-12 text-zinc-400" />
            <h2 className="text-lg font-semibold text-zinc-900">No products to inventory yet</h2>
            <p className="max-w-md text-sm text-zinc-500">
              Create categories, then add products with starting stock. Inventory appears here automatically.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/dashboard/categories"
                className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm hover:bg-zinc-50"
              >
                Add categories
              </Link>
              <Link
                href="/dashboard/products/create"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
              >
                <Plus size={14} /> Create product + stock
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader title="Inventory" description="Add or update stock — out-of-stock items listed first" />

      {noInventory.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-amber-900">
              {noInventory.length} product{noInventory.length === 1 ? "" : "s"} with no inventory — add stock below
            </p>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-zinc-600">Low stock threshold:</span>
        <Input type="number" className="w-24" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
        <Badge variant="warning">{lowStock.length} low stock</Badge>
        <Badge variant="destructive">{noInventory.length} out of stock</Badge>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <THead>
            <TR>
              <TH>Product</TH>
              <TH>Sizes</TH>
              <TH>Current Stock</TH>
              <TH>Status</TH>
              <TH>Add / update inventory</TH>
            </TR>
          </THead>
          <TBody>
            {[...noInventory, ...products.filter((p) => p.stock > 0)].map((p) => (
              <TR key={p.id}>
                <TD>{p.title}</TD>
                <TD className="text-xs text-zinc-600">{p.sizes?.join(", ") || "—"}</TD>
                <TD>
                  <Badge variant={p.stock <= 0 ? "destructive" : p.stock <= threshold ? "warning" : "success"}>
                    {p.stock}
                  </Badge>
                </TD>
                <TD>
                  <Badge variant={p.active ? "success" : "secondary"}>{p.active ? "Active" : "Disabled"}</Badge>
                </TD>
                <TD>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      className="w-24"
                      placeholder={p.stock === 0 ? "Add qty" : String(p.stock)}
                      value={draftStock[p.id] ?? ""}
                      onChange={(e) => setDraftStock((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      onBlur={() => applyDraft(p.id, p.stock)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          applyDraft(p.id, p.stock);
                        }
                      }}
                    />
                    {p.stock === 0 ? (
                      <Button size="sm" onClick={() => updateStock(p.id, 10)}>Add 10</Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => updateStock(p.id, p.stock + 10)}>+10</Button>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
