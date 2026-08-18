"use client";

import { apiFetch, ApiError } from "@/lib/api";
import { useMutation, useQuery } from "@tanstack/react-query";

export type TelegramUserChat = { native_chat_id: string; title: string };

/**
 * `query` empty means "every chat" -- backs the personal-chats page's own
 * search box the same way `useChats`' client-side `.filter` backs
 * `/admin/chats`' one, except this one asks the server (see warden's
 * `chat_summary.searchChatsByTitle`) since the source list can be large
 * enough on a real account ("dozens of chats") that the whole point of
 * this page existing is not shipping it all to the client at once the way
 * `/tdchats`' old un-paginated dump used to.
 */
export function useTelegramUserChats(query: string) {
  return useQuery<{ chats: TelegramUserChat[] }, ApiError>({
    queryKey: ["telegram-user", "chats", query],
    queryFn: () =>
      apiFetch<{ chats: TelegramUserChat[] }>(
        `/api/v1/telegram-user/chats${query.trim() ? `?query=${encodeURIComponent(query.trim())}` : ""}`,
      ),
  });
}

/** Fetches a chat's unread messages, has the model summarize them, and
 * marks them read as a side effect -- same action `/tdsummary` performs in
 * Telegram itself. */
export function useSummarizeTelegramUserChat() {
  return useMutation<{ summary: string }, ApiError, { chat_id: string }>({
    mutationFn: (body) =>
      apiFetch<{ summary: string }>("/api/v1/telegram-user/chats/summarize", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

/** Sends a message through the personal account to one chat -- same action
 * `/tdsend`/`/sendas` perform in Telegram itself. */
export function useSendTelegramUserMessage() {
  return useMutation<unknown, ApiError, { chat_id: string; message: string }>({
    mutationFn: (body) =>
      apiFetch("/api/v1/telegram-user/chats/send", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}
