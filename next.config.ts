import type { NextConfig } from "next";
const config: NextConfig = {
  // Keep fixture-only browser QA separate from the founder's running dev server.
  distDir:
    process.env.FIRSTCUSTOMERS_UI_QA === "true" ? ".next-ui-qa" : ".next",
  poweredByHeader: false,
  allowedDevOrigins:
    process.env.NODE_ENV !== "production" && process.env.DEV_LAN_ORIGIN
      ? [new URL(process.env.DEV_LAN_ORIGIN).hostname]
      : [],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
