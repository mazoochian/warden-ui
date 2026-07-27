"use client";

import { TelegramAuthUser, TelegramLoginButton } from "@/components/TelegramLoginButton";
import { apiFetch } from "@/lib/api";
import { useInvalidateSession, useSession } from "@/hooks/useSession";
import { useProviders } from "@/hooks/useProviders";
import {
  Body1,
  Button,
  Card,
  Caption1,
  Divider,
  MessageBar,
  MessageBarBody,
  Spinner,
  Title2,
  makeStyles,
  shorthands,
  tokens,
} from "@fluentui/react-components";
import { GlobeRegular } from "@fluentui/react-icons";
import { useMutation } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

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
  const invalidateSession = useInvalidateSession();

  useEffect(() => {
    if (session?.authenticated) router.replace("/");
  }, [session, router]);

  const telegramLogin = useMutation({
    mutationFn: (user: TelegramAuthUser) =>
      apiFetch("/api/v1/auth/telegram/callback", {
        method: "POST",
        body: JSON.stringify(user),
      }),
    onSuccess: () => {
      invalidateSession();
      router.replace("/");
    },
  });

  const handleTelegramAuth = useCallback((user: TelegramAuthUser) => telegramLogin.mutate(user), [telegramLogin]);

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

        {telegramLogin.isError && (
          <MessageBar intent="error">
            <MessageBarBody>Sign-in failed: {telegramLogin.error.message}</MessageBarBody>
          </MessageBar>
        )}

        <div className={styles.stack}>
          {providersLoading && <Spinner size="tiny" label="Loading sign-in options..." />}

          {!providersLoading && providers?.telegram && (
            <TelegramLoginButton botUsername={providers.telegram.bot_username} onAuth={handleTelegramAuth} />
          )}
          {!providersLoading && !providers?.telegram && (
            <Body1 className={styles.muted}>
              Telegram sign-in isn&apos;t configured on this deployment yet (<code>WARDEN_TELEGRAM_BOT_USERNAME</code>{" "}
              unset).
            </Body1>
          )}
          <Caption1 className={styles.muted}>
            Uses Telegram&apos;s official login widget and resolves straight to your existing bot identity, if you
            have one. Warden never asks for a password.
          </Caption1>
        </div>

        {!providersLoading && (providers?.oidc?.length ?? 0) > 0 && (
          <>
            <Divider>or</Divider>
            <div className={styles.stack}>
              {providers!.oidc.map((p) => (
                <Button key={p.id} as="a" href={`/api/v1/auth/oidc/${p.id}/start`} icon={<GlobeRegular />}>
                  Continue with {p.name}
                </Button>
              ))}
              <Caption1 className={styles.muted}>
                Redirects to {providers!.oidc[0].name}&apos;s own sign-in page (OIDC) -- Warden never sees your
                password there either.
              </Caption1>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
