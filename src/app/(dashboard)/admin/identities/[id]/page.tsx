"use client";

import { useIdentityDetail } from "@/hooks/useAdminDirectory";
import { PageHeader, PlatformBadge, Section, StatTile, useCommonStyles } from "@/components/ui-kit";
import { Badge, Body1, Spinner } from "@fluentui/react-components";
import { useParams } from "next/navigation";

function formatLastSeen(seconds: number | null) {
  return seconds ? new Date(seconds * 1000).toLocaleString() : "never";
}

export default function AdminIdentityDetailPage() {
  const s = useCommonStyles();
  const params = useParams<{ id: string }>();
  const { data: identity, isPending, isError } = useIdentityDetail(Number(params.id));

  if (isPending) return <Spinner label="Loading user..." />;
  if (isError || !identity) return <Section title="User">Failed to load user.</Section>;

  return (
    <div className={s.page}>
      <PageHeader
        title={identity.username ? `${identity.display_name} (@${identity.username})` : identity.display_name}
        description={`id ${identity.native_id}`}
        actions={
          <>
            <PlatformBadge platform={identity.platform} />
            {identity.is_bot_admin && (
              <Badge appearance="filled" color="brand" shape="square">
                Bot admin
              </Badge>
            )}
            {identity.is_allowed && (
              <Badge appearance="tint" shape="square">
                Allowed
              </Badge>
            )}
          </>
        }
      />

      <div className={s.tiles}>
        <StatTile label="LLM credits" value={identity.credits} />
      </div>

      <Section title="Activity">
        <Body1>Last seen: {formatLastSeen(identity.last_seen)}</Body1>
      </Section>
    </div>
  );
}
