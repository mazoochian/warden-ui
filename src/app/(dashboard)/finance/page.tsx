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
  Tab,
  TabList,
  Table,
  TableBody,
  TableCell,
  TableCellLayout,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
} from "@fluentui/react-components";
import { EmptyState, PageHeader, Section, StatTile, TableScroll, useCommonStyles } from "@/components/ui-kit";
import { useMyChats, type MyChat } from "@/hooks/useMyChats";
import { useMySettings } from "@/hooks/useMySettings";
import { useSession } from "@/hooks/useSession";
import { ApiError } from "@/lib/api";
import { t } from "@/lib/i18n";
import { defaultCurrency, formatMoney, intervalPresets, parseAmountCents, startOfMonthUnix } from "@/lib/money";
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

function chatLabel(c: MyChat) {
  return c.title ?? c.native_chat_id;
}

function formatWhen(seconds: number) {
  return new Date(seconds * 1000).toLocaleString();
}

/** Shared chat picker -- every finance form needs one, and the Budgets tab
 * needs it as a required filter rather than a form field. */
function ChatPicker({
  chats,
  value,
  onChange,
  label,
  placeholder,
}: {
  chats: MyChat[];
  value: number | undefined;
  onChange: (id: number | undefined) => void;
  label: string;
  placeholder: string;
}) {
  const selected = chats.find((c) => c.id === value);
  return (
    <Field label={label}>
      <Dropdown
        placeholder={placeholder}
        selectedOptions={value ? [String(value)] : []}
        value={selected ? chatLabel(selected) : ""}
        onOptionSelect={(_, d) => onChange(d.optionValue ? Number(d.optionValue) : undefined)}
      >
        {chats.map((c) => (
          <Option key={c.id} value={String(c.id)} text={chatLabel(c)}>
            {chatLabel(c)}
          </Option>
        ))}
      </Dropdown>
    </Field>
  );
}

// --- Expenses ---

function NewExpenseForm() {
  const s = useCommonStyles();
  const { data: chats } = useMyChats();
  const createExpense = useCreateExpense();

  const [chatId, setChatId] = useState<number | undefined>(undefined);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const cents = parseAmountCents(amount);
  // Only complain once something has actually been typed -- an empty field
  // on first render isn't an error the user made yet.
  const amountInvalid = amount.trim().length > 0 && cents === null;
  const canSubmit = Boolean(chatId) && cents !== null && category.trim().length > 0 && category.trim().length <= 64;

  const submit = () => {
    if (!chatId || cents === null) return;
    createExpense.mutate(
      {
        chat_id: chatId,
        amount_cents: cents,
        category: category.trim(),
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          setAmount("");
          setDescription("");
        },
      },
    );
  };

  return (
    <Section title={t("finance.newExpense")}>
      <div className={s.formGrid}>
        <ChatPicker
          chats={chats?.items ?? []}
          value={chatId}
          onChange={setChatId}
          label={t("finance.chatLabel")}
          placeholder={t("finance.selectChat")}
        />
        <Field
          label={t("finance.amountLabel")}
          hint={t("finance.amountHint")}
          validationState={amountInvalid ? "error" : "none"}
          validationMessage={amountInvalid ? t("finance.amountInvalid") : undefined}
        >
          <Input value={amount} onChange={(_, d) => setAmount(d.value)} inputMode="decimal" placeholder="12.50" />
        </Field>
        <Field label={t("finance.categoryLabel")}>
          <Input value={category} onChange={(_, d) => setCategory(d.value)} maxLength={64} placeholder={t("finance.categoryPlaceholder")} />
        </Field>
        <Field label={t("finance.descriptionLabel")}>
          <Input value={description} onChange={(_, d) => setDescription(d.value)} maxLength={500} />
        </Field>
      </div>

      {createExpense.isError && (
        <MessageBar intent="error">
          <MessageBarBody>
            {createExpense.error instanceof ApiError ? createExpense.error.message : t("finance.saveFailed")}
          </MessageBarBody>
        </MessageBar>
      )}

      <Button appearance="primary" disabled={!canSubmit || createExpense.isPending} onClick={submit} style={{ alignSelf: "flex-start" }}>
        {t("finance.addExpense")}
      </Button>
    </Section>
  );
}

