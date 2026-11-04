import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const origin = new URL(
    process.env.APP_URL ??
      "https://firstcustomer-kuhnchristiaans-projects.vercel.app",
  ).origin;
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/products/", "/guest/", "/auth/"],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
