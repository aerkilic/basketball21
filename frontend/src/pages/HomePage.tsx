import { useState } from "react";
import { fetchHealth, type AuthUser } from "../api/client";
import type { ThemeMode } from "../App";

const projectName = import.meta.env.VITE_PROJECT_NAME ?? "PROJECT_DISPLAY_NAME";

type Props = {
  user: AuthUser;
  onLogout: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  showThemeToggle: boolean;
};

export function HomePage({ user, onLogout, theme, onToggleTheme, showThemeToggle }: Props) {
  const [message, setMessage] = useState("Backend noch nicht geprueft.");
  const [busy, setBusy] = useState(false);

  const checkBackend = async () => {
    setBusy(true);
    setMessage("Backend wird geprueft...");
    try {
      const health = await fetchHealth();
      setMessage(`Status: ${health.status} | Projekt: ${health.project} | Backend: ${health.backend}`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unbekannter Fehler";
      setMessage(`Backend nicht erreichbar: ${detail}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page">
      <section className="card">
        <h1>{projectName}</h1>
        <p>Neutrale Projektvorlage mit Backend-Health-Check und Marketing-Verlinkung.</p>
        <p className="status">Angemeldet als: {user.email}</p>
        <p className="status">Aktives Theme: {theme}</p>

        <button type="button" onClick={checkBackend} disabled={busy}>
          {busy ? "Pruefe..." : "Backend pruefen"}
        </button>
        {showThemeToggle && (
          <button type="button" className="secondary" onClick={onToggleTheme}>
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
        )}
        <button type="button" className="secondary" onClick={onLogout}>
          Abmelden
        </button>
        <p className="status">{message}</p>

        <div className="preview" aria-label="App-Vorschau-Platzhalter">
          <span>Platzhalter App-Vorschau</span>
        </div>

        <nav className="links">
          <a href="/../marketing/index.html" target="_blank" rel="noreferrer">Marketing-Seite</a>
          <a href="/../marketing/datenschutz.html" target="_blank" rel="noreferrer">Datenschutz</a>
          <a href="/../marketing/support.html" target="_blank" rel="noreferrer">Support</a>
          <a href="/../marketing/impressum.html" target="_blank" rel="noreferrer">Impressum</a>
          <a href="/../marketing/kontakt.html" target="_blank" rel="noreferrer">Kontakt</a>
        </nav>
      </section>
    </main>
  );
}
