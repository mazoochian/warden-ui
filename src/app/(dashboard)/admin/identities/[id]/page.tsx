"use client";

import { useIdentityDetail } from "@/hooks/useAdminDirectory";
import { PageHeader, PlatformBadge, Section, useCommonStyles } from "@/components/ui-kit";
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
            {identity.is_blocked && (
              <Badge appearance="tint" color="danger" shape="square">
                {t("adminIdentityDetail.blocked")}
              </Badge>
            )}
          </>
        }
      />

      <Section title={t("adminIdentityDetail.activity")}>
        <Body1>{t("adminIdentityDetail.lastSeen", { value: formatLastSeen(identity.last_seen) })}</Body1>
      </Section>
    </div>
  );
}
