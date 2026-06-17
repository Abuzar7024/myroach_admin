"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { SyncStatusBar } from "@/components/layout/sync-status";
import { SyncProvider } from "@/providers/sync-provider";
import { PageLoader } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100">
        <PageLoader />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-100">
        <PageLoader />
        <p className="text-sm text-zinc-500">Redirecting to login…</p>
      </div>
    );
  }

  return (
    <SyncProvider>
      <div className="min-h-screen bg-zinc-100">
        <Sidebar />
        <main className="lg:pl-64">
          <div className="p-6 pt-16 lg:pt-6">
            <TopBar />
            <SyncStatusBar />
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </SyncProvider>
  );
}
