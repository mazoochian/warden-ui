"use client";

import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

export function useExpenses(chatId?: number) {
  return useQuery({
    queryKey: ["expenses", chatId ?? "all"],
    queryFn: () => apiFetch<{ items: Expense[] }>(`/api/v1/expenses${chatId ? `?chat_id=${chatId}` : ""}`),
  });
}

export type CreateExpenseInput = {
  chat_id: number;
  amount_cents: number;
  category: string;
  description?: string;
  currency?: string;
};

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExpenseInput) =>
      apiFetch<{ id: number }>("/api/v1/expenses", { method: "POST", body: JSON.stringify(input) }),
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

export type ExpenseSummaryRow = { category: string; total_cents: number; budget_cents: number | null; over: boolean };
export type ExpenseSummary = { chat_id: number; total_cents: number; categories: ExpenseSummaryRow[] };

/** `since` omitted means all-time -- the caller decides the window (e.g.
 * "this calendar month" in the viewer's own UTC offset), the server
 * doesn't guess it. */
export function useExpenseSummary(chatId: number | undefined, since?: number) {
  return useQuery({
    queryKey: ["expense-summary", chatId, since ?? "all"],
    queryFn: () =>
      apiFetch<ExpenseSummary>(`/api/v1/expenses/summary?chat_id=${chatId}${since ? `&since=${since}` : ""}`),
    enabled: chatId !== undefined,
  });
}

export type Budget = { id: number; chat_id: number; category: string; amount_cents: number; currency: string };

export function useBudgets(chatId: number | undefined) {
  return useQuery({
    queryKey: ["budgets", chatId],
    queryFn: () => apiFetch<{ items: Budget[] }>(`/api/v1/budgets?chat_id=${chatId}`),
    enabled: chatId !== undefined,
  });
}

export type SetBudgetInput = { chat_id: number; category: string; amount_cents: number; currency?: string };

export function useSetBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetBudgetInput) => apiFetch<{ id: number }>("/api/v1/budgets", { method: "PUT", body: JSON.stringify(input) }),
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
  currency?: string;
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
