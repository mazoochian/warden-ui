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
import { EmptyState, PageHeader, Section, ToggleButtonGroup, useCommonStyles } from "@/components/ui-kit";
import { useMyChats } from "@/hooks/useMyChats";
import { ApiError } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useAlerts, useCancelAlert, useCreateAlert, type AlertCondition, type AlertKind } from "@/hooks/useAlerts";

function unitFor(kind: AlertKind) {
  return kind === "crypto" ? "usd" : kind === "weather" ? "°C" : "AQI";
}

const conditionOptions: { value: AlertCondition; label: string }[] = [
  { value: "above", label: t("alerts.conditionAbove") },
  { value: "below", label: t("alerts.conditionBelow") },
];

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
    <Section title={t("alerts.newAlert")}>
      <div className={s.formGrid}>
        <Field label={t("alerts.chatLabel")}>
          <Dropdown
            placeholder={t("alerts.selectChat")}
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

        <Field label={t("alerts.kindLabel")}>
          <Dropdown value={kind} selectedOptions={[kind]} onOptionSelect={(_, d) => d.optionValue && setKind(d.optionValue as AlertKind)}>
            <Option value="crypto">{t("alerts.kindCrypto")}</Option>
            <Option value="weather">{t("alerts.kindWeather")}</Option>
            <Option value="aqi">{t("alerts.kindAqi")}</Option>
          </Dropdown>
        </Field>

        <Field label={kind === "crypto" ? t("alerts.subjectCrypto") : t("alerts.subjectOther")}>
          <Input value={subject} onChange={(_, d) => setSubject(d.value)} />
        </Field>

        <Field label={t("alerts.conditionLabel")}>
          <ToggleButtonGroup ariaLabel={t("alerts.conditionLabel")} value={condition} options={conditionOptions} onChange={setCondition} />
        </Field>

        <Field label={t("alerts.threshold", { unit: unitFor(kind) })}>
          <Input type="number" value={threshold} onChange={(_, d) => setThreshold(d.value)} />
        </Field>
      </div>

      {createAlert.isError && (
        <MessageBar intent="error">
          <MessageBarBody>{createAlert.error instanceof ApiError ? createAlert.error.message : t("alerts.createFailed")}</MessageBarBody>
        </MessageBar>
      )}

      <Button appearance="primary" disabled={!canSubmit || createAlert.isPending} onClick={submit} style={{ alignSelf: "flex-start" }}>
        {t("alerts.create")}
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
      <PageHeader title={t("alerts.title")} description={t("alerts.description")} />

      <NewAlertForm />

      <Section title={t("alerts.active")}>
        {isPending && <Spinner label={t("alerts.loading")} />}
        {isError && <Body1>{t("alerts.loadFailed")}</Body1>}
        {data && data.items.length === 0 && <EmptyState text={t("alerts.none")} />}
        {data && data.items.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>{t("alerts.columnChat")}</TableHeaderCell>
                <TableHeaderCell>{t("alerts.columnKind")}</TableHeaderCell>
                <TableHeaderCell>{t("alerts.columnSubject")}</TableHeaderCell>
                <TableHeaderCell>{t("alerts.columnCondition")}</TableHeaderCell>
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
                      {t("alerts.cancel")}
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
