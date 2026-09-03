"use client";

import { useState } from "react";
import {
  Body1,
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  SearchBox,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableCellLayout,
  TableRow,
  Text,
  Textarea,
} from "@fluentui/react-components";
import { clickableRowProps, EmptyState, PageHeader, Section, ToggleButtonGroup, useCommonStyles } from "@/components/ui-kit";
import { useSession } from "@/hooks/useSession";
import { ApiError } from "@/lib/api";
import { t } from "@/lib/i18n";
import {
  useApproveDraft,
  useChatAutonomy,
  useDiscardDraft,
  useDrafts,
  useGlobalAutonomy,
  useSendTdMessage,
  useSetChatAutonomy,
  useSetGlobalAutonomy,
  useSubmitCode,
  useSubmitPassword,
  useSubmitPhone,
  useSummarizeChat,
  useTelegramUserChats,
  useTelegramUserLogout,
  useTelegramUserStatus,
  type AuthState,
  type ChatMatch,
  type ReplyAutonomy,
} from "@/hooks/useTelegramUser";

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

function LoginFlow({ authState }: { authState: AuthState }) {
  const submitPhone = useSubmitPhone();
  const submitCode = useSubmitCode();
  const submitPassword = useSubmitPassword();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  if (authState === "none" || authState === "wait_tdlib_parameters") {
    return (
      <Section title={t("personalAccount.login")}>
        <Spinner label={t("personalAccount.starting")} />
      </Section>
    );
  }

  if (authState === "unsupported" || authState === "closed" || authState === "logging_out") {
    return (
      <Section title={t("personalAccount.login")}>
        <MessageBar intent="error">
          <MessageBarBody>{t("personalAccount.unsupportedState", { state: authState })}</MessageBarBody>
        </MessageBar>
      </Section>
    );
  }

  return (
    <Section title={t("personalAccount.login")}>
      {authState === "wait_phone_number" && (
        <>
          <Field label={t("personalAccount.phoneLabel")} hint={t("personalAccount.phoneHint")}>
            <Input value={phone} onChange={(_, d) => setPhone(d.value)} placeholder="+15551234567" />
          </Field>
          {submitPhone.isError && (
            <MessageBar intent="error">
              <MessageBarBody>{errorMessage(submitPhone.error, t("personalAccount.phoneFailed"))}</MessageBarBody>
            </MessageBar>
          )}
          <Button
            appearance="primary"
            disabled={phone.trim().length === 0 || submitPhone.isPending}
            onClick={() => submitPhone.mutate(phone.trim())}
            style={{ alignSelf: "flex-start" }}
          >
            {t("personalAccount.submitPhone")}
          </Button>
        </>
      )}

      {authState === "wait_code" && (
        <>
          <Field label={t("personalAccount.codeLabel")} hint={t("personalAccount.codeHint")}>
            <Input value={code} onChange={(_, d) => setCode(d.value)} />
          </Field>
          {submitCode.isError && (
            <MessageBar intent="error">
              <MessageBarBody>{errorMessage(submitCode.error, t("personalAccount.codeFailed"))}</MessageBarBody>
            </MessageBar>
          )}
          <Button
            appearance="primary"
            disabled={code.trim().length === 0 || submitCode.isPending}
            onClick={() => submitCode.mutate(code.trim())}
            style={{ alignSelf: "flex-start" }}
          >
            {t("personalAccount.submitCode")}
          </Button>
        </>
      )}

      {authState === "wait_password" && (
        <>
          <Field label={t("personalAccount.passwordLabel")} hint={t("personalAccount.passwordHint")}>
            <Input type="password" value={password} onChange={(_, d) => setPassword(d.value)} />
          </Field>
          {submitPassword.isError && (
            <MessageBar intent="error">
              <MessageBarBody>{errorMessage(submitPassword.error, t("personalAccount.passwordFailed"))}</MessageBarBody>
            </MessageBar>
          )}
          <Button
            appearance="primary"
            disabled={password.length === 0 || submitPassword.isPending}
            onClick={() => submitPassword.mutate(password)}
            style={{ alignSelf: "flex-start" }}
          >
            {t("personalAccount.submitPassword")}
          </Button>
        </>
      )}
    </Section>
  );
}

