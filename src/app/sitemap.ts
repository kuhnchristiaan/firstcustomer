import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = new URL(
    process.env.APP_URL ??
      "https://firstcustomer-kuhnchristiaans-projects.vercel.app",
  ).origin;
  return [{ url: `${origin}/advisor`, changeFrequency: "weekly", priority: 1 }];
}
