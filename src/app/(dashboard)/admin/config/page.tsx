"use client";

import { RecentChanges } from "@/components/RecentChanges";
import { ConfigEntry, useAdminConfig, useSetConfigValue } from "@/hooks/useAdminConfig";
import {
  Badge,
  Body1,
  Button,
  Input,
  Spinner,
  Title2,
  Title3,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { useState } from "react";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
    maxWidth: "700px",
  },
  group: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
  },
  label: {
    flex: 1,
  },
});

function DynamicRow({ entry }: { entry: ConfigEntry }) {
  const styles = useStyles();
  const setValue = useSetConfigValue();
  const [draft, setDraft] = useState(entry.value);

  const dirty = draft !== entry.value;

  return (
    <div className={styles.row}>
      <div className={styles.label}>
        <Body1>{entry.label}</Body1>
        {entry.is_override && (
          <Badge appearance="tint" color="brand" style={{ marginLeft: tokens.spacingHorizontalXS }}>
            overridden
          </Badge>
        )}
      </div>
      <Input value={draft} onChange={(_, data) => setDraft(data.value)} size="small" />
      <Button
        size="small"
        appearance={dirty ? "primary" : "secondary"}
        disabled={!dirty || setValue.isPending}
        onClick={() => setValue.mutate({ key: entry.key, value: draft })}
      >
        Save
      </Button>
    </div>
  );
}

function SecretRow({ entry }: { entry: ConfigEntry }) {
  const styles = useStyles();
  return (
    <div className={styles.row}>
      <div className={styles.label}>
        <Body1>{entry.label}</Body1>
      </div>
      <Body1>
        <code>{entry.value}</code>
      </Body1>
    </div>
  );
}

export default function AdminConfigPage() {
  const styles = useStyles();
  const { data, isPending, isError } = useAdminConfig();

  const dynamicEntries = data?.items.filter((e) => e.category === "dynamic") ?? [];
  const secretEntries = data?.items.filter((e) => e.category === "secret") ?? [];

  return (
    <div className={styles.root}>
      <Title2>Config</Title2>
      <Body1>Live-editable settings, plus confirmation of which secrets are set (never shown in full).</Body1>

      {isPending && <Spinner label="Loading config..." />}
      {isError && <Body1>Failed to load config.</Body1>}

      {data && (
        <>
          <div className={styles.group}>
            <Title3>Live settings</Title3>
            {dynamicEntries.map((e) => (
              <DynamicRow key={e.key} entry={e} />
            ))}
          </div>

          <div className={styles.group}>
            <Title3>Secrets</Title3>
            <Body1>Masked, read-only -- change these in the deployment&apos;s .env and restart.</Body1>
            {secretEntries.map((e) => (
              <SecretRow key={e.key} entry={e} />
            ))}
          </div>
        </>
      )}

      <RecentChanges actions={["config.set"]} />
    </div>
  );
}
