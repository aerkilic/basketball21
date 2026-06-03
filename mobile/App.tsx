import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Appearance, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";

type HealthResponse = {
  status: string;
  project: string;
  backend: string;
};

type AuthUser = {
  email: string;
};

type LoginResponse = {
  status: string;
  user: AuthUser;
  detail?: string;
};

type ThemeMode = "light" | "dark";
type ThemeDefaultMode = ThemeMode | "system";

const projectName = process.env.EXPO_PUBLIC_PROJECT_NAME ?? "PROJECT_DISPLAY_NAME";
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
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

const enableThemeToggle = envBool(process.env.EXPO_PUBLIC_ENABLE_THEME_TOGGLE, true);
const configuredDefaultTheme = envThemeDefault(process.env.EXPO_PUBLIC_DEFAULT_THEME);

function initialTheme(): ThemeMode {
  if (configuredDefaultTheme === "light" || configuredDefaultTheme === "dark") {
    return configuredDefaultTheme;
  }
  const systemTheme = Appearance.getColorScheme();
  return systemTheme === "dark" ? "dark" : "light";
}

async function loginWithEmailPassword(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = (await response.json().catch(() => ({}))) as LoginResponse;
  if (!response.ok || payload.status !== "ok" || !payload.user) {
    throw new Error(payload.detail ?? `Login failed with status ${response.status}`);
  }
  return payload;
}

