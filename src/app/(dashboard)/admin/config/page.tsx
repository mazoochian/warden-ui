"use client";

import { RecentChanges } from "@/components/RecentChanges";
import { ConfigEntry, useAdminConfig, useSetConfigValue } from "@/hooks/useAdminConfig";
import { PageHeader, Section, useCommonStyles } from "@/components/ui-kit";
import { t } from "@/lib/i18n";
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
          <Badge appearance="tint" color="brand" shape="square" style={{ marginInlineStart: tokens.spacingHorizontalXS }}>
            {t("adminConfig.overridden")}
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
          {t("adminConfig.save")}
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
      <PageHeader title={t("adminConfig.title")} description={t("adminConfig.description")} />

      {isPending && <Spinner label={t("adminConfig.loading")} />}
      {isError && <Section title={t("adminConfig.title")}>{t("adminConfig.loadFailed")}</Section>}

      {data && (
        <>
          <Section title={t("adminConfig.liveSettings")}>
            <div>
              {dynamicEntries.map((e) => (
                <DynamicRow key={e.key} entry={e} />
              ))}
            </div>
          </Section>

          <Section title={t("adminConfig.secrets")}>
            <Body1 className={s.muted}>{t("adminConfig.secretsHint")}</Body1>
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
