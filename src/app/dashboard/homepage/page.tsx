"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/skeleton";
import { FeaturedCollectionScheduler } from "@/components/homepage/featured-collection-scheduler";
import { STORE_URL } from "@/lib/utils";
import { runSave } from "@/lib/save-action";
import { getHomepageContent, updateHomepageContent } from "@/services/settings.service";
import { getProducts } from "@/services/product.service";
import { getCategories } from "@/services/category.service";
import {
  MAX_FEATURED_ROTATE_SECONDS,
  resolveActiveFeaturedCollectionIds,
  schedulesFromLegacyIds,
} from "@/lib/featured-collection-schedule";
import type { HomepageContent, Product, Category } from "@/types";

export default function HomepagePage() {
  const [homepage, setHomepage] = useState<HomepageContent | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getHomepageContent(), getProducts(), getCategories()]).then(([h, p, c]) => {
      const schedules =
        h.featuredCollectionSchedules?.length
          ? h.featuredCollectionSchedules
          : h.featuredCollectionIds.length
            ? schedulesFromLegacyIds(h.featuredCollectionIds)
            : [];
      setHomepage({ ...h, featuredCollectionSchedules: schedules });
      setProducts(p.filter((x) => x.active));
      setCategories(c.filter((x) => x.active));
      setLoading(false);
    });
  }, []);

  async function save() {
    if (!homepage) return;
    setSaving(true);
    const schedules = homepage.featuredCollectionSchedules ?? [];
    const payload: HomepageContent = {
      ...homepage,
      featuredCollectionSchedules: schedules,
      featuredCollectionIds: resolveActiveFeaturedCollectionIds(
        schedules,
        homepage.featuredCollectionIds
      ),
      featuredRotateSeconds: Math.max(
        3,
        Math.min(MAX_FEATURED_ROTATE_SECONDS, homepage.featuredRotateSeconds ?? 5)
      ),
    };
    await runSave(
      () => updateHomepageContent(payload),
      {
        successMessage: "Homepage updated — changes reflect on live store",
        onSuccess: async () => setHomepage(await getHomepageContent()),
      }
    );
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
              { key: "showFeaturedProducts", label: "Featured Products" },
              { key: "showFeatured", label: "Featured Collections" },
              { key: "showBestSellers", label: "Best Sellers" },
              { key: "showNewArrivals", label: "New Arrivals" },
              { key: "showPromo", label: "Promotional Banner" },
              { key: "showShopTeaser", label: "Shop Teaser (static image)" },
              { key: "showBrandStory", label: "Brand Story (static / About)" },
              { key: "showNewsletter", label: "Newsletter Signup" },
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
          <CardHeader><CardTitle>Featured Products</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-zinc-500">
              Mark products as Featured on the product page. The carousel shows 3 at a time.
            </p>
            <div>
              <Label>Carousel speed (seconds, max {MAX_FEATURED_ROTATE_SECONDS})</Label>
              <Input
                type="number"
                min={3}
                max={MAX_FEATURED_ROTATE_SECONDS}
                value={homepage.featuredRotateSeconds ?? 5}
                onChange={(e) =>
                  setHomepage({
                    ...homepage,
                    featuredRotateSeconds: Math.max(
                      3,
                      Math.min(MAX_FEATURED_ROTATE_SECONDS, Number(e.target.value) || 5)
                    ),
                  })
                }
              />
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
              {products.filter((p) => p.featured).length === 0 ? (
                <p className="text-sm text-zinc-500">No featured products yet.</p>
              ) : (
                products
                  .filter((p) => p.featured)
                  .map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span>{p.title}</span>
                      <span className="text-zinc-500">
                        {p.featuredDisplaySeconds ?? homepage.featuredRotateSeconds ?? 5}s
                      </span>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Featured Collections Calendar</CardTitle></CardHeader>
          <CardContent>
            <FeaturedCollectionScheduler
              categories={categories}
              schedules={homepage.featuredCollectionSchedules ?? []}
              onChange={(featuredCollectionSchedules) =>
                setHomepage({ ...homepage, featuredCollectionSchedules })
              }
            />
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
