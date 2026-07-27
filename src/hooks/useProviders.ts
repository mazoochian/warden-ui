"use client";

import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export type Providers = {
  google: null;
  oidc: { id: string; name: string }[];
};

/** Public endpoint -- drives which login buttons the login page renders. */
export function useProviders() {
  return useQuery({
    queryKey: ["auth-providers"],
    queryFn: () => apiFetch<Providers>("/api/v1/auth/providers"),
    staleTime: 5 * 60_000,
  });
}
