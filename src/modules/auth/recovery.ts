import { z } from "zod";
type Result = { error?: { message?: string } | null };
export interface RecoveryClient {
  requestPasswordReset(input: {
    email: string;
    redirectTo: string;
  }): Promise<Result>;
  resetPassword(input: { newPassword: string; token: string }): Promise<Result>;
}
export async function requestRecovery(
  client: RecoveryClient,
  email: string,
  origin: string,
  saveGuest: boolean,
) {
  const address = z.email().parse(email);
  const redirectTo = `${new URL(origin).origin}/auth/reset-password${saveGuest ? "?save=guest" : ""}`;
  const result = await client.requestPasswordReset({
    email: address,
    redirectTo,
  });
  if (result.error)
    throw new Error(
      "We could not request a reset link. Please try again later.",
    );
}
export async function finishRecovery(
  client: RecoveryClient,
  password: string,
  confirmation: string,
  token: string,
) {
  if (password !== confirmation) throw new Error("The passwords do not match.");
  if (!z.string().min(8).max(128).safeParse(password).success)
    throw new Error("Use a password with 8–128 characters.");
  if (!z.string().min(1).max(2048).safeParse(token).success)
    throw new Error("Request a new reset link.");
  const result = await client.resetPassword({ newPassword: password, token });
  if (result.error)
    throw new Error(
      "This reset link may be invalid or expired. Request a new link and try again.",
    );
}
