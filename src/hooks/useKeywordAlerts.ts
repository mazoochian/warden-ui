"use client";

import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type KeywordAlert = {
  id: number;
  chat_id: number;
  identity_id: number;
  keyword: string;
  created_at: number;
};

export function useKeywordAlerts(chatId: number) {
  return useQuery({
    queryKey: ["keyword-alerts", chatId],
    queryFn: () => apiFetch<{ items: KeywordAlert[] }>(`/api/v1/chats/${chatId}/keyword-alerts`),
  });
}

export function useCreateKeywordAlert(chatId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyword: string) =>
      apiFetch<{ id: number }>(`/api/v1/chats/${chatId}/keyword-alerts`, { method: "POST", body: JSON.stringify({ keyword }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["keyword-alerts", chatId] }),
  });
}

export function useDeleteKeywordAlert(chatId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/v1/keyword-alerts/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["keyword-alerts", chatId] }),
  });
}
