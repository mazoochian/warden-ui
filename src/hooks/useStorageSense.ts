"use client";

import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type StorageStatus = {
  used_pct: number;
  total_bytes: number;
  available_bytes: number;
  watermark: "normal" | "low" | "high" | "flood";
  low_watermark_pct: number;
  high_watermark_pct: number;
  flood_watermark_pct: number;
  autopilot_enabled: boolean;
  sleep_active: boolean;
};

const statusKey = ["admin", "storage", "status"] as const;

export function useStorageStatus() {
  return useQuery({
    queryKey: statusKey,
    queryFn: () => apiFetch<StorageStatus>("/api/v1/admin/storage/status"),
  });
}

export function useSetStorageAutopilot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => apiFetch("/api/v1/admin/storage/autopilot", { method: "PATCH", body: JSON.stringify({ enabled }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: statusKey }),
  });
}

export type SweepTmpResult = {
  files_deleted: number;
  bytes_freed: number;
  /** Files left alone for being newer than `max_age_seconds`. */
  files_kept?: number;
  bytes_kept?: number;
  max_age_seconds?: number;
};

export function useCleanupTmp() {
  return useMutation({
    mutationFn: () => apiFetch<SweepTmpResult>("/api/v1/admin/storage/cleanup/tmp", { method: "POST" }),
  });
}

export type CleanupMessagesInput = { chat_id?: number; keep_last?: number; before?: string };

/** Only the age-based prune reports counts; `keep_last` returns `{}`. */
export type CleanupMessagesResult = {
  rows_deleted?: number;
  chats_affected?: number;
  chats_failed?: number;
  /** Unix seconds: messages older than this were deleted. */
  cutoff_ts?: number;
  /** Unix seconds of the oldest message still stored in scope, or null if none. */
  oldest_ts?: number | null;
};

export function useCleanupMessages() {
  return useMutation({
    mutationFn: (input: CleanupMessagesInput) =>
      apiFetch<CleanupMessagesResult>("/api/v1/admin/storage/cleanup/messages", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  });
}

export function useCleanupResample() {
  return useMutation({
    mutationFn: (chatId?: number) =>
      apiFetch<{ messages_compacted: number; chats_affected: number; chats_failed?: number }>("/api/v1/admin/storage/cleanup/resample", {
        method: "POST",
        body: JSON.stringify({ chat_id: chatId ?? null }),
      }),
  });
}
