"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { login } from "@/services/auth.service";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { USE_MOCK, FIREBASE_CONFIGURED } from "@/lib/utils";
import { StoreOpenLink } from "@/components/layout/store-open-link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter your email and password");
      return;
    }
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
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
              {USE_MOCK ? "Mock mode active" : "Sign in with your Firebase admin account"}
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
                <p>Use the email and password from Firebase Authentication.</p>
                <p>Your account must have <span className="text-zinc-300">role: admin</span> in Firestore <span className="text-zinc-300">users/&#123;uid&#125;</span> (set automatically on first admin login after rules are deployed).</p>
                <p>If you see &quot;Missing or insufficient permissions&quot;: run <span className="font-mono text-zinc-300">firebase login</span> then <span className="font-mono text-zinc-300">firebase deploy --only firestore:rules,storage</span> from the admin project folder.</p>
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
                  autoComplete="username"
                  placeholder="you@example.com"
                  className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
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
                  placeholder="Enter your password"
                  className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                />
              </div>
              <Button type="submit" className="w-full bg-white text-zinc-900 hover:bg-zinc-200" disabled={loading}>
                {loading ? "Signing in..." : "Sign in to Admin"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <StoreOpenLink variant="text" label="Visit customer store" className="mt-6" />
      </div>
    </div>
  );
}
