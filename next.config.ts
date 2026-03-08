import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2gb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Required for FFmpeg WASM (SharedArrayBuffer) — without these Chrome blocks it
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy",   value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};

// middlewareClientMaxBodySize raises the 10MB default cap on route handler
// request bodies. Types haven't caught up with Next.js 15 docs yet —
// casting is the correct approach over @ts-ignore.
(nextConfig as Record<string, unknown>).middlewareClientMaxBodySize =
  2 * 1024 * 1024 * 1024; // 2GB

export default nextConfig;