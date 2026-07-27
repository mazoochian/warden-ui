"use client";

import { apiFetch } from "@/lib/api";
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";

export type Roles = { owner: boolean; bot_admin: boolean };

export type Session =
  | { authenticated: false }
  | {
      authenticated: true;
      account_id: number;
      display_name: string;
      avatar_url: string | null;
      identity_ids: number[];
      roles: Roles;
    };

/** Owner or bot admin -- the one check every admin-only page/nav item needs. */
export function isAdmin(session: Session | undefined): boolean {
  return !!session?.authenticated && (session.roles.owner || session.roles.bot_admin);
}

export const sessionQueryKey = ["session"] as const;

/**
 * The one call every page needs to know whether -- and as whom -- the
 * caller is logged in. See `AppShell`/`(dashboard)/layout.tsx` for where
 * this drives the redirect-to-login and account-menu rendering.
 */
export function useSession(): UseQueryResult<Session> {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: () => apiFetch<Session>("/api/v1/auth/session"),
    // A stale session (e.g. after another tab logs out) is a soft
    // problem -- the next mutating request will 401 and the frontend
    // will catch that -- so this doesn't need aggressive refetching.
    staleTime: 60_000,
  });
}

/** Call after login/logout to make every `useSession()` consumer re-check. */
export function useInvalidateSession() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: sessionQueryKey });
}
