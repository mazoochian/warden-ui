"use client";

import { Badge, Body1, Button, Caption1, Card, Subtitle1, Title3, makeStyles, shorthands, tokens } from "@fluentui/react-components";
import type { KeyboardEvent, ReactNode } from "react";

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
    borderInlineStartWidth: "3px",
    borderInlineStartStyle: "solid",
    borderInlineStartColor: tokens.colorBrandStroke1,
    paddingInlineStart: "10px",
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

/**
 * Accessible "segmented button" toggle group -- several pages
 * (Reminders' when-mode, Alerts' condition, Group Administration's
 * redact mode, per-group Thinking display, Personal Settings' date/time
 * format) hand-rolled this same pattern as a plain row of `Button`s with
 * only an `appearance` swap for the selected one, which is a visual cue
 * only -- nothing told a screen reader which option was selected, or that
 * the buttons were a related set at all. Uses the "pressed toggle
 * button" ARIA pattern (`aria-pressed` per button inside a labeled
 * `role="group"`) rather than `radiogroup`/`radio`, since these stay
 * individually Tab-reachable (no roving-tabindex/arrow-key handling here)
 * -- `radiogroup` semantics would promise arrow-key navigation this
 * doesn't implement.
 */
export function ToggleButtonGroup<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const s = useCommonStyles();
  return (
    <div className={s.row} role="group" aria-label={ariaLabel}>
      {options.map((opt) => (
        <Button
          key={opt.value}
          appearance={value === opt.value ? "primary" : "secondary"}
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

/**
 * Props to spread onto a clickable `TableRow` (the "click a row to open
 * its detail page" pattern used by Admin Chats, Admin Users, and My
 * Groups) so it's actually keyboard-operable -- a bare `onClick` on a
 * `<tr>` (this code's previous state) has no keyboard equivalent at all,
 * and no affordance telling assistive tech the row does anything.
 * `role="button"` on the row does give up the row's native
 * `row`/`gridcell` semantics for its cells, a real tradeoff, but the
 * alternative -- mouse-only navigation -- is worse; the row's own visible
 * text is still read as the resulting button's accessible name.
 */
export function clickableRowProps(onActivate: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate();
      }
    },
  };
}

export function EmptyState({ text }: { text: string }) {
  const s = useCommonStyles();
  return (
    <Body1 className={s.muted} style={{ padding: "12px 0" }}>
      {text}
    </Body1>
  );
}
