import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "system" | "light" | "dark" | "high-contrast";
export type ResolvedTheme = "light" | "dark" | "high-contrast";

interface ThemeContextType {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
}

const STORAGE_KEY = "agrismart_theme_preference";

const ThemeContext = createContext<ThemeContextType | null>(null);

const getStoredPreference = (): ThemePreference => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "system" || stored === "light" || stored === "dark" || stored === "high-contrast") {
    return stored;
  }
  return "system";
};

const resolveTheme = (preference: ThemePreference): ResolvedTheme => {
  if (preference === "light" || preference === "dark" || preference === "high-contrast") {
    return preference;
  }

  const prefersHighContrast =
    window.matchMedia("(forced-colors: active)").matches ||
    window.matchMedia("(prefers-contrast: more)").matches;

  if (prefersHighContrast) {
    return "high-contrast";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => getStoredPreference());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(getStoredPreference()));

  useEffect(() => {
    const mediaQueries = [
      window.matchMedia("(prefers-color-scheme: dark)"),
      window.matchMedia("(forced-colors: active)"),
      window.matchMedia("(prefers-contrast: more)"),
    ];

    const recalculate = () => {
      setResolvedTheme(resolveTheme(preference));
    };

    recalculate();
    mediaQueries.forEach((query) => query.addEventListener("change", recalculate));

    return () => {
      mediaQueries.forEach((query) => query.removeEventListener("change", recalculate));
    };
  }, [preference]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "high-contrast");

    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    }

    if (resolvedTheme === "high-contrast") {
      root.classList.add("high-contrast");
    }
  }, [resolvedTheme]);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      setPreference,
    }),
    [preference, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
};
