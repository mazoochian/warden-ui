"use client";

import { useIdentityDetail } from "@/hooks/useAdminDirectory";
import { PageHeader, PlatformBadge, Section, StatTile, useCommonStyles } from "@/components/ui-kit";
import { t } from "@/lib/i18n";
import { Badge, Body1, Spinner } from "@fluentui/react-components";
import { useParams } from "next/navigation";

function formatLastSeen(seconds: number | null) {
  return seconds ? new Date(seconds * 1000).toLocaleString() : t("adminIdentityDetail.never");
}

export default function AdminIdentityDetailPage() {
  const s = useCommonStyles();
  const params = useParams<{ id: string }>();
  const { data: identity, isPending, isError } = useIdentityDetail(Number(params.id));

  if (isPending) return <Spinner label={t("adminIdentityDetail.loading")} />;
  if (isError || !identity) return <Section title={t("adminIdentities.title")}>{t("adminIdentityDetail.loadFailed")}</Section>;

  return (
    <div className={s.page}>
      <PageHeader
        title={identity.username ? `${identity.display_name} (@${identity.username})` : identity.display_name}
        description={t("adminIdentityDetail.idLabel", { id: identity.native_id })}
        actions={
          <>
            <PlatformBadge platform={identity.platform} />
            {identity.is_bot_admin && (
              <Badge appearance="filled" color="brand" shape="square">
                {t("adminIdentityDetail.botAdmin")}
              </Badge>
            )}
            {identity.is_allowed && (
              <Badge appearance="tint" shape="square">
                {t("adminIdentityDetail.allowed")}
              </Badge>
            )}
          </>
        }
      />

      <div className={s.tiles}>
        <StatTile label={t("adminIdentityDetail.creditsLabel")} value={identity.credits} />
      </div>

      <Section title={t("adminIdentityDetail.activity")}>
        <Body1>{t("adminIdentityDetail.lastSeen", { value: formatLastSeen(identity.last_seen) })}</Body1>
      </Section>
    </div>
  );
}
