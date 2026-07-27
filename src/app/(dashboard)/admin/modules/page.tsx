"use client";

import { RecentChanges } from "@/components/RecentChanges";
import { ModuleInfo, useModules, useSetModule } from "@/hooks/useAdminModules";
import { Body1, Spinner, Switch, Title2, Title3, makeStyles, tokens } from "@fluentui/react-components";

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
    gap: tokens.spacingVerticalXS,
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${tokens.spacingVerticalXS} 0`,
  },
});

function ModuleRow({ module }: { module: ModuleInfo }) {
  const setModule = useSetModule();
  return (
    <div className={useStyles().row}>
      <Body1>{module.label}</Body1>
      <Switch
        checked={module.enabled}
        disabled={setModule.isPending}
        onChange={(_, data) => setModule.mutate({ key: module.key, enabled: data.checked })}
      />
    </div>
  );
}

export default function AdminModulesPage() {
  const styles = useStyles();
  const { data, isPending, isError } = useModules();

  const standalone = data?.items.filter((m) => m.category === "standalone") ?? [];
  const llmTools = data?.items.filter((m) => m.category === "llm_tool") ?? [];

  return (
    <div className={styles.root}>
      <Title2>Modules</Title2>
      <Body1>
        Bot-wide on/off switches. Disabling a module blocks creating/changing things through it (commands, `/menu`,
        and its natural-language equivalent where one exists) -- existing data stays visible.
      </Body1>

      {isPending && <Spinner label="Loading modules..." />}
      {isError && <Body1>Failed to load modules.</Body1>}

      {data && (
        <>
          <div className={styles.group}>
            <Title3>Commands</Title3>
            {standalone.map((m) => (
              <ModuleRow key={m.key} module={m} />
            ))}
          </div>

          <div className={styles.group}>
            <Title3>LLM tools</Title3>
            <Body1>
              Natural-language capabilities the model can use when answering -- behave differently under the hood
              (filtered from the tool list per turn) but toggle the same way.
            </Body1>
            {llmTools.map((m) => (
              <ModuleRow key={m.key} module={m} />
            ))}
          </div>
        </>
      )}

      <RecentChanges actions={["module.set"]} />
    </div>
  );
}
