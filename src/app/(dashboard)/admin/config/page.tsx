"use client";

import { RecentChanges } from "@/components/RecentChanges";
import { ConfigEntry, useAdminConfig, useSetConfigValue } from "@/hooks/useAdminConfig";
import { PageHeader, Section, useCommonStyles } from "@/components/ui-kit";
import { Badge, Body1, Button, Input, Spinner, Text, tokens } from "@fluentui/react-components";
import { useState } from "react";

function DynamicRow({ entry }: { entry: ConfigEntry }) {
  const s = useCommonStyles();
  const setValue = useSetConfigValue();
  const [draft, setDraft] = useState(entry.value);

  const dirty = draft !== entry.value;

  return (
    <div className={s.listRow}>
      <div style={{ flex: 1 }}>
        <Text weight="semibold">{entry.label}</Text>
        {entry.is_override && (
          <Badge appearance="tint" color="brand" shape="square" style={{ marginLeft: tokens.spacingHorizontalXS }}>
            overridden
          </Badge>
        )}
      </div>
      <div className={s.row}>
        <Input aria-label={entry.label} value={draft} onChange={(_, data) => setDraft(data.value)} size="small" />
        <Button
          size="small"
          appearance={dirty ? "primary" : "secondary"}
          disabled={!dirty || setValue.isPending}
          onClick={() => setValue.mutate({ key: entry.key, value: draft })}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function SecretRow({ entry }: { entry: ConfigEntry }) {
  const s = useCommonStyles();
  return (
    <div className={s.listRow}>
      <Text weight="semibold">{entry.label}</Text>
      <Body1>
        <code>{entry.value}</code>
      </Body1>
    </div>
  );
}

export default function AdminConfigPage() {
  const s = useCommonStyles();
  const { data, isPending, isError } = useAdminConfig();

  const dynamicEntries = data?.items.filter((e) => e.category === "dynamic") ?? [];
  const secretEntries = data?.items.filter((e) => e.category === "secret") ?? [];

  return (
    <div className={s.page}>
      <PageHeader
        title="Config"
        description="Live-editable settings, plus confirmation of which secrets are set (never shown in full)."
      />

      {isPending && <Spinner label="Loading config..." />}
      {isError && <Section title="Config">Failed to load config.</Section>}

      {data && (
        <>
          <Section title="Live settings">
            <div>
              {dynamicEntries.map((e) => (
                <DynamicRow key={e.key} entry={e} />
              ))}
            </div>
          </Section>

          <Section title="Secrets">
            <Body1 className={s.muted}>Masked, read-only -- change these in the deployment&apos;s .env and restart.</Body1>
            <div>
              {secretEntries.map((e) => (
                <SecretRow key={e.key} entry={e} />
              ))}
            </div>
          </Section>
        </>
      )}

      <RecentChanges actions={["config.set"]} />
    </div>
  );
}
