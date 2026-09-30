export type SessionRole = "customer" | "business" | "charity" | "admin";

const ROLE_KEY = "role";
const NAME_KEY = "balahader_user_name";

export function getSessionRole(): SessionRole | null {
  const role = localStorage.getItem(ROLE_KEY);
  return ["customer", "business", "charity", "admin"].includes(role ?? "")
    ? role as SessionRole
    : null;
}

export function saveSession(role: SessionRole, firstName?: string, lastName?: string) {
  localStorage.setItem(ROLE_KEY, role);
  if (firstName || lastName) {
    localStorage.setItem(NAME_KEY, JSON.stringify({ first_name: firstName ?? "", last_name: lastName ?? "" }));
  }
}

export function clearSession() {
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem("access_token");
}
