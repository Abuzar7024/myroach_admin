import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "myroach-6cc80.firebasestorage.app" },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
