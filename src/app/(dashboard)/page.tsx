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

function formatTimestamp(seconds: number) {
  return new Date(seconds * 1000).toLocaleString();
}

function NonAdminDashboard() {
  const s = useCommonStyles();
  const { data: session } = useSession();
  const firstName = session?.authenticated ? session.display_name.split(" ")[0] : "there";
  return (
    <div className={s.page}>
      <PageHeader title={`Welcome back, ${firstName}`} description="Warden is running normally." />
      <Card className={s.section}>
        <Subtitle1>Nothing bot-wide to show here</Subtitle1>
        <Body1 className={s.muted}>
          Bot-wide statistics are only visible to bot admins. Everything you can change lives under your groups and
          your personal settings.
        </Body1>
        <div className={s.row}>
          <Link href="/groups">
            <Button appearance="primary" icon={<PeopleTeam24Regular />}>
              Go to My Groups
            </Button>
          </Link>
          <Link href="/settings">
            <Button>Personal settings</Button>
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
      <PageHeader title="Dashboard" description="Bot-wide activity across Telegram, Matrix and XMPP." />

      {isPending && <Spinner label="Loading stats..." />}
      {isError && <Body1>Failed to load stats.</Body1>}

      {stats && (
        <div className={s.tiles}>
          <StatTile label="Total messages" value={stats.total_messages} icon={<Chat24Regular fontSize={18} />} />
          <StatTile label="Total chats" value={stats.total_chats} icon={<PeopleTeam24Regular fontSize={18} />} />
          <StatTile label="Total users" value={stats.total_identities} icon={<People24Regular fontSize={18} />} />
          <StatTile label="Messages · 24h" value={stats.messages_last_24h} icon={<Pulse24Regular fontSize={18} />} />
          <StatTile label="Messages · 7d" value={stats.messages_last_7d} icon={<Timeline24Regular fontSize={18} />} />
          <StatTile
            label="Active chats · 7d"
            value={stats.active_chats_last_7d}
            icon={<Clock24Regular fontSize={18} />}
          />
        </div>
      )}

      <Section
        title="Busiest chats"
        action={
          <Link href="/admin/chats">
            <Button size="small" appearance="subtle">
              All chats
            </Button>
          </Link>
        }
      >
        {busiest.length === 0 && <EmptyState text="No chats yet." />}
        <div>
          {busiest.map((c) => (
            <div key={c.id} className={s.listRow}>
              <div className={s.row}>
                <Body1>{c.title ?? c.native_chat_id}</Body1>
                <PlatformBadge platform={c.platform} />
              </div>
              <Caption1 className={s.muted}>
                {c.message_count.toLocaleString()} messages · {c.member_count} members
              </Caption1>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Recent panel activity"
        action={
          <Link href="/admin/audit-log">
            <Button size="small" appearance="subtle">
              Audit log
            </Button>
          </Link>
        }
      >
        {(!recent || recent.items.length === 0) && <EmptyState text="No panel activity yet." />}
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