const autonomyOptions: { value: ReplyAutonomy; label: string }[] = [
  { value: "off", label: t("personalAccount.autonomyOff") },
  { value: "draft", label: t("personalAccount.autonomyDraft") },
  { value: "auto", label: t("personalAccount.autonomyAuto") },
];

function AutonomySection() {
  const { data } = useGlobalAutonomy();
  const setGlobal = useSetGlobalAutonomy();

  return (
    <Section title={t("personalAccount.autonomy")}>
      <MessageBar intent="warning">
        <MessageBarBody>{t("personalAccount.autonomyWarning")}</MessageBarBody>
      </MessageBar>
      <Field label={t("personalAccount.globalDefault")} hint={t("personalAccount.autonomyHint")}>
        <ToggleButtonGroup
          ariaLabel={t("personalAccount.globalDefault")}
          value={data?.global ?? "off"}
          options={autonomyOptions}
          onChange={(v) => setGlobal.mutate(v)}
        />
      </Field>
    </Section>
  );
}

function DraftsSection() {
  const { data, isPending, isError } = useDrafts();
  const approve = useApproveDraft();
  const discard = useDiscardDraft();

  return (
    <Section title={t("personalAccount.drafts")}>
      {/* Says where a draft actually lives now -- it is not only on this
          page, it is pre-typed in the chat's Telegram composer. */}
      <Body1 style={{ color: "var(--colorNeutralForeground3)" }}>{t("personalAccount.draftsHint")}</Body1>
      {isPending && <Spinner label={t("personalAccount.loadingDrafts")} />}
      {isError && <Body1>{t("personalAccount.loadDraftsFailed")}</Body1>}
      {data && data.items.length === 0 && <EmptyState text={t("personalAccount.noDrafts")} />}
      {data &&
        data.items.map((d) => (
          <div key={d.native_chat_id} className="draft-row" style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "10px 0", borderBottom: "1px solid var(--colorNeutralStroke2)" }}>
            <Text weight="semibold">{d.chat_title}</Text>
            {/* The incoming message is what makes a draft judgeable at a
                glance -- without it the reply is context-free. */}
            <Text size={200} style={{ color: "var(--colorNeutralForeground3)" }}>
              {t("personalAccount.draftIncoming")}
            </Text>
            <Body1 style={{ whiteSpace: "pre-wrap", color: "var(--colorNeutralForeground2)" }}>{d.incoming_text}</Body1>
            <Text size={200} style={{ color: "var(--colorNeutralForeground3)" }}>
              {t("personalAccount.draftReply")}
            </Text>
            <Body1 style={{ whiteSpace: "pre-wrap" }}>{d.draft_text}</Body1>
            {d.replaced_draft && (
              <MessageBar intent="warning">
                <MessageBarBody>{t("personalAccount.draftReplaced", { text: d.replaced_draft })}</MessageBarBody>
              </MessageBar>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                size="small"
                appearance="primary"
                onClick={() => approve.mutate(d.native_chat_id)}
                disabled={approve.isPending || discard.isPending}
              >
                {t("personalAccount.approve")}
              </Button>
              <Button size="small" onClick={() => discard.mutate(d.native_chat_id)} disabled={approve.isPending || discard.isPending}>
                {t("personalAccount.discard")}
              </Button>
            </div>
          </div>
        ))}
    </Section>
  );
}

const chatAutonomyOptions: { value: "inherit" | ReplyAutonomy; label: string }[] = [
  { value: "inherit", label: t("personalAccount.autonomyInherit") },
  { value: "off", label: t("personalAccount.autonomyOff") },
  { value: "draft", label: t("personalAccount.autonomyDraft") },
  { value: "auto", label: t("personalAccount.autonomyAuto") },
];

