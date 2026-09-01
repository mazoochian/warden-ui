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

export function useCleanupTmp() {
  return useMutation({
    mutationFn: () => apiFetch<{ files_deleted: number; bytes_freed: number }>("/api/v1/admin/storage/cleanup/tmp", { method: "POST" }),
  });
}

export type CleanupMessagesInput = { chat_id?: number; keep_last?: number; before?: string };

export function useCleanupMessages() {
  return useMutation({
    mutationFn: (input: CleanupMessagesInput) =>
      apiFetch<{ rows_deleted?: number; chats_affected?: number }>("/api/v1/admin/storage/cleanup/messages", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  });
}

export function useCleanupResample() {
  return useMutation({
    mutationFn: (chatId?: number) =>
      apiFetch<{ messages_compacted: number; chats_affected: number }>("/api/v1/admin/storage/cleanup/resample", {
        method: "POST",
        body: JSON.stringify({ chat_id: chatId ?? null }),
      }),
  });
}
