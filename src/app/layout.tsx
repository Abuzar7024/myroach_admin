import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AuthProvider } from "@/providers/auth-provider";
import { AdminToaster } from "@/components/ui/admin-toaster";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "MyRoach Admin",
  description: "E-commerce admin panel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <AuthProvider>
          {children}
          <AdminToaster />
        </AuthProvider>
      </body>
    </html>
  );
}
