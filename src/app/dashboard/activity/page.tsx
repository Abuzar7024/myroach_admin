"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart, Users, Package, Star, AlertTriangle } from "lucide-react";
import { DashboardHeader } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { getRecentActivity } from "@/services/activity.service";
import type { ActivityItem } from "@/types";

const icons = {
  order: ShoppingCart,
  customer: Users,
  product: Package,
  review: Star,
};

export default function ActivityPage() {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecentActivity().then((a) => { setActivity(a); setLoading(false); });
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div>
      <DashboardHeader title="Activity Feed" description="Real-time sync from your live store" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">No recent activity</p>
          ) : (
            <ul className="divide-y">
              {activity.map((item) => {
                const Icon = icons[item.type];
                const content = (
                  <div className="flex items-start gap-3 py-3">
                    <div className="rounded-full bg-zinc-100 p-2">
                      <Icon size={16} className="text-zinc-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{item.message}</p>
                      <p className="text-xs text-zinc-500">{formatDate(item.timestamp)} · {item.type}</p>
                    </div>
                  </div>
                );
                return item.link ? (
                  <li key={item.id}><Link href={item.link} className="hover:bg-zinc-50 block rounded-md">{content}</Link></li>
                ) : (
                  <li key={item.id}>{content}</li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
