import { useEffect, useState } from "react";
import type { AuthUser } from "./api/client";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";

export type ThemeMode = "light" | "dark";
type ThemeDefaultMode = ThemeMode | "system";

const truthyValues = new Set(["1", "true", "yes", "on"]);

function normalizeEnvValue(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .toLowerCase();
}

function envBool(value: unknown, fallback: boolean): boolean {
  const normalized = normalizeEnvValue(value);
  if (!normalized) {
    return fallback;
  }
  return truthyValues.has(normalized);
}

function envThemeDefault(value: unknown): ThemeDefaultMode {
  const normalized = normalizeEnvValue(value);
  if (normalized === "light" || normalized === "dark" || normalized === "system") {
    return normalized;
  }
  return "system";
}

const enableThemeToggle = envBool(import.meta.env.VITE_ENABLE_THEME_TOGGLE, true);
const configuredDefaultTheme = envThemeDefault(import.meta.env.VITE_DEFAULT_THEME);

function initialTheme(): ThemeMode {
  const fromStorage = window.localStorage.getItem("theme_mode");
  if (fromStorage === "light" || fromStorage === "dark") {
    return fromStorage;
  }
  if (configuredDefaultTheme === "light" || configuredDefaultTheme === "dark") {
    return configuredDefaultTheme;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("theme_mode", theme);
  }, [theme]);

  const toggleTheme = () => {
    if (!enableThemeToggle) {
      return;
    }
    setTheme((current) => (current === "light" ? "dark" : "light"));
  };

  if (!user) {
    return (
      <LoginPage
        onLogin={setUser}
        theme={theme}
        onToggleTheme={toggleTheme}
        showThemeToggle={enableThemeToggle}
      />
    );
  }

  return (
    <HomePage
      user={user}
      onLogout={() => setUser(null)}
      theme={theme}
      onToggleTheme={toggleTheme}
      showThemeToggle={enableThemeToggle}
    />
  );
}
