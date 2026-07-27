"use client";

import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type AlertKind = "crypto" | "weather" | "aqi";
export type AlertCondition = "above" | "below";

export type Alert = {
  id: number;
  chat_id: number;
  chat_title: string | null;
  kind: AlertKind;
  subject: string;
  currency: string | null;
  condition: AlertCondition;
  threshold: number;
};

const alertsQueryKey = (chatId?: number) => ["alerts", chatId ?? "all"] as const;

export function useAlerts(chatId?: number) {
  return useQuery({
    queryKey: alertsQueryKey(chatId),
    queryFn: () => apiFetch<{ items: Alert[] }>(`/api/v1/alerts${chatId ? `?chat_id=${chatId}` : ""}`),
  });
}

export type CreateAlertInput = {
  chat_id: number;
  kind: AlertKind;
  subject: string;
  condition: AlertCondition;
  threshold: number;
};

export function useCreateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAlertInput) =>
      apiFetch<{ id: number }>("/api/v1/alerts", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

export function useCancelAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/v1/alerts/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });
}
