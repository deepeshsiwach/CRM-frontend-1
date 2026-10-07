// ============================================================
// DERIVION CRM - AUTH & ACCESS CONTROL UTILITIES
// ============================================================

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
  "add-user": ["ADMIN"],
  "user-details": ["ADMIN"],
  "edit-user": ["ADMIN"],
};

export const RESTRICTED_PAGES: Record<string, boolean> = {
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

