"use client";

import { useSession } from "@/hooks/useSession";
import { useProviders } from "@/hooks/useProviders";
import {
  Body1,
  Button,
  Card,
  Caption1,
  Spinner,
  Title2,
  makeStyles,
  shorthands,
  tokens,
} from "@fluentui/react-components";
import { GlobeRegular } from "@fluentui/react-icons";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { t } from "@/lib/i18n";

const useStyles = makeStyles({
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding("24px"),
  },
  card: {
    width: "100%",
    maxWidth: "380px",
    ...shorthands.padding("28px"),
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    boxShadow: tokens.shadow16,
  },
  brand: { display: "flex", alignItems: "center", gap: "10px" },
  mark: {
    width: "36px",
    height: "36px",
    flexShrink: 0,
  },
  muted: { color: tokens.colorNeutralForeground3 },
  stack: { display: "flex", flexDirection: "column", gap: "8px" },
});

export default function LoginPage() {
  const styles = useStyles();
  const router = useRouter();
  const { data: session } = useSession();
  const { data: providers, isLoading: providersLoading } = useProviders();

  useEffect(() => {
    if (session?.authenticated) router.replace("/");
  }, [session, router]);

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.brand}>
          <Image src="/warden-mark.png" alt={t("nav.brandAlt")} width={36} height={36} className={styles.mark} priority />
          <div>
            <Title2 as="h1" block>
              {t("nav.brand")}
            </Title2>
            <Caption1 className={styles.muted}>{t("login.subtitle")}</Caption1>
          </div>
        </div>

        <div className={styles.stack}>
          {providersLoading && <Spinner size="tiny" label={t("login.loadingProviders")} />}

          {!providersLoading && (providers?.oidc?.length ?? 0) === 0 && (
            <Body1 className={styles.muted}>{t("login.noProvider")}</Body1>
          )}

          {!providersLoading &&
            providers?.oidc.map((p) => (
              <Button key={p.id} as="a" href={`/api/v1/auth/oidc/${p.id}/start`} appearance="primary" icon={<GlobeRegular />}>
                {t("login.continueWith", { name: p.name })}
              </Button>
            ))}

          {!providersLoading && (providers?.oidc?.length ?? 0) > 0 && (
            <Caption1 className={styles.muted}>{t("login.oidcHint", { name: providers!.oidc[0].name })}</Caption1>
          )}
        </div>
      </Card>
    </div>
  );
}
