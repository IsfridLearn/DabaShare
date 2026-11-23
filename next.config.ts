import type { NextConfig } from "next";

// Baseline security headers for every response. A full script CSP is not set
// because Next.js injects inline scripts; these directives are the ones that
// don't need nonces: no framing (clickjacking), no plugins, forms and <base>
// only to this site, and links/uploads/etc. only over HTTPS in production.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

// Public site URL for auth email links. An explicit NEXT_PUBLIC_SITE_URL wins;
// on Vercel it falls back to the project's production address (a system
// variable Vercel sets at build time), so the first deploy works before you
// know your *.vercel.app name. Inlined into server and browser bundles.
const vercelProductionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || (vercelProductionHost ? `https://${vercelProductionHost}` : undefined);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  env: siteUrl ? { NEXT_PUBLIC_SITE_URL: siteUrl } : {},
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