function ChatDetail({ chat }: { chat: ChatMatch }) {
  const s = useCommonStyles();
  const { data: autonomy } = useChatAutonomy(chat.native_chat_id);
  const setChatAutonomy = useSetChatAutonomy();

  // Ghostwriter prompt editing: `null` means "untouched, show whatever the
  // server has", so a fetch landing (or a save completing) is picked up
  // without an effect that writes state. Switching chats resets this for
  // free -- ChatDetail is keyed by native_chat_id at its render site, so it
  // remounts rather than carrying one chat's unsaved edit to another.
  // Explicit-save rather than on-change, since this is free text.
  const [promptEdit, setPromptEdit] = useState<string | null>(null);
  const serverPrompt = autonomy?.prompt ?? "";
  const prompt = promptEdit ?? serverPrompt;

  const summarize = useSummarizeChat();
  const [summary, setSummary] = useState("");

  const send = useSendTdMessage();
  const [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className={s.formGrid} style={{ borderTop: "1px solid var(--colorNeutralStroke2)", paddingTop: "12px", marginTop: "8px" }}>
      <Field
        label={t("personalAccount.chatAutonomy")}
        hint={autonomy ? t("personalAccount.effectiveIs", { level: autonomy.effective }) : undefined}
        style={{ gridColumn: "1 / -1" }}
      >
        <ToggleButtonGroup
          ariaLabel={t("personalAccount.chatAutonomy")}
          value={autonomy?.override ?? "inherit"}
          options={chatAutonomyOptions}
          onChange={(v) => setChatAutonomy.mutate({ nativeChatId: chat.native_chat_id, override: v === "inherit" ? null : v })}
        />
      </Field>

      {/* Separate from the chat persona on purpose: that one styles Warden
          answering as itself, this one styles Warden impersonating you.
          Sharing a single setting made ghostwritten replies sound like a
          bot the moment a persona was set anywhere. */}
      <Field
        label={t("personalAccount.ghostwriterPrompt")}
        hint={t("personalAccount.ghostwriterPromptHint")}
        style={{ gridColumn: "1 / -1" }}
      >
        <Textarea
          value={prompt}
          placeholder={t("personalAccount.ghostwriterPromptPlaceholder")}
          onChange={(_, d) => setPromptEdit(d.value)}
          rows={3}
        />
        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "6px" }}>
          <Button
            size="small"
            onClick={() =>
              setChatAutonomy.mutate(
                {
                  nativeChatId: chat.native_chat_id,
                  override: autonomy?.override ?? null,
                  // Empty means "clear it, fall back to the built-in prompt".
                  prompt: prompt.trim() === "" ? null : prompt,
                },
                // Hand control back to the server value once it's saved.
                { onSuccess: () => setPromptEdit(null) },
              )
            }
            disabled={setChatAutonomy.isPending || prompt === serverPrompt}
          >
            {t("personalAccount.savePrompt")}
          </Button>
          {setChatAutonomy.isError && (
            <MessageBar intent="error">
              <MessageBarBody>{errorMessage(setChatAutonomy.error, t("personalAccount.promptFailed"))}</MessageBarBody>
            </MessageBar>
          )}
        </div>
      </Field>

      <div>
        <Button onClick={() => summarize.mutate({ chatId: chat.native_chat_id }, { onSuccess: (d) => setSummary(d.summary) })} disabled={summarize.isPending}>
          {t("personalAccount.summarize")}
        </Button>
        {summarize.isError && (
          <MessageBar intent="error">
            <MessageBarBody>{errorMessage(summarize.error, t("personalAccount.summarizeFailed"))}</MessageBarBody>
          </MessageBar>
        )}
        {summary && <Body1 style={{ whiteSpace: "pre-wrap", display: "block", marginTop: "8px" }}>{summary}</Body1>}
      </div>

      <Field label={t("personalAccount.sendMessage")}>
        <Textarea value={message} onChange={(_, d) => setMessage(d.value)} rows={2} />
      </Field>
      {send.isError && (
        <MessageBar intent="error">
          <MessageBarBody>{errorMessage(send.error, t("personalAccount.sendFailed"))}</MessageBarBody>
        </MessageBar>
      )}
      <Dialog open={confirmOpen} onOpenChange={(_, d) => setConfirmOpen(d.open)}>
        <DialogTrigger disableButtonEnhancement>
          <Button appearance="primary" disabled={message.trim().length === 0} style={{ alignSelf: "flex-start" }}>
            {t("personalAccount.send")}
          </Button>
        </DialogTrigger>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{t("personalAccount.confirmSendTitle")}</DialogTitle>
            <DialogContent>
              <Body1>{t("personalAccount.confirmSendBody", { chat: chat.title })}</Body1>
              <div style={{ marginTop: "10px", padding: "10px", borderRadius: "4px", background: "var(--colorNeutralBackground3, #f3f2f1)", whiteSpace: "pre-wrap" }}>
                {message}
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setConfirmOpen(false)}>
                {t("personalAccount.cancel")}
              </Button>
              <Button
                appearance="primary"
                disabled={send.isPending}
                onClick={() =>
                  send.mutate(
                    { chatId: chat.native_chat_id, message: message.trim() },
                    { onSuccess: () => { setMessage(""); setConfirmOpen(false); } },
                  )
                }
              >
                {send.isPending ? t("personalAccount.sending") : t("personalAccount.send")}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}

