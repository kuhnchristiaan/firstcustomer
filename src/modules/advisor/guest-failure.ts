import { AppError } from "@/lib/errors";

/** Persist only fixed, non-identifying diagnostics; never store provider errors or URLs. */
export function guestFailureMessage(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = error.code;
    if (code === "ENOTFOUND" || code === "EAI_AGAIN")
      return "The website address could not be resolved.";
    if (code === "ECONNREFUSED" || code === "ECONNRESET")
      return "The website connection was unavailable.";
  }
  if (error instanceof AppError) {
    const safe = new Set([
      "Crawling restrictions could not be checked.",
      "This site requests a crawl delay beyond the analysis time budget.",
      "This website redirects to a different domain. Enter its final address.",
      "The website does not permit crawling this page.",
      "This website resolves to a restricted network.",
      "Unsafe website redirect.",
      "Too many website redirects.",
      "The website did not return readable HTML.",
      "Website request timed out.",
      "Website lookup timed out.",
      "No useful website content was found. The site may require JavaScript or block crawling.",
    ]);
    if (safe.has(error.message)) return error.message;
  }
  return "The advisor could not complete this plan. No plan was published.";
}
