"use client";

import { useRecentChanges } from "@/hooks/useAdminConfig";
import { Body1, Caption1, Spinner, Title3, makeStyles, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalXS} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

function formatTimestamp(seconds: number) {
  return new Date(seconds * 1000).toLocaleString();
}

/**
 * Lightweight "recently changed" list for the modules/config pages, per
 * ROADMAP.md Phase 3 -- full filterable audit log browsing is Phase 7,
 * this is deliberately just the last few module.set/config.set entries.
 */
export function RecentChanges({ actions }: { actions: string[] }) {
  const styles = useStyles();
  const { data, isPending } = useRecentChanges(actions);

  return (
    <div className={styles.root}>
      <Title3>Recently changed</Title3>
      {isPending && <Spinner size="tiny" />}
      {data?.length === 0 && <Body1>No changes yet.</Body1>}
      {data?.map((entry) => (
        <div key={entry.id} className={styles.row}>
          <Body1>
            {entry.action} {entry.target && <code>{entry.target}</code>}
          </Body1>
          <Caption1>{formatTimestamp(entry.at)}</Caption1>
        </div>
      ))}
    </div>
  );
}
