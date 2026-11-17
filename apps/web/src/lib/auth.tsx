import { useCallback, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, setCsrfToken } from "./api";
import { AuthContext, type AuthValue } from "./auth-context";
import type { CurrentUser } from "./types";

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
      const result = await api.post<{ user: CurrentUser; csrfToken?: string }>("/auth/login", {
        mobile,
        password,
      });
      if (result.csrfToken) setCsrfToken(result.csrfToken);
      queryClient.setQueryData(["me"], result.user);
      return result.user;
    },
    [queryClient],
  );

  const register = useCallback(
    async (input: { fullName: string; mobile: string; email?: string; password: string }) => {
      const result = await api.post<{ user: CurrentUser; csrfToken?: string }>(
        "/auth/register",
        input,
      );
      if (result.csrfToken) setCsrfToken(result.csrfToken);
      queryClient.setQueryData(["me"], result.user);
      return result.user;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setCsrfToken(null);
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
