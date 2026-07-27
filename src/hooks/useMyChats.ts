"use client";

import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type MyChat = {
  id: number;
  platform: string;
  native_chat_id: string;
  title: string | null;
  is_group_admin: boolean;
};

export function useMyChats() {
  return useQuery({
    queryKey: ["chats", "mine"],
    queryFn: () => apiFetch<{ items: MyChat[] }>("/api/v1/chats?mine=true"),
  });
}

export type ChatSettings = {
  persona: string | null;
  magic_word: string | null;
  digest_enabled: boolean;
  thinking_override: boolean | null;
};

export function useChatSettings(chatId: number) {
  return useQuery({
    queryKey: ["chats", chatId, "settings"],
    queryFn: () => apiFetch<ChatSettings>(`/api/v1/chats/${chatId}/settings`),
  });
}

export function useSetChatSettings(chatId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: ChatSettings) =>
      apiFetch(`/api/v1/chats/${chatId}/settings`, {
        method: "PATCH",
        body: JSON.stringify(settings),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chats", chatId, "settings"] }),
  });
}

export type ChatMember = {
  identity_id: number;
  display_name: string;
  username: string | null;
  last_seen: number | null;
};

export function useChatMembers(chatId: number) {
  return useQuery({
    queryKey: ["chats", chatId, "members"],
    queryFn: () => apiFetch<{ items: ChatMember[] }>(`/api/v1/chats/${chatId}/members`),
  });
}
