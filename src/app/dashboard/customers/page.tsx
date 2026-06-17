"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { getCustomers } from "@/services/customer.service";
import type { User } from "@/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { getCustomers().then((c) => { setCustomers(c); setLoading(false); }); }, []);

  const filtered = useMemo(() => customers.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  ), [customers, search]);

  if (loading) return <PageLoader />;

  return (
    <div>
      <DashboardHeader title="Customers" description="View and manage customers" />
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
        <Input className="pl-9" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="rounded-lg border bg-white">
        <Table>
          <THead><TR><TH>Name</TH><TH>Email</TH><TH>Status</TH><TH>Joined</TH></TR></THead>
          <TBody>
            {filtered.map((c) => (
              <TR key={c.uid}>
                <TD><Link href={`/dashboard/customers/${c.uid}`} className="text-blue-600 hover:underline">{c.name}</Link></TD>
                <TD>{c.email}</TD>
                <TD><Badge variant={c.active ? "success" : "destructive"}>{c.active ? "Active" : "Disabled"}</Badge></TD>
                <TD>{formatDate(c.createdAt)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
