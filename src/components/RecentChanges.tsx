"use client";

import { useRecentChanges } from "@/hooks/useAdminConfig";
import { EmptyState, Section, useCommonStyles } from "@/components/ui-kit";
import { Caption1, Spinner, Text } from "@fluentui/react-components";

function formatTimestamp(seconds: number) {
  return new Date(seconds * 1000).toLocaleString();
}

/**
 * Lightweight "recently changed" list for the modules/config pages, per
 * ROADMAP.md Phase 3 -- full filterable audit log browsing is Phase 7,
 * this is deliberately just the last few module.set/config.set entries.
 */
export function RecentChanges({ actions }: { actions: string[] }) {
  const s = useCommonStyles();
  const { data, isPending } = useRecentChanges(actions);

  return (
    <Section title="Recently changed">
      {isPending && <Spinner size="tiny" />}
      {data?.length === 0 && <EmptyState text="No changes yet." />}
      <div>
        {data?.map((entry) => (
          <div key={entry.id} className={s.listRow}>
            <Text>
              {entry.action} {entry.target && <code>{entry.target}</code>}
            </Text>
            <Caption1 className={s.muted}>{formatTimestamp(entry.at)}</Caption1>
          </div>
        ))}
      </div>
    </Section>
  );
}
