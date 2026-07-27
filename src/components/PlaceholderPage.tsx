"use client";

import { Body1, Caption1 } from "@fluentui/react-components";
import { PageHeader, Section, useCommonStyles } from "@/components/ui-kit";

/**
 * Every route that doesn't have real content yet renders one of these
 * instead of a 404 -- so the nav/shell is fully clickable and
 * demonstrates real routing today, with an honest "not built yet"
 * message rather than pretending the feature exists.
 */
export function PlaceholderPage({ title, phase, description }: { title: string; phase: string; description: string }) {
  const s = useCommonStyles();
  return (
    <div className={s.page}>
      <PageHeader title={title} />
      <Section title="Not built yet">
        <Body1>{description}</Body1>
        <Caption1 className={s.muted}>Planned: {phase} — see ROADMAP.md.</Caption1>
      </Section>
    </div>
  );
}
