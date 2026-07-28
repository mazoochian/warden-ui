"use client";

import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export type AuditLogEntry = {
  id: number;
  account_id: number | null;
  action: string;
  target: string | null;
  detail: string | null;
  at: number;
};

/**
 * `GET /api/v1/admin/audit-log?cursor=&limit=&action=` -- newest-first,
 * `cursor` narrows to strictly older rows than that id (see
 * `audit_log.list`'s own doc comment). No account/date filter server-side
 * today, only `action`; the page filters by account client-side over
 * whatever page is currently loaded, good enough at this project's scale.
 */
export function useAuditLog(cursor: number | null, action: string | null) {
  const params = new URLSearchParams({ limit: "50" });
  if (cursor !== null) params.set("cursor", String(cursor));
  if (action) params.set("action", action);
  return useQuery({
    queryKey: ["admin", "audit-log", cursor, action],
    queryFn: () => apiFetch<{ items: AuditLogEntry[]; next_cursor: number | null }>(`/api/v1/admin/audit-log?${params}`),
  });
}
