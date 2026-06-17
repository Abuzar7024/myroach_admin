"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/skeleton";
import { STORE_URL } from "@/lib/utils";
import { getHomepageContent, updateHomepageContent } from "@/services/settings.service";
import { getProducts } from "@/services/product.service";
import { getCategories } from "@/services/category.service";
import type { HomepageContent, Product, Category } from "@/types";

export default function HomepagePage() {
  const [homepage, setHomepage] = useState<HomepageContent | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getHomepageContent(), getProducts(), getCategories()]).then(([h, p, c]) => {
      setHomepage(h);
      setProducts(p.filter((x) => x.active));
      setCategories(c.filter((x) => x.active));
      setLoading(false);
    });
  }, []);

  async function save() {
    if (!homepage) return;
    setSaving(true);
    await updateHomepageContent(homepage);
    toast.success("Homepage updated — changes reflect on live store");
    setSaving(false);
  }

  function toggleId(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  if (loading || !homepage) return <PageLoader />;

  return (
    <div>
      <DashboardHeader
        title="Homepage Content"
        description="Control what appears on your live store homepage"
        actions={
          <a href={STORE_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2">
              <ExternalLink size={16} /> Preview Store
            </Button>
          </a>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Section Visibility</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "showFeatured", label: "Featured Collections" },
              { key: "showBestSellers", label: "Best Sellers" },
              { key: "showNewArrivals", label: "New Arrivals" },
              { key: "showPromo", label: "Promotional Banner" },
            ].map((s) => (
              <label key={s.key} className="flex items-center justify-between rounded-md border p-3">
                <span className="text-sm font-medium">{s.label}</span>
                <input
                  type="checkbox"
                  checked={homepage[s.key as keyof HomepageContent] as boolean}
                  onChange={(e) => setHomepage({ ...homepage, [s.key]: e.target.checked })}
                />
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Promo Section</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Title</Label><Input value={homepage.promoTitle} onChange={(e) => setHomepage({ ...homepage, promoTitle: e.target.value })} /></div>
            <div><Label>Subtitle</Label><Input value={homepage.promoSubtitle} onChange={(e) => setHomepage({ ...homepage, promoSubtitle: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Featured Collections</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={homepage.featuredCollectionIds.includes(c.id)}
                  onChange={() => setHomepage({ ...homepage, featuredCollectionIds: toggleId(homepage.featuredCollectionIds, c.id) })}
                />
                {c.name}
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Best Sellers</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {products.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={homepage.bestSellerIds.includes(p.id)}
                  onChange={() => setHomepage({ ...homepage, bestSellerIds: toggleId(homepage.bestSellerIds, p.id) })}
                />
                {p.title}
              </label>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>New Arrivals</CardTitle></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-80 overflow-y-auto">
            {products.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm rounded border p-2">
                <input
                  type="checkbox"
                  checked={homepage.newArrivalIds.includes(p.id)}
                  onChange={() => setHomepage({ ...homepage, newArrivalIds: toggleId(homepage.newArrivalIds, p.id) })}
                />
                {p.title}
              </label>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Homepage Content"}</Button>
      </div>
    </div>
  );
}
