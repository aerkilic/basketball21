import { useState } from "react";
import type { ThemeMode } from "../App";
import {
  fetchGoogleAuthUrl,
  loginWithEmailPassword,
  registerWithEmailPassword,
  type AuthUser,
} from "../api/client";

const projectName = import.meta.env.VITE_PROJECT_NAME ?? "PROJECT_DISPLAY_NAME";
const enableGoogleLogin = (import.meta.env.VITE_ENABLE_GOOGLE_LOGIN ?? "true").toLowerCase() === "true";

type Props = {
  onLogin: (user: AuthUser) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  showThemeToggle: boolean;
};

export function LoginPage({ onLogin, theme, onToggleTheme, showThemeToggle }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Bitte mit E-Mail und Passwort anmelden.");

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setMessage("E-Mail und Passwort sind erforderlich.");
      return;
    }
    setBusy(true);
    setMessage("Anmeldung wird geprueft...");
    try {
      const payload = await loginWithEmailPassword(email.trim(), password);
      onLogin(payload.user);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unbekannter Fehler";
      setMessage(`Login fehlgeschlagen: ${detail}`);
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      setMessage("E-Mail, Passwort und Passwort-Bestaetigung sind erforderlich.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwort und Bestaetigung sind nicht identisch.");
      return;
    }
    setBusy(true);
    setMessage("Account wird erstellt...");
    try {
      const payload = await registerWithEmailPassword(email.trim(), password, confirmPassword);
      setMessage("Registrierung erfolgreich. Du bist jetzt angemeldet.");
      onLogin(payload.user);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unbekannter Fehler";
      setMessage(`Registrierung fehlgeschlagen: ${detail}`);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    setBusy(true);
    setMessage("Google-Login wird vorbereitet...");
    try {
      const authUrl = await fetchGoogleAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unbekannter Fehler";
      setMessage(`Google-Login nicht verfuegbar: ${detail}`);
      setBusy(false);
    }
  };

  return (
    <main className="page">
      <section className="card">
        <h1>{projectName}</h1>
        <p>Auth-Vorlage: Login und Registrierung mit E-Mail + Passwort, optional Google-Login.</p>
        <p className="status">Aktives Theme: {theme}</p>

        {showThemeToggle && (
          <div className="button-row">
            <button type="button" className="secondary" onClick={onToggleTheme}>
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
          </div>
        )}

        <div className="button-row">
          <button
            type="button"
            className={mode === "login" ? "" : "secondary"}
            onClick={() => {
              setMode("login");
              setMessage("Bitte mit E-Mail und Passwort anmelden.");
            }}
          >
            Anmelden
          </button>
          <button
            type="button"
            className={mode === "register" ? "" : "secondary"}
            onClick={() => {
              setMode("register");
              setMessage("Neuen Account mit E-Mail und Passwort erstellen.");
            }}
          >
            Registrieren
          </button>
        </div>

        <div className="field">
          <label htmlFor="email">E-Mail-Adresse</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="mail@example.com"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Passwort</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                if (mode === "register") {
                  return;
                }
                void handleLogin();
              }
            }}
          />
        </div>

        {mode === "register" && (
          <div className="field">
            <label htmlFor="confirm_password">Passwort bestaetigen</label>
            <input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="••••••••"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleRegister();
                }
              }}
            />
          </div>
        )}

        <div className="button-row">
          {mode === "login" ? (
            <button type="button" onClick={() => void handleLogin()} disabled={busy}>
              {busy ? "Bitte warten..." : "Mit E-Mail anmelden"}
            </button>
          ) : (
            <button type="button" onClick={() => void handleRegister()} disabled={busy}>
              {busy ? "Bitte warten..." : "Account erstellen"}
            </button>
          )}
          {mode === "login" && enableGoogleLogin && (
            <button type="button" className="google" onClick={() => void handleGoogleLogin()} disabled={busy}>
              Mit Google anmelden
            </button>
          )}
        </div>

        <p className="status">{message}</p>
        <p className="hint">
          Hinweis: Google-Login ist eine Vorlage. Konfiguriere
          `GOOGLE_OAUTH_CLIENT_ID` und `GOOGLE_OAUTH_REDIRECT_URI` in `backend/.env`.
        </p>
      </section>
    </main>
  );
}
