"use client";

import { RecentChanges } from "@/components/RecentChanges";
import { ModuleInfo, useModules, useSetModule } from "@/hooks/useAdminModules";
import { PageHeader, Section, useCommonStyles } from "@/components/ui-kit";
import { t } from "@/lib/i18n";
import { Body1, Spinner, Switch, Text } from "@fluentui/react-components";

function ModuleRow({ module }: { module: ModuleInfo }) {
  const s = useCommonStyles();
  const setModule = useSetModule();
  return (
    <div className={s.listRow}>
      <div>
        <Text weight="semibold" block>
          {module.label}
        </Text>
      </div>
      <Switch
        aria-label={module.label}
        checked={module.enabled}
        disabled={setModule.isPending}
        onChange={(_, data) => setModule.mutate({ key: module.key, enabled: data.checked })}
      />
    </div>
  );
}

export default function AdminModulesPage() {
  const s = useCommonStyles();
  const { data, isPending, isError } = useModules();

  const standalone = data?.items.filter((m) => m.category === "standalone") ?? [];
  const llmTools = data?.items.filter((m) => m.category === "llm_tool") ?? [];

  return (
    <div className={s.page}>
      <PageHeader title={t("adminModules.title")} description={t("adminModules.description")} />

      {isPending && <Spinner label={t("adminModules.loading")} />}
      {isError && <Section title={t("adminModules.title")}>{t("adminModules.loadFailed")}</Section>}

      {data && (
        <>
          <Section title={t("adminModules.commands")}>
            <div>
              {standalone.map((m) => (
                <ModuleRow key={m.key} module={m} />
              ))}
            </div>
          </Section>

          <Section title={t("adminModules.llmTools")}>
            <Body1 className={s.muted}>{t("adminModules.llmToolsHint")}</Body1>
            <div>
              {llmTools.map((m) => (
                <ModuleRow key={m.key} module={m} />
              ))}
            </div>
          </Section>
        </>
      )}

      <RecentChanges actions={["module.set"]} />
    </div>
  );
}
