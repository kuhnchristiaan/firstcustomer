import { AppError } from "@/lib/errors";
import { ProviderOutputError } from "./provider";
export function analysisFailure(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof ProviderOutputError) {
    if (error.reason === "input_budget")
      return new AppError(
        "This website contains more information than we can process in one report. Try the main product page or a shorter features page.",
        422,
      );
    if (error.reason === "product_identity_uncertain")
      return new AppError(
        "We could not confidently identify the SaaS this website sells. Try a page that clearly describes the product and its features.",
        422,
      );
    return new AppError(
      "We could not complete a reliable strategy from this website. Please try again, or use a page that focuses on the product.",
      502,
    );
  }
  return new AppError(
    "The report could not be generated. Please try again.",
    502,
  );
}
