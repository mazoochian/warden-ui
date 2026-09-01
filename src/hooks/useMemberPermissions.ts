"use client";

import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/** Matches `platform/interface.zig`'s `MemberPermission` bit letters. */
export const PERMISSION_BITS = [
  { bit: 1 << 0, letter: "r", key: "read" },
  { bit: 1 << 1, letter: "w", key: "write" },
  { bit: 1 << 2, letter: "p", key: "photos" },
  { bit: 1 << 3, letter: "v", key: "videos" },
  { bit: 1 << 4, letter: "f", key: "file" },
  { bit: 1 << 5, letter: "m", key: "music" },
  { bit: 1 << 6, letter: "o", key: "voice" },
  { bit: 1 << 7, letter: "d", key: "video_messages" },
  { bit: 1 << 8, letter: "s", key: "stickers" },
  { bit: 1 << 9, letter: "l", key: "polls" },
  { bit: 1 << 10, letter: "e", key: "embed_links" },
  { bit: 1 << 11, letter: "a", key: "reactions" },
  { bit: 1 << 12, letter: "t", key: "edit_tags" },
  { bit: 1 << 13, letter: "change_info", key: "change_info" },
] as const;

export const ALL_PERMISSION_BITS = PERMISSION_BITS.reduce((acc, p) => acc | p.bit, 0);

export function useMemberPermissions(chatId: number, identityId: number | null) {
  return useQuery({
    queryKey: ["chats", chatId, "members", identityId, "permissions"],
    queryFn: () => apiFetch<{ bits: number }>(`/api/v1/chats/${chatId}/members/${identityId}/permissions`),
    enabled: identityId !== null,
  });
}

export function useSetMemberPermissions(chatId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ identityId, bits, expiresAt }: { identityId: number; bits: number; expiresAt?: number }) =>
      apiFetch(`/api/v1/chats/${chatId}/members/${identityId}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({ bits, expires_at: expiresAt ?? null }),
      }),
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: ["chats", chatId, "members", vars.identityId, "permissions"] }),
  });
}

export function useSetMemberTag(chatId: number) {
  return useMutation({
    mutationFn: ({ identityId, title }: { identityId: number; title: string }) =>
      apiFetch(`/api/v1/chats/${chatId}/members/${identityId}/tag`, { method: "PATCH", body: JSON.stringify({ title }) }),
  });
}
