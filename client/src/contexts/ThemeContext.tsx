import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "retro";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

const THEME_ORDER: Theme[] = ["light", "dark", "retro"];

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme");
      if (stored && THEME_ORDER.includes(stored as Theme)) {
        return stored as Theme;
      }
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes
    root.classList.remove("dark", "retro");
    // Add the active theme class
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "retro") {
      root.classList.add("retro");
    }

    if (switchable) {
      localStorage.setItem("theme", theme);
    }
  }, [theme, switchable]);

  const setTheme = (newTheme: Theme) => {
    if (switchable) setThemeState(newTheme);
  };

  const cycleTheme = () => {
    if (!switchable) return;
    setThemeState((prev) => {
      const idx = THEME_ORDER.indexOf(prev);
      return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
