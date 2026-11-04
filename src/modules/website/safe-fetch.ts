import http from "node:http";
import https from "node:https";
import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { AppError } from "@/lib/errors";
export function publicAddress(address: string) {
  try {
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}
export function normalizeUrl(input: string) {
  const url = new URL(input.includes("://") ? input : `https://${input}`);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port)) ||
    host === "localhost" ||
    (!host.includes(".") && !ipaddr.isValid(host)) ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    (ipaddr.isValid(host) && !publicAddress(host))
  )
    throw new AppError("Enter a public HTTP or HTTPS website.");
  url.hash = "";
  return url.toString();
}
// Resolve once, validate every answer, then pin the socket to that answer. Never re-resolve on connect.
export async function safeFetch(
  input: string,
  signal: AbortSignal,
  redirects = 0,
): Promise<{ url: string; body: string; type: string; status: number }> {
  const url = new URL(normalizeUrl(input));
  signal.throwIfAborted();
  const addresses = await new Promise<{ address: string; family: number }[]>(
    (resolve, reject) => {
      const abort = () => reject(new AppError("Website lookup timed out."));
      signal.addEventListener("abort", abort, { once: true });
      lookup(url.hostname, { all: true })
        .then(resolve, reject)
        .finally(() => signal.removeEventListener("abort", abort));
    },
  );
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new AppError("This website resolves to a restricted network.");
  const selected = addresses[0];
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    const req = transport.get(
      url,
      {
        signal,
        agent: false,
        family: selected.family,
        timeout: 6000,
        headers: {
          "User-Agent": "FirstCustomersBot/1.0",
          Accept: "text/html,text/plain",
          "Accept-Encoding": "identity",
        },
        lookup: (_hostname, _options, callback) =>
          callback(null, selected.address, selected.family),
      },
      (res) => {
        const status = res.statusCode || 500;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirects >= 3)
            return reject(new AppError("Too many website redirects."));
          let destination: URL;
          try {
            destination = new URL(res.headers.location, url);
          } catch {
            return reject(
              new AppError("The website returned an invalid redirect."),
            );
          }
          if (destination.origin !== url.origin) {
            return reject(
              new AppError(
                "Please submit the final website address. Cross-origin redirects are not crawled.",
              ),
            );
          }
          if (url.protocol === "https:" && destination.protocol !== "https:")
            return reject(new AppError("Unsafe website redirect."));
          safeFetch(destination.toString(), signal, redirects + 1).then(
            resolve,
            reject,
          );
          return;
        }
        const type = String(res.headers["content-type"] || "");
        if (!/text\/(html|plain)|application\/xhtml/i.test(type)) {
          res.resume();
          reject(new AppError("The website did not return readable HTML."));
          return;
        }
        const chunks: Buffer[] = [];
        let bytes = 0;
        res.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 1000000) {
            req.destroy(
              new AppError("Website response exceeds the size limit."),
            );
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () =>
          resolve({
            url: url.toString(),
            body: Buffer.concat(chunks).toString("utf8"),
            type,
            status,
          }),
        );
        res.on("error", reject);
      },
    );
    req.on("timeout", () =>
      req.destroy(new AppError("Website request timed out.")),
    );
    req.on("error", reject);
  });
}
