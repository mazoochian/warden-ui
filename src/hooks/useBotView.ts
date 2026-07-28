"use client";

import { apiFetch } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

export type BotViewEvent = {
  chat_id: number;
  sender: string;
  text: string | null;
  ts: number;
};

/**
 * Live incoming-message feed for one chat (ARCHITECTURE.md §8) -- opens a
 * WebSocket to `warden`'s API server (same-origin, see `ARCHITECTURE.md`
 * §2's single reverse-proxied domain) and appends each event as it
 * arrives. Reconnects with a short fixed backoff on any close/error while
 * `chatId` stays selected -- there's no reconnect-with-history request
 * here (matches the backend's own no-replay pub/sub semantics, see
 * `bot_view.zig`'s doc comment), so a dropped connection just means a
 * gap in the feed, not stale/duplicate messages.
 */
export function useBotViewFeed(chatId: number | null) {
  const [events, setEvents] = useState<BotViewEvent[]>([]);
  const [connected, setConnected] = useState(false);

  // Reset during render (not inside the effect below) when `chatId`
  // changes -- the React-recommended way to clear derived state on a prop
  // change without an extra render-then-effect-then-setState cascade.
  const [lastChatId, setLastChatId] = useState(chatId);
  if (chatId !== lastChatId) {
    setLastChatId(chatId);
    setEvents([]);
  }

  useEffect(() => {
    if (chatId === null) return;

    let cancelled = false;
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;
      const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${scheme}//${window.location.host}/api/v1/bot-view/ws?chat_id=${chatId}`);
      socket = ws;

      ws.onopen = () => setConnected(true);
      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as BotViewEvent;
          setEvents((prev) => [...prev.slice(-199), parsed]);
        } catch {
          // Malformed frame -- drop it rather than crash the feed.
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!cancelled) retryTimer = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
    };
    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    };
  }, [chatId]);

  return { events, connected };
}

/**
 * `POST /api/v1/bot-view/send` -- the single most sensitive action in the
 * whole panel (posts as the bot itself, indistinguishable from a real
 * automated reply). No client-side gating beyond what the page's
 * confirmation dialog already provides; the backend re-checks owner-only
 * access itself regardless.
 */
export function useBotViewSend() {
  return useMutation({
    mutationFn: (body: { chat_id: number; text: string }) =>
      apiFetch<Record<string, never>>("/api/v1/bot-view/send", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

export function useAutoScroll<T>(dep: T) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [dep]);
  return ref;
}
