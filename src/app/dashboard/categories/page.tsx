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
import { slugify } from "@/lib/utils";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/services/category.service";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => { getCategories().then((c) => { setCategories(c); setLoading(false); }); }, []);

  function openCreate() {
    setEditId(null);
    setName("");
    setImage("");
    setShowForm(true);
  }

  function openEdit(c: Category) {
    setEditId(c.id);
    setName(c.name);
    setImage(c.image);
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    if (!image) {
      toast.error("Upload a category image first");
      return;
    }
    if (editId) {
      await updateCategory(editId, { name, slug: slugify(name), image });
      setCategories((prev) => prev.map((c) => c.id === editId ? { ...c, name, slug: slugify(name), image } : c));
      toast.success("Category updated");
    } else {
      const id = await createCategory({ name, slug: slugify(name), image, active: true });
      setCategories((prev) => [...prev, { id, name, slug: slugify(name), image, active: true }]);
      toast.success("Category created");
    }
    setName("");
    setImage("");
    setEditId(null);
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    await deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    toast.success("Category deleted");
  }

  async function toggleActive(id: string, active: boolean) {
    await updateCategory(id, { active: !active });
    setCategories((prev) => prev.map((c) => c.id === id ? { ...c, active: !active } : c));
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <DashboardHeader title="Categories" description="Collection images — synced via Firestore `categories`" />
        <Button className="gap-2" onClick={openCreate}>
          <Plus size={16} /> Add Category
        </Button>
      </div>

      {showForm && (
        <div className="mb-4 space-y-3 rounded-lg border bg-white p-4">
          <div><Label>Name</Label><Input placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <ImageUpload
            label="Category image"
            value={image}
            onChange={setImage}
            storageBase={editId ? `categories/${editId}` : "categories/new"}
            previewClassName="h-24 w-24 rounded-lg object-cover"
          />
          <div className="flex gap-2">
            <Button onClick={handleSave}>{editId ? "Update" : "Create"}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-white">
        <Table>
          <THead><TR><TH>Image</TH><TH>Name</TH><TH>Slug</TH><TH>Status</TH><TH>Actions</TH></TR></THead>
          <TBody>
            {categories.map((c) => (
              <TR key={c.id}>
                <TD><Image src={c.image} alt="" width={40} height={40} className="rounded object-cover" unoptimized /></TD>
                <TD>{c.name}</TD>
                <TD>{c.slug}</TD>
                <TD><Badge variant={c.active ? "success" : "destructive"}>{c.active ? "Active" : "Disabled"}</Badge></TD>
                <TD>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(c)}>Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => toggleActive(c.id, c.active)}>{c.active ? "Disable" : "Enable"}</Button>
                    <ConfirmDialog title="Delete category?" description="Products may lose category reference." onConfirm={() => handleDelete(c.id)} />
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
