"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type FeedSource = {
  id: number;
  native_chat_id: string;
  title: string;
  last_seen_message_id: number;
  enabled: boolean;
};

export type Feed = {
  enabled: boolean;
  /** The same Settings.isRunnable the scheduler checks: enabled *and* fully
   *  configured. Lets the page say "enabled but not running" without
   *  re-deriving that rule on the client. */
  runnable: boolean;
  target_native_chat_id: string | null;
  policy: string | null;
  interval_seconds: number;
  /** Unix seconds; 0 means it has never run. */
  last_run_at: number;
  sources: FeedSource[];
};

const key = ["feed"];

export function useFeed() {
  return useQuery({
    queryKey: key,
    queryFn: () => apiFetch<Feed>("/api/v1/feed"),
  });
}

function useInvalidateFeed() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: key });
}

/** Every field is optional so one dial can be changed without resending the
 *  rest. An empty string clears `target_native_chat_id`/`policy` — the
 *  backend can't distinguish an explicit JSON null from an absent field, so
 *  null would read as "leave alone". */
export function useSetFeed() {
  const invalidate = useInvalidateFeed();
  return useMutation({
    mutationFn: (patch: {
      enabled?: boolean;
      target_native_chat_id?: string;
      policy?: string;
      interval_seconds?: number;
    }) => apiFetch("/api/v1/feed", { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: invalidate,
  });
}

export function useAddFeedSource() {
  const invalidate = useInvalidateFeed();
  return useMutation({
    // `query` is a channel name or a raw TDLib chat id — resolved server
    // side, so the user never has to go and find an id first.
    mutationFn: (query: string) =>
      apiFetch<{ native_chat_id: string; title: string }>("/api/v1/feed/sources", {
        method: "POST",
        body: JSON.stringify({ query }),
      }),
    onSuccess: invalidate,
  });
}

export function useRemoveFeedSource() {
  const invalidate = useInvalidateFeed();
  return useMutation({
    mutationFn: (nativeChatId: string) =>
      apiFetch(`/api/v1/feed/sources/${encodeURIComponent(nativeChatId)}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useRunFeed() {
  const invalidate = useInvalidateFeed();
  return useMutation({
    mutationFn: () => apiFetch<{ posted: number }>("/api/v1/feed/run", { method: "POST" }),
    onSuccess: invalidate,
  });
}
