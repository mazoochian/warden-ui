"use client";

import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type Announcement = {
  id: number;
  identity_id: number;
  message: string;
  due_at: number;
  recur_interval_seconds: number | null;
};

export function useAnnouncements(chatId: number) {
  return useQuery({
    queryKey: ["announcements", chatId],
    queryFn: () => apiFetch<{ items: Announcement[] }>(`/api/v1/chats/${chatId}/announcements`),
  });
}

export type AnnouncementWhen =
  | { kind: "duration"; seconds: number }
  | { kind: "absolute"; year: number; month: number; day: number; hour?: number; minute?: number; second?: number };

export type CreateAnnouncementInput = { message: string; when: AnnouncementWhen; recur_interval_seconds?: number };

export function useCreateAnnouncement(chatId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) =>
      apiFetch<{ id: number; due_at: number }>(`/api/v1/chats/${chatId}/announcements`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements", chatId] }),
  });
}

export function useCancelAnnouncement(chatId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/v1/announcements/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements", chatId] }),
  });
}
