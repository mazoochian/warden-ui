"use client";

import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Finance (warden `ROADMAP.md` Phase 17): expenses, budgets, subscriptions.
 *
 * Two different scoping models live here on purpose, mirroring the bot:
 * expenses and subscriptions are **identity-scoped** ("my spending across
 * every chat", same as notes/reminders/alerts/watches), while budgets and
 * the expense summary are **chat-scoped** — a budget is chat-wide policy,
 * so "am I over budget" is only meaningful against the whole chat's
 * spending. See warden's `store/budgets.zig` doc comment.
 *
 * Every `*_cents` field is an integer; see `@/lib/money` for why nothing
 * here ever handles a float.
 */

export type Expense = {
  id: number;
  chat_id: number;
  chat_title: string | null;
  amount_cents: number;
  currency: string;
  category: string;
  description: string | null;
  created_at: number;
};

export type Budget = {
  id: number;
  chat_id: number;
  category: string;
  amount_cents: number;
  currency: string;
};

export type Subscription = {
  id: number;
  chat_id: number;
  chat_title: string | null;
  name: string;
  amount_cents: number;
  currency: string;
  interval_days: number;
  monthly_equivalent_cents: number;
  created_at: number;
};

export type SummaryCategory = {
  category: string;
  total_cents: number;
  budget_cents: number | null;
  over: boolean;
};

export type ExpenseSummary = {
  chat_id: number;
  total_cents: number;
  categories: SummaryCategory[];
};

// --- Expenses ---

export type ExpenseFilters = { chatId?: number; category?: string; since?: number };

export function useExpenses(filters: ExpenseFilters = {}) {
  const params = new URLSearchParams();
  if (filters.chatId) params.set("chat_id", String(filters.chatId));
  if (filters.category) params.set("category", filters.category);
  if (filters.since) params.set("since", String(filters.since));
  const qs = params.toString();

  return useQuery({
    queryKey: ["expenses", filters.chatId ?? "all", filters.category ?? "all", filters.since ?? "all"],
    queryFn: () => apiFetch<{ items: Expense[] }>(`/api/v1/expenses${qs ? `?${qs}` : ""}`),
  });
}

export type CreateExpenseInput = {
  chat_id: number;
  amount_cents: number;
  category: string;
  description?: string;
};

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExpenseInput) =>
      apiFetch<{ id: number }>("/api/v1/expenses", { method: "POST", body: JSON.stringify(input) }),
    // Also invalidates the summary: a new expense changes the
    // spent-vs-budget numbers on the Budgets tab, not just the list.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/v1/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
    },
  });
}

/** Chat-scoped spend-vs-budget totals. `since` is a Unix timestamp; omit for all time. */
export function useExpenseSummary(chatId: number | undefined, since?: number) {
  const params = new URLSearchParams();
  if (chatId) params.set("chat_id", String(chatId));
  if (since) params.set("since", String(since));

  return useQuery({
    queryKey: ["expense-summary", chatId ?? "none", since ?? "all"],
    queryFn: () => apiFetch<ExpenseSummary>(`/api/v1/expenses/summary?${params.toString()}`),
    enabled: Boolean(chatId),
  });
}

// --- Budgets ---

export function useBudgets(chatId: number | undefined) {
  return useQuery({
    queryKey: ["budgets", chatId ?? "none"],
    queryFn: () => apiFetch<{ items: Budget[] }>(`/api/v1/budgets?chat_id=${chatId}`),
    enabled: Boolean(chatId),
  });
}

export type SetBudgetInput = { chat_id: number; category: string; amount_cents: number };

/**
 * `PUT`, not `POST` — the endpoint upserts on `(chat_id, category)`, so
 * setting the same category twice replaces the amount instead of adding a
 * second budget. Owner-only server-side (see warden's `handleSetBudget`);
 * the form is hidden for non-owners rather than left to 403.
 */
export function useSetBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetBudgetInput) =>
      apiFetch<{ id: number }>("/api/v1/budgets", { method: "PUT", body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/v1/budgets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
    },
  });
}

// --- Subscriptions ---

export function useSubscriptions(chatId?: number) {
  return useQuery({
    queryKey: ["subscriptions", chatId ?? "all"],
    queryFn: () =>
      apiFetch<{ items: Subscription[]; monthly_total_cents: number }>(
        `/api/v1/subscriptions${chatId ? `?chat_id=${chatId}` : ""}`,
      ),
  });
}

export type CreateSubscriptionInput = {
  chat_id: number;
  name: string;
  amount_cents: number;
  interval_days: number;
};

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSubscriptionInput) =>
      apiFetch<{ id: number }>("/api/v1/subscriptions", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscriptions"] }),
  });
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/v1/subscriptions/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscriptions"] }),
  });
}
