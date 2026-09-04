"use client";

import { useState } from "react";
import {
  Body1,
  Button,
  Caption1,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
  Switch,
  Text,
  Textarea,
} from "@fluentui/react-components";
import { EmptyState, PageHeader, Section, useCommonStyles } from "@/components/ui-kit";
import { ApiError } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useAddFeedSource, useFeed, useRemoveFeedSource, useRunFeed, useSetFeed } from "@/hooks/useFeed";

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

function SourcesSection({ sources }: { sources: { native_chat_id: string; title: string; enabled: boolean }[] }) {
  const s = useCommonStyles();
  const addSource = useAddFeedSource();
  const removeSource = useRemoveFeedSource();
  const [query, setQuery] = useState("");

  return (
    <Section title={t("feed.sources")}>
      <Body1 style={{ color: "var(--colorNeutralForeground3)" }}>{t("feed.newSourceNote")}</Body1>

      {sources.length === 0 && <EmptyState text={t("feed.noSources")} />}
      {sources.map((src) => (
        <div key={src.native_chat_id} className={s.listRow}>
          <div>
            <Text weight="semibold">{src.title}</Text>{" "}
            <Caption1 className={s.muted}>
              {src.native_chat_id}
              {!src.enabled && ` — ${t("feed.paused")}`}
            </Caption1>
          </div>
          <Button
            size="small"
            onClick={() => removeSource.mutate(src.native_chat_id)}
            disabled={removeSource.isPending}
          >
            {t("feed.remove")}
          </Button>
        </div>
      ))}

      <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", marginTop: "12px" }}>
        <Field label={t("feed.add")} style={{ flex: 1 }}>
          <Input
            value={query}
            placeholder={t("feed.addPlaceholder")}
            onChange={(_, d) => setQuery(d.value)}
          />
        </Field>
        <Button
          appearance="primary"
          disabled={query.trim() === "" || addSource.isPending}
          // Cleared only on success, so a failed add (an ambiguous name,
          // say) leaves the text in place to edit rather than making the
          // user retype it.
          onClick={() => addSource.mutate(query.trim(), { onSuccess: () => setQuery("") })}
        >
          {t("feed.add")}
        </Button>
      </div>
      {addSource.isError && (
        <MessageBar intent="error">
          <MessageBarBody>{errorMessage(addSource.error, t("feed.addFailed"))}</MessageBarBody>
        </MessageBar>
      )}
      {removeSource.isError && (
        <MessageBar intent="error">
          <MessageBarBody>{errorMessage(removeSource.error, t("feed.removeFailed"))}</MessageBarBody>
        </MessageBar>
      )}
    </Section>
  );
}

export default function FeedPage() {
  const s = useCommonStyles();
  const { data, isPending, isError } = useFeed();
  const setFeed = useSetFeed();
  const runFeed = useRunFeed();

  // Same "null means untouched, show the server value" pattern the
  // per-chat ghostwriter prompt uses, so a fetch landing (or a save
  // completing) is picked up without an effect that writes state.
  const [targetEdit, setTargetEdit] = useState<string | null>(null);
  const [policyEdit, setPolicyEdit] = useState<string | null>(null);
  const [intervalEdit, setIntervalEdit] = useState<string | null>(null);

  if (isPending) return <Spinner label={t("feed.title")} />;
  if (isError || !data) {
    return (
      <>
        <PageHeader title={t("feed.title")} description={t("feed.description")} />
        <Section title={t("feed.title")}>{t("feed.loadFailed")}</Section>
      </>
    );
  }

  const serverTarget = data.target_native_chat_id ?? "";
  const serverPolicy = data.policy ?? "";
  const serverInterval = String(data.interval_seconds);
  const target = targetEdit ?? serverTarget;
  const policy = policyEdit ?? serverPolicy;
  const interval = intervalEdit ?? serverInterval;
  const dirty = target !== serverTarget || policy !== serverPolicy || interval !== serverInterval;

  const intervalNumber = Number(interval);
  const intervalValid = Number.isFinite(intervalNumber) && intervalNumber >= 300;

  return (
    <>
      <PageHeader title={t("feed.title")} description={t("feed.description")} />

      <Section title={t("feed.settings")}>
        <Switch
          checked={data.enabled}
          label={t("feed.enabled")}
          onChange={(_, d) => setFeed.mutate({ enabled: d.checked })}
        />
        <Caption1 className={s.muted}>{t("feed.enabledHint")}</Caption1>

        {/* Enabled but missing a destination or a policy does nothing at
            all, which would otherwise look identical to "on and quiet". */}
        {data.enabled && !data.runnable && (
          <MessageBar intent="warning">
            <MessageBarBody>{t("feed.notRunnable")}</MessageBarBody>
          </MessageBar>
        )}

        <Field label={t("feed.target")} hint={t("feed.targetHint")}>
          <Input value={target} onChange={(_, d) => setTargetEdit(d.value)} />
        </Field>

        <Field label={t("feed.policy")} hint={t("feed.policyHint")}>
          <Textarea
            value={policy}
            rows={3}
            placeholder={t("feed.policyPlaceholder")}
            onChange={(_, d) => setPolicyEdit(d.value)}
          />
        </Field>

        <Field
          label={t("feed.interval")}
          hint={t("feed.intervalHint")}
          validationState={intervalValid ? "none" : "error"}
        >
          <Input type="number" value={interval} onChange={(_, d) => setIntervalEdit(d.value)} />
        </Field>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Button
            appearance="primary"
            disabled={!dirty || !intervalValid || setFeed.isPending}
            onClick={() =>
              setFeed.mutate(
                {
                  target_native_chat_id: target,
                  policy,
                  interval_seconds: intervalNumber,
                },
                // Hand control back to the server values once saved.
                {
                  onSuccess: () => {
                    setTargetEdit(null);
                    setPolicyEdit(null);
                    setIntervalEdit(null);
                  },
                },
              )
            }
          >
            {t("feed.save")}
          </Button>
          <Caption1 className={s.muted}>
            {data.last_run_at === 0
              ? t("feed.neverRun")
              : t("feed.lastRun", { when: new Date(data.last_run_at * 1000).toLocaleString() })}
          </Caption1>
        </div>
        {setFeed.isError && (
          <MessageBar intent="error">
            <MessageBarBody>{errorMessage(setFeed.error, t("feed.saveFailed"))}</MessageBarBody>
          </MessageBar>
        )}
      </Section>

      <SourcesSection sources={data.sources} />

      <Section title={t("feed.runNow")}>
        <Button onClick={() => runFeed.mutate()} disabled={!data.runnable || runFeed.isPending}>
          {t("feed.runNow")}
        </Button>
        {runFeed.isSuccess && (
          <MessageBar intent="success">
            <MessageBarBody>
              {runFeed.data.posted === 0
                ? t("feed.ranNothing")
                : t("feed.ranPosted", { count: runFeed.data.posted })}
            </MessageBarBody>
          </MessageBar>
        )}
        {runFeed.isError && (
          <MessageBar intent="error">
            <MessageBarBody>{errorMessage(runFeed.error, t("feed.runFailed"))}</MessageBarBody>
          </MessageBar>
        )}
      </Section>
    </>
  );
}
