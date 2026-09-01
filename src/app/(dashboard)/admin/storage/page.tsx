"use client";

import { useState } from "react";
import {
  Badge,
  Body1,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
  Switch,
  Text,
} from "@fluentui/react-components";
import { PageHeader, Section, StatTile, useCommonStyles } from "@/components/ui-kit";
import { useSession } from "@/hooks/useSession";
import {
  useCleanupMessages,
  useCleanupResample,
  useCleanupTmp,
  useSetStorageAutopilot,
  useStorageStatus,
} from "@/hooks/useStorageSense";
import { ApiError } from "@/lib/api";
import { t } from "@/lib/i18n";

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

const watermarkColor: Record<string, "success" | "warning" | "danger" | "informative"> = {
  normal: "success",
  low: "warning",
  high: "danger",
  flood: "danger",
};

const watermarkLabelKey = {
  normal: "adminStorage.watermark_normal",
  low: "adminStorage.watermark_low",
  high: "adminStorage.watermark_high",
  flood: "adminStorage.watermark_flood",
} as const;

function StatusSection() {
  const { data, isPending, isError } = useStorageStatus();
  const setAutopilot = useSetStorageAutopilot();

  if (isPending) return <Section title={t("adminStorage.status")}><Spinner label={t("adminStorage.loadingStatus")} /></Section>;
  if (isError || !data) return <Section title={t("adminStorage.status")}><Body1>{t("adminStorage.loadStatusFailed")}</Body1></Section>;

  return (
    <Section title={t("adminStorage.status")}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
        <StatTile value={`${data.used_pct.toFixed(1)}%`} label={t("adminStorage.usedPct")} />
        <StatTile value={formatBytes(data.available_bytes)} label={t("adminStorage.available")} />
        <StatTile value={formatBytes(data.total_bytes)} label={t("adminStorage.total")} />
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "12px", flexWrap: "wrap" }}>
        <Badge appearance="tint" color={watermarkColor[data.watermark]}>
          {t(watermarkLabelKey[data.watermark])}
        </Badge>
        {data.sleep_active && (
          <Badge appearance="filled" color="danger">
            {t("adminStorage.sleepActive")}
          </Badge>
        )}
      </div>

      <Switch
        checked={data.autopilot_enabled}
        onChange={(_, d) => setAutopilot.mutate(d.checked)}
        label={t("adminStorage.autopilot")}
        style={{ marginTop: "12px" }}
      />
      <Text as="p" block style={{ color: "var(--colorNeutralForeground3)" }}>
        {t("adminStorage.autopilotHint")}
      </Text>
    </Section>
  );
}

function SweepTmpCard() {
  const cleanupTmp = useCleanupTmp();
  const [result, setResult] = useState<string | null>(null);

  return (
    <div>
      <Text weight="semibold" block>
        {t("adminStorage.sweepTmp")}
      </Text>
      <Text as="p" block style={{ color: "var(--colorNeutralForeground3)" }}>
        {t("adminStorage.sweepTmpHint")}
      </Text>
      <Button
        onClick={() =>
          cleanupTmp.mutate(undefined, {
            onSuccess: (d) => setResult(t("adminStorage.sweepTmpResult", { files: d.files_deleted, bytes: formatBytes(d.bytes_freed) })),
          })
        }
        disabled={cleanupTmp.isPending}
      >
        {t("adminStorage.sweepTmpButton")}
      </Button>
      {cleanupTmp.isError && (
        <MessageBar intent="error">
          <MessageBarBody>{errorMessage(cleanupTmp.error, t("adminStorage.actionFailed"))}</MessageBarBody>
        </MessageBar>
      )}
      {result && <Text as="p">{result}</Text>}
    </div>
  );
}

