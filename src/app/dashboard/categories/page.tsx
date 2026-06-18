"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { slugify } from "@/lib/utils";
import { GENDER_OPTIONS, genderLabel } from "@/lib/catalog";
import { runSave } from "@/lib/save-action";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/services/category.service";
import type { CatalogGender, Category } from "@/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [gender, setGender] = useState<CatalogGender>("unisex");
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCategories().then((c) => {
      setCategories(c);
      setLoading(false);
    });
  }, []);

  function openCreate() {
    setEditId(null);
    setName("");
    setDescription("");
    setImage("");
    setGender("unisex");
    setShowForm(true);
  }

  function openEdit(c: Category) {
    setEditId(c.id);
    setName(c.name);
    setDescription(c.description ?? "");
    setImage(c.image ?? "");
    setGender(c.gender || "unisex");
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }
    setSaving(true);
    const slug = slugify(name);
    const payload = { name, slug, image, description: description.trim(), gender };

    if (editId) {
      await runSave(
        () => updateCategory(editId, payload),
        {
          successMessage: "Category updated — image shows on storefront collections",
          onSuccess: async () => {
            setCategories(await getCategories());
            setShowForm(false);
          },
        }
      );
    } else {
      await runSave(
        () => createCategory({ ...payload, active: true }),
        {
          successMessage: "Category created — add products and it appears on the site",
          onSuccess: async () => {
            setCategories(await getCategories());
            setShowForm(false);
          },
        }
      );
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await runSave(
      () => deleteCategory(id),
      {
        successMessage: "Category deleted",
        onSuccess: async () => setCategories(await getCategories()),
      }
    );
  }

  async function toggleActive(id: string, active: boolean) {
    await runSave(
      () => updateCategory(id, { active: !active }),
      {
        onSuccess: async () => setCategories(await getCategories()),
      }
    );
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <DashboardHeader
          title="Categories"
          description="Name, image, and audience — shown on homepage collections and shop pages."
        />
        <Button className="gap-2" onClick={openCreate}>
          <Plus size={16} /> Add Category
        </Button>
      </div>

      {showForm && (
        <div className="mb-4 space-y-3 rounded-lg border bg-white p-4">
          <div>
            <Label>Category name</Label>
            <Input placeholder="e.g. Hoodies, Tees, Accessories" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Short description (optional)</Label>
            <Textarea
              placeholder="Shown on collection cards on the homepage"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <ImageUpload
            label="Category image"
            value={image}
            onChange={setImage}
            storageBase={editId ? `categories/${editId}` : "categories/new"}
            aspectRatio={4 / 5}
            previewClassName="h-40 w-32 rounded-lg object-cover"
          />
          <div>
            <Label>Post to (audience)</Label>
            <Select value={gender} onChange={(e) => setGender(e.target.value as CatalogGender)}>
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editId ? "Update" : "Create"}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-white">
        <Table>
          <THead>
            <TR>
              <TH>Image</TH>
              <TH>Name</TH>
              <TH>Slug</TH>
              <TH>Post to</TH>
              <TH>Status</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {categories.length === 0 ? (
              <TR>
                <TD colSpan={6} className="py-10 text-center text-sm text-zinc-500">
                  No categories yet — add lanes with images above.
                </TD>
              </TR>
            ) : (
              categories.map((c) => (
                <TR key={c.id}>
                  <TD>
                    {c.image ? (
                      <Image src={c.image} alt="" width={40} height={50} className="rounded object-cover" />
                    ) : (
                      <span className="text-xs text-zinc-400">No image</span>
                    )}
                  </TD>
                  <TD>{c.name}</TD>
                  <TD>{c.slug}</TD>
                  <TD>
                    <Badge variant="secondary">{genderLabel(c.gender)}</Badge>
                  </TD>
                  <TD>
                    <Badge variant={c.active ? "success" : "destructive"}>{c.active ? "Active" : "Disabled"}</Badge>
                  </TD>
                  <TD>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(c)}>Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => toggleActive(c.id, c.active)}>
                        {c.active ? "Disable" : "Enable"}
                      </Button>
                      <ConfirmDialog
                        title="Delete category?"
                        description="Products may lose category reference."
                        onConfirm={() => handleDelete(c.id)}
                      />
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
