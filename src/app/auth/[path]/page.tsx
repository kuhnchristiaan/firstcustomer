import { BrandMark } from "@/components/brand";
import { RecoveryForm } from "@/components/recovery-form";
import { notFound } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { configured } from "@/modules/config/env";
export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>;
  searchParams: Promise<{
    url?: string;
    save?: string;
    token?: string;
    error?: string;
  }>;
}) {
  const { path } = await params;
  const { url = "", save, token, error } = await searchParams;
  const signup = path === "sign-up";
  if (
    !["sign-up", "sign-in", "forgot-password", "reset-password"].includes(path)
  )
    notFound();
  const recovery = path === "forgot-password" || path === "reset-password";
  return (
    <main className="container">
      <div className="auth-layout">
        <aside className="auth-story">
          <span className="brand-symbol">
            <BrandMark />
          </span>
          <div>
            <h2>
              A little more focus.
              <br />
              <span>A better next move.</span>
            </h2>
            <p>
              Your buyer, acquisition channel and next seven days.
              Keep your plan, track progress and learn from real results.
            </p>
          </div>
          <p>Built for SaaS founders. Free to get started.</p>
        </aside>
        <div className="auth-content">
          <p className="eyebrow">YOUR NEXT CHAPTER</p>
          <h1 className="mb-3 mt-4 text-3xl font-semibold tracking-tight">
            {recovery
              ? path === "forgot-password"
                ? "Reset your password"
                : "Choose a new password"
              : signup
                ? "Your sales plan starts here."
                : "Welcome back."}
          </h1>
          <p className="mb-7 text-sm leading-6 muted">
            A free account keeps your plan, completed tasks and weekly results in one
            place.
          </p>
          {configured() ? (
            recovery ? (
              <RecoveryForm
                reset={path === "reset-password"}
                token={token}
                invalid={Boolean(error)}
                saveGuest={save === "guest"}
              />
            ) : (
              <AuthForm
                signup={signup}
                website={url}
                saveGuest={save === "guest"}
              />
            )
          ) : (
            <p className="rounded-lg bg-amber-50 p-4 text-sm leading-6">
              Account registration needs this application’s Neon Auth and
              PostgreSQL configuration. You can explore the sample preview now;
              no credentials are required for that preview.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
