"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/skeleton";
import { getProducts, updateProduct } from "@/services/product.service";
import type { Product } from "@/types";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [threshold, setThreshold] = useState(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getProducts().then((p) => { setProducts(p); setLoading(false); }); }, []);

  const filtered = products.filter((p) => p.stock <= threshold);

  async function updateStock(id: string, stock: number) {
    await updateProduct(id, { stock });
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, stock } : p));
    toast.success("Stock updated");
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <DashboardHeader title="Inventory" description="Monitor and update stock levels" />
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-zinc-600">Low stock threshold:</span>
        <Input type="number" className="w-24" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
        <Badge variant="warning">{filtered.length} low stock items</Badge>
      </div>
      <div className="rounded-lg border bg-white">
        <Table>
          <THead><TR><TH>Product</TH><TH>SKU</TH><TH>Current Stock</TH><TH>Status</TH><TH>Update</TH></TR></THead>
          <TBody>
            {products.map((p) => (
              <TR key={p.id}>
                <TD>{p.title}</TD>
                <TD>{p.sku}</TD>
                <TD><Badge variant={p.stock <= threshold ? "warning" : "success"}>{p.stock}</Badge></TD>
                <TD><Badge variant={p.active ? "success" : "destructive"}>{p.active ? "Active" : "Disabled"}</Badge></TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <Input type="number" className="w-20" defaultValue={p.stock} onBlur={(e) => {
                      const val = Number(e.target.value);
                      if (val !== p.stock) updateStock(p.id, val);
                    }} />
                    <Button variant="outline" size="sm" onClick={() => updateStock(p.id, p.stock + 10)}>+10</Button>
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
