"use client";
import { requestRecovery, finishRecovery } from "@/modules/auth/recovery";
import { useState } from "react";
import Link from "next/link";
import { authClient } from "./auth-form";
import { Button } from "./ui/button";
export function RecoveryForm({
  reset,
  token,
  invalid,
  saveGuest = false,
}: {
  reset: boolean;
  token?: string;
  invalid?: boolean;
  saveGuest?: boolean;
}) {
  const [pending, setPending] = useState(false),
    [complete, setComplete] = useState(false),
    [error, setError] = useState(""),
    [visible, setVisible] = useState(false);
  const suffix = saveGuest ? "?save=guest" : "";
  if (complete)
    return (
      <div role="status">
        <p className="mb-5 text-sm leading-7">
          {reset
            ? "Your password was updated. Sign in with your new password."
            : "If this address has an account, a reset link has been requested. Check your inbox and spam folder. You can request a new link if yours expires."}
        </p>
        <Link href={`/auth/sign-in${suffix}`} className="underline">
          Back to sign in
        </Link>
      </div>
    );
  if (reset && (!token || invalid))
    return (
      <div role="alert">
        <p className="mb-4">This reset link is missing, invalid or expired.</p>
        <Link href={`/auth/forgot-password${suffix}`} className="underline">
          Request a new reset link
        </Link>
      </div>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError("");
        const f = new FormData(e.currentTarget);
        try {
          if (reset)
            await finishRecovery(
              authClient,
              String(f.get("password")),
              String(f.get("confirm")),
              token!,
            );
          else
            await requestRecovery(
              authClient,
              String(f.get("email")),
              window.location.origin,
              saveGuest,
            );
          setComplete(true);
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Password recovery failed.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      {reset ? (
        <>
          <label className="block text-sm">
            New password
            <input
              name="password"
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
          </label>
          <label className="block text-sm">
            Confirm new password
            <input
              name="confirm"
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
          </label>
          <button
            type="button"
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
            className="text-sm underline"
          >
            {visible ? "Hide passwords" : "Show passwords"}
          </button>
          <p className="text-sm muted">Use 8–128 characters.</p>
        </>
      ) : (
        <label className="block text-sm">
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
      )}
      <Button disabled={pending} type="submit">
        {pending
          ? "Please wait…"
          : reset
            ? "Update password"
            : "Send reset link"}
      </Button>
      <p role="alert" className="text-sm text-red-700">
        {error}
      </p>
      {error && reset && (
        <Link
          href={`/auth/forgot-password${suffix}`}
          className="block underline"
        >
          Request a new link
        </Link>
      )}
      <Link href={`/auth/sign-in${suffix}`} className="block text-sm underline">
        Back to sign in
      </Link>
    </form>
  );
}
