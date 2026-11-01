import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The admin's account avatar sits bottom left, where the dev badge would cover it.
  devIndicators: { position: "bottom-right" },
  // Parabola (packages/parabola) ships TypeScript source; Next compiles it.
  transpilePackages: ["@beltechi/parabola"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
    // Cap generated sizes - prevents 3840px requests, saves bandwidth
    deviceSizes: [640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Quality levels used across the app (thumbnails use 60, larger use 80)
    qualities: [60, 75, 80],
  },
  // The design system showcase moved from /ds to /parabola; keep old links working.
  async redirects() {
    return [
      { source: "/ds", destination: "/parabola", permanent: true },
      { source: "/ds/:path*", destination: "/parabola/:path*", permanent: true },
      // Lifestyle rolled up into Journal (2026-10-04).
      { source: "/lifestyle", destination: "/journal", permanent: true },
    ];
  },
  // The example sites (seed/) are read from disk by the routes that offer and load them (lib/cms/examples.ts).
  outputFileTracingIncludes: {
    "/api/setup": ["./seed/**/*"],
    "/api/admin/examples": ["./seed/**/*"],
  },
  // Exclude ffmpeg packages from bundling - they use native binaries
  serverExternalPackages: [
    "fluent-ffmpeg",
    "@ffmpeg-installer/ffmpeg",
  ],
};

export default nextConfig;
