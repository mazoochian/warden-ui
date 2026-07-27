"use client";

import { useOverviewStats } from "@/hooks/useAdminDirectory";
import { useSession, isAdmin } from "@/hooks/useSession";
import { Body1, Card, CardHeader, Spinner, Title2, Title3, makeStyles, tokens } from "@fluentui/react-components";

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

function formatNumber(n: number) {
  return n.toLocaleString();
}

export default function DashboardPage() {
  const styles = useStyles();
  const { data: session } = useSession();
  const admin = isAdmin(session);
  const { data: stats, isPending, isError } = useOverviewStats();

  if (!admin) {
    return (
      <div className={styles.root}>
        <Title2>Dashboard</Title2>
        <Body1>Bot-wide stats are visible to owners and bot admins. Check My Groups for chats you administer.</Body1>
      </div>
    );
  }

  const tiles = stats
    ? [
        { label: "Total messages", value: formatNumber(stats.total_messages) },
        { label: "Chats", value: formatNumber(stats.total_chats) },
        { label: "Users", value: formatNumber(stats.total_identities) },
        { label: "Messages (24h)", value: formatNumber(stats.messages_last_24h) },
        { label: "Messages (7d)", value: formatNumber(stats.messages_last_7d) },
        { label: "Active chats (7d)", value: formatNumber(stats.active_chats_last_7d) },
      ]
    : [];

  return (
    <div className={styles.root}>
      <Title2>Dashboard</Title2>
      {isPending && <Spinner label="Loading stats..." />}
      {isError && <Body1>Failed to load stats.</Body1>}
      {stats && (
        <div className={styles.tiles}>
          {tiles.map((tile) => (
            <Card key={tile.label}>
              <CardHeader header={<Title3>{tile.value}</Title3>} description={tile.label} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
