"use client";

import { Section } from "@/components/ui-kit";
import { t } from "@/lib/i18n";
import { Button, Field, Input, Spinner, Text } from "@fluentui/react-components";
import { useState } from "react";
import {
  useSubmitAuthCode,
  useSubmitPassword,
  useSubmitPhoneNumber,
  useTelegramUserStatus,
} from "@/hooks/useTelegramUserLogin";

/** Renders nothing when the deployment doesn't have the personal-account
 * connector configured at all -- see `useTelegramUserStatus`'s
 * `notConfigured` doc comment. Distinct from every other in-progress/error
 * state below, which do render (so the owner can see *why* nothing's
 * happening), this one hides the whole section rather than showing a
 * permanent "not available" card on every page load for deployments that
 * simply never turned this feature on. */
export function TelegramPersonalAccountSection() {
  const status = useTelegramUserStatus();

  if (status.notConfigured) return null;

  return (
    <Section title={t("settings.telegramPersonal")}>
      <Text>{t("settings.telegramPersonalHint")}</Text>

      {status.isPending && <Spinner label={t("settings.loading")} />}
      {status.isError && !status.notConfigured && <Text>{t("settings.loadFailed")}</Text>}

      {status.data?.auth_state === "ready" && <Text weight="semibold">{t("settings.telegramPersonalReady")}</Text>}
      {status.data?.auth_state === "wait_phone_number" && <PhoneStep />}
      {status.data?.auth_state === "wait_code" && <CodeStep />}
      {status.data?.auth_state === "wait_password" && <PasswordStep />}
      {status.data?.auth_state === "wait_tdlib_parameters" && <Spinner label={t("settings.loading")} />}

      <Text size={200}>{t("settings.telegramPersonalOrBot")}</Text>
    </Section>
  );
}

function PhoneStep() {
  const [phone, setPhone] = useState("");
  const submit = useSubmitPhoneNumber();

  return (
    <Field label={t("settings.telegramPersonalPhoneLabel")} hint={t("settings.telegramPersonalPhoneHint")}>
      <div style={{ display: "flex", gap: 8 }}>
        <Input value={phone} onChange={(_, d) => setPhone(d.value)} placeholder="+15551234567" />
        <Button
          appearance="primary"
          disabled={phone.trim().length === 0 || submit.isPending}
          onClick={() => submit.mutate({ phone_number: phone.trim() })}
        >
          {t("settings.telegramPersonalPhoneSubmit")}
        </Button>
      </div>
    </Field>
  );
}

function CodeStep() {
  const [code, setCode] = useState("");
  const submit = useSubmitAuthCode();

  return (
    <Field label={t("settings.telegramPersonalCodeLabel")} hint={t("settings.telegramPersonalCodeHint")}>
      <div style={{ display: "flex", gap: 8 }}>
        <Input value={code} onChange={(_, d) => setCode(d.value)} />
        <Button
          appearance="primary"
          disabled={code.trim().length === 0 || submit.isPending}
          onClick={() => submit.mutate({ code: code.trim() })}
        >
          {t("settings.telegramPersonalCodeSubmit")}
        </Button>
      </div>
    </Field>
  );
}

function PasswordStep() {
  const [password, setPassword] = useState("");
  const submit = useSubmitPassword();

  return (
    <Field label={t("settings.telegramPersonalPasswordLabel")} hint={t("settings.telegramPersonalPasswordHint")}>
      <div style={{ display: "flex", gap: 8 }}>
        <Input type="password" value={password} onChange={(_, d) => setPassword(d.value)} />
        <Button
          appearance="primary"
          disabled={password.length === 0 || submit.isPending}
          onClick={() => submit.mutate({ password })}
        >
          {t("settings.telegramPersonalPasswordSubmit")}
        </Button>
      </div>
    </Field>
  );
}
