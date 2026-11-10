import { it, expect } from "vitest";
import { AppError } from "@/lib/errors";
import { guestFailureMessage } from "@/modules/advisor/guest-failure";
it("stores useful known failures without saving arbitrary user or provider text", () => {
  expect(
    guestFailureMessage(
      new AppError("Crawling restrictions could not be checked."),
    ),
  ).toBe("Crawling restrictions could not be checked.");
  expect(guestFailureMessage(new Error("private URL or provider output"))).toBe(
    "The advisor could not complete this plan. No plan was published.",
  );
  expect(
    guestFailureMessage(new AppError("private URL or user text")),
  ).not.toContain("private");
});
