"use client";

import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ConfigEntry = {
  key: string;
  label: string;
  category: "secret" | "dynamic";
  value: string;
  is_override: boolean | null;
};

const configQueryKey = ["admin", "config"] as const;

export function useAdminConfig() {
  return useQuery({
    queryKey: configQueryKey,
    queryFn: () => apiFetch<{ items: ConfigEntry[] }>("/api/v1/admin/config"),
  });
}

export function useSetConfigValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      apiFetch(`/api/v1/admin/config/${key}`, {
        method: "PATCH",
        body: JSON.stringify({ value }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: configQueryKey }),
  });
}

export type AuditLogEntry = {
  id: number;
  account_id: number | null;
  action: string;
  target: string | null;
  detail: string | null;
  at: number;
};

/**
 * "Recently changed" widget material -- calls the audit-log endpoint once
 * per action (it only supports a single `?action=` filter at a time) and
 * merges client-side. Full multi-action filtering/browsing is Phase 7.
 */
export function useRecentChanges(actions: string[], limit = 5) {
  return useQuery({
    queryKey: ["admin", "audit-log", "recent", actions, limit],
    queryFn: async () => {
      const results = await Promise.all(
        actions.map((action) =>
          apiFetch<{ items: AuditLogEntry[] }>(`/api/v1/admin/audit-log?action=${action}&limit=${limit}`),
        ),
      );
      return results
        .flatMap((r) => r.items)
        .sort((a, b) => b.at - a.at)
        .slice(0, limit);
    },
  });
}

/** Unfiltered recent audit log, for the dashboard's "recent panel activity". */
export function useRecentAuditLog(limit = 5) {
  return useQuery({
    queryKey: ["admin", "audit-log", "recent-all", limit],
    queryFn: () => apiFetch<{ items: AuditLogEntry[] }>(`/api/v1/admin/audit-log?limit=${limit}`),
  });
}
