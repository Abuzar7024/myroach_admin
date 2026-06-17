"use client";

import { useEffect, useState } from "react";
import { Download, Mail } from "lucide-react";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PageLoader, EmptyState } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { formatDate } from "@/lib/utils";
import { getSubscribers, exportSubscribersCsv } from "@/services/subscriber.service";
import { downloadCsv } from "@/services/activity.service";

import type { Subscriber } from "@/types";

export default function SubscribersPage() {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSubscribers().then((s) => { setSubs(s); setLoading(false); });
  }, []);

  const { page, totalPages, paginated, goTo, total } = usePagination(subs, 15);

  async function handleExport() {
    const csv = await exportSubscribersCsv();
    downloadCsv("subscribers.csv", csv);
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <DashboardHeader
        title="Newsletter Subscribers"
        description="Email list from your store signup forms"
        actions={
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download size={16} /> Export CSV
          </Button>
        }
      />
      {subs.length === 0 ? (
        <EmptyState title="No subscribers yet" description="Newsletter signups sync from Firebase" />
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <THead><TR><TH>Email</TH><TH>Status</TH><TH>Joined</TH></TR></THead>
            <TBody>
              {paginated.map((s) => (
                <TR key={s.id}>
                  <TD className="flex items-center gap-2"><Mail size={14} className="text-zinc-400" />{s.email}</TD>
                  <TD><Badge variant={s.active ? "success" : "destructive"}>{s.active ? "Active" : "Inactive"}</Badge></TD>
                  <TD>{formatDate(s.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={goTo} />
        </div>
      )}
    </div>
  );
}
