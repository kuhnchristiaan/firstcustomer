/** Preserve the certificate verification currently used by Neon require-mode URLs. */
export function databaseUrl(input: string) {
  const url = new URL(input);
  if (
    url.hostname.endsWith(".neon.tech") &&
    ["require", "prefer", "verify-ca"].includes(
      url.searchParams.get("sslmode") ?? "",
    )
  ) {
    url.searchParams.set("sslmode", "verify-full");
    url.searchParams.delete("uselibpqcompat");
  }
  return url.toString();
}
