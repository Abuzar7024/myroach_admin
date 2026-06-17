"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/skeleton";
import { ImageUpload } from "@/components/ui/image-upload";
import { getSettings, updateSettings, getHomepageContent, updateHomepageContent } from "@/services/settings.service";
import type { Settings, HomepageContent } from "@/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [homepage, setHomepage] = useState<HomepageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getSettings(), getHomepageContent()]).then(([s, h]) => {
      setSettings(s);
      setHomepage(h);
      setLoading(false);
    });
  }, []);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    await updateSettings(settings);
    toast.success("Settings saved");
    setSaving(false);
  }

  async function saveHomepage() {
    if (!homepage) return;
    setSaving(true);
    await updateHomepageContent(homepage);
    toast.success("Homepage content saved");
    setSaving(false);
  }

  if (loading || !settings || !homepage) return <PageLoader />;

  return (
    <div>
      <DashboardHeader title="Settings" description="Store configuration and homepage content" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>General</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <ImageUpload
              label="Store logo"
              value={settings.logo}
              onChange={(logo) => setSettings({ ...settings, logo })}
              storageBase="settings/logos"
              previewClassName="h-16 w-16 rounded-lg object-contain bg-zinc-50"
            />
            <div><Label>Store Name</Label><Input value={settings.storeName} onChange={(e) => setSettings({ ...settings, storeName: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={settings.storeDescription} onChange={(e) => setSettings({ ...settings, storeDescription: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={settings.contactEmail} onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} /></div>
            <div><Label>Address</Label><Textarea value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} /></div>
            <Button onClick={saveSettings} disabled={saving}>Save General</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Shipping & Tax</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Shipping Charge</Label><Input type="number" step="0.01" value={settings.shippingCharge} onChange={(e) => setSettings({ ...settings, shippingCharge: Number(e.target.value) })} /></div>
            <div><Label>Free Shipping Threshold</Label><Input type="number" step="0.01" value={settings.freeShippingThreshold} onChange={(e) => setSettings({ ...settings, freeShippingThreshold: Number(e.target.value) })} /></div>
            <div><Label>Tax Percentage</Label><Input type="number" value={settings.taxPercentage} onChange={(e) => setSettings({ ...settings, taxPercentage: Number(e.target.value) })} /></div>
            <Button onClick={saveSettings} disabled={saving}>Save Shipping & Tax</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Social Links</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Facebook</Label><Input value={settings.socialLinks.facebook ?? ""} onChange={(e) => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, facebook: e.target.value } })} /></div>
            <div><Label>Instagram</Label><Input value={settings.socialLinks.instagram ?? ""} onChange={(e) => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, instagram: e.target.value } })} /></div>
            <div><Label>Twitter</Label><Input value={settings.socialLinks.twitter ?? ""} onChange={(e) => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, twitter: e.target.value } })} /></div>
            <Button onClick={saveSettings} disabled={saving}>Save Social</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Policies</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Return Policy</Label><Textarea value={settings.policies.returnPolicy ?? ""} onChange={(e) => setSettings({ ...settings, policies: { ...settings.policies, returnPolicy: e.target.value } })} /></div>
            <div><Label>Privacy Policy</Label><Textarea value={settings.policies.privacyPolicy ?? ""} onChange={(e) => setSettings({ ...settings, policies: { ...settings.policies, privacyPolicy: e.target.value } })} /></div>
            <div><Label>Terms</Label><Textarea value={settings.policies.termsAndConditions ?? ""} onChange={(e) => setSettings({ ...settings, policies: { ...settings.policies, termsAndConditions: e.target.value } })} /></div>
            <div><Label>Footer</Label><Textarea value={settings.footerContent} onChange={(e) => setSettings({ ...settings, footerContent: e.target.value })} /></div>
            <Button onClick={saveSettings} disabled={saving}>Save Policies</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Homepage Sections</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Promo Title</Label><Input value={homepage.promoTitle} onChange={(e) => setHomepage({ ...homepage, promoTitle: e.target.value })} /></div>
            <div><Label>Promo Subtitle</Label><Input value={homepage.promoSubtitle} onChange={(e) => setHomepage({ ...homepage, promoSubtitle: e.target.value })} /></div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={homepage.showFeatured} onChange={(e) => setHomepage({ ...homepage, showFeatured: e.target.checked })} /> Show Featured</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={homepage.showBestSellers} onChange={(e) => setHomepage({ ...homepage, showBestSellers: e.target.checked })} /> Show Best Sellers</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={homepage.showNewArrivals} onChange={(e) => setHomepage({ ...homepage, showNewArrivals: e.target.checked })} /> Show New Arrivals</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={homepage.showPromo} onChange={(e) => setHomepage({ ...homepage, showPromo: e.target.checked })} /> Show Promo</label>
            </div>
            <Button onClick={saveHomepage} disabled={saving}>Save Homepage</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
