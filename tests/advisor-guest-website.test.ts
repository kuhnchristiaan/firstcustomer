import { it, expect } from "vitest";
import { guestWebsite } from "@/components/guest-advisor";
it("uses a newly entered website after a failure and clears only an unrelated error", () => {
  expect(guestWebsite("FAILED", "https://old.example/", "new.example")).toEqual(
    { url: "new.example", clearError: true },
  );
  expect(guestWebsite("FAILED", "https://old.example/", "old.example")).toEqual(
    { url: "old.example", clearError: false },
  );
});
it("keeps the original site for a running or completed plan", () => {
  expect(
    guestWebsite("SUCCEEDED", "https://old.example/", "new.example").url,
  ).toBe("https://old.example/");
  expect(
    guestWebsite("RUNNING", "https://old.example/", "new.example").url,
  ).toBe("https://old.example/");
});
