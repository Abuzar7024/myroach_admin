"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { bypassLogin, login } from "@/services/auth.service";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { USE_MOCK, STORE_URL, FIREBASE_CONFIGURED } from "@/lib/utils";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@gmail.com");
  const [password, setPassword] = useState("admin@123");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  const isDev = process.env.NODE_ENV === "development";

  function handleBypassLogin() {
    try {
      const user = bypassLogin();
      setUser(user);
      toast.success("Dev bypass — dashboard unlocked (no Firebase auth)");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bypass failed");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      setUser(user);
      toast.success("Welcome back!");
      router.replace("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (msg === "Unauthorized") {
        router.push("/unauthorized");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">MY ROACH</h1>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mt-1">Admin Control Panel</p>
        </div>
        <Card className="border-zinc-800 bg-zinc-900 text-white shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Sign in</CardTitle>
            <p className="text-sm text-zinc-400">
              {USE_MOCK ? "Mock mode active" : "Synced with live Firebase store"}
            </p>
          </CardHeader>
          <CardContent>
            {!FIREBASE_CONFIGURED && !USE_MOCK && (
              <p className="mb-4 rounded-md bg-amber-900/30 border border-amber-700/50 p-3 text-xs text-amber-200">
                Firebase env variables missing. Copy .env.example to .env.local and restart the server.
              </p>
            )}
            {!USE_MOCK && FIREBASE_CONFIGURED && (
              <div className="mb-4 rounded-md border border-zinc-700 bg-zinc-800/50 p-3 text-xs text-zinc-400 space-y-1">
                <p>Firebase project: <span className="text-zinc-300">myroach-6cc80</span></p>
                <p>First login: <span className="text-zinc-300">admin@gmail.com</span> / <span className="text-zinc-300">admin@123</span> (auto-creates admin)</p>
                <p>If you added the user in Firebase Console, use that exact password — or reset it there.</p>
                <p>Deploy rules: <span className="text-zinc-300">firebase deploy --only firestore:rules</span></p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="border-zinc-700 bg-zinc-800 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300">Password</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="border-zinc-700 bg-zinc-800 text-white"
                />
              </div>
              {USE_MOCK && (
                <p className="text-xs text-zinc-500">Mock: admin@gmail.com / admin@123</p>
              )}
              <Button type="submit" className="w-full bg-white text-zinc-900 hover:bg-zinc-200" disabled={loading}>
                {loading ? "Signing in..." : "Sign in to Admin"}
              </Button>
              {isDev && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-zinc-600 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  disabled={loading}
                  onClick={handleBypassLogin}
                >
                  Skip login (dev only)
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
        <a
          href={STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ExternalLink size={14} />
          Visit customer store
        </a>
      </div>
    </div>
  );
}
