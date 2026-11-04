import { it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("@neondatabase/auth/next", () => ({ createAuthClient: () => ({}) }));
import { requestRecovery, finishRecovery } from "@/modules/auth/recovery";
import { RecoveryForm } from "@/components/recovery-form";
import { ReportView } from "@/components/report";
import { mockReport } from "@/modules/analysis/mock";
const client = () => ({
  requestPasswordReset: vi.fn().mockResolvedValue({ error: null }),
  resetPassword: vi.fn().mockResolvedValue({ error: null }),
});
it("keeps the reset callback on the app origin and preserves guest-save intent", async () => {
  const c = client();
  await requestRecovery(
    c,
    "test@example.invalid",
    "https://app.example.invalid/ignored",
    true,
  );
  expect(c.requestPasswordReset).toHaveBeenCalledWith({
    email: "test@example.invalid",
    redirectTo: "https://app.example.invalid/auth/reset-password?save=guest",
  });
});
it("validates password confirmation before submitting the reset token", async () => {
  const c = client();
  await expect(
    finishRecovery(c, "long-password", "different", "fixture-token"),
  ).rejects.toThrow("match");
  expect(c.resetPassword).not.toHaveBeenCalled();
  await finishRecovery(c, "long-password", "long-password", "fixture-token");
  expect(c.resetPassword).toHaveBeenCalledWith({
    newPassword: "long-password",
    token: "fixture-token",
  });
});
it("handles server rejection of expired or invalid tokens without claiming success", async () => {
  const c = client();
  c.resetPassword.mockResolvedValue({ error: { message: "expired" } });
  await expect(
    finishRecovery(c, "long-password", "long-password", "fixture-token"),
  ).rejects.toThrow("expired");
  const html = renderToStaticMarkup(
    <RecoveryForm reset invalid token="fixture-token" saveGuest />,
  );
  expect(html).toContain("invalid or expired");
  expect(html).toContain("/auth/forgot-password?save=guest");
  expect(html).not.toContain("Update password");
});
it("does not expose account details in reset-request errors", async () => {
  const c = client();
  c.requestPasswordReset.mockResolvedValue({
    error: { message: "private provider detail" },
  });
  await expect(
    requestRecovery(
      c,
      "test@example.invalid",
      "https://app.example.invalid",
      false,
    ),
  ).rejects.toThrow("could not request");
});
it("uses a secondary heading and unnumbered labels for the abbreviated sample", () => {
  const html = renderToStaticMarkup(
    <ReportView
      initial={mockReport}
      sections={["segments", "thirtyDayPlan"]}
    />,
  );
  expect(html).not.toContain("<h1");
  expect(html).not.toContain("03 ·");
  expect(html).toContain("Week 1");
  expect(html).toContain("Planning assumptions");
});
