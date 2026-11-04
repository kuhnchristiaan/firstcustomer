import { it, expect } from "vitest";
import { safeFetch } from "@/modules/website/safe-fetch";
import { extract } from "@/modules/website/extract";
it.skipIf(process.env.LIVE_CRAWL_TEST !== "true")(
  "fetches ordinary public HTML through the real pinned socket",
  async () => {
    const response = await safeFetch(
      "https://example.com/",
      AbortSignal.timeout(10000),
    );
    expect(response.status).toBe(200);
    const source = extract(response.body, response.url);
    expect(source.title).toBe("Example Domain");
    expect(source.content).toContain("documentation");
  },
  15000,
);
