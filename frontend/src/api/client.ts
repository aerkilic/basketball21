export type AuthUser = {
  id: number;
  email: string;
  username: string;
};

export type LoginResponse = {
  status: string;
  user: AuthUser;
};

export type GoogleStartResponse = {
  status: string;
  auth_url?: string;
  detail?: string;
};

export type HealthResponse = {
  status: string;
  project: string;
  backend: string;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl}/api/health/`);
  if (!response.ok) {
    throw new Error(`Backend request failed with status ${response.status}`);
  }
  return response.json();
}

export async function loginWithEmailPassword(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = (await response.json().catch(() => ({}))) as LoginResponse & { detail?: string };
  if (!response.ok) {
    throw new Error(payload.detail ?? `Login failed with status ${response.status}`);
  }
  return payload;
}

export async function registerWithEmailPassword(
  email: string,
  password: string,
  confirmPassword: string
): Promise<LoginResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, confirm_password: confirmPassword }),
  });
  const payload = (await response.json().catch(() => ({}))) as LoginResponse & { detail?: string };
  if (!response.ok) {
    throw new Error(payload.detail ?? `Registration failed with status ${response.status}`);
  }
  return payload;
}

export async function fetchGoogleAuthUrl(): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/api/auth/google/start/`);
  const payload = (await response.json()) as GoogleStartResponse;
  if (!response.ok || payload.status !== "ok" || !payload.auth_url) {
    throw new Error(payload.detail ?? `Google login failed with status ${response.status}`);
  }
  return payload.auth_url;
}
