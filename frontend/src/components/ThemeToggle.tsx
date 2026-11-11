import type { Theme } from "../lib/preferences";

type Props = {
  theme: Theme;
  onToggle: () => void;
};

export default function ThemeToggle({ theme, onToggle }: Props) {
  const oscuro = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-pressed={oscuro}
      onClick={onToggle}
      title={oscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
    >
      <span className="theme-icon" aria-hidden="true">
        {oscuro ? "☀" : "☾"}
      </span>
      <span>{oscuro ? "Modo claro" : "Modo oscuro"}</span>
    </button>
  );
}
