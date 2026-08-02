"use client";

import { useChatDetail } from "@/hooks/useAdminDirectory";
import { EmptyState, PageHeader, PlatformBadge, Section, StatTile, useCommonStyles } from "@/components/ui-kit";
import { t } from "@/lib/i18n";
import { Badge, Body1, Caption1, Card, Spinner } from "@fluentui/react-components";
import { useParams } from "next/navigation";

function formatTimestamp(seconds: number) {
  return new Date(seconds * 1000).toLocaleString();
}

export default function AdminChatDetailPage() {
  const s = useCommonStyles();
  const params = useParams<{ id: string }>();
  const { data: chat, isPending, isError } = useChatDetail(Number(params.id));

  if (isPending) return <Spinner label={t("adminChatDetail.loading")} />;
  if (isError || !chat) return <Section title={t("adminChats.title")}>{t("adminChatDetail.loadFailed")}</Section>;

  return (
    <div className={s.page}>
      <PageHeader
        title={chat.title ?? chat.native_chat_id}
        description={`${chat.native_chat_id} · ${chat.chat_type ?? t("adminChatDetail.unknownType")}`}
        actions={<PlatformBadge platform={chat.platform} />}
      />

      <div className={s.tiles}>
        <StatTile label={t("adminChatDetail.statMembers")} value={chat.member_count} />
        <StatTile label={t("adminChatDetail.statMessages")} value={chat.message_count} />
        <Card className={s.tile} style={{ justifyContent: "center" }}>
          <Badge appearance="tint" color={chat.digest_enabled ? "success" : "informative"} shape="square">
            {chat.digest_enabled ? t("adminChatDetail.digestOn") : t("adminChatDetail.digestOff")}
          </Badge>
        </Card>
      </div>

      {chat.magic_word && (
        <Section title={t("adminChatDetail.magicWord")}>
          <Body1>{chat.magic_word}</Body1>
        </Section>
      )}

      <Section title={t("adminChatDetail.recentMessages")}>
        {chat.recent_messages.length === 0 && <EmptyState text={t("adminChatDetail.noMessages")} />}
        <div>
          {chat.recent_messages.map((m, i) => (
            <div key={i} className={s.listRow}>
              <Body1>
                <strong>{m.sender_display_name}</strong>: {m.text ?? <em>{t("adminChatDetail.noText")}</em>}
              </Body1>
              <Caption1 className={s.muted} style={{ whiteSpace: "nowrap" }}>
                {formatTimestamp(m.ts)}
              </Caption1>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