function PruneMessagesCard() {
  const s = useCommonStyles();
  const cleanup = useCleanupMessages();
  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState("");
  const [keepLast, setKeepLast] = useState("");
  const [before, setBefore] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const submit = () => {
    cleanup.mutate(
      {
        chat_id: chatId.trim() ? Number(chatId) : undefined,
        keep_last: keepLast.trim() ? Number(keepLast) : undefined,
        before: before.trim() || undefined,
      },
      {
        onSuccess: (d) => {
          setResult(
            d.rows_deleted !== undefined
              ? t("adminStorage.pruneResult", { rows: d.rows_deleted, chats: d.chats_affected ?? 0 })
              : t("adminStorage.pruneKeepResult"),
          );
          setOpen(false);
        },
      },
    );
  };

  return (
    <div>
      <Text weight="semibold" block>
        {t("adminStorage.pruneMessages")}
      </Text>
      <Text as="p" block style={{ color: "var(--colorNeutralForeground3)" }}>
        {t("adminStorage.pruneMessagesHint")}
      </Text>
      <Dialog open={open} onOpenChange={(_, d) => setOpen(d.open)}>
        <DialogTrigger disableButtonEnhancement>
          <Button appearance="secondary">{t("adminStorage.pruneMessagesButton")}</Button>
        </DialogTrigger>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{t("adminStorage.pruneMessages")}</DialogTitle>
            <DialogContent>
              <div className={s.formGrid}>
                <Field label={t("adminStorage.chatIdOptional")} hint={t("adminStorage.chatIdHint")}>
                  <Input value={chatId} onChange={(_, d) => setChatId(d.value)} placeholder={t("adminStorage.allChats")} />
                </Field>
                <Field label={t("adminStorage.keepLast")} hint={t("adminStorage.keepLastHint")}>
                  <Input value={keepLast} onChange={(_, d) => setKeepLast(d.value)} type="number" min={1} />
                </Field>
                <Field label={t("adminStorage.before")} hint={t("adminStorage.beforeHint")}>
                  <Input value={before} onChange={(_, d) => setBefore(d.value)} placeholder="2026-01-01" />
                </Field>
              </div>
              {cleanup.isError && (
                <MessageBar intent="error">
                  <MessageBarBody>{errorMessage(cleanup.error, t("adminStorage.actionFailed"))}</MessageBarBody>
                </MessageBar>
              )}
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">{t("adminStorage.dialogCancel")}</Button>
              </DialogTrigger>
              <Button appearance="primary" disabled={cleanup.isPending} onClick={submit}>
                {t("adminStorage.dialogPrune")}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
      {result && <Text as="p">{result}</Text>}
    </div>
  );
}

function ResampleCard() {
  const resample = useCleanupResample();
  const [chatId, setChatId] = useState("");
  const [result, setResult] = useState<string | null>(null);

  return (
    <div>
      <Text weight="semibold" block>
        {t("adminStorage.resample")}
      </Text>
      <Text as="p" block style={{ color: "var(--colorNeutralForeground3)" }}>
        {t("adminStorage.resampleHint")}
      </Text>
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
        <Field label={t("adminStorage.chatIdOptional")}>
          <Input value={chatId} onChange={(_, d) => setChatId(d.value)} placeholder={t("adminStorage.allChats")} style={{ width: 160 }} />
        </Field>
        <Button
          onClick={() =>
            resample.mutate(chatId.trim() ? Number(chatId) : undefined, {
              onSuccess: (d) => setResult(t("adminStorage.resampleResult", { messages: d.messages_compacted, chats: d.chats_affected })),
            })
          }
          disabled={resample.isPending}
        >
          {t("adminStorage.resampleButton")}
        </Button>
      </div>
      {resample.isError && (
        <MessageBar intent="error">
          <MessageBarBody>{errorMessage(resample.error, t("adminStorage.actionFailed"))}</MessageBarBody>
        </MessageBar>
      )}
      {result && <Text as="p">{result}</Text>}
    </div>
  );
}

export default function AdminStoragePage() {
  const s = useCommonStyles();
  const { data: session } = useSession();

  if (session?.authenticated && !session.roles.owner) {
    return (
      <div className={s.page}>
        <PageHeader title={t("adminStorage.title")} description={t("adminStorage.ownerOnlyDescription")} />
        <MessageBar intent="warning">
          <MessageBarBody>{t("adminStorage.ownerOnlyWarning")}</MessageBarBody>
        </MessageBar>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <PageHeader title={t("adminStorage.title")} description={t("adminStorage.description")} />

      <StatusSection />

      <Section title={t("adminStorage.manualCleanup")}>
        <MessageBar intent="warning">
          <MessageBarBody>{t("adminStorage.manualCleanupWarning")}</MessageBarBody>
        </MessageBar>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "12px" }}>
          <SweepTmpCard />
          <PruneMessagesCard />
          <ResampleCard />
        </div>
      </Section>
    </div>
  );
}
