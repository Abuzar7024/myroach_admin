"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Star, Check, X } from "lucide-react";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PageLoader, EmptyState } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { formatDate } from "@/lib/utils";
import { getReviews, approveReview, deleteReview } from "@/services/review.service";

import type { Review } from "@/types";

export default function ReviewsPage() {
  const [reviewList, setReviewList] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  useEffect(() => {
    getReviews().then((r) => { setReviewList(r); setLoading(false); });
  }, []);

  const filtered = reviewList.filter((r) => {
    if (filter === "pending") return !r.approved;
    if (filter === "approved") return r.approved;
    return true;
  });

  const { page, totalPages, paginated, goTo, total } = usePagination(filtered, 10);

  async function handleApprove(id: string, approved: boolean) {
    await approveReview(id, approved);
    setReviewList((prev) => prev.map((r) => r.id === id ? { ...r, approved } : r));
    toast.success(approved ? "Review approved" : "Review rejected");
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <DashboardHeader title="Reviews" description="Moderate customer product reviews" />
      <div className="mb-4 flex gap-2">
        {(["all", "pending", "approved"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="No reviews" description="Customer reviews from your store will appear here" />
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <THead>
              <TR><TH>Author</TH><TH>Rating</TH><TH>Comment</TH><TH>Status</TH><TH>Date</TH><TH>Actions</TH></TR>
            </THead>
            <TBody>
              {paginated.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium">{r.author}</TD>
                  <TD><div className="flex items-center gap-1"><Star size={14} className="fill-amber-400 text-amber-400" />{r.rating}</div></TD>
                  <TD className="max-w-xs truncate">{r.comment}</TD>
                  <TD><Badge variant={r.approved ? "success" : "warning"}>{r.approved ? "Approved" : "Pending"}</Badge></TD>
                  <TD>{formatDate(r.createdAt)}</TD>
                  <TD>
                    <div className="flex gap-2">
                      {!r.approved && (
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => handleApprove(r.id, true)}>
                          <Check size={14} /> Approve
                        </Button>
                      )}
                      {r.approved && (
                        <Button variant="outline" size="sm" onClick={() => handleApprove(r.id, false)}>
                          <X size={14} /> Reject
                        </Button>
                      )}
                      <ConfirmDialog title="Delete review?" description="Permanent." onConfirm={async () => {
                        await deleteReview(r.id);
                        setReviewList((prev) => prev.filter((x) => x.id !== r.id));
                        toast.success("Deleted");
                      }} />
                    </div>
                  </TD>
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
