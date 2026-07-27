"use client";

import { apiFetch } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/** Every action here matches API.md's Group Administration section --
 * kick/ban/mute/unmute/promote/demote/pin/unpin/redact, each routed
 * server-side through the exact same `auth.checkGroupAdminAccess` ladder
 * the slash commands and `/menu` already use. No client-side confirmation
 * step: a button click here already *is* the single deliberate action,
 * matching the "fires immediately" convention these actions already have
 * everywhere else in the bot. */

function useChatAction<TBody extends object | undefined>(chatId: number, action: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TBody) =>
      apiFetch<Record<string, never>>(`/api/v1/chats/${chatId}/actions/${action}`, {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chats", chatId, "members"] }),
  });
}

export function useKick(chatId: number) {
  return useChatAction<{ identity_id: number }>(chatId, "kick");
}
export function useBan(chatId: number) {
  return useChatAction<{ identity_id: number }>(chatId, "ban");
}
export function useMute(chatId: number) {
  return useChatAction<{ identity_id: number; duration_seconds?: number }>(chatId, "mute");
}
export function useUnmute(chatId: number) {
  return useChatAction<{ identity_id: number }>(chatId, "unmute");
}
export function usePromote(chatId: number) {
  return useChatAction<{ identity_id: number }>(chatId, "promote");
}
export function useDemote(chatId: number) {
  return useChatAction<{ identity_id: number }>(chatId, "demote");
}
export function usePin(chatId: number) {
  return useChatAction<{ message_id: string }>(chatId, "pin");
}
export function useUnpin(chatId: number) {
  return useChatAction<undefined>(chatId, "unpin");
}

export type RedactInput =
  | { mode: "lastn"; n?: number }
  | { mode: "user"; identity_id: number; n?: number }
  | { mode: "text"; substring: string }
  | { mode: "regex"; pattern: string };

export function useRedact(chatId: number) {
  return useChatAction<RedactInput>(chatId, "redact");
}
