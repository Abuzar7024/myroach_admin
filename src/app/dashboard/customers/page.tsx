"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDate } from "@/lib/utils";
import { runSave } from "@/lib/save-action";
import { getCustomers, deleteCustomer } from "@/services/customer.service";
import { useCachedResource } from "@/hooks/use-cached-resource";

type StatusFilter = "all" | "active" | "disabled";

export default function CustomersPage() {
  const { data, loading, refresh } = useCachedResource("customers", getCustomers);
  const customers = useMemo(() => data ?? [], [data]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(
    () =>
      customers.filter((c) => {
        const q = search.toLowerCase();
        const matchSearch =
          !search || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
        const matchStatus =
          status === "all" || (status === "active" ? c.active : !c.active);
        return matchSearch && matchStatus;
      }),
    [customers, search, status]
  );

  const isFiltered = search !== "" || status !== "all";

  const handleDelete = async (uid: string) => {
    await runSave(() => deleteCustomer(uid), {
      successMessage: "Customer deleted",
      onSuccess: async () => {
        await refresh();
      },
    });
  };

  const handleBulkDelete = async () => {
    const targets = [...filtered];
    await runSave(
      async () => {
        for (const c of targets) await deleteCustomer(c.uid);
      },
      {
        successMessage: `Deleted ${targets.length} customer${targets.length === 1 ? "" : "s"}`,
        onSuccess: async () => {
          await refresh();
        },
      }
    );
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <DashboardHeader title="Customers" description="View and manage customers" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            className="pl-9"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </Select>
        {filtered.length > 0 && (
          <ConfirmDialog
            title={isFiltered ? "Delete filtered customers?" : "Delete all customers?"}
            description={`Permanently delete ${filtered.length} customer${
              filtered.length === 1 ? "" : "s"
            } shown below? This removes their profile and cannot be undone.`}
            triggerLabel={`Delete ${filtered.length} shown`}
            onConfirm={handleBulkDelete}
          />
        )}
      </div>
      <div className="rounded-lg border bg-white">
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Status</TH>
              <TH>Joined</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.length === 0 ? (
              <TR>
                <TD colSpan={5} className="text-center text-zinc-500">
                  No customers match your filters.
                </TD>
              </TR>
            ) : (
              filtered.map((c) => (
                <TR key={c.uid}>
                  <TD>
                    <Link href={`/dashboard/customers/${c.uid}`} className="text-blue-600 hover:underline">
                      {c.name}
                    </Link>
                  </TD>
                  <TD>{c.email}</TD>
                  <TD>
                    <Badge variant={c.active ? "success" : "destructive"}>
                      {c.active ? "Active" : "Disabled"}
                    </Badge>
                  </TD>
                  <TD>{formatDate(c.createdAt)}</TD>
                  <TD>
                    <ConfirmDialog
                      title="Delete customer?"
                      description={`Permanently delete ${c.name || c.email}? This removes their profile and cannot be undone.`}
                      onConfirm={() => handleDelete(c.uid)}
                    />
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
