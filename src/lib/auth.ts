// ============================================================
// DERIVION CRM - AUTH & ACCESS CONTROL UTILITIES
// ============================================================

import { API_BASE_URL } from "./config";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("jwtToken");
}

export function getUserName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("userName");
}

export function getUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("userId");
}

export function getUserEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("userEmail");
}

export function getUserRole(): string {
  if (typeof window === "undefined") return "";
  let role = (localStorage.getItem("userRole") || "").trim().toUpperCase();
  if (role.startsWith("ROLE_")) {
    role = role.substring(5);
  }
  return role;
}

export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("jwtToken");
  localStorage.removeItem("userId");
  localStorage.removeItem("userName");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  window.location.href = "/";
}

// ============================================================
// SESSION EXPIRY
// ============================================================

/** True when the JWT's exp claim is in the past (or the token cannot be read). */
export function isTokenExpired(token: string | null, skewSeconds = 30): boolean {
  if (!token) return true;
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp !== "number" || json.exp * 1000 <= Date.now() + skewSeconds * 1000;
  } catch {
    return true;
  }
}

/** Seconds until the token expires (negative if already expired). */
export function tokenSecondsRemaining(token: string | null): number {
  if (!token) return -1;
  try {
    const payload = token.split(".")[1];
    if (!payload) return -1;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof json.exp !== "number") return -1;
    return Math.floor((json.exp * 1000 - Date.now()) / 1000);
  } catch {
    return -1;
  }
}

/** Clear the stored login and send the user to the login page with a session-expired notice. */
export function expireSession(): void {
  if (typeof window === "undefined") return;
  ["jwtToken", "userId", "userName", "userEmail", "userRole"].forEach((k) => localStorage.removeItem(k));
  window.location.replace("/?session=expired");
}

// ============================================================
// REFRESH TOKEN (calls the HttpOnly-cookie refresh endpoint)
// ============================================================

let refreshPromise: Promise<boolean> | null = null;

/**
 * Calls POST /api/auth/refresh (the backend reads the HttpOnly cookie).
 * On success: saves the new access token + user fields to localStorage, returns true.
 * On failure: returns false (caller should redirect to login).
 * Multiple callers that fire concurrently share the same in-flight Promise.
 */
export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data.token) return false;
      // Save the new access token (and user fields if returned)
      localStorage.setItem("jwtToken", data.token);
      if (data.id)       localStorage.setItem("userId",    String(data.id));
      if (data.fullName) localStorage.setItem("userName",  data.fullName);
      if (data.email)    localStorage.setItem("userEmail", data.email);
      if (data.role)     localStorage.setItem("userRole",  data.role);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export function saveLoginData(data: {
  token: string;
  id: number | string;
  fullName: string;
  email: string;
  role: string;
}): void {
  localStorage.setItem("jwtToken", data.token);
  localStorage.setItem("userId", String(data.id));
  localStorage.setItem("userName", data.fullName);
  localStorage.setItem("userEmail", data.email);
  localStorage.setItem("userRole", data.role);
}

// ============================================================
// SESSION GUARD (fetch interceptor)
// ============================================================

let sessionGuardInstalled = false;

/**
 * Installs one global fetch hook.
 * - On 401 from an authenticated API call: attempts silent token refresh first.
 *   If refresh succeeds, retries the original request with the new token.
 *   If refresh fails, redirects to login (session genuinely expired).
 * - Role-based 403s with a valid token are left to the page.
 */
