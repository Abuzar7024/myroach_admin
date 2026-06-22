"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { runSave } from "@/lib/save-action";
import { storePage, STOREFRONT_PATHS } from "@/lib/storefront-links";
import { OptionalNumberInput } from "@/components/ui/optional-number-input";
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from "@/services/coupon.service";
import type { Coupon } from "@/types";

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{
    code: string;
    discountType: "percentage" | "fixed";
    discountValue?: number;
    minimumOrderAmount?: number;
    usageLimit?: number;
  }>({ code: "", discountType: "percentage", discountValue: 10, minimumOrderAmount: undefined, usageLimit: 100 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { getCoupons().then((c) => { setCoupons(c); setLoading(false); }); }, []);

  async function handleCreate() {
    if (!form.code) return;
    setSaving(true);
    await runSave(
      () =>
        createCoupon({
          ...form,
          discountValue: form.discountValue ?? 0,
          minimumOrderAmount: form.minimumOrderAmount ?? 0,
          usageLimit: form.usageLimit ?? 100,
          expiryDate: new Date(Date.now() + 30 * 86400000),
          active: true,
        }),
      {
        successMessage: "Coupon created",
        storefrontHref: storePage(STOREFRONT_PATHS.shop),
        onSuccess: async () => {
          setCoupons(await getCoupons());
          setShowForm(false);
        },
      }
    );
    setSaving(false);
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <DashboardHeader title="Coupons" description="Manage discount codes" />
        <Button className="gap-2" onClick={() => setShowForm(true)}><Plus size={16} /> Add Coupon</Button>
      </div>

      {showForm && (
        <div className="mb-4 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-2">
          <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
          <div><Label>Type</Label><Select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as "percentage" | "fixed" })}><option value="percentage">Percentage</option><option value="fixed">Fixed</option></Select></div>
          <div>
            <Label>Value</Label>
            <OptionalNumberInput
              value={form.discountValue}
              onChange={(discountValue) => setForm({ ...form, discountValue })}
            />
          </div>
          <div>
            <Label>Min Order</Label>
            <OptionalNumberInput
              value={form.minimumOrderAmount}
              onChange={(minimumOrderAmount) => setForm({ ...form, minimumOrderAmount })}
            />
          </div>
          <div className="flex gap-2 md:col-span-2"><Button onClick={handleCreate} disabled={saving}>{saving ? "Saving..." : "Create"}</Button><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
        </div>
      )}

      <div className="rounded-lg border bg-white">
        <Table>
          <THead><TR><TH>Code</TH><TH>Type</TH><TH>Value</TH><TH>Min Order</TH><TH>Expires</TH><TH>Status</TH><TH>Actions</TH></TR></THead>
          <TBody>
            {coupons.map((c) => (
              <TR key={c.id}>
                <TD className="font-mono font-medium">{c.code}</TD>
                <TD>{c.discountType}</TD>
                <TD>{c.discountType === "percentage" ? `${c.discountValue}%` : formatCurrency(c.discountValue)}</TD>
                <TD>{formatCurrency(c.minimumOrderAmount)}</TD>
                <TD>{formatDate(c.expiryDate)}</TD>
                <TD><Badge variant={c.active ? "success" : "destructive"}>{c.active ? "Active" : "Disabled"}</Badge></TD>
                <TD>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { void runSave(() => updateCoupon(c.id, { active: !c.active }), { onSuccess: async () => setCoupons(await getCoupons()) }); }}>{c.active ? "Disable" : "Enable"}</Button>
                    <ConfirmDialog title="Delete coupon?" description="This cannot be undone." onConfirm={() => { void runSave(() => deleteCoupon(c.id), { successMessage: "Deleted", onSuccess: async () => setCoupons(await getCoupons()) }); }} />
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
