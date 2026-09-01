"use client";

import { useState } from "react";
import {
  Badge,
  Body1,
  Button,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableCellLayout,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
} from "@fluentui/react-components";
import { EmptyState, PageHeader, Section, useCommonStyles } from "@/components/ui-kit";
import { useMyChats } from "@/hooks/useMyChats";
import { useSession } from "@/hooks/useSession";
import {
  useBudgets,
  useCreateExpense,
  useCreateSubscription,
  useDeleteBudget,
  useDeleteExpense,
  useDeleteSubscription,
  useExpenseSummary,
  useExpenses,
  useSetBudget,
  useSubscriptions,
} from "@/hooks/useFinance";
import { ApiError } from "@/lib/api";
import { formatCents, parseAmountCents } from "@/lib/money";
import { t } from "@/lib/i18n";

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

function formatCreatedAt(seconds: number) {
  return new Date(seconds * 1000).toLocaleDateString();
}

const intervalPresets = [
  { value: "7", label: t("finance.intervalWeekly") },
  { value: "30", label: t("finance.intervalMonthly") },
  { value: "365", label: t("finance.intervalYearly") },
];

function NewExpenseForm() {
  const s = useCommonStyles();
  const { data: chats } = useMyChats();
  const createExpense = useCreateExpense();

  const [chatId, setChatId] = useState<number | undefined>(undefined);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const chatOptions = chats?.items ?? [];
  const amountCents = parseAmountCents(amount);
  const canSubmit = Boolean(chatId) && amountCents !== null && category.trim().length > 0 && category.trim().length <= 64;

  const submit = () => {
    if (!chatId || amountCents === null) return;
    createExpense.mutate(
      { chat_id: chatId, amount_cents: amountCents, category: category.trim(), description: description.trim() || undefined },
      { onSuccess: () => { setAmount(""); setCategory(""); setDescription(""); } },
    );
  };

  return (
    <Section title={t("finance.newExpense")}>
      <div className={s.formGrid}>
        <Field label={t("finance.chatLabel")}>
          <Dropdown
            placeholder={t("finance.selectChat")}
            selectedOptions={chatId ? [String(chatId)] : []}
            value={chatOptions.find((c) => c.id === chatId)?.title ?? chatOptions.find((c) => c.id === chatId)?.native_chat_id ?? ""}
            onOptionSelect={(_, d) => setChatId(d.optionValue ? Number(d.optionValue) : undefined)}
          >
            {chatOptions.map((c) => (
              <Option key={c.id} value={String(c.id)} text={c.title ?? c.native_chat_id}>
                {c.title ?? c.native_chat_id}
              </Option>
            ))}
          </Dropdown>
        </Field>
        <Field label={t("finance.amountLabel")} validationState={amount.length > 0 && amountCents === null ? "error" : "none"}>
          <Input value={amount} onChange={(_, d) => setAmount(d.value)} placeholder="12.50" />
        </Field>
        <Field label={t("finance.categoryLabel")}>
          <Input value={category} onChange={(_, d) => setCategory(d.value)} maxLength={64} />
        </Field>
      </div>

      <Field label={t("finance.descriptionLabel")}>
        <Input value={description} onChange={(_, d) => setDescription(d.value)} maxLength={500} />
      </Field>

      {createExpense.isError && (
        <MessageBar intent="error">
          <MessageBarBody>{errorMessage(createExpense.error, t("finance.expenseSaveFailed"))}</MessageBarBody>
        </MessageBar>
      )}

      <Button appearance="primary" disabled={!canSubmit || createExpense.isPending} onClick={submit} style={{ alignSelf: "flex-start" }}>
        {t("finance.addExpense")}
      </Button>
    </Section>
  );
}