export function installSessionGuard(): void {
  if (typeof window === "undefined" || sessionGuardInstalled) return;
  sessionGuardInstalled = true;
  const originalFetch = window.fetch.bind(window);
  let redirecting = false;

  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    if (redirecting) return response;

    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
    const isRefreshCall = url.includes("/api/auth/refresh");
    const isLoginCall = url.includes("/api/auth/login");

    // Only intercept authenticated API calls that return 401
    if (response.status !== 401 || isRefreshCall || isLoginCall) return response;

    const headers = new Headers(init?.headers ?? (input instanceof Request ? (input as Request).headers : undefined));
    const isAuthenticatedApiCall = url.includes("/api/") && headers.has("Authorization");
    if (!isAuthenticatedApiCall) return response;

    // Attempt silent refresh
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      redirecting = true;
      expireSession();
      return response;
    }

    // Retry the original request with the new access token
    const newToken = getToken();
    const newInit: RequestInit = {
      ...(init ?? {}),
      headers: {
        ...(init?.headers ? Object.fromEntries(new Headers(init.headers)) : {}),
        Authorization: `Bearer ${newToken}`,
      },
    };
    return originalFetch(input, newInit);
  };
}

// ============================================================
// PAGE ACCESS CONTROL
// ============================================================

export const PAGE_ACCESS: Record<string, string[]> = {
  dashboard: ["ADMIN", "MANAGER", "AGENT"],
  leads: ["ADMIN", "MANAGER", "AGENT"],
  "add-lead": ["ADMIN", "MANAGER", "AGENT"],
  "lead-details": ["ADMIN", "MANAGER", "AGENT"],
  "lead-edit": ["ADMIN", "MANAGER", "AGENT"],
  "closed-leads": ["ADMIN", "MANAGER", "AGENT"],
  "call-logs": ["ADMIN", "MANAGER", "AGENT"],
  "call-log-details": ["ADMIN", "MANAGER", "AGENT"],
  "add-call-log": ["ADMIN", "MANAGER", "AGENT"],
  "follow-ups": ["ADMIN", "MANAGER", "AGENT"],
  "add-follow-up": ["ADMIN", "MANAGER", "AGENT"],
  "edit-follow-up": ["ADMIN", "MANAGER", "AGENT"],
  "follow-up-details": ["ADMIN", "MANAGER", "AGENT"],
  notes: ["ADMIN", "MANAGER", "AGENT"],
  "add-note": ["ADMIN", "MANAGER", "AGENT"],
  "note-details": ["ADMIN", "MANAGER", "AGENT"],
  "edit-note": ["ADMIN", "MANAGER", "AGENT"],
  // ADMIN + MANAGER ONLY
  "lead-assignments": ["ADMIN", "MANAGER"],
  "lead-assignment-details": ["ADMIN", "MANAGER"],
  teams: ["ADMIN", "MANAGER"],
  "add-team": ["ADMIN", "MANAGER"],
  "team-details": ["ADMIN", "MANAGER"],
  "edit-team": ["ADMIN", "MANAGER"],
  courses: ["ADMIN", "MANAGER"],
  "add-course": ["ADMIN", "MANAGER"],
  "course-details": ["ADMIN", "MANAGER"],
  "edit-course": ["ADMIN", "MANAGER"],
  campaigns: ["ADMIN", "MANAGER"],
  "add-campaign": ["ADMIN", "MANAGER"],
  "campaign-details": ["ADMIN", "MANAGER"],
  "edit-campaign": ["ADMIN", "MANAGER"],
  // ADMIN ONLY
  users: ["ADMIN"],
    survey: ["ADMIN"],
  "add-user": ["ADMIN"],
  "user-details": ["ADMIN"],
  "edit-user": ["ADMIN"],
};

export const RESTRICTED_PAGES: Record<string, boolean> = {
    survey: true,
  "lead-assignments": true,
  users: true,
  teams: true,
  courses: true,
  campaigns: true,
};

export function canAccessPage(pageName: string): boolean {
  const role = getUserRole();
  const allowed = PAGE_ACCESS[pageName];
  if (!allowed) return true; // page not in list means open
  return allowed.includes(role);
}

export function hasRoleAccess(pageName: string): boolean {
  return canAccessPage(pageName);
}

export function isManagement(): boolean {
  const role = getUserRole();
  return role === "ADMIN" || role === "MANAGER";
}

export function isAgent(): boolean {
  return getUserRole() === "AGENT";
}
