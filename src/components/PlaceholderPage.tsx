"use client";

import { Body1, Caption1, Title2, makeStyles, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    maxWidth: "640px",
  },
});

/**
 * Every route that doesn't have real content yet (most of them, this
 * early) renders one of these instead of a 404 -- so the nav/shell is
 * fully clickable and demonstrates real routing today, with an honest
 * "not built yet" message rather than pretending the feature exists.
 */
export function PlaceholderPage({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <div className={useStyles().root}>
      <Title2>{title}</Title2>
      <Body1>{description}</Body1>
      <Caption1>Planned: {phase} — see ROADMAP.md.</Caption1>
    </div>
  );
}
