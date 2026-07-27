"use client";

import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type Reminder = {
  id: number;
  chat_id: number;
  chat_title: string | null;
  message: string;
  due_at: number;
  due_at_date: string;
  due_at_time: string;
  recur_interval_seconds: number | null;
};

const remindersQueryKey = (chatId?: number) => ["reminders", chatId ?? "all"] as const;

export function useReminders(chatId?: number) {
  return useQuery({
    queryKey: remindersQueryKey(chatId),
    queryFn: () => apiFetch<{ items: Reminder[] }>(`/api/v1/reminders${chatId ? `?chat_id=${chatId}` : ""}`),
  });
}

/** Mirrors the `/menu` reminder wizard's own step data -- see API.md. */
export type CreateReminderWhen =
  | { kind: "duration"; seconds: number }
  | { kind: "absolute"; year: number; month: number; day: number; hour: number; minute: number; second?: number };

export type CreateReminderInput = {
  chat_id: number;
  message: string;
  recur_interval_seconds?: number | null;
  when: CreateReminderWhen;
};

export function useCreateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReminderInput) =>
      apiFetch<{ id: number; due_at: number }>("/api/v1/reminders", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminders"] }),
  });
}

export function useCancelReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/v1/reminders/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminders"] }),
  });
}
