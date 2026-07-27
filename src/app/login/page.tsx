"use client";

import { TelegramAuthUser, TelegramLoginButton } from "@/components/TelegramLoginButton";
import { apiFetch } from "@/lib/api";
import { useInvalidateSession, useSession } from "@/hooks/useSession";
import { useProviders } from "@/hooks/useProviders";
import {
  Body1,
  Button,
  Card,
  CardHeader,
  Caption1,
  MessageBar,
  MessageBarBody,
  Spinner,
  Title1,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { GlobeRegular, PersonRegular } from "@fluentui/react-icons";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

const useStyles = makeStyles({
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.spacingVerticalXXL,
  },
  card: {
    width: "360px",
    padding: tokens.spacingVerticalXL,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  buttons: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: tokens.spacingVerticalS,
    marginTop: tokens.spacingVerticalM,
  },
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

  const handleTelegramAuth = useCallback(
    (user: TelegramAuthUser) => telegramLogin.mutate(user),
    [telegramLogin],
  );

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <CardHeader header={<Title1>warden</Title1>} description="Sign in to the control panel" />

        {telegramLogin.isError && (
          <MessageBar intent="error">
            <MessageBarBody>Sign-in failed: {telegramLogin.error.message}</MessageBarBody>
          </MessageBar>
        )}

        <div className={styles.buttons}>
          {providersLoading && <Spinner size="tiny" label="Loading sign-in options..." />}

          {!providersLoading && providers?.telegram && (
            <TelegramLoginButton botUsername={providers.telegram.bot_username} onAuth={handleTelegramAuth} />
          )}
          {!providersLoading && !providers?.telegram && (
            <Body1>
              Telegram sign-in isn&apos;t configured on this deployment yet (
              <code>WARDEN_TELEGRAM_BOT_USERNAME</code> unset).
            </Body1>
          )}

          <Button appearance="secondary" icon={<PersonRegular />} disabled>
            Continue with Google
          </Button>
          <Button appearance="secondary" icon={<GlobeRegular />} disabled>
            Continue with SSO
          </Button>
        </div>

        <Caption1>
          Telegram Login resolves straight to your existing bot identity, if you have one. Google/SSO aren&apos;t
          wired up yet.
        </Caption1>
      </Card>
    </div>
  );
}
