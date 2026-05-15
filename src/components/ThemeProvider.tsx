import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ThemeContext, type Theme } from "@/components/ThemeContext";

const storageKey = "echoui.theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme());
  const nextTheme: Theme = theme === "dark" ? "light" : "dark";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {
      // Storage can be unavailable in hardened/private browser contexts.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(
    () => ({
      nextTheme,
      theme,
      toggleTheme,
    }),
    [nextTheme, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}
