"use client";

import { createContext, useContext } from "react";
import type { Dictionary } from "./dictionaries/en";
import type { Locale } from "./config";
import { fmt } from "./load";

type IntlValue = { locale: Locale; dir: "ltr" | "rtl"; t: Dictionary };

const IntlContext = createContext<IntlValue | null>(null);

export function IntlProvider({
  locale,
  dir,
  dict,
  children,
}: {
  locale: Locale;
  dir: "ltr" | "rtl";
  dict: Dictionary;
  children: React.ReactNode;
}) {
  return (
    <IntlContext.Provider value={{ locale, dir, t: dict }}>{children}</IntlContext.Provider>
  );
}

export function useIntl(): IntlValue {
  const ctx = useContext(IntlContext);
  if (!ctx) throw new Error("useIntl must be used within IntlProvider");
  return ctx;
}

// Convenience: returns the dictionary directly.
export function useT(): Dictionary {
  return useIntl().t;
}

export { fmt };
