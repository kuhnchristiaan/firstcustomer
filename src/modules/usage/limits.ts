import { AppError } from "@/lib/errors";
export function enforceLimits(
  counts: { monthly: number; running: number; recent: number },
  limits: { monthly: number; concurrent: number },
) {
  if (counts.monthly >= limits.monthly)
    throw new AppError("Your free monthly report quota has been reached.", 429);
  if (counts.running >= limits.concurrent)
    throw new AppError(
      "A report is already processing. Please wait before starting another.",
      429,
      "analysis_busy",
    );
  if (counts.recent >= 3)
    throw new AppError(
      "Please wait a minute before requesting another report.",
      429,
    );
}
