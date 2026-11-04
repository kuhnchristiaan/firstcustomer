"use client";
import { useEffect } from "react";

// Native print events also cover browsers without the ::details-content selector.
export function PrintSupport() {
  useEffect(() => {
    let openedForPrint: HTMLDetailsElement[] = [];
    const restore = () => {
      openedForPrint.forEach((details) => details.removeAttribute("open"));
      openedForPrint = [];
    };
    const prepare = () => {
      document
        .querySelectorAll<HTMLDetailsElement>("main details:not([open])")
        .forEach((details) => {
          openedForPrint.push(details);
          details.setAttribute("open", "");
        });
    };
    window.addEventListener("beforeprint", prepare);
    window.addEventListener("afterprint", restore);
    return () => {
      window.removeEventListener("beforeprint", prepare);
      window.removeEventListener("afterprint", restore);
      restore();
    };
  }, []);
  return null;
}
