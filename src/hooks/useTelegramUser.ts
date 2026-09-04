"use client";

import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type AuthState =
  | "none"
  | "wait_tdlib_parameters"
  | "wait_phone_number"
  | "wait_code"
  | "wait_password"
  | "ready"
  | "logging_out"
  | "closed"
  | "unsupported";

export function useTelegramUserStatus() {
  return useQuery({
    queryKey: ["telegram-user", "status"],
    queryFn: () => apiFetch<{ auth_state: AuthState }>("/api/v1/telegram-user/status"),
    refetchInterval: (query) => (query.state.data?.auth_state === "ready" ? false : 2000),
  });
}

function useInvalidateStatus() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["telegram-user", "status"] });
}

export function useSubmitPhone() {
  const invalidate = useInvalidateStatus();
  return useMutation({
    mutationFn: (phone_number: string) => apiFetch("/api/v1/telegram-user/phone", { method: "POST", body: JSON.stringify({ phone_number }) }),
    onSuccess: invalidate,
  });
}

export function useSubmitCode() {
  const invalidate = useInvalidateStatus();
  return useMutation({
    mutationFn: (code: string) => apiFetch("/api/v1/telegram-user/code", { method: "POST", body: JSON.stringify({ code }) }),
    onSuccess: invalidate,
  });
}

export function useSubmitPassword() {
  const invalidate = useInvalidateStatus();
  return useMutation({
    mutationFn: (password: string) => apiFetch("/api/v1/telegram-user/password", { method: "POST", body: JSON.stringify({ password }) }),
    onSuccess: invalidate,
  });
}

export function useTelegramUserLogout() {
  const invalidate = useInvalidateStatus();
  return useMutation({
    mutationFn: () => apiFetch("/api/v1/telegram-user/logout", { method: "POST" }),
    onSuccess: invalidate,
  });
}

export type ChatMatch = { native_chat_id: string; title: string };

export function useTelegramUserChats(query: string) {
  return useQuery({
    queryKey: ["telegram-user", "chats", query],
    queryFn: () => apiFetch<{ chats: ChatMatch[] }>(`/api/v1/telegram-user/chats${query ? `?query=${encodeURIComponent(query)}` : ""}`),
  });
}

export function useSummarizeChat() {
  return useMutation({
    mutationFn: ({ chatId, all }: { chatId: string; all?: boolean }) =>
      apiFetch<{ summary: string }>("/api/v1/telegram-user/chats/summarize", {
        method: "POST",
        body: JSON.stringify({ chat_id: chatId, all: all ?? false }),
      }),
  });
}

export function useSendTdMessage() {
  return useMutation({
    mutationFn: ({ chatId, message }: { chatId: string; message: string }) =>
      apiFetch("/api/v1/telegram-user/chats/send", { method: "POST", body: JSON.stringify({ chat_id: chatId, message }) }),
  });
}

export type ReplyAutonomy = "off" | "draft" | "auto";

export function useGlobalAutonomy() {
  return useQuery({
    queryKey: ["telegram-user", "autonomy"],
    queryFn: () => apiFetch<{ global: ReplyAutonomy }>("/api/v1/telegram-user/autonomy"),
  });
}

export function useSetGlobalAutonomy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (global: ReplyAutonomy) => apiFetch("/api/v1/telegram-user/autonomy", { method: "PATCH", body: JSON.stringify({ global }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["telegram-user", "autonomy"] }),
  });
}

/** `prompt` is this chat's ghostwriter voice -- deliberately separate from
 *  `/persona`, which styles Warden answering as *itself*. `null` means the
 *  built-in "write in the owner's voice, no AI framing" prompt. */
export type ChatAutonomy = { override: ReplyAutonomy | null; effective: ReplyAutonomy; prompt: string | null };

export function useChatAutonomy(nativeChatId: string | null) {
  return useQuery({
    queryKey: ["telegram-user", "chat-autonomy", nativeChatId],
    queryFn: () => apiFetch<ChatAutonomy>(`/api/v1/telegram-user/chats/${nativeChatId}/autonomy`),
    enabled: nativeChatId !== null,
  });
}

export function useSetChatAutonomy() {
  const queryClient = useQueryClient();
  return useMutation({
    // `prompt` needs three states on the wire but JSON null can't carry one
    // of them: the backend can't tell an explicit `null` from an absent
    // field (std.json collapses both), so **the empty string is the "clear
    // it" sentinel** and omitting the key means "leave it alone". Sending
    // `null` would be read as "leave it alone" and silently do nothing, so
    // the body is built conditionally and a clear is sent as "".
    mutationFn: ({ nativeChatId, override, prompt }: { nativeChatId: string; override: ReplyAutonomy | null; prompt?: string | null }) =>
      apiFetch(`/api/v1/telegram-user/chats/${nativeChatId}/autonomy`, {
        method: "PATCH",
        body: JSON.stringify(prompt === undefined ? { override } : { override, prompt: prompt ?? "" }),
      }),
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: ["telegram-user", "chat-autonomy", vars.nativeChatId] }),
  });
}

export type Draft = {
  native_chat_id: string;
  chat_title: string;
  /** What the contact actually said -- the message being replied to. */
  incoming_text: string;
  draft_text: string;
  /** Set only when writing this draft into the chat's Telegram composer
   *  overwrote something already typed there, so it can be shown rather than
   *  silently lost. */
  replaced_draft: string | null;
};

export function useDrafts() {
  return useQuery({
    queryKey: ["telegram-user", "drafts"],
    queryFn: () => apiFetch<{ items: Draft[] }>("/api/v1/telegram-user/drafts"),
  });
}

function useInvalidateDrafts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["telegram-user", "drafts"] });
}

export function useApproveDraft() {
  const invalidate = useInvalidateDrafts();
  return useMutation({
    mutationFn: (nativeChatId: string) => apiFetch(`/api/v1/telegram-user/chats/${nativeChatId}/draft/approve`, { method: "POST" }),
    onSuccess: invalidate,
  });
}

export function useDiscardDraft() {
  const invalidate = useInvalidateDrafts();
  return useMutation({
    mutationFn: (nativeChatId: string) => apiFetch(`/api/v1/telegram-user/chats/${nativeChatId}/draft`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
