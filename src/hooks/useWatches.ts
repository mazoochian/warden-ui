"use client";

import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type Watch = {
  id: number;
  chat_id: number;
  chat_title: string | null;
  feed_url: string;
};

const watchesQueryKey = (chatId?: number) => ["watches", chatId ?? "all"] as const;

export function useWatches(chatId?: number) {
  return useQuery({
    queryKey: watchesQueryKey(chatId),
    queryFn: () => apiFetch<{ items: Watch[] }>(`/api/v1/watches${chatId ? `?chat_id=${chatId}` : ""}`),
  });
}

export type CreateWatchInput = { chat_id: number; feed_url: string };

export function useCreateWatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWatchInput) =>
      apiFetch<{ created: boolean }>("/api/v1/watches", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watches"] }),
  });
}

export function useDeleteWatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/v1/watches/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watches"] }),
  });
}
