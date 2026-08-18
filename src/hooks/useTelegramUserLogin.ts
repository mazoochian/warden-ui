"use client";

import { apiFetch, ApiError } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type TelegramUserAuthState =
  | "none"
  | "wait_tdlib_parameters"
  | "wait_phone_number"
  | "wait_code"
  | "wait_password"
  | "ready"
  | "logging_out"
  | "closed"
  | "unsupported";

type StatusResponse = { auth_state: TelegramUserAuthState };

const statusQueryKey = ["telegram-user", "status"] as const;

/** States worth polling through -- anything actively waiting on TDLib or a
 * step the owner just submitted. Polling stops once `ready` (nothing left
 * to watch for) or on a state this hook can't drive further (`closed`/
 * `unsupported`) -- see `platform/telegram_user.zig`'s `AuthState` doc
 * comment for what each one means. */
function isInProgress(state: TelegramUserAuthState | undefined) {
  return state === "wait_tdlib_parameters" || state === "wait_phone_number" || state === "wait_code" || state === "wait_password";
}

/**
 * `undefined` data + `notConfigured: true` means this deployment doesn't
 * have `WARDEN_TELEGRAM_USER_*` set at all (the API 404s) -- distinct from
 * a real loading/error state, since the settings page needs to render
 * "not available here" rather than a spinner or an error banner for that
 * case.
 */
export function useTelegramUserStatus() {
  const query = useQuery<StatusResponse, ApiError>({
    queryKey: statusQueryKey,
    queryFn: () => apiFetch<StatusResponse>("/api/v1/telegram-user/status"),
    // Re-check every 2s while a login is actually in flight, so the UI
    // advances through phone -> code -> (password) -> ready on its own as
    // the owner answers each step from wherever they're actually typing
    // (this page, or the /tdlogin bot-chat fallback) -- otherwise a step
    // answered via the bot chat would never show up here without a manual
    // refresh.
    refetchInterval: (q) => (isInProgress(q.state.data?.auth_state) ? 2000 : false),
    retry: (failureCount, error) => error.status !== 404 && failureCount < 2,
  });

  const notConfigured = query.error instanceof ApiError && query.error.status === 404;
  return { ...query, notConfigured };
}

function useSubmit<TBody>(path: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TBody) => apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: statusQueryKey }),
  });
}

export function useSubmitPhoneNumber() {
  return useSubmit<{ phone_number: string }>("/api/v1/telegram-user/phone");
}

export function useSubmitAuthCode() {
  return useSubmit<{ code: string }>("/api/v1/telegram-user/code");
}

export function useSubmitPassword() {
  return useSubmit<{ password: string }>("/api/v1/telegram-user/password");
}
