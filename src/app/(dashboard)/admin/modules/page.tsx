"use client";

import { RecentChanges } from "@/components/RecentChanges";
import { ModuleInfo, useModules, useSetModule } from "@/hooks/useAdminModules";
import { PageHeader, Section, useCommonStyles } from "@/components/ui-kit";
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
      <PageHeader
        title="Modules"
        description="Flipping a switch takes effect immediately -- disabling a module blocks creating/changing things through it (commands, /menu, and its natural-language equivalent where one exists), existing data stays visible."
      />

      {isPending && <Spinner label="Loading modules..." />}
      {isError && <Section title="Modules">Failed to load modules.</Section>}

      {data && (
        <>
          <Section title="Commands">
            <div>
              {standalone.map((m) => (
                <ModuleRow key={m.key} module={m} />
              ))}
            </div>
          </Section>

          <Section title="LLM tools">
            <Body1 className={s.muted}>
              Natural-language capabilities the model can use when answering -- filtered from the tool list per turn,
              but toggle the same way as commands.
            </Body1>
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
