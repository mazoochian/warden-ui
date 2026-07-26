"use client";

import { Body1, Button, Card, CardHeader, Caption1, Title1, makeStyles, tokens } from "@fluentui/react-components";
import { ChatRegular, GlobeRegular, PersonRegular } from "@fluentui/react-icons";

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
    gap: tokens.spacingVerticalS,
    marginTop: tokens.spacingVerticalM,
  },
});

/**
 * Visual shell only, per Phase 1's scope (see ROADMAP.md) -- real
 * Telegram Login Widget / Google OAuth / generic-OIDC wiring needs
 * externally-registered OAuth clients (a Google Cloud OAuth client id,
 * the bot's domain set in @BotFather for the Telegram widget) that only
 * Armin can set up, so those buttons don't do anything real yet. Backend
 * endpoints for all three already exist as stubs per API.md.
 */
export default function LoginPage() {
  const styles = useStyles();
  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <CardHeader header={<Title1>warden</Title1>} description="Sign in to the control panel" />
        <Body1>
          Real login isn&apos;t wired up yet (Phase 1, in progress) -- these buttons are placeholders showing the
          intended flow.
        </Body1>
        <div className={styles.buttons}>
          <Button appearance="primary" icon={<ChatRegular />} disabled>
            Continue with Telegram
          </Button>
          <Button appearance="secondary" icon={<PersonRegular />} disabled>
            Continue with Google
          </Button>
          <Button appearance="secondary" icon={<GlobeRegular />} disabled>
            Continue with SSO
          </Button>
        </div>
        <Caption1>Telegram Login resolves straight to your existing bot identity, if you have one.</Caption1>
      </Card>
    </div>
  );
}