async function registerWithEmailPassword(
  email: string,
  password: string,
  confirmPassword: string
): Promise<LoginResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, confirm_password: confirmPassword }),
  });
  const payload = (await response.json().catch(() => ({}))) as LoginResponse;
  if (!response.ok || !payload.user) {
    throw new Error(payload.detail ?? `Registration failed with status ${response.status}`);
  }
  return payload;
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("Backend noch nicht geprueft.");
  const [authMessage, setAuthMessage] = useState("Bitte mit E-Mail und Passwort anmelden.");
  const [loading, setLoading] = useState(false);

  const palette =
    theme === "dark"
      ? {
          bg: "#0f1724",
          card: "#1a2438",
          title: "#e6eefb",
          muted: "#bccbe3",
          text: "#d7e5fb",
          inputBg: "#24324d",
          inputBorder: "#44587d",
          placeholder: "#9fb1cf",
          modeBorder: "#4d6282",
          modeActiveBg: "#274063",
          modeActiveBorder: "#80b9ff",
          primary: "#2f8fff",
          secondary: "#607596",
          statusBg: "#24324d",
          note: "#9fb1cf",
        }
      : {
          bg: "#f2f6fc",
          card: "#ffffff",
          title: "#10223a",
          muted: "#38506e",
          text: "#243b53",
          inputBg: "#ffffff",
          inputBorder: "#b8cde6",
          placeholder: "#6b7f99",
          modeBorder: "#8aa8cb",
          modeActiveBg: "#d7e8ff",
          modeActiveBorder: "#1e63b5",
          primary: "#1e88e5",
          secondary: "#6b7f99",
          statusBg: "#eaf1fb",
          note: "#5b6f86",
        };

  const toggleTheme = () => {
    if (!enableThemeToggle) {
      return;
    }
    setTheme((current) => (current === "light" ? "dark" : "light"));
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setAuthMessage("E-Mail und Passwort sind erforderlich.");
      return;
    }
    setLoading(true);
    setAuthMessage("Anmeldung wird geprueft...");
    try {
      const payload = await loginWithEmailPassword(email.trim(), password);
      setUser(payload.user);
      setAuthMessage(`Angemeldet als ${payload.user.email}`);
      setPassword("");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unbekannter Fehler";
      setAuthMessage(`Login fehlgeschlagen: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      setAuthMessage("Bitte E-Mail, Passwort und Bestaetigung angeben.");
      return;
    }
    if (password !== confirmPassword) {
      setAuthMessage("Passwoerter stimmen nicht ueberein.");
      return;
    }
    setLoading(true);
    setAuthMessage("Registrierung wird geprueft...");
    try {
      const payload = await registerWithEmailPassword(email.trim(), password, confirmPassword);
      setUser(payload.user);
      setAuthMessage(`Registriert als ${payload.user.email}`);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unbekannter Fehler";
      setAuthMessage(`Registrierung fehlgeschlagen: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  const checkBackend = async () => {
    setLoading(true);
    setStatus("Backend wird geprueft...");
    try {
      const response = await fetch(`${apiBaseUrl}/api/health/`);
      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }
      const data: HealthResponse = await response.json();
      setStatus(`Status: ${data.status} | Backend: ${data.backend}`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unbekannter Fehler";
      setStatus(`Backend nicht erreichbar: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setMode("login");
    setStatus("Backend noch nicht geprueft.");
    setAuthMessage("Abgemeldet.");
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: palette.bg }]}>
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
        <View style={[styles.container, { backgroundColor: palette.card }]}>
          <Text style={[styles.title, { color: palette.title }]}>{projectName}</Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>Mobile Login-Vorlage mit Backend-Anbindung.</Text>
          <Text style={[styles.themeInfo, { color: palette.muted }]}>Aktives Theme: {theme}</Text>

          {enableThemeToggle && (
            <Pressable
              style={[styles.secondaryButton, { backgroundColor: palette.secondary }]}
              onPress={toggleTheme}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{theme === "dark" ? "Light Mode" : "Dark Mode"}</Text>
            </Pressable>
          )}

          <View style={styles.modeRow}>
            <Pressable
              style={[
                styles.modeButton,
                { backgroundColor: palette.inputBg, borderColor: palette.modeBorder },
                mode === "login" && { backgroundColor: palette.modeActiveBg, borderColor: palette.modeActiveBorder },
              ]}
              onPress={() => setMode("login")}
              disabled={loading}
            >
              <Text style={[styles.modeButtonText, { color: palette.muted }, mode === "login" && { color: palette.text }]}>Login</Text>
            </Pressable>
            <Pressable
              style={[
                styles.modeButton,
                { backgroundColor: palette.inputBg, borderColor: palette.modeBorder },
                mode === "register" && { backgroundColor: palette.modeActiveBg, borderColor: palette.modeActiveBorder },
              ]}
              onPress={() => setMode("register")}
              disabled={loading}
            >
              <Text style={[styles.modeButtonText, { color: palette.muted }, mode === "register" && { color: palette.text }]}>Registrieren</Text>
            </Pressable>
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
            placeholder="E-Mail"
            placeholderTextColor={palette.placeholder}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
            placeholder="Passwort"
            placeholderTextColor={palette.placeholder}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {mode === "register" && (
            <TextInput
              style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
              placeholder="Passwort bestaetigen"
              placeholderTextColor={palette.placeholder}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          )}

          <Pressable
            style={[styles.button, { backgroundColor: palette.primary }]}
            onPress={() => void (mode === "login" ? handleLogin() : handleRegister())}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? "Pruefe..." : mode === "login" ? "Anmelden" : "Registrieren"}</Text>
          </Pressable>
          <Text style={[styles.status, { color: palette.text, backgroundColor: palette.statusBg }]}>{authMessage}</Text>
          <Text style={[styles.note, { color: palette.note }]}>API-Basis: {apiBaseUrl}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: palette.bg }]}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <View style={[styles.container, { backgroundColor: palette.card }]}>
        <Text style={[styles.title, { color: palette.title }]}>{projectName}</Text>
        <Text style={[styles.subtitle, { color: palette.muted }]}>Angemeldet als: {user.email}</Text>
        <Text style={[styles.themeInfo, { color: palette.muted }]}>Aktives Theme: {theme}</Text>

        {enableThemeToggle && (
          <Pressable style={[styles.secondaryButton, { backgroundColor: palette.secondary }]} onPress={toggleTheme} disabled={loading}>
            <Text style={styles.buttonText}>{theme === "dark" ? "Light Mode" : "Dark Mode"}</Text>
          </Pressable>
        )}

        <Pressable style={[styles.button, { backgroundColor: palette.primary }]} onPress={checkBackend} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Pruefe..." : "Backend pruefen"}</Text>
        </Pressable>
        <Pressable style={[styles.secondaryButton, { backgroundColor: palette.secondary }]} onPress={logout} disabled={loading}>
          <Text style={styles.buttonText}>Abmelden</Text>
        </Pressable>
        <Text style={[styles.status, { color: palette.text, backgroundColor: palette.statusBg }]}>{status}</Text>
        <Text style={[styles.note, { color: palette.note }]}>Intro-Video Platzhalter: mobile/assets/intro.mp4</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 12,
    margin: 12,
    borderRadius: 16,
  },
  title: { fontSize: 30, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 16, textAlign: "center", marginBottom: 2 },
  themeInfo: { fontSize: 13, textAlign: "center", marginBottom: 4 },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  modeButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modeButtonText: { fontWeight: "600" },
  input: {
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
  secondaryButton: { marginTop: 4, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
  buttonText: { color: "#ffffff", fontWeight: "600" },
  status: { marginTop: 10, textAlign: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  note: { marginTop: 6, textAlign: "center", fontSize: 12 },
});
