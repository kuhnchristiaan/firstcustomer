let pending: Promise<void> | undefined;
export function loadTurnstileSdk() {
  if (window.turnstile) return Promise.resolve();
  if (pending) return pending;
  pending = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    const fail = () => {
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      script.remove();
      pending = undefined;
      reject(
        new Error(
          "Verification could not load. Check your connection and retry.",
        ),
      );
    };
    const timer = setTimeout(fail, 15000);
    script.onload = () => {
      if (!window.turnstile) {
        fail();
        return;
      }
      clearTimeout(timer);
      resolve();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return pending;
}