function ExpensesTab() {
  const s = useCommonStyles();
  const { data: chats } = useMyChats();
  const [filterChatId, setFilterChatId] = useState<number | undefined>(undefined);
  const { data, isPending, isError } = useExpenses({ chatId: filterChatId });
  const deleteExpense = useDeleteExpense();

  return (
    <>
      <NewExpenseForm />

      <Section title={t("finance.recorded")}>
        <div className={s.formGrid}>
          <ChatPicker
            chats={chats?.items ?? []}
            value={filterChatId}
            onChange={setFilterChatId}
            label={t("finance.filterChatLabel")}
            placeholder={t("finance.allChats")}
          />
        </div>

        {isPending && <Spinner label={t("finance.loading")} />}
        {isError && <Body1>{t("finance.loadFailed")}</Body1>}
        {data && data.items.length === 0 && <EmptyState text={t("finance.noExpenses")} />}
        {data && data.items.length > 0 && (
          <TableScroll label={t("finance.recorded")} minWidth={880}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>{t("finance.columnChat")}</TableHeaderCell>
                  <TableHeaderCell>{t("finance.columnAmount")}</TableHeaderCell>
                  <TableHeaderCell>{t("finance.columnCategory")}</TableHeaderCell>
                  <TableHeaderCell>{t("finance.columnDescription")}</TableHeaderCell>
                  <TableHeaderCell>{t("finance.columnWhen")}</TableHeaderCell>
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
                    <TableCell>{formatMoney(e.amount_cents, e.currency)}</TableCell>
                    <TableCell>{e.category}</TableCell>
                    <TableCell>{e.description ?? ""}</TableCell>
                    <TableCell>{formatWhen(e.created_at)}</TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => deleteExpense.mutate(e.id)} disabled={deleteExpense.isPending}>
                        {t("finance.delete")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableScroll>
        )}
      </Section>
    </>
  );
}

// --- Budgets ---

function SetBudgetForm({ chatId }: { chatId: number }) {
  const s = useCommonStyles();
  const setBudget = useSetBudget();
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");

  const cents = parseAmountCents(amount);
  const amountInvalid = amount.trim().length > 0 && cents === null;
  const canSubmit = cents !== null && category.trim().length > 0 && category.trim().length <= 64;

  const submit = () => {
    if (cents === null) return;
    setBudget.mutate(
      { chat_id: chatId, category: category.trim(), amount_cents: cents },
      {
        onSuccess: () => {
          setCategory("");
          setAmount("");
        },
      },
    );
  };

  return (
    <Section title={t("finance.setBudget")}>
      <div className={s.formGrid}>
        <Field label={t("finance.categoryLabel")}>
          <Input value={category} onChange={(_, d) => setCategory(d.value)} maxLength={64} placeholder={t("finance.categoryPlaceholder")} />
        </Field>
        <Field
          label={t("finance.monthlyBudgetLabel")}
          hint={t("finance.amountHint")}
          validationState={amountInvalid ? "error" : "none"}
          validationMessage={amountInvalid ? t("finance.amountInvalid") : undefined}
        >
          <Input value={amount} onChange={(_, d) => setAmount(d.value)} inputMode="decimal" placeholder="300.00" />
        </Field>
      </div>

      {setBudget.isError && (
        <MessageBar intent="error">
          <MessageBarBody>{setBudget.error instanceof ApiError ? setBudget.error.message : t("finance.saveFailed")}</MessageBarBody>
        </MessageBar>
      )}

      <Button appearance="primary" disabled={!canSubmit || setBudget.isPending} onClick={submit} style={{ alignSelf: "flex-start" }}>
        {t("finance.saveBudget")}
      </Button>
    </Section>
  );
}

