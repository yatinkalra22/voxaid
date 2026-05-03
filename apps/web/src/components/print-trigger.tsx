"use client";

import { useEffect } from "react";

/** Tiny client component that triggers the browser print dialog after mount. */
export function PrintTrigger() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 250);
    return () => clearTimeout(t);
  }, []);
  return null;
}
