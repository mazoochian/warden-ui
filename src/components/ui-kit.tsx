"use client";

import { Badge, Body1, Button, Caption1, Card, Subtitle1, Title3, makeStyles, shorthands, tokens } from "@fluentui/react-components";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { media } from "@/lib/breakpoints";

/**
 * Shared layout primitives used across every real page -- ported from the
 * design reference at github.com/mazoochian/warden-control-hub
 * (2026-07-28, updated to its "Fluent 2 UI" pass 2026-08-02) rather than
 * each page inventing its own spacing/card conventions, which is what led
 * to the previous, less consistent look.
 *
 * The `media.narrow` blocks (Phase 10) are why every page got responsive
 * for free: because each page already composes `page`/`tiles`/`section`/
 * `formGrid`/`listRow` from here rather than rolling its own spacing, one
 * edit per primitive reflows all of them consistently.
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
    // 180px floors out to a single column on a phone (a 358px content box
    // minus the 12px gap leaves 173px each), turning six stats into six
    // full-width blocks you have to scroll past. 140px keeps them two-up.
    [media.narrow]: { gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px" },
  },
  // Fluent 2 card: 8px radius, hairline stroke, layer background, no heavy shadow.
  tile: {
    ...shorthands.padding("16px"),
    minWidth: 0,
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
    [media.narrow]: { fontSize: "24px", lineHeight: "28px" },
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
    minWidth: 0,
    [media.narrow]: { ...shorthands.padding("14px"), gap: "12px" },
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    // Several sections put a SearchBox/Button in `action`; without this
    // the title and a ~240px search field fight over a 320px phone row
    // and both get squashed rather than one dropping to its own line.
    flexWrap: "wrap",
  },
  row: { display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" },
  formGrid: {
    display: "grid",
    // 252px, not 240px: Fluent's own `Dropdown`/`Combobox` carry a hard
    // `min-width: 250px`, so a 240px floor lets the grid hand out tracks
    // narrower than the control that has to sit in them -- which showed up
    // as a 7px overflow on a phone in landscape, the width that happens to
    // divide into exactly three 244px columns.
    gridTemplateColumns: "repeat(auto-fit, minmax(252px, 1fr))",
    gap: "16px",
    // `minmax(252px, …)` is a *floor*, so on a container narrower than
    // that the track overflows instead of shrinking -- explicit single
    // column below the narrow breakpoint rather than relying on luck.
    [media.narrow]: { gridTemplateColumns: "1fr", gap: "12px" },
  },
  listRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    ...shorthands.padding("10px", "12px"),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
    minWidth: 0,
    // These are "label on the left, value/control on the right" rows. At
    // phone width the two halves have nothing left to give, so they stack
    // instead of each being crushed to a few characters.
    [media.narrow]: {
      flexDirection: "column",
      alignItems: "stretch",
      gap: "6px",
      ...shorthands.padding("10px", "4px"),
    },
  },
  /**
   * Wrapper that makes a Fluent `Table` horizontally scrollable -- see
   * `TableScroll` below for why this is the fix rather than trying to
   * make the columns themselves narrower.
   */
  tableScroll: {
    overflowX: "auto",
    // Griffel emits this as a real child selector; `> table` targets the
    // native <table> Fluent's `Table` renders (it only becomes a set of
    // divs under `noNativeElements`, which nothing here uses).
    "& > table": { minWidth: "var(--warden-table-min-width, 640px)" },
  },
  /** Same idea for any single non-wrapping strip (e.g. a `TabList`). */
  scrollX: { overflowX: "auto", maxWidth: "100%" },
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

/**
 * Horizontal-scroll wrapper for a Fluent `Table` (Phase 10).
 *
 * Fluent's `Table` is `width: 100%; table-layout: fixed`, which means it
 * *never* overflows -- it silently divides whatever width it's given by
 * the column count. On a 358px phone content box a six-column expense
 * table gets ~60px per column, and every cell degrades into a vertical
 * stack of one or two characters per line. That's why "the tables are
 * broken on mobile" doesn't show up as a horizontal scrollbar anywhere.
 *
 * So the fix isn't narrower columns, it's a *floor*: `minWidth` keeps the
 * table at a legible size and this wrapper scrolls it. Deliberately not
 * the popular alternative of collapsing each row into a stacked card at
 * phone width -- that would mean rewriting all thirteen tables and giving
 * up the real `<table>` semantics Phase 7's accessibility pass just
 * finished getting right.
 *
 * `label` names the scroll region and `tabIndex` makes it focusable,
 * because a scrollable area that can only be panned by touch/trackpad is
 * unreachable for keyboard-only users (WCAG 2.1.1). Pass the section
 * title the table already sits under -- no new string needed.
 */
export function TableScroll({ label, minWidth = 640, children }: { label: string; minWidth?: number; children: ReactNode }) {
  const s = useCommonStyles();
  return (
    <div
      className={s.tableScroll}
      role="region"
      aria-label={label}
      tabIndex={0}
      style={{ "--warden-table-min-width": `${minWidth}px` } as CSSProperties}
    >
      {children}
    </div>
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
