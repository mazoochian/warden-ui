"use client";

import { ChatSettings, useChatMembers, useChatSettings, useMyChats, useSetChatSettings } from "@/hooks/useMyChats";
import { useCreateKeywordAlert, useDeleteKeywordAlert, useKeywordAlerts } from "@/hooks/useKeywordAlerts";
import { useAnnouncements, useCancelAnnouncement, useCreateAnnouncement, type AnnouncementWhen } from "@/hooks/useAnnouncements";
import { useSession } from "@/hooks/useSession";
import { EmptyState, PageHeader, Section, ToggleButtonGroup, useCommonStyles } from "@/components/ui-kit";
import { ApiError } from "@/lib/api";
import { t } from "@/lib/i18n";
import {
  Body1,
  Button,
  Caption1,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Textarea,
} from "@fluentui/react-components";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

function formatLastSeen(seconds: number | null) {
  return seconds ? new Date(seconds * 1000).toLocaleString() : t("groupSettings.never");
}

const thinkingOptions = [
  { value: "default" as const, label: t("groupSettings.thinkingDefault") },
  { value: "on" as const, label: t("groupSettings.thinkingOn") },
  { value: "off" as const, label: t("groupSettings.thinkingOff") },
];

const videoQualityOptions = [
  { value: "lossless" as const, label: t("groupSettings.videoQualityLossless") },
  { value: "lossy" as const, label: t("groupSettings.videoQualityLossy") },
];

/** Seeds its editable state directly from `initial` (no effect needed --
 * mounted fresh, via `key`, whenever the loaded settings actually change).
 * `welcome_message`/`default_location` are owner-only to change server-side
 * (see `router.zig`'s `optionalStringChanged` gate) -- their inputs are
 * disabled for non-owners rather than hidden, since viewing them stays open
 * to anyone who can reach this page. Because their state is only ever
 * seeded from `initial` and never touched when disabled, a non-owner's save
 * always resubmits them unchanged, so the rest of the form still saves. */
