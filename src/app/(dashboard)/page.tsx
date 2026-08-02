"use client";

import { useOverviewStats } from "@/hooks/useAdminDirectory";
import { useChats } from "@/hooks/useAdminDirectory";
import { useRecentAuditLog } from "@/hooks/useAdminConfig";
import { useSession, isAdmin } from "@/hooks/useSession";
import { EmptyState, PageHeader, PlatformBadge, Section, StatTile, useCommonStyles } from "@/components/ui-kit";
import { Body1, Button, Card, Caption1, Spinner, Subtitle1, tokens } from "@fluentui/react-components";
import {
  Chat24Regular,
  Clock24Regular,
  People24Regular,
  PeopleTeam24Regular,
  Pulse24Regular,
  Timeline24Regular,
} from "@fluentui/react-icons";
import Link from "next/link";
import { t } from "@/lib/i18n";

function formatTimestamp(seconds: number) {
  return new Date(seconds * 1000).toLocaleString();
}

function NonAdminDashboard() {
  const s = useCommonStyles();
  const { data: session } = useSession();
  const firstName = session?.authenticated ? session.display_name.split(" ")[0] : "there";
  return (
    <div className={s.page}>
      <PageHeader title={t("dashboard.welcome", { name: firstName })} description={t("dashboard.runningNormally")} />
      <Card className={s.section}>
        <Subtitle1>{t("dashboard.nothingTitle")}</Subtitle1>
        <Body1 className={s.muted}>{t("dashboard.nothingBody")}</Body1>
        <div className={s.row}>
          <Link href="/groups">
            <Button appearance="primary" icon={<PeopleTeam24Regular />}>
              {t("dashboard.goToGroups")}
            </Button>
          </Link>
          <Link href="/settings">
            <Button>{t("dashboard.personalSettings")}</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const s = useCommonStyles();
  const { data: session } = useSession();
  const admin = isAdmin(session);
  const { data: stats, isPending, isError } = useOverviewStats();
  const { data: chats } = useChats();
  const { data: recent } = useRecentAuditLog(5);

  if (!admin) return <NonAdminDashboard />;

  const busiest = chats ? [...chats.items].sort((a, b) => b.message_count - a.message_count).slice(0, 4) : [];

  return (
    <div className={s.page}>
      <PageHeader title={t("dashboard.title")} description={t("dashboard.description")} />

      {isPending && <Spinner label={t("dashboard.loadingStats")} />}
      {isError && <Body1>{t("dashboard.failedStats")}</Body1>}

      {stats && (
        <div className={s.tiles}>
          <StatTile label={t("dashboard.statTotalMessages")} value={stats.total_messages} icon={<Chat24Regular fontSize={18} />} />
          <StatTile label={t("dashboard.statTotalChats")} value={stats.total_chats} icon={<PeopleTeam24Regular fontSize={18} />} />
          <StatTile label={t("dashboard.statTotalUsers")} value={stats.total_identities} icon={<People24Regular fontSize={18} />} />
          <StatTile label={t("dashboard.statMessages24h")} value={stats.messages_last_24h} icon={<Pulse24Regular fontSize={18} />} />
          <StatTile label={t("dashboard.statMessages7d")} value={stats.messages_last_7d} icon={<Timeline24Regular fontSize={18} />} />
          <StatTile
            label={t("dashboard.statActiveChats7d")}
            value={stats.active_chats_last_7d}
            icon={<Clock24Regular fontSize={18} />}
          />
        </div>
      )}

      <Section
        title={t("dashboard.busiestChats")}
        action={
          <Link href="/admin/chats">
            <Button size="small" appearance="subtle">
              {t("dashboard.allChats")}
            </Button>
          </Link>
        }
      >
        {busiest.length === 0 && <EmptyState text={t("dashboard.noChats")} />}
        <div>
          {busiest.map((c) => (
            <div key={c.id} className={s.listRow}>
              <div className={s.row}>
                <Body1>{c.title ?? c.native_chat_id}</Body1>
                <PlatformBadge platform={c.platform} />
              </div>
              <Caption1 className={s.muted}>
                {t("dashboard.chatSummary", { count: c.message_count.toLocaleString(), members: c.member_count })}
              </Caption1>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={t("dashboard.recentActivity")}
        action={
          <Link href="/admin/audit-log">
            <Button size="small" appearance="subtle">
              {t("dashboard.auditLog")}
            </Button>
          </Link>
        }
      >
        {(!recent || recent.items.length === 0) && <EmptyState text={t("dashboard.noActivity")} />}
        <div>
          {recent?.items.map((e) => (
            <div key={e.id} className={s.listRow}>
              <div>
                <Body1 block>
                  {e.action}
                  {e.target && <span> · {e.target}</span>}
                </Body1>
              </div>
              <Caption1 style={{ color: tokens.colorNeutralForeground3, whiteSpace: "nowrap" }}>
                {formatTimestamp(e.at)}
              </Caption1>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
