"use client";

import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ModuleInfo = {
  key: string;
  label: string;
  category: "standalone" | "llm_tool";
  enabled: boolean;
};

const modulesQueryKey = ["admin", "modules"] as const;

export function useModules() {
  return useQuery({
    queryKey: modulesQueryKey,
    queryFn: () => apiFetch<{ items: ModuleInfo[] }>("/api/v1/admin/modules"),
  });
}

export function useSetModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      apiFetch(`/api/v1/admin/modules/${key}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: modulesQueryKey }),
  });
}
