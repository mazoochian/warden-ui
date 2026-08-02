"use client";

import { useMemo, useState } from "react";
import {
  Body1,
  Button,
  Caption1,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableCellLayout,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Textarea,
} from "@fluentui/react-components";
import { EmptyState, PageHeader, Section, ToggleButtonGroup, useCommonStyles } from "@/components/ui-kit";
import { useMyChats } from "@/hooks/useMyChats";
import { ApiError } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useCancelReminder, useCreateReminder, useReminders, type CreateReminderWhen } from "@/hooks/useReminders";

type DurationUnit = "minutes" | "hours" | "days";
const unitSeconds: Record<DurationUnit, number> = { minutes: 60, hours: 3600, days: 86400 };
const unitOptions: { value: DurationUnit; label: string }[] = [
  { value: "minutes", label: t("reminders.unitMinutes") },
  { value: "hours", label: t("reminders.unitHours") },
  { value: "days", label: t("reminders.unitDays") },
];
const whenModeOptions = [
  { value: "duration" as const, label: t("reminders.fromNow") },
  { value: "absolute" as const, label: t("reminders.specificDateTime") },
];

function formatRecur(seconds: number | null) {
  if (!seconds) return t("reminders.recurNone");
  if (seconds % 86400 === 0) return t("reminders.recurDays", { n: seconds / 86400 });
  if (seconds % 3600 === 0) return t("reminders.recurHours", { n: seconds / 3600 });
  return t("reminders.recurMinutes", { n: Math.round(seconds / 60) });
}

function NewReminderForm() {
  const s = useCommonStyles();
  const { data: chats } = useMyChats();
  const createReminder = useCreateReminder();

  const [chatId, setChatId] = useState<number | undefined>(undefined);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"duration" | "absolute">("duration");
  const [amount, setAmount] = useState("30");
  const [unit, setUnit] = useState<DurationUnit>("minutes");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [repeats, setRepeats] = useState(false);
  const [repeatAmount, setRepeatAmount] = useState("1");
  const [repeatUnit, setRepeatUnit] = useState<DurationUnit>("days");

  const chatOptions = chats?.items ?? [];

  const when: CreateReminderWhen | null = useMemo(() => {
    if (mode === "duration") {
      const n = Number(amount);
      if (!Number.isFinite(n) || n <= 0) return null;
      return { kind: "duration", seconds: Math.round(n * unitSeconds[unit]) };
    }
    if (!date || !time) return null;
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    if (!year || !month || !day) return null;
    return { kind: "absolute", year, month, day, hour: hour ?? 0, minute: minute ?? 0 };
  }, [mode, amount, unit, date, time]);

  const recurSeconds = repeats ? Math.round(Number(repeatAmount) * unitSeconds[repeatUnit]) : null;
  const canSubmit = Boolean(chatId) && message.trim().length > 0 && when !== null && (!repeats || (recurSeconds ?? 0) > 0);

  const submit = () => {
    if (!chatId || !when) return;
    createReminder.mutate(
      { chat_id: chatId, message: message.trim(), when, recur_interval_seconds: recurSeconds },
      {
        onSuccess: () => {
          setMessage("");
          setDate("");
          setTime("");
        },
      },
    );
  };

  return (
    <Section title={t("reminders.newReminder")}>
      <div className={s.formGrid}>
        <Field label={t("reminders.chatLabel")}>
          <Dropdown
            placeholder={t("reminders.selectChat")}
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

        <Field label={t("reminders.whenLabel")}>
          <ToggleButtonGroup ariaLabel={t("reminders.whenLabel")} value={mode} options={whenModeOptions} onChange={setMode} />
        </Field>
      </div>

      {mode === "duration" ? (
        <div className={s.row}>
          <Input
            type="number"
            min={1}
            value={amount}
            onChange={(_, d) => setAmount(d.value)}
            style={{ width: 100 }}
            aria-label={t("reminders.amount")}
          />
          <Dropdown
            value={unitOptions.find((o) => o.value === unit)?.label ?? unit}
            selectedOptions={[unit]}
            onOptionSelect={(_, d) => d.optionValue && setUnit(d.optionValue as DurationUnit)}
            aria-label={t("reminders.unit")}
          >
            {unitOptions.map((o) => (
              <Option key={o.value} value={o.value}>
                {o.label}
              </Option>
            ))}
          </Dropdown>
          <Caption1 className={s.muted}>{t("reminders.fromNowSuffix")}</Caption1>
        </div>
      ) : (
        <div className={s.row}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label={t("reminders.dateInput")} />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label={t("reminders.timeInput")} />
          <Caption1 className={s.muted}>{t("reminders.localTimeHint")}</Caption1>
        </div>
      )}

      <Field label={t("reminders.messageLabel")}>
        <Textarea value={message} onChange={(_, d) => setMessage(d.value)} rows={2} />
      </Field>

      <Switch checked={repeats} onChange={(_, d) => setRepeats(d.checked)} label={t("reminders.repeats")} />
      {repeats && (
        <div className={s.row}>
          <Input
            type="number"
            min={1}
            value={repeatAmount}
            onChange={(_, d) => setRepeatAmount(d.value)}
            style={{ width: 100 }}
            aria-label={t("reminders.repeatAmount")}
          />
          <Dropdown
            value={unitOptions.find((o) => o.value === repeatUnit)?.label ?? repeatUnit}
            selectedOptions={[repeatUnit]}
            onOptionSelect={(_, d) => d.optionValue && setRepeatUnit(d.optionValue as DurationUnit)}
            aria-label={t("reminders.repeatUnit")}
          >
            {unitOptions.map((o) => (
              <Option key={o.value} value={o.value}>
                {o.label}
              </Option>
            ))}
          </Dropdown>
        </div>
      )}

      {createReminder.isError && (
        <MessageBar intent="error">
          <MessageBarBody>
            {createReminder.error instanceof ApiError ? createReminder.error.message : t("reminders.createFailed")}
          </MessageBarBody>
        </MessageBar>
      )}

      <Button appearance="primary" disabled={!canSubmit || createReminder.isPending} onClick={submit} style={{ alignSelf: "flex-start" }}>
        {t("reminders.create")}
      </Button>
    </Section>
  );
}

export default function RemindersPage() {
  const s = useCommonStyles();
  const { data, isPending, isError } = useReminders();
  const cancelReminder = useCancelReminder();

  return (
    <div className={s.page}>
      <PageHeader title={t("reminders.title")} description={t("reminders.description")} />

      <NewReminderForm />

      <Section title={t("reminders.pending")}>
        {isPending && <Spinner label={t("reminders.loading")} />}
        {isError && <Body1>{t("reminders.loadFailed")}</Body1>}
        {data && data.items.length === 0 && <EmptyState text={t("reminders.none")} />}
        {data && data.items.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>{t("reminders.columnChat")}</TableHeaderCell>
                <TableHeaderCell>{t("reminders.columnMessage")}</TableHeaderCell>
                <TableHeaderCell>{t("reminders.columnDue")}</TableHeaderCell>
                <TableHeaderCell>{t("reminders.columnRepeats")}</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <TableCellLayout>
                      <Text weight="semibold">{r.chat_title ?? `Chat #${r.chat_id}`}</Text>
                    </TableCellLayout>
                  </TableCell>
                  <TableCell>{r.message}</TableCell>
                  <TableCell>
                    {r.due_at_date} {r.due_at_time}
                  </TableCell>
                  <TableCell>{formatRecur(r.recur_interval_seconds)}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => cancelReminder.mutate(r.id)} disabled={cancelReminder.isPending}>
                      {t("reminders.cancel")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}