function ChatBrowser() {
  const [query, setQuery] = useState("");
  const { data, isPending } = useTelegramUserChats(query);
  const [selected, setSelected] = useState<ChatMatch | null>(null);

  return (
    <Section
      title={t("personalAccount.chats")}
      action={<SearchBox aria-label={t("personalAccount.searchChats")} placeholder={t("personalAccount.searchChats")} value={query} onChange={(_, d) => setQuery(d.value ?? "")} />}
    >
      {isPending && <Spinner label={t("personalAccount.loadingChats")} />}
      {data && data.chats.length === 0 && <EmptyState text={t("personalAccount.noChats")} />}
      {data && data.chats.length > 0 && (
        <Table size="small">
          <TableBody>
            {data.chats.map((c) => (
              <TableRow key={c.native_chat_id} {...clickableRowProps(() => setSelected(selected?.native_chat_id === c.native_chat_id ? null : c))}>
                <TableCell>
                  <TableCellLayout>
                    <Text weight={selected?.native_chat_id === c.native_chat_id ? "bold" : "regular"}>{c.title}</Text>
                  </TableCellLayout>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {selected && <ChatDetail key={selected.native_chat_id} chat={selected} />}
    </Section>
  );
}

export default function PersonalAccountPage() {
  const s = useCommonStyles();
  const { data: session } = useSession();
  const { data: status, isError: statusError, error } = useTelegramUserStatus();
  const logout = useTelegramUserLogout();

  if (session?.authenticated && !session.roles.owner) {
    return (
      <div className={s.page}>
        <PageHeader title={t("personalAccount.title")} description={t("personalAccount.ownerOnlyDescription")} />
        <MessageBar intent="warning">
          <MessageBarBody>{t("personalAccount.ownerOnlyWarning")}</MessageBarBody>
        </MessageBar>
      </div>
    );
  }

  if (statusError && error instanceof ApiError && error.status === 404) {
    return (
      <div className={s.page}>
        <PageHeader title={t("personalAccount.title")} description={t("personalAccount.description")} />
        <MessageBar intent="info">
          <MessageBarBody>{t("personalAccount.notConfigured")}</MessageBarBody>
        </MessageBar>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <PageHeader title={t("personalAccount.title")} description={t("personalAccount.description")} />

      {!status && <Spinner label={t("personalAccount.loadingStatus")} />}

      {status && status.auth_state !== "ready" && <LoginFlow authState={status.auth_state} />}

      {status && status.auth_state === "ready" && (
        <>
          <Section title={t("personalAccount.status")}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Caption1>{t("personalAccount.connected")}</Caption1>
              <Button onClick={() => logout.mutate()} disabled={logout.isPending}>
                {t("personalAccount.logout")}
              </Button>
            </div>
          </Section>

          <AutonomySection />
          <DraftsSection />
          <ChatBrowser />
        </>
      )}
    </div>
  );
}
