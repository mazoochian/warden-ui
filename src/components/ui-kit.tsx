"use client";

import { Body1, Caption1, Card, Subtitle1, Title3, makeStyles, tokens, shorthands, Badge } from "@fluentui/react-components";
import type { ReactNode } from "react";

/**
 * Shared layout primitives used across every real page -- ported from the
 * design reference at github.com/mazoochian/warden-control-hub
 * (2026-07-28, updated to its "Fluent 2 UI" pass 2026-08-02) rather than
 * each page inventing its own spacing/card conventions, which is what led
 * to the previous, less consistent look.
 */
export const useCommonStyles = makeStyles({
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    maxWidth: "1180px",
  },
  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
  },
  tiles: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "12px",
  },
  // Fluent 2 card: 8px radius, hairline stroke, layer background, no heavy shadow.
  tile: {
    ...shorthands.padding("16px"),
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    boxShadow: "none",
  },
  tileValue: {
    fontSize: "30px",
    lineHeight: "34px",
    fontWeight: 600,
    letterSpacing: "-0.5px",
  },
  section: {
    ...shorthands.padding("20px"),
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    boxShadow: "none",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  row: { display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
  },
  listRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    ...shorthands.padding("10px", "12px"),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
  },
  muted: { color: tokens.colorNeutralForeground3 },
  clickableRow: { cursor: "pointer" },
  accentBar: {
    ...shorthands.borderLeft("3px", "solid", tokens.colorBrandStroke1),
    paddingLeft: "10px",
  },
});

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  const s = useCommonStyles();
  return (
    <div className={s.headerRow}>
      <div>
        <Title3 as="h1" block>
          {title}
        </Title3>
        {description ? (
          <Body1 block className={s.muted} style={{ marginTop: 4 }}>
            {description}
          </Body1>
        ) : null}
      </div>
      {actions ? <div className={s.row}>{actions}</div> : null}
    </div>
  );
}

export function StatTile({ value, label, icon }: { value: string | number; label: string; icon?: ReactNode }) {
  const s = useCommonStyles();
  return (
    <Card className={s.tile}>
      <div className={s.row} style={{ gap: 8, color: tokens.colorBrandForeground1 }}>
        {icon}
        <Caption1 className={s.muted}>{label}</Caption1>
      </div>
      <span className={s.tileValue}>{typeof value === "number" ? value.toLocaleString() : value}</span>
    </Card>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const s = useCommonStyles();
  return (
    <Card className={s.section}>
      <div className={s.sectionHeader}>
        <Subtitle1>{title}</Subtitle1>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  const normalized = platform.toLowerCase();
  const color = normalized === "telegram" ? "brand" : normalized === "matrix" ? "success" : "warning";
  return (
    <Badge appearance="tint" color={color} shape="square">
      {platform}
    </Badge>
  );
}

export function EmptyState({ text }: { text: string }) {
  const s = useCommonStyles();
  return (
    <Body1 className={s.muted} style={{ padding: "12px 0" }}>
      {text}
    </Body1>
  );
}
