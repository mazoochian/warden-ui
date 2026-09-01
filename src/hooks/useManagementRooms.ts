"use client";

import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ManagementRoomBinding = {
  control_chat_id: number;
  control_native_chat_id: string;
  control_platform: string;
  control_title: string | null;
  target_chat_id: number;
  target_native_chat_id: string;
  target_platform: string;
  target_title: string | null;
  bound_by_identity_id: number;
  created_at: number;
};

const queryKey = ["admin", "management-rooms"] as const;

export function useManagementRooms() {
  return useQuery({
    queryKey,
    queryFn: () => apiFetch<{ items: ManagementRoomBinding[] }>("/api/v1/admin/management-rooms"),
  });
}

export type BindManagementRoomInput = { control_chat_id: number; target_chat_id: number };

export function useBindManagementRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BindManagementRoomInput) =>
      apiFetch("/api/v1/admin/management-rooms", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useUnbindManagementRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ controlChatId, targetChatId }: { controlChatId: number; targetChatId: number }) =>
      apiFetch(`/api/v1/admin/management-rooms?control_chat_id=${controlChatId}&target_chat_id=${targetChatId}`, {
        method: "DELETE",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}
