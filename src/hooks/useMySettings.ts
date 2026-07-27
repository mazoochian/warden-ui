"use client";

import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type MySettings = {
  utc_offset_minutes: number;
  date_format: "mdy" | "dmy" | "ymd";
  time_format: "h24" | "h12";
};

const mySettingsQueryKey = ["me", "settings"] as const;

export function useMySettings() {
  return useQuery({
    queryKey: mySettingsQueryKey,
    queryFn: () => apiFetch<MySettings>("/api/v1/me/settings"),
  });
}

export function useSetMySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: MySettings) =>
      apiFetch("/api/v1/me/settings", {
        method: "PATCH",
        body: JSON.stringify(settings),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mySettingsQueryKey }),
  });
}
