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
          <Image src="/warden-mark.png" alt="Warden" width={36} height={36} className={styles.mark} priority />
          <div>
            <Title2 as="h1" block>
              Warden
            </Title2>
            <Caption1 className={styles.muted}>Sign in to the control panel.</Caption1>
          </div>
        </div>

        <div className={styles.stack}>
          {providersLoading && <Spinner size="tiny" label="Loading sign-in options..." />}

          {!providersLoading && (providers?.oidc?.length ?? 0) === 0 && (
            <Body1 className={styles.muted}>No sign-in provider is configured on this deployment yet.</Body1>
          )}

          {!providersLoading &&
            providers?.oidc.map((p) => (
              <Button key={p.id} as="a" href={`/api/v1/auth/oidc/${p.id}/start`} appearance="primary" icon={<GlobeRegular />}>
                Continue with {p.name}
              </Button>
            ))}

          {!providersLoading && (providers?.oidc?.length ?? 0) > 0 && (
            <Caption1 className={styles.muted}>
              Redirects to {providers!.oidc[0].name}&apos;s own sign-in page (OIDC). Warden never sees your password
              there.
            </Caption1>
          )}
        </div>
      </Card>
    </div>
  );
}
