import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { CurrentUser, Role } from "./types";

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
    return next === "/admin" || next === "/admin/requests" || next.startsWith("/admin/requests/") ? next : null;
  }

  return next === "/admin" || next.startsWith("/admin/") ? next : null;
}

type AuthValue = {
  user: CurrentUser | null;
  isLoading: boolean;
  login: (mobile: string, password: string) => Promise<CurrentUser>;
  register: (input: { fullName: string; mobile: string; email?: string; password: string }) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  updateUser: (user: CurrentUser) => void;
};

const AuthContext = createContext<AuthValue | null>(null);

// /auth/session answers 200 with `user: null` when signed out; /auth/me would
// return 401 for anonymous visitors and log a red error in the console.
async function fetchMe(): Promise<CurrentUser | null> {
  const data = await api.get<{ user: CurrentUser | null }>("/auth/session");
  return data.user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const login = useCallback(
    async (mobile: string, password: string) => {
      const result = await api.post<{ user: CurrentUser }>("/auth/login", { mobile, password });
      queryClient.setQueryData(["me"], result.user);
      return result.user;
    },
    [queryClient],
  );

  const register = useCallback(
    async (input: { fullName: string; mobile: string; email?: string; password: string }) => {
      const result = await api.post<{ user: CurrentUser }>("/auth/register", input);
      queryClient.setQueryData(["me"], result.user);
      return result.user;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    queryClient.setQueryData(["me"], null);
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "me" });
  }, [queryClient]);

  const updateUser = useCallback(
    (user: CurrentUser) => queryClient.setQueryData(["me"], user),
    [queryClient],
  );

  const value = useMemo<AuthValue>(
    () => ({ user: data ?? null, isLoading, login, register, logout, updateUser }),
    [data, isLoading, login, register, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
