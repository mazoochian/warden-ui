"use client";

import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type SessionListItem = {
  id: number;
  created_at: number;
  expires_at: number;
  user_agent: string | null;
  ip: string | null;
  current: boolean;
};

const sessionsQueryKey = ["me", "sessions"] as const;

/** Every live session for the caller's account -- see API.md's Account section. */
export function useSessions() {
  return useQuery({
    queryKey: sessionsQueryKey,
    queryFn: () => apiFetch<{ items: SessionListItem[] }>("/api/v1/me/sessions"),
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => apiFetch(`/api/v1/me/sessions/${sessionId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionsQueryKey }),
  });
}