function BudgetsTab() {
  const s = useCommonStyles();
  const { data: chats } = useMyChats();
  const { data: session } = useSession();
  const { data: settings } = useMySettings();
  const [chatId, setChatId] = useState<number | undefined>(undefined);

  // Budgets are monthly, so the summary window is the viewer's current
  // calendar month -- see `startOfMonthUnix` for why the offset matters.
  const since = startOfMonthUnix(settings?.utc_offset_minutes ?? 0);
  const { data: summary, isPending: summaryPending } = useExpenseSummary(chatId, since);
  const { data: budgets } = useBudgets(chatId);
  const deleteBudget = useDeleteBudget();

  const isOwner = session?.authenticated === true && session.roles.owner;
  const budgetFor = (category: string) => budgets?.items.find((b) => b.category === category);

  return (
    <>
      <Section title={t("finance.chooseChat")}>
        <div className={s.formGrid}>
          <ChatPicker
            chats={chats?.items ?? []}
            value={chatId}
            onChange={setChatId}
            label={t("finance.chatLabel")}
            placeholder={t("finance.selectChat")}
          />
        </div>
        <Body1 className={s.muted}>{t("finance.budgetsChatHint")}</Body1>
      </Section>

      {!chatId && <EmptyState text={t("finance.pickChatFirst")} />}

      {chatId && (
        <>
          {isOwner && <SetBudgetForm chatId={chatId} />}

          <Section title={t("finance.thisMonth")}>
            {summaryPending && <Spinner label={t("finance.loading")} />}
            {summary && (
              <>
                <div className={s.tiles}>
                  <StatTile value={formatMoney(summary.total_cents, defaultCurrency)} label={t("finance.totalSpent")} />
                  <StatTile value={summary.categories.length} label={t("finance.categoriesTracked")} />
                </div>

                {summary.categories.length === 0 && <EmptyState text={t("finance.noSpending")} />}
                {summary.categories.length > 0 && (
                  <TableScroll label={t("finance.thisMonth")} minWidth={700}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHeaderCell>{t("finance.columnCategory")}</TableHeaderCell>
                          <TableHeaderCell>{t("finance.columnSpent")}</TableHeaderCell>
                          <TableHeaderCell>{t("finance.columnBudget")}</TableHeaderCell>
                          <TableHeaderCell>{t("finance.columnStatus")}</TableHeaderCell>
                          {isOwner && <TableHeaderCell />}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.categories.map((c) => {
                          const budget = budgetFor(c.category);
                          return (
                            <TableRow key={c.category}>
                              <TableCell>
                                <TableCellLayout>
                                  <Text weight="semibold">{c.category}</Text>
                                </TableCellLayout>
                              </TableCell>
                              <TableCell>{formatMoney(c.total_cents, defaultCurrency)}</TableCell>
                              <TableCell>
                                {c.budget_cents === null
                                  ? t("finance.noBudget")
                                  : formatMoney(c.budget_cents, budget?.currency ?? defaultCurrency)}
                              </TableCell>
                              <TableCell>
                                {c.budget_cents === null ? (
                                  ""
                                ) : c.over ? (
                                  <Badge appearance="filled" color="danger">
                                    {t("finance.overBudget")}
                                  </Badge>
                                ) : (
                                  <Badge appearance="outline" color="success">
                                    {t("finance.withinBudget")}
                                  </Badge>
                                )}
                              </TableCell>
                              {isOwner && (
                                <TableCell>
                                  {budget !== undefined && (
                                    <Button size="small" onClick={() => deleteBudget.mutate(budget.id)} disabled={deleteBudget.isPending}>
                                      {t("finance.removeBudget")}
                                    </Button>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableScroll>
                )}
              </>
            )}
          </Section>
        </>
      )}
    </>
  );
}

// --- Subscriptions ---

function NewSubscriptionForm() {
  const s = useCommonStyles();
  const { data: chats } = useMyChats();
  const createSubscription = useCreateSubscription();

  const [chatId, setChatId] = useState<number | undefined>(undefined);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [intervalDays, setIntervalDays] = useState<number>(30);

  const cents = parseAmountCents(amount);
  const amountInvalid = amount.trim().length > 0 && cents === null;
  const canSubmit = Boolean(chatId) && cents !== null && name.trim().length > 0 && name.trim().length <= 128;

  const submit = () => {
    if (!chatId || cents === null) return;
    createSubscription.mutate(
      { chat_id: chatId, name: name.trim(), amount_cents: cents, interval_days: intervalDays },
      {
        onSuccess: () => {
          setName("");
          setAmount("");
        },
      },
    );
  };

  // Spelled out rather than built by template string: `t()`'s key type is
  // `keyof typeof en`, so a literal key is what makes a missing/renamed
  // string a compile error instead of a runtime blank.
  const intervalLabel = (days: number) => {
    switch (days) {
      case 7:
        return t("finance.intervalWeekly");
      case 90:
        return t("finance.intervalQuarterly");
      case 365:
        return t("finance.intervalYearly");
      default:
        return t("finance.intervalMonthly");
    }
  };

  return (
    <Section title={t("finance.newSubscription")}>
      <div className={s.formGrid}>
        <ChatPicker
          chats={chats?.items ?? []}
          value={chatId}
          onChange={setChatId}
          label={t("finance.chatLabel")}
          placeholder={t("finance.selectChat")}
        />
        <Field label={t("finance.nameLabel")}>
          <Input value={name} onChange={(_, d) => setName(d.value)} maxLength={128} placeholder={t("finance.namePlaceholder")} />
        </Field>
        <Field
          label={t("finance.amountLabel")}
          hint={t("finance.amountHint")}
          validationState={amountInvalid ? "error" : "none"}
          validationMessage={amountInvalid ? t("finance.amountInvalid") : undefined}
        >
          <Input value={amount} onChange={(_, d) => setAmount(d.value)} inputMode="decimal" placeholder="15.99" />
        </Field>
        <Field label={t("finance.billingIntervalLabel")}>
          <Dropdown
            selectedOptions={[String(intervalDays)]}
            value={intervalLabel(intervalDays)}
            onOptionSelect={(_, d) => setIntervalDays(Number(d.optionValue))}
          >
            {intervalPresets.map((p) => (
              <Option key={p.days} value={String(p.days)} text={intervalLabel(p.days)}>
                {intervalLabel(p.days)}
              </Option>
            ))}
          </Dropdown>
        </Field>
      </div>

      {createSubscription.isError && (
        <MessageBar intent="error">
          <MessageBarBody>
            {createSubscription.error instanceof ApiError ? createSubscription.error.message : t("finance.saveFailed")}
          </MessageBarBody>
        </MessageBar>
      )}

      <Button
        appearance="primary"
        disabled={!canSubmit || createSubscription.isPending}
        onClick={submit}
        style={{ alignSelf: "flex-start" }}
      >
        {t("finance.addSubscription")}
      </Button>
    </Section>
  );
}

function SubscriptionsTab() {
  const s = useCommonStyles();
  const { data, isPending, isError } = useSubscriptions();
  const deleteSubscription = useDeleteSubscription();

  return (
    <>
      <NewSubscriptionForm />

      <Section title={t("finance.recurring")}>
        {isPending && <Spinner label={t("finance.loading")} />}
        {isError && <Body1>{t("finance.loadFailed")}</Body1>}
        {data && data.items.length === 0 && <EmptyState text={t("finance.noSubscriptions")} />}
        {data && data.items.length > 0 && (
          <>
            <div className={s.tiles}>
              <StatTile value={formatMoney(data.monthly_total_cents, defaultCurrency)} label={t("finance.monthlyTotal")} />
              <StatTile value={data.items.length} label={t("finance.subscriptionCount")} />
            </div>

            <TableScroll label={t("finance.recurring")} minWidth={880}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>{t("finance.columnChat")}</TableHeaderCell>
                    <TableHeaderCell>{t("finance.columnName")}</TableHeaderCell>
                    <TableHeaderCell>{t("finance.columnAmount")}</TableHeaderCell>
                    <TableHeaderCell>{t("finance.columnEvery")}</TableHeaderCell>
                    <TableHeaderCell>{t("finance.columnPerMonth")}</TableHeaderCell>
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
                      <TableCell>{formatMoney(sub.amount_cents, sub.currency)}</TableCell>
                      <TableCell>{t("finance.everyDays", { days: sub.interval_days })}</TableCell>
                      <TableCell>{formatMoney(sub.monthly_equivalent_cents, sub.currency)}</TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => deleteSubscription.mutate(sub.id)} disabled={deleteSubscription.isPending}>
                          {t("finance.remove")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableScroll>

            <Body1 className={s.muted}>{t("finance.monthlyEquivalentNote")}</Body1>
          </>
        )}
      </Section>
    </>
  );
}

// --- Page ---

type FinanceTab = "expenses" | "budgets" | "subscriptions";

/**
 * Warden's `finance` module (its `ROADMAP.md` Phase 17) covers three
 * separate ledgers behind one feature flag, so this is one nav entry with
 * three tabs rather than three sibling pages -- matching how the bot gates
 * `/expense`, `/budget` and `/subscription` together.
 */
export default function FinancePage() {
  const s = useCommonStyles();
  const [tab, setTab] = useState<FinanceTab>("expenses");

  return (
    <div className={s.page}>
      <PageHeader title={t("finance.title")} description={t("finance.description")} />

      {/* `TabList` neither wraps nor scrolls on its own, so three tabs
          overflow a phone-width row -- scroll the strip rather than
          truncating a tab label. */}
      <div className={s.scrollX}>
        <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as FinanceTab)}>
          <Tab value="expenses">{t("finance.tabExpenses")}</Tab>
          <Tab value="budgets">{t("finance.tabBudgets")}</Tab>
          <Tab value="subscriptions">{t("finance.tabSubscriptions")}</Tab>
        </TabList>
      </div>

      {tab === "expenses" && <ExpensesTab />}
      {tab === "budgets" && <BudgetsTab />}
      {tab === "subscriptions" && <SubscriptionsTab />}
    </div>
  );
}
