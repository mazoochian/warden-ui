"use client";

import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export type OverviewStats = {
  total_messages: number;
  total_chats: number;
  total_identities: number;
  messages_last_24h: number;
  messages_last_7d: number;
  active_chats_last_7d: number;
};

export function useOverviewStats() {
  return useQuery({
    queryKey: ["admin", "stats", "overview"],
    queryFn: () => apiFetch<OverviewStats>("/api/v1/admin/stats/overview"),
  });
}

export type ChatSummary = {
  id: number;
  platform: string;
  native_chat_id: string;
  title: string | null;
  member_count: number;
  message_count: number;
  digest_enabled: boolean;
};

/**
 * `limit=200` (the API's max page size) instead of real pagination UI --
 * fine for a single bot's realistic chat/user counts today. `next_cursor`
 * is in the response shape and ready for a "load more" control whenever a
 * deployment actually has more than 200 of either; not built yet since
 * nothing has needed it.
 */
export function useChats() {
  return useQuery({
    queryKey: ["admin", "chats"],
    queryFn: () => apiFetch<{ items: ChatSummary[]; next_cursor: number | null }>("/api/v1/admin/chats?limit=200"),
  });
}

export type RecentMessage = { sender_display_name: string; text: string | null; ts: number };

export type ChatDetail = ChatSummary & {
  chat_type: string | null;
  magic_word: string | null;
  recent_messages: RecentMessage[];
};

export function useChatDetail(id: number) {
  return useQuery({
    queryKey: ["admin", "chats", id],
    queryFn: () => apiFetch<ChatDetail>(`/api/v1/admin/chats/${id}`),
  });
}

export type IdentitySummary = {
  id: number;
  platform: string;
  display_name: string;
  username: string | null;
  is_bot_admin: boolean;
  is_allowed: boolean;
  credits: number;
  last_seen: number | null;
};

export function useIdentities() {
  return useQuery({
    queryKey: ["admin", "identities"],
    queryFn: () =>
      apiFetch<{ items: IdentitySummary[]; next_cursor: number | null }>("/api/v1/admin/identities?limit=200"),
  });
}

export type IdentityDetail = IdentitySummary & { native_id: string };

export function useIdentityDetail(id: number) {
  return useQuery({
    queryKey: ["admin", "identities", id],
    queryFn: () => apiFetch<IdentityDetail>(`/api/v1/admin/identities/${id}`),
  });
}
