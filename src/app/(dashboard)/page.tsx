"use client";

import { Body1, Card, CardHeader, Title2, Title3, makeStyles, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
  },
  tiles: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: tokens.spacingHorizontalM,
  },
});

const placeholderTiles = [
  { label: "Total messages", value: "—" },
  { label: "Groups", value: "—" },
  { label: "Users", value: "—" },
  { label: "Messages (24h)", value: "—" },
];

export default function DashboardPage() {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <Title2>Dashboard</Title2>
      <Body1>
        Real stats land in Phase 2 (see ROADMAP.md) — these tiles are wired up visually now so Phase 2 only has to
        swap in real data, not build the layout too.
      </Body1>
      <div className={styles.tiles}>
        {placeholderTiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader header={<Title3>{tile.value}</Title3>} description={tile.label} />
          </Card>
        ))}
      </div>
    </div>
  );
}
