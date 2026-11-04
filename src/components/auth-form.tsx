"use client";
import "@/lib/browser-crypto";
import { createAuthClient } from "@neondatabase/auth/next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { FunnelView } from "./funnel";
export const authClient = createAuthClient();
const client = authClient;
export function AuthForm({
  signup,
  website,
  saveGuest = false,
}: {
  signup: boolean;
  website: string;
  saveGuest?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError("");
        setNotice("");
        const f = new FormData(e.currentTarget);
        try {
          const credentials = {
            email: String(f.get("email")),
            password: String(f.get("password")),
          };
          const r = signup
            ? await client.signUp.email({
                ...credentials,
                name: String(f.get("name")),
              })
            : await client.signIn.email(credentials);
          if (r.error)
            throw new Error(r.error.message || "Authentication failed");
          if (signup && r.data && "token" in r.data && !r.data.token) {
            setNotice(
              "Check your email to verify your account, then sign in here. If you are saving a guest report, use this same browser before the report expires.",
            );
            return;
          }
          router.push(
            saveGuest
              ? "/guest/claim"
              : `/dashboard${website ? `?url=${encodeURIComponent(website)}` : ""}`,
          );
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Sign in failed");
        } finally {
          setPending(false);
        }
      }}
    >
      {signup && <FunnelView event="registration_start" />}
      {signup && (
        <label className="block text-sm">
          Name
          <input name="name" autoComplete="name" required className="mt-2" />
        </label>
      )}
      <label className="block text-sm">
        Email
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          className="mt-2"
        />
      </label>
      <label className="block text-sm">
        Password
        <input
          type={showPassword ? "text" : "password"}
          name="password"
          minLength={8}
          maxLength={128}
          autoComplete={signup ? "new-password" : "current-password"}
          required
          className="mt-2"
        />
      </label>
      <button
        type="button"
        aria-pressed={showPassword}
        className="text-sm underline"
        onClick={() => setShowPassword((v) => !v)}
      >
        {showPassword ? "Hide password" : "Show password"}
      </button>
      {signup && (
        <p className="text-sm muted">
          Use 8–128 characters. Choose a unique password.
        </p>
      )}
      {!signup && (
        <Link
          className="block text-sm underline"
          href={`/auth/forgot-password${saveGuest ? "?save=guest" : ""}`}
        >
          Forgot password?
        </Link>
      )}
      {signup && (
        <p className="text-sm leading-6 muted">
          Read our{" "}
          <Link href="/privacy" className="underline">
            privacy notice
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="underline">
            beta terms
          </Link>
          . Your guest report stays in this browser until saved or expired.
        </p>
      )}
      <Button className="w-full" disabled={pending}>
        {pending ? "Please wait…" : signup ? "Create free account" : "Sign in"}
      </Button>
      <p role="alert" className="text-sm text-red-700">
        {error}
      </p>
      <p role="status" className="text-sm leading-6">
        {notice}
      </p>
      <Link
        className="block text-center text-sm underline"
        href={`/auth/${signup ? "sign-in" : "sign-up"}?url=${encodeURIComponent(website)}${saveGuest ? "&save=guest" : ""}`}
      >
        {signup
          ? "Already have an account? Sign in"
          : "New here? Create a free account"}
      </Link>
    </form>
  );
}
export function SignOut() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        const result = await client.signOut();
        if (!result.error) {
          router.push("/");
          router.refresh();
        }
      }}
    >
      Sign out
    </Button>
  );
}
