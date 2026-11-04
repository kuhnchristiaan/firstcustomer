/** Preserve cryptographic randomness on local HTTP LAN previews. */
export function ensureRandomUUID(crypto: Crypto) {
  if (typeof crypto.randomUUID === "function") return;
  if (typeof crypto.getRandomValues !== "function")
    throw new Error("This browser requires HTTPS for secure authentication.");
  Object.defineProperty(crypto, "randomUUID", {
    configurable: true,
    value: (): ReturnType<Crypto["randomUUID"]> => {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    },
  });
}

// This dependency must execute before the Neon browser SDK is imported.
// Production authentication continues to require the normal HTTPS environment.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production")
  ensureRandomUUID(window.crypto);
