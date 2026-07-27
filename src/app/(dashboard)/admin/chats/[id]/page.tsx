"use client";

import { useChatDetail } from "@/hooks/useAdminDirectory";
import { Badge, Body1, Card, Caption1, Spinner, Title2, Title3, makeStyles, tokens } from "@fluentui/react-components";
import { useParams } from "next/navigation";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    maxWidth: "800px",
  },
  tiles: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: tokens.spacingHorizontalM,
  },
  message: {
    padding: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

function formatTimestamp(seconds: number) {
  return new Date(seconds * 1000).toLocaleString();
}

export default function AdminChatDetailPage() {
  const styles = useStyles();
  const params = useParams<{ id: string }>();
  const { data: chat, isPending, isError } = useChatDetail(Number(params.id));

  if (isPending) return <Spinner label="Loading chat..." />;
  if (isError || !chat) return <Body1>Failed to load chat.</Body1>;

  return (
    <div className={styles.root}>
      <Title2>{chat.title ?? chat.native_chat_id}</Title2>
      <Caption1>
        {chat.platform} &middot; {chat.native_chat_id} &middot; {chat.chat_type ?? "unknown type"}
      </Caption1>

      <div className={styles.tiles}>
        <Card>
          <Title3>{chat.member_count}</Title3>
          <Caption1>Members</Caption1>
        </Card>
        <Card>
          <Title3>{chat.message_count}</Title3>
          <Caption1>Messages</Caption1>
        </Card>
        <Card>
          {chat.digest_enabled ? (
            <Badge appearance="tint" color="brand">
              Digest on
            </Badge>
          ) : (
            <Badge appearance="tint">Digest off</Badge>
          )}
        </Card>
      </div>

      {chat.magic_word && <Body1>Magic word: {chat.magic_word}</Body1>}

      <Title3>Recent messages</Title3>
      {chat.recent_messages.length === 0 && <Body1>No messages yet.</Body1>}
      {chat.recent_messages.map((m, i) => (
        <div key={i} className={styles.message}>
          <Body1>
            <strong>{m.sender_display_name}</strong>: {m.text ?? <em>(no text)</em>}
          </Body1>
          <Caption1>{formatTimestamp(m.ts)}</Caption1>
        </div>
      ))}
    </div>
  );
}
