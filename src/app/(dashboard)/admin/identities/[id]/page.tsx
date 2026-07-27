"use client";

import { useIdentityDetail } from "@/hooks/useAdminDirectory";
import { Badge, Body1, Card, Caption1, Spinner, Title2, Title3, makeStyles, tokens } from "@fluentui/react-components";
import { useParams } from "next/navigation";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    maxWidth: "640px",
  },
  badges: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
  },
  tiles: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: tokens.spacingHorizontalM,
  },
});

function formatLastSeen(seconds: number | null) {
  return seconds ? new Date(seconds * 1000).toLocaleString() : "never";
}

export default function AdminIdentityDetailPage() {
  const styles = useStyles();
  const params = useParams<{ id: string }>();
  const { data: identity, isPending, isError } = useIdentityDetail(Number(params.id));

  if (isPending) return <Spinner label="Loading user..." />;
  if (isError || !identity) return <Body1>Failed to load user.</Body1>;

  return (
    <div className={styles.root}>
      <Title2>
        {identity.display_name}
        {identity.username && <span> (@{identity.username})</span>}
      </Title2>
      <Caption1>
        {identity.platform} &middot; id {identity.native_id}
      </Caption1>

      <div className={styles.badges}>
        {identity.is_bot_admin && (
          <Badge appearance="filled" color="brand">
            Bot admin
          </Badge>
        )}
        {identity.is_allowed && <Badge appearance="tint">Allowed</Badge>}
      </div>

      <div className={styles.tiles}>
        <Card>
          <Title3>{identity.credits}</Title3>
          <Caption1>LLM credits</Caption1>
        </Card>
      </div>

      <Body1>Last seen: {formatLastSeen(identity.last_seen)}</Body1>
    </div>
  );
}
