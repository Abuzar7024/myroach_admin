"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ImageUpload } from "@/components/ui/image-upload";
import { OptionalNumberInput } from "@/components/ui/optional-number-input";
import { runSave } from "@/lib/save-action";
import { storePage, STOREFRONT_PATHS } from "@/lib/storefront-links";
import { getBanners, createBanner, updateBanner, deleteBanner } from "@/services/banner.service";
import type { Banner } from "@/types";

const emptyForm = { title: "", subtitle: "", redirectUrl: "", position: 1, image: "" };

function bannerStorefrontUrl(redirectUrl: string) {
  const path = redirectUrl.trim();
  if (!path) return storePage(STOREFRONT_PATHS.home);
  if (/^https?:\/\//i.test(path)) return path;
  return storePage(path);
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getBanners().then((b) => { setBanners(b); setLoading(false); }); }, []);

  async function handleSave() {
    if (!form.title) return;
    if (!form.image) {
      toast.error("Upload a banner image first");
      return;
    }
    setSaving(true);
    if (editId) {
      await runSave(
        () => updateBanner(editId, form),
        {
          successMessage: "Banner updated — live on storefront when site reads `banners` collection",
          storefrontHref: bannerStorefrontUrl(form.redirectUrl),
          onSuccess: async () => {
            setBanners(await getBanners());
            setShowForm(false);
            setEditId(null);
            setForm(emptyForm);
          },
        }
      );
    } else {
      await runSave(
        () => createBanner({ ...form, active: true }),
        {
          successMessage: "Banner created",
          storefrontHref: bannerStorefrontUrl(form.redirectUrl),
          onSuccess: async () => {
            setBanners(await getBanners());
            setShowForm(false);
            setEditId(null);
            setForm(emptyForm);
          },
        }
      );
    }
    setSaving(false);
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <DashboardHeader title="Banners" description="Homepage hero images — synced via Firestore `banners` + Storage" />
        <Button className="gap-2" onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}>
          <Plus size={16} /> Add Banner
        </Button>
      </div>

      {showForm && (
        <div className="mb-4 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-2">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Subtitle</Label><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
          <div><Label>Redirect URL</Label><Input value={form.redirectUrl} onChange={(e) => setForm({ ...form, redirectUrl: e.target.value })} placeholder="/collections/sale" /></div>
          <div>
            <Label>Position</Label>
            <OptionalNumberInput
              value={form.position}
              onChange={(position) => setForm({ ...form, position: position ?? 1 })}
            />
          </div>
          <div className="md:col-span-2">
            <ImageUpload
              label="Banner image (1200×400 recommended)"
              value={form.image}
              onChange={(image) => setForm({ ...form, image })}
              storageBase={editId ? `banners/${editId}` : "banners/new"}
              previewClassName="h-24 w-full max-w-md rounded-lg object-cover"
            />
          </div>
          <div className="flex gap-2 md:col-span-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editId ? "Update" : "Create"}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-white">
        <Table>
          <THead><TR><TH>Image</TH><TH>Title</TH><TH>Position</TH><TH>Status</TH><TH>Actions</TH></TR></THead>
          <TBody>
            {banners.map((b) => (
              <TR key={b.id}>
                <TD><Image src={b.image} alt="" width={80} height={30} className="rounded object-cover" unoptimized /></TD>
                <TD>{b.title}</TD>
                <TD>{b.position}</TD>
                <TD><Badge variant={b.active ? "success" : "destructive"}>{b.active ? "Active" : "Disabled"}</Badge></TD>
                <TD>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditId(b.id); setForm({ title: b.title, subtitle: b.subtitle, redirectUrl: b.redirectUrl, position: b.position, image: b.image }); setShowForm(true); }}>Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => { void runSave(() => updateBanner(b.id, { active: !b.active }), { onSuccess: async () => setBanners(await getBanners()) }); }}>{b.active ? "Disable" : "Enable"}</Button>
                    <ConfirmDialog title="Delete banner?" description="This will remove it from homepage." onConfirm={() => { void runSave(() => deleteBanner(b.id), { successMessage: "Deleted", onSuccess: async () => setBanners(await getBanners()) }); }} />
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