function ExpensesList() {
  const { data, isPending, isError } = useExpenses();
  const deleteExpense = useDeleteExpense();

  return (
    <Section title={t("finance.expenses")}>
      {isPending && <Spinner label={t("finance.loadingExpenses")} />}
      {isError && <Body1>{t("finance.loadExpensesFailed")}</Body1>}
      {data && data.items.length === 0 && <EmptyState text={t("finance.noExpenses")} />}
      {data && data.items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>{t("finance.columnChat")}</TableHeaderCell>
              <TableHeaderCell>{t("finance.columnCategory")}</TableHeaderCell>
              <TableHeaderCell>{t("finance.columnAmount")}</TableHeaderCell>
              <TableHeaderCell>{t("finance.columnDate")}</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <TableCellLayout>
                    <Text weight="semibold">{e.chat_title ?? t("finance.chatFallback", { id: e.chat_id })}</Text>
                  </TableCellLayout>
                </TableCell>
                <TableCell>
                  {e.category}
                  {e.description && <Body1 block> {e.description}</Body1>}
                </TableCell>
                <TableCell>{formatCents(e.amount_cents, e.currency)}</TableCell>
                <TableCell>{formatCreatedAt(e.created_at)}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => deleteExpense.mutate(e.id)} disabled={deleteExpense.isPending}>
                    {t("finance.delete")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
  );
}

function NewSubscriptionForm() {
  const s = useCommonStyles();
  const { data: chats } = useMyChats();
  const createSubscription = useCreateSubscription();

  const [chatId, setChatId] = useState<number | undefined>(undefined);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [interval, setInterval] = useState("30");
  const [customInterval, setCustomInterval] = useState("30");

  const chatOptions = chats?.items ?? [];
  const amountCents = parseAmountCents(amount);
  const intervalDays = interval === "custom" ? Number(customInterval) : Number(interval);
  const canSubmit =
    Boolean(chatId) && amountCents !== null && name.trim().length > 0 && name.trim().length <= 128 && intervalDays > 0 && intervalDays <= 36_500;

  const submit = () => {
    if (!chatId || amountCents === null) return;
    createSubscription.mutate(
      { chat_id: chatId, name: name.trim(), amount_cents: amountCents, interval_days: intervalDays },
      { onSuccess: () => setName("") },
    );
  };

  return (
    <Section title={t("finance.newSubscription")}>
      <div className={s.formGrid}>
        <Field label={t("finance.chatLabel")}>
          <Dropdown
            placeholder={t("finance.selectChat")}
            selectedOptions={chatId ? [String(chatId)] : []}
            value={chatOptions.find((c) => c.id === chatId)?.title ?? chatOptions.find((c) => c.id === chatId)?.native_chat_id ?? ""}
            onOptionSelect={(_, d) => setChatId(d.optionValue ? Number(d.optionValue) : undefined)}
          >
            {chatOptions.map((c) => (
              <Option key={c.id} value={String(c.id)} text={c.title ?? c.native_chat_id}>
                {c.title ?? c.native_chat_id}
              </Option>
            ))}
          </Dropdown>
        </Field>
        <Field label={t("finance.nameLabel")}>
          <Input value={name} onChange={(_, d) => setName(d.value)} maxLength={128} />
        </Field>
        <Field label={t("finance.amountLabel")} validationState={amount.length > 0 && amountCents === null ? "error" : "none"}>
          <Input value={amount} onChange={(_, d) => setAmount(d.value)} placeholder="9.99" />
        </Field>
        <Field label={t("finance.intervalLabel")}>
          <Dropdown value={intervalPresets.find((p) => p.value === interval)?.label ?? t("finance.intervalCustom")} selectedOptions={[interval]} onOptionSelect={(_, d) => setInterval(d.optionValue ?? "30")}>
            {intervalPresets.map((p) => (
              <Option key={p.value} value={p.value}>
                {p.label}
              </Option>
            ))}
            <Option value="custom">{t("finance.intervalCustom")}</Option>
          </Dropdown>
        </Field>
        {interval === "custom" && (
          <Field label={t("finance.intervalDaysLabel")}>
            <Input type="number" min={1} max={36500} value={customInterval} onChange={(_, d) => setCustomInterval(d.value)} />
          </Field>
        )}
      </div>

      {createSubscription.isError && (
        <MessageBar intent="error">
          <MessageBarBody>{errorMessage(createSubscription.error, t("finance.subscriptionSaveFailed"))}</MessageBarBody>
        </MessageBar>
      )}

      <Button appearance="primary" disabled={!canSubmit || createSubscription.isPending} onClick={submit} style={{ alignSelf: "flex-start" }}>
        {t("finance.addSubscription")}
      </Button>
    </Section>
  );
}

function SubscriptionsList() {
  const { data, isPending, isError } = useSubscriptions();
  const deleteSubscription = useDeleteSubscription();

  return (
    <Section
      title={t("finance.subscriptions")}
      action={data && data.items.length > 0 ? <Badge appearance="tint">{t("finance.monthlyTotal", { amount: formatCents(data.monthly_total_cents, data.items[0].currency) })}</Badge> : undefined}
    >
      {isPending && <Spinner label={t("finance.loadingSubscriptions")} />}
      {isError && <Body1>{t("finance.loadSubscriptionsFailed")}</Body1>}
      {data && data.items.length === 0 && <EmptyState text={t("finance.noSubscriptions")} />}
      {data && data.items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>{t("finance.columnChat")}</TableHeaderCell>
              <TableHeaderCell>{t("finance.columnName")}</TableHeaderCell>
              <TableHeaderCell>{t("finance.columnAmount")}</TableHeaderCell>
              <TableHeaderCell>{t("finance.columnMonthly")}</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell>
                  <TableCellLayout>
                    <Text weight="semibold">{sub.chat_title ?? t("finance.chatFallback", { id: sub.chat_id })}</Text>
                  </TableCellLayout>
                </TableCell>
                <TableCell>{sub.name}</TableCell>
                <TableCell>
                  {formatCents(sub.amount_cents, sub.currency)} {t("finance.every", { n: sub.interval_days })}
                </TableCell>
                <TableCell>{formatCents(sub.monthly_equivalent_cents, sub.currency)}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => deleteSubscription.mutate(sub.id)} disabled={deleteSubscription.isPending}>
                    {t("finance.delete")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
  );
}

function NewBudgetForm({ chatId, isOwner }: { chatId: number; isOwner: boolean }) {
  const s = useCommonStyles();
  const setBudget = useSetBudget();
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");

  if (!isOwner) return null;

  const amountCents = parseAmountCents(amount);
  const canSubmit = category.trim().length > 0 && category.trim().length <= 64 && amountCents !== null;

  const submit = () => {
    if (amountCents === null) return;
    setBudget.mutate({ chat_id: chatId, category: category.trim(), amount_cents: amountCents }, { onSuccess: () => { setCategory(""); setAmount(""); } });
  };

  return (
    <div className={s.formGrid}>
      <Field label={t("finance.categoryLabel")}>
        <Input value={category} onChange={(_, d) => setCategory(d.value)} maxLength={64} />
      </Field>
      <Field label={t("finance.amountLabel")} validationState={amount.length > 0 && amountCents === null ? "error" : "none"}>
        <Input value={amount} onChange={(_, d) => setAmount(d.value)} placeholder="200.00" />
      </Field>
      <Button appearance="primary" disabled={!canSubmit || setBudget.isPending} onClick={submit} style={{ alignSelf: "flex-end" }}>
        {t("finance.setBudget")}
      </Button>
    </div>
  );
}

function BudgetsAndSummary() {
  const s = useCommonStyles();
  const { data: session } = useSession();
  const isOwner = Boolean(session?.authenticated && session.roles.owner);
  const { data: chats } = useMyChats();
  const [chatId, setChatId] = useState<number | undefined>(undefined);
  const { data: summary, isPending: summaryPending } = useExpenseSummary(chatId);
  const { data: budgets } = useBudgets(chatId);
  const deleteBudget = useDeleteBudget();

  const chatOptions = chats?.items ?? [];

  return (
    <Section title={t("finance.budgets")}>
      <Field label={t("finance.chatLabel")}>
        <Dropdown
          placeholder={t("finance.selectChat")}
          selectedOptions={chatId ? [String(chatId)] : []}
          value={chatOptions.find((c) => c.id === chatId)?.title ?? chatOptions.find((c) => c.id === chatId)?.native_chat_id ?? ""}
          onOptionSelect={(_, d) => setChatId(d.optionValue ? Number(d.optionValue) : undefined)}
        >
          {chatOptions.map((c) => (
            <Option key={c.id} value={String(c.id)} text={c.title ?? c.native_chat_id}>
              {c.title ?? c.native_chat_id}
            </Option>
          ))}
        </Dropdown>
      </Field>

      {chatId && isOwner && <NewBudgetForm chatId={chatId} isOwner={isOwner} />}
      {chatId && !isOwner && <Body1 className={s.muted}>{t("finance.budgetsOwnerOnly")}</Body1>}

      {chatId && summaryPending && <Spinner label={t("finance.loadingSummary")} />}
      {chatId && summary && summary.categories.length === 0 && <EmptyState text={t("finance.noSpending")} />}
      {chatId && summary && summary.categories.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>{t("finance.columnCategory")}</TableHeaderCell>
              <TableHeaderCell>{t("finance.columnSpent")}</TableHeaderCell>
              <TableHeaderCell>{t("finance.columnBudget")}</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.categories.map((row) => {
              const budget = budgets?.items.find((b) => b.category === row.category);
              return (
                <TableRow key={row.category}>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>
                    {formatCents(row.total_cents, budget?.currency ?? "USD")}
                    {row.over && (
                      <Badge appearance="filled" color="danger" style={{ marginInlineStart: "8px" }}>
                        {t("finance.overBudget")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{row.budget_cents !== null ? formatCents(row.budget_cents, budget?.currency ?? "USD") : t("finance.noBudget")}</TableCell>
                  <TableCell>
                    {isOwner && budget && (
                      <Button size="small" onClick={() => deleteBudget.mutate(budget.id)} disabled={deleteBudget.isPending}>
                        {t("finance.delete")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Section>
  );
}

export default function FinancePage() {
  const s = useCommonStyles();

  return (
    <div className={s.page}>
      <PageHeader title={t("finance.title")} description={t("finance.description")} />

      <NewExpenseForm />
      <ExpensesList />
      <NewSubscriptionForm />
      <SubscriptionsList />
      <BudgetsAndSummary />
    </div>
  );
}
