"use client";

import { useState } from "react";
import {
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
import { ApiError } from "@/lib/api";
import { useAlerts, useCancelAlert, useCreateAlert, type AlertCondition, type AlertKind } from "@/hooks/useAlerts";

function unitFor(kind: AlertKind) {
  return kind === "crypto" ? "usd" : kind === "weather" ? "°C" : "AQI";
}

function NewAlertForm() {
  const s = useCommonStyles();
  const { data: chats } = useMyChats();
  const createAlert = useCreateAlert();

  const [chatId, setChatId] = useState<number | undefined>(undefined);
  const [kind, setKind] = useState<AlertKind>("crypto");
  const [subject, setSubject] = useState("");
  const [condition, setCondition] = useState<AlertCondition>("above");
  const [threshold, setThreshold] = useState("");

  const chatOptions = chats?.items ?? [];
  const canSubmit = Boolean(chatId) && subject.trim().length > 0 && threshold.trim().length > 0 && Number.isFinite(Number(threshold));

  const submit = () => {
    if (!chatId) return;
    createAlert.mutate(
      { chat_id: chatId, kind, subject: subject.trim(), condition, threshold: Number(threshold) },
      { onSuccess: () => setSubject("") },
    );
  };

  return (
    <Section title="New alert">
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

        <Field label="Kind">
          <Dropdown value={kind} selectedOptions={[kind]} onOptionSelect={(_, d) => d.optionValue && setKind(d.optionValue as AlertKind)}>
            <Option value="crypto">Crypto</Option>
            <Option value="weather">Weather</Option>
            <Option value="aqi">Air quality</Option>
          </Dropdown>
        </Field>

        <Field label={kind === "crypto" ? "Coin (e.g. bitcoin)" : "City"}>
          <Input value={subject} onChange={(_, d) => setSubject(d.value)} />
        </Field>

        <Field label="Condition">
          <div className={s.row}>
            <Button appearance={condition === "above" ? "primary" : "secondary"} onClick={() => setCondition("above")}>
              Above
            </Button>
            <Button appearance={condition === "below" ? "primary" : "secondary"} onClick={() => setCondition("below")}>
              Below
            </Button>
          </div>
        </Field>

        <Field label={`Threshold (${unitFor(kind)})`}>
          <Input type="number" value={threshold} onChange={(_, d) => setThreshold(d.value)} />
        </Field>
      </div>

      {createAlert.isError && (
        <MessageBar intent="error">
          <MessageBarBody>{createAlert.error instanceof ApiError ? createAlert.error.message : "Couldn't create that alert."}</MessageBarBody>
        </MessageBar>
      )}

      <Button appearance="primary" disabled={!canSubmit || createAlert.isPending} onClick={submit} style={{ alignSelf: "flex-start" }}>
        Create alert
      </Button>
    </Section>
  );
}

export default function AlertsPage() {
  const s = useCommonStyles();
  const { data, isPending, isError } = useAlerts();
  const cancelAlert = useCancelAlert();

  return (
    <div className={s.page}>
      <PageHeader
        title="Alerts"
        description="Standing crypto/weather/AQI alerts you've set, across every chat you're a member of -- mirrors /alert."
      />

      <NewAlertForm />

      <Section title="Active">
        {isPending && <Spinner label="Loading alerts..." />}
        {isError && <Body1>Failed to load alerts.</Body1>}
        {data && data.items.length === 0 && <EmptyState text="No active alerts." />}
        {data && data.items.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Chat</TableHeaderCell>
                <TableHeaderCell>Kind</TableHeaderCell>
                <TableHeaderCell>Subject</TableHeaderCell>
                <TableHeaderCell>Condition</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((al) => (
                <TableRow key={al.id}>
                  <TableCell>
                    <TableCellLayout>
                      <Text weight="semibold">{al.chat_title ?? `Chat #${al.chat_id}`}</Text>
                    </TableCellLayout>
                  </TableCell>
                  <TableCell>{al.kind}</TableCell>
                  <TableCell>{al.subject}</TableCell>
                  <TableCell>
                    {al.condition} {al.threshold} {unitFor(al.kind)}
                  </TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => cancelAlert.mutate(al.id)} disabled={cancelAlert.isPending}>
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
