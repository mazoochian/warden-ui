"use client";

import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type Memory = {
  id: number;
  identity_id: number;
  text: string;
  created_at: number;
};

const queryKey = ["memory"] as const;

export function useMemory() {
  return useQuery({
    queryKey,
    queryFn: () => apiFetch<{ items: Memory[] }>("/api/v1/memory"),
  });
}

export function useForgetMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/v1/memory/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}
