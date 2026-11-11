export type Theme = "light" | "dark";
export type Role = "cliente" | "administrador";

const THEME_KEY = "cc-theme";
const ROLE_KEY = "cc-role";

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // La vista sigue funcionando aunque el navegador bloquee storage.
  }
}

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

function isRole(value: string | null): value is Role {
  return value === "cliente" || value === "administrador";
}

export function initialTheme(): Theme {
  if (typeof document !== "undefined") {
    const fromDocument = document.documentElement.dataset.theme ?? null;
    if (isTheme(fromDocument)) return fromDocument;
  }

  const stored = safeGet(THEME_KEY);
  if (isTheme(stored)) return stored;

  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

export function persistTheme(theme: Theme): void {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta instanceof HTMLMetaElement) {
      meta.content = theme === "dark" ? "#0a141d" : "#123a6b";
    }
  }

  safeSet(THEME_KEY, theme);
}

export function initialRole(): Role {
  const stored = safeGet(ROLE_KEY);
  return isRole(stored) ? stored : "cliente";
}

export function persistRole(role: Role): void {
  safeSet(ROLE_KEY, role);
}
