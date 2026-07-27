import type { NextConfig } from "next";

// Production is same-origin by design (ARCHITECTURE.md §2 -- one reverse
// proxy routes /api/* to warden's API server), so `src/lib/api.ts` always
// uses relative paths and this rewrite is a no-op there. In local dev,
// Next.js and the Zig API server run on different ports, so set
// WARDEN_API_ORIGIN (e.g. http://localhost:8081) to proxy /api/* through
// to it instead.
const apiOrigin = process.env.WARDEN_API_ORIGIN;

const nextConfig: NextConfig = {
  // A minimal, self-contained `.next/standalone` output for the production
  // Docker image (see Dockerfile) -- doesn't affect `next dev`.
  output: "standalone",
  async rewrites() {
    if (!apiOrigin) return [];
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
