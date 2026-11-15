import { createContext, useContext } from "react";
import type { CurrentUser, Role } from "./types";

export type AuthValue = {
  user: CurrentUser | null;
  isLoading: boolean;
  login: (mobile: string, password: string) => Promise<CurrentUser>;
  register: (input: {
    fullName: string;
    mobile: string;
    email?: string;
    password: string;
  }) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  updateUser: (user: CurrentUser) => void;
};

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

/** Landing page for a signed-in role. */
export function homePathForRole(role: Role): string {
  return role === "CUSTOMER" ? "/dashboard" : "/admin";
}

/**
 * Only honor a `next` target the signed-in role can actually open. This stops
 * a stale `?next=/dashboard` (left over from a customer session) from sending
 * an admin to a customer page after login.
 */
export function safeNextPath(role: Role, next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;

  if (role === "CUSTOMER") {
    return next === "/requests/new" || next.startsWith("/dashboard") ? next : null;
  }

  if (role === "EXPERT") {
    return next === "/admin" || next === "/admin/requests" || next.startsWith("/admin/requests/")
      ? next
      : null;
  }

  return next === "/admin" || next.startsWith("/admin/") ? next : null;
}
