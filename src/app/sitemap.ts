import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = new URL(
    process.env.APP_URL ??
      "https://firstcustomer-kuhnchristiaans-projects.vercel.app",
  ).origin;
  return [
    { url: origin, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/preview`, changeFrequency: "monthly", priority: 0.7 },
  ];
}
