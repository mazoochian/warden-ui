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
import { EmptyState, PageHeader, Section, useCommonStyles } from "@/components/ui-kit";
import { useMyChats } from "@/hooks/useMyChats";
import { ApiError } from "@/lib/api";
import { useCancelReminder, useCreateReminder, useReminders, type CreateReminderWhen } from "@/hooks/useReminders";

type DurationUnit = "minutes" | "hours" | "days";
const unitSeconds: Record<DurationUnit, number> = { minutes: 60, hours: 3600, days: 86400 };

function formatRecur(seconds: number | null) {
  if (!seconds) return "—";
  if (seconds % 86400 === 0) return `every ${seconds / 86400}d`;
  if (seconds % 3600 === 0) return `every ${seconds / 3600}h`;
  return `every ${Math.round(seconds / 60)}m`;
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
    <Section title="New reminder">
      <div className={s.formGrid}>
        <Field label="Chat">
          <Dropdown
            placeholder="Select a chat"
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

        <Field label="When">
          <div className={s.row}>
            <Button appearance={mode === "duration" ? "primary" : "secondary"} onClick={() => setMode("duration")}>
              From now
            </Button>
            <Button appearance={mode === "absolute" ? "primary" : "secondary"} onClick={() => setMode("absolute")}>
              Specific date/time
            </Button>
          </div>
        </Field>
      </div>

      {mode === "duration" ? (
        <div className={s.row}>
          <Input type="number" min={1} value={amount} onChange={(_, d) => setAmount(d.value)} style={{ width: 100 }} />
          <Dropdown value={unit} selectedOptions={[unit]} onOptionSelect={(_, d) => d.optionValue && setUnit(d.optionValue as DurationUnit)}>
            <Option value="minutes">minutes</Option>
            <Option value="hours">hours</Option>
            <Option value="days">days</Option>
          </Dropdown>
          <Caption1 className={s.muted}>from now</Caption1>
        </div>
      ) : (
        <div className={s.row}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <Caption1 className={s.muted}>your local time (see Personal Settings for timezone/format)</Caption1>
        </div>
      )}

      <Field label="Message">
        <Textarea value={message} onChange={(_, d) => setMessage(d.value)} rows={2} />
      </Field>

      <Switch checked={repeats} onChange={(_, d) => setRepeats(d.checked)} label="Repeats" />
      {repeats && (
        <div className={s.row}>
          <Input type="number" min={1} value={repeatAmount} onChange={(_, d) => setRepeatAmount(d.value)} style={{ width: 100 }} />
          <Dropdown value={repeatUnit} selectedOptions={[repeatUnit]} onOptionSelect={(_, d) => d.optionValue && setRepeatUnit(d.optionValue as DurationUnit)}>
            <Option value="minutes">minutes</Option>
            <Option value="hours">hours</Option>
            <Option value="days">days</Option>
          </Dropdown>
        </div>
      )}

      {createReminder.isError && (
        <MessageBar intent="error">
          <MessageBarBody>{createReminder.error instanceof ApiError ? createReminder.error.message : "Couldn't create that reminder."}</MessageBarBody>
        </MessageBar>
      )}

      <Button appearance="primary" disabled={!canSubmit || createReminder.isPending} onClick={submit} style={{ alignSelf: "flex-start" }}>
        Create reminder
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
      <PageHeader
        title="Reminders"
        description="Reminders you've set, across every chat you're a member of. Cancel your own -- the bot owner can cancel anyone's."
      />

      <NewReminderForm />

      <Section title="Pending">
        {isPending && <Spinner label="Loading reminders..." />}
        {isError && <Body1>Failed to load reminders.</Body1>}
        {data && data.items.length === 0 && <EmptyState text="No pending reminders." />}
        {data && data.items.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Chat</TableHeaderCell>
                <TableHeaderCell>Message</TableHeaderCell>
                <TableHeaderCell>Due</TableHeaderCell>
                <TableHeaderCell>Repeats</TableHeaderCell>
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
                      Cancel
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
