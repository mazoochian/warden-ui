"use client";

import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type Note = {
  id: number;
  chat_id: number;
  chat_title: string | null;
  text: string;
  created_at: number;
};

const notesQueryKey = (chatId?: number) => ["notes", chatId ?? "all"] as const;

export function useNotes(chatId?: number) {
  return useQuery({
    queryKey: notesQueryKey(chatId),
    queryFn: () => apiFetch<{ items: Note[] }>(`/api/v1/notes${chatId ? `?chat_id=${chatId}` : ""}`),
  });
}

export type CreateNoteInput = { chat_id: number; text: string };

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoteInput) =>
      apiFetch<{ id: number }>("/api/v1/notes", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/v1/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
  });
}
