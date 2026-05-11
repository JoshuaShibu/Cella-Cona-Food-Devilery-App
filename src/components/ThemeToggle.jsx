import { useTheme } from "../app/theme/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      <span className="theme-toggle-track">
        <span className="theme-toggle-icon" aria-hidden="true">
          {isDark ? "🌙" : "☀️"}
        </span>
      </span>
    </button>
  );
}