function SettingsForm({ chatId, initial, isOwner }: { chatId: number; initial: ChatSettings; isOwner: boolean }) {
  const setSettings = useSetChatSettings(chatId);

  const [persona, setPersona] = useState(initial.persona ?? "");
  const [magicWord, setMagicWord] = useState(initial.magic_word ?? "");
  const [digestEnabled, setDigestEnabled] = useState(initial.digest_enabled);
  const [thinkingOverride, setThinkingOverride] = useState<"default" | "on" | "off">(
    initial.thinking_override === null ? "default" : initial.thinking_override ? "on" : "off",
  );
  const [briefingEnabled, setBriefingEnabled] = useState(initial.briefing_enabled);
  const [defaultLocation, setDefaultLocation] = useState(initial.default_location ?? "");
  const [welcomeMessage, setWelcomeMessage] = useState(initial.welcome_message ?? "");
  const [autopinAnnouncements, setAutopinAnnouncements] = useState(initial.autopin_announcements);
  const [videoDownloadEnabled, setVideoDownloadEnabled] = useState(initial.video_download_enabled);
  const [videoQuality, setVideoQuality] = useState<"lossy" | "lossless">(initial.video_download_lossy ? "lossy" : "lossless");
  const [slowmodeSeconds, setSlowmodeSeconds] = useState(String(initial.slowmode_seconds));

  const parsedSlowmode = Number(slowmodeSeconds);
  const slowmodeValid = Number.isInteger(parsedSlowmode) && parsedSlowmode >= 0;

  const save = () => {
    if (!slowmodeValid) return;
    setSettings.mutate({
      persona: persona.trim() === "" ? null : persona,
      magic_word: magicWord.trim() === "" ? null : magicWord,
      digest_enabled: digestEnabled,
      thinking_override: thinkingOverride === "default" ? null : thinkingOverride === "on",
      briefing_enabled: briefingEnabled,
      default_location: defaultLocation.trim() === "" ? null : defaultLocation,
      welcome_message: welcomeMessage.trim() === "" ? null : welcomeMessage,
      autopin_announcements: autopinAnnouncements,
      video_download_enabled: videoDownloadEnabled,
      video_download_lossy: videoQuality === "lossy",
      slowmode_seconds: parsedSlowmode,
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
      <Switch checked={briefingEnabled} onChange={(_, data) => setBriefingEnabled(data.checked)} label={t("groupSettings.briefingEnabled")} />

      <Field label={t("groupSettings.thinkingDisplay")}>
        <ToggleButtonGroup ariaLabel={t("groupSettings.thinkingDisplay")} value={thinkingOverride} options={thinkingOptions} onChange={setThinkingOverride} />
      </Field>

      <Field
        label={t("groupSettings.defaultLocation")}
        hint={isOwner ? t("groupSettings.defaultLocationHint") : t("groupSettings.ownerOnlyHint")}
      >
        <Input value={defaultLocation} onChange={(_, data) => setDefaultLocation(data.value)} maxLength={100} disabled={!isOwner} />
      </Field>

      <Field
        label={t("groupSettings.welcomeMessage")}
        hint={isOwner ? t("groupSettings.welcomeMessageHint") : t("groupSettings.ownerOnlyHint")}
      >
        <Textarea value={welcomeMessage} onChange={(_, data) => setWelcomeMessage(data.value)} rows={2} maxLength={1000} disabled={!isOwner} />
      </Field>

      <Switch
        checked={autopinAnnouncements}
        onChange={(_, data) => setAutopinAnnouncements(data.checked)}
        label={t("groupSettings.autopinAnnouncements")}
      />

      <Switch
        checked={videoDownloadEnabled}
        onChange={(_, data) => setVideoDownloadEnabled(data.checked)}
        label={t("groupSettings.videoDownloadEnabled")}
      />
      {videoDownloadEnabled && (
        <Field label={t("groupSettings.videoQuality")}>
          <ToggleButtonGroup ariaLabel={t("groupSettings.videoQuality")} value={videoQuality} options={videoQualityOptions} onChange={setVideoQuality} />
        </Field>
      )}

      <Field label={t("groupSettings.slowmode")} hint={t("groupSettings.slowmodeHint")} validationState={slowmodeValid ? "none" : "error"}>
        <Input type="number" min={0} value={slowmodeSeconds} onChange={(_, data) => setSlowmodeSeconds(data.value)} style={{ maxWidth: 160 }} />
      </Field>

      <Button appearance="primary" disabled={!slowmodeValid || setSettings.isPending} onClick={save} style={{ alignSelf: "flex-start" }}>
        {t("groupSettings.save")}
      </Button>
    </Section>
  );
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

function formatCreatedAt(seconds: number) {
  return new Date(seconds * 1000).toLocaleDateString();
}

function KeywordAlertsSection({ chatId }: { chatId: number }) {
  const { data: session } = useSession();
  const isOwner = Boolean(session?.authenticated && session.roles.owner);
  const myIdentityIds = session?.authenticated ? session.identity_ids : [];
  const { data, isPending, isError } = useKeywordAlerts(chatId);
  const createAlert = useCreateKeywordAlert(chatId);
  const deleteAlert = useDeleteKeywordAlert(chatId);
  const [keyword, setKeyword] = useState("");

  const canSubmit = keyword.trim().length > 0 && keyword.trim().length <= 100;
  const submit = () => {
    if (!canSubmit) return;
    createAlert.mutate(keyword.trim(), { onSuccess: () => setKeyword("") });
  };

  return (
    <Section title={t("groupSettings.keywordAlerts")}>
      <Field label={t("groupSettings.newKeyword")}>
        <div style={{ display: "flex", gap: "8px" }}>
          <Input value={keyword} onChange={(_, data) => setKeyword(data.value)} maxLength={100} style={{ flexGrow: 1 }} />
          <Button appearance="primary" disabled={!canSubmit || createAlert.isPending} onClick={submit}>
            {t("groupSettings.addKeyword")}
          </Button>
        </div>
      </Field>

      {createAlert.isError && (
        <MessageBar intent="error">
          <MessageBarBody>{errorMessage(createAlert.error, t("groupSettings.keywordSaveFailed"))}</MessageBarBody>
        </MessageBar>
      )}

      {isPending && <Spinner label={t("groupSettings.loadingKeywords")} />}
      {isError && <Body1>{t("groupSettings.loadKeywordsFailed")}</Body1>}
      {data && data.items.length === 0 && <EmptyState text={t("groupSettings.noKeywords")} />}
      {data && data.items.length > 0 && (
        <Table>
          <TableBody>
            {data.items.map((k) => {
              const canDelete = isOwner || myIdentityIds.includes(k.identity_id);
              return (
                <TableRow key={k.id}>
                  <TableCell>{k.keyword}</TableCell>
                  <TableCell>{formatCreatedAt(k.created_at)}</TableCell>
                  <TableCell>
                    {canDelete && (
                      <Button size="small" onClick={() => deleteAlert.mutate(k.id)} disabled={deleteAlert.isPending}>
                        {t("groupSettings.deleteKeyword")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Section>
  );
}

type DurationUnit = "minutes" | "hours" | "days";
const unitSeconds: Record<DurationUnit, number> = { minutes: 60, hours: 3600, days: 86400 };
const unitOptions: { value: DurationUnit; label: string }[] = [
  { value: "minutes", label: t("groupSettings.unitMinutes") },
  { value: "hours", label: t("groupSettings.unitHours") },
  { value: "days", label: t("groupSettings.unitDays") },
];
const whenModeOptions = [
  { value: "duration" as const, label: t("groupSettings.fromNow") },
  { value: "absolute" as const, label: t("groupSettings.specificDateTime") },
];

function formatRecur(seconds: number | null) {
  if (!seconds) return t("groupSettings.recurNone");
  if (seconds % 86400 === 0) return t("groupSettings.recurDays", { n: seconds / 86400 });
  if (seconds % 3600 === 0) return t("groupSettings.recurHours", { n: seconds / 3600 });
  return t("groupSettings.recurMinutes", { n: Math.round(seconds / 60) });
}

/** New-announcement form + list, modeled on Reminders' own create form
 * (same when-picker shape) minus the chat picker, since this section is
 * already scoped to one chat. */
function AnnouncementsSection({ chatId }: { chatId: number }) {
  const s = useCommonStyles();
  const { data, isPending, isError } = useAnnouncements(chatId);
  const createAnnouncement = useCreateAnnouncement(chatId);
  const cancelAnnouncement = useCancelAnnouncement(chatId);

  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"duration" | "absolute">("duration");
  const [amount, setAmount] = useState("30");
  const [unit, setUnit] = useState<DurationUnit>("minutes");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [repeats, setRepeats] = useState(false);
  const [repeatAmount, setRepeatAmount] = useState("1");
  const [repeatUnit, setRepeatUnit] = useState<DurationUnit>("days");

  const when: AnnouncementWhen | null = useMemo(() => {
    if (mode === "duration") {
      const n = Number(amount);
      if (!Number.isFinite(n) || n <= 0) return null;
      return { kind: "duration", seconds: Math.round(n * unitSeconds[unit]) };
    }
    if (!date || !time) return null;
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    if (!year || !month || !day) return null;
    return { kind: "absolute", year, month, day, hour: hour ?? 0, minute: minute ?? 0 };
  }, [mode, amount, unit, date, time]);

  const recurSeconds = repeats ? Math.round(Number(repeatAmount) * unitSeconds[repeatUnit]) : null;
  const canSubmit = message.trim().length > 0 && message.trim().length <= 1000 && when !== null && (!repeats || (recurSeconds ?? 0) > 0);

  const submit = () => {
    if (!when) return;
    createAnnouncement.mutate(
      { message: message.trim(), when, recur_interval_seconds: recurSeconds ?? undefined },
      { onSuccess: () => { setMessage(""); setDate(""); setTime(""); } },
    );
  };

  return (
    <Section title={t("groupSettings.announcements")}>
      <Field label={t("groupSettings.whenLabel")}>
        <ToggleButtonGroup ariaLabel={t("groupSettings.whenLabel")} value={mode} options={whenModeOptions} onChange={setMode} />
      </Field>

      {mode === "duration" ? (
        <div className={s.row}>
          <Input type="number" min={1} value={amount} onChange={(_, d) => setAmount(d.value)} style={{ width: 100 }} aria-label={t("groupSettings.amount")} />
          <Dropdown
            value={unitOptions.find((o) => o.value === unit)?.label ?? unit}
            selectedOptions={[unit]}
            onOptionSelect={(_, d) => d.optionValue && setUnit(d.optionValue as DurationUnit)}
            aria-label={t("groupSettings.unit")}
          >
            {unitOptions.map((o) => (
              <Option key={o.value} value={o.value}>
                {o.label}
              </Option>
            ))}
          </Dropdown>
          <Caption1 className={s.muted}>{t("groupSettings.fromNowSuffix")}</Caption1>
        </div>
      ) : (
        <div className={s.row}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label={t("groupSettings.dateInput")} />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label={t("groupSettings.timeInput")} />
        </div>
      )}

      <Field label={t("groupSettings.announcementMessage")}>
        <Textarea value={message} onChange={(_, d) => setMessage(d.value)} rows={2} maxLength={1000} />
      </Field>

      <Switch checked={repeats} onChange={(_, d) => setRepeats(d.checked)} label={t("groupSettings.repeats")} />
      {repeats && (
        <div className={s.row}>
          <Input type="number" min={1} value={repeatAmount} onChange={(_, d) => setRepeatAmount(d.value)} style={{ width: 100 }} aria-label={t("groupSettings.repeatAmount")} />
          <Dropdown
            value={unitOptions.find((o) => o.value === repeatUnit)?.label ?? repeatUnit}
            selectedOptions={[repeatUnit]}
            onOptionSelect={(_, d) => d.optionValue && setRepeatUnit(d.optionValue as DurationUnit)}
            aria-label={t("groupSettings.repeatUnit")}
          >
            {unitOptions.map((o) => (
              <Option key={o.value} value={o.value}>
                {o.label}
              </Option>
            ))}
          </Dropdown>
        </div>
      )}

      {createAnnouncement.isError && (
        <MessageBar intent="error">
          <MessageBarBody>{errorMessage(createAnnouncement.error, t("groupSettings.announcementSaveFailed"))}</MessageBarBody>
        </MessageBar>
      )}

      <Button appearance="primary" disabled={!canSubmit || createAnnouncement.isPending} onClick={submit} style={{ alignSelf: "flex-start" }}>
        {t("groupSettings.scheduleAnnouncement")}
      </Button>

      {isPending && <Spinner label={t("groupSettings.loadingAnnouncements")} />}
      {isError && <Body1>{t("groupSettings.loadAnnouncementsFailed")}</Body1>}
      {data && data.items.length === 0 && <EmptyState text={t("groupSettings.noAnnouncements")} />}
      {data && data.items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>{t("groupSettings.columnMessage")}</TableHeaderCell>
              <TableHeaderCell>{t("groupSettings.columnDue")}</TableHeaderCell>
              <TableHeaderCell>{t("groupSettings.columnRepeats")}</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((ann) => (
              <TableRow key={ann.id}>
                <TableCell style={{ whiteSpace: "pre-wrap" }}>{ann.message}</TableCell>
                <TableCell style={{ whiteSpace: "nowrap" }}>{new Date(ann.due_at * 1000).toLocaleString()}</TableCell>
                <TableCell>{formatRecur(ann.recur_interval_seconds)}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => cancelAnnouncement.mutate(ann.id)} disabled={cancelAnnouncement.isPending}>
                    {t("groupSettings.cancelAnnouncement")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
  );
}

export default function GroupSettingsPage() {
  const s = useCommonStyles();
  const params = useParams<{ id: string }>();
  const chatId = Number(params.id);

  const { data: myChats } = useMyChats();
  const chat = myChats?.items.find((c) => c.id === chatId);
  const { data: session } = useSession();
  const isOwner = Boolean(session?.authenticated && session.roles.owner);

  const { data: settings, isPending, isError } = useChatSettings(chatId);
  const { data: members } = useChatMembers(chatId);

  if (isPending) return <Spinner label={t("groupSettings.loading")} />;
  if (isError || !settings) return <Section title={t("groupSettings.settings")}>{t("groupSettings.loadFailed")}</Section>;

  return (
    <div className={s.page}>
      <PageHeader title={chat?.title ?? t("groupSettings.chatFallback", { id: chatId })} />

      <SettingsForm key={JSON.stringify(settings)} chatId={chatId} initial={settings} isOwner={isOwner} />

      <KeywordAlertsSection chatId={chatId} />

      <AnnouncementsSection chatId={chatId} />

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
