"use client";

import { ChatSettings, useChatMembers, useChatSettings, useMyChats, useSetChatSettings } from "@/hooks/useMyChats";
import { EmptyState, PageHeader, Section, ToggleButtonGroup, useCommonStyles } from "@/components/ui-kit";
import { t } from "@/lib/i18n";
import { Button, Caption1, Field, Spinner, Switch, Text, Textarea } from "@fluentui/react-components";
import { useParams } from "next/navigation";
import { useState } from "react";

function formatLastSeen(seconds: number | null) {
  return seconds ? new Date(seconds * 1000).toLocaleString() : t("groupSettings.never");
}

const thinkingOptions = [
  { value: "default" as const, label: t("groupSettings.thinkingDefault") },
  { value: "on" as const, label: t("groupSettings.thinkingOn") },
  { value: "off" as const, label: t("groupSettings.thinkingOff") },
];

/** Seeds its editable state directly from `initial` (no effect needed --
 * mounted fresh, via `key`, whenever the loaded settings actually change). */
function SettingsForm({ chatId, initial }: { chatId: number; initial: ChatSettings }) {
  const setSettings = useSetChatSettings(chatId);

  const [persona, setPersona] = useState(initial.persona ?? "");
  const [magicWord, setMagicWord] = useState(initial.magic_word ?? "");
  const [digestEnabled, setDigestEnabled] = useState(initial.digest_enabled);
  const [thinkingOverride, setThinkingOverride] = useState<"default" | "on" | "off">(
    initial.thinking_override === null ? "default" : initial.thinking_override ? "on" : "off",
  );

  const save = () => {
    setSettings.mutate({
      persona: persona.trim() === "" ? null : persona,
      magic_word: magicWord.trim() === "" ? null : magicWord,
      digest_enabled: digestEnabled,
      thinking_override: thinkingOverride === "default" ? null : thinkingOverride === "on",
    });
  };

  return (
    <Section title={t("groupSettings.settings")}>
      <Field label={t("groupSettings.persona")} hint={t("groupSettings.personaHint")}>
        <Textarea value={persona} onChange={(_, data) => setPersona(data.value)} resize="vertical" rows={4} />
      </Field>

      <Field label={t("groupSettings.magicWord")} hint={t("groupSettings.magicWordHint")}>
        <Textarea value={magicWord} onChange={(_, data) => setMagicWord(data.value)} rows={1} />
      </Field>

      <Switch checked={digestEnabled} onChange={(_, data) => setDigestEnabled(data.checked)} label={t("groupSettings.digestEnabled")} />

      <Field label={t("groupSettings.thinkingDisplay")}>
        <ToggleButtonGroup ariaLabel={t("groupSettings.thinkingDisplay")} value={thinkingOverride} options={thinkingOptions} onChange={setThinkingOverride} />
      </Field>

      <Button appearance="primary" disabled={setSettings.isPending} onClick={save} style={{ alignSelf: "flex-start" }}>
        {t("groupSettings.save")}
      </Button>
    </Section>
  );
}

export default function GroupSettingsPage() {
  const s = useCommonStyles();
  const params = useParams<{ id: string }>();
  const chatId = Number(params.id);

  const { data: myChats } = useMyChats();
  const chat = myChats?.items.find((c) => c.id === chatId);

  const { data: settings, isPending, isError } = useChatSettings(chatId);
  const { data: members } = useChatMembers(chatId);

  if (isPending) return <Spinner label={t("groupSettings.loading")} />;
  if (isError || !settings) return <Section title={t("groupSettings.settings")}>{t("groupSettings.loadFailed")}</Section>;

  return (
    <div className={s.page}>
      <PageHeader title={chat?.title ?? t("groupSettings.chatFallback", { id: chatId })} />

      <SettingsForm key={JSON.stringify(settings)} chatId={chatId} initial={settings} />

      <Section title={t("groupSettings.members")}>
        {(!members || members.items.length === 0) && <EmptyState text={t("groupSettings.noMembers")} />}
        <div>
          {members?.items.map((m) => (
            <div key={m.identity_id} className={s.listRow}>
              <Text>
                {m.display_name}
                {m.username && <span> (@{m.username})</span>}
              </Text>
              <Caption1 className={s.muted} style={{ whiteSpace: "nowrap" }}>
                {formatLastSeen(m.last_seen)}
              </Caption1>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
