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
  // COOP/COEP required for FFmpeg WASM (SharedArrayBuffer) — scoped to upload
  // routes only. Previously applied to ALL routes via (.*) which blocked
  // cross-origin popups needed for OAuth and payment redirects (Monnify).
  async headers() {
    return [
      {
        // Only apply SharedArrayBuffer headers to pages that use FFmpeg WASM
        source: "/(create|stories)(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy",   value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
      {
        // Cache static assets aggressively — fonts, icons, etc.
        source: "/fonts/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
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