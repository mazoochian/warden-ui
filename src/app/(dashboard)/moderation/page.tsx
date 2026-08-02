"use client";

import { useState } from "react";
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
  SearchBox,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableCellLayout,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
} from "@fluentui/react-components";
import { EmptyState, PageHeader, Section, ToggleButtonGroup, useCommonStyles } from "@/components/ui-kit";
import { useChatMembers, useMyChats, type ChatMember } from "@/hooks/useMyChats";
import { isAdmin, useSession } from "@/hooks/useSession";
import {
  useBan,
  useDemote,
  useKick,
  useMute,
  usePin,
  usePromote,
  useRedact,
  useUnmute,
  useUnpin,
  type RedactInput,
} from "@/hooks/useModeration";
import { ApiError } from "@/lib/api";
import { t } from "@/lib/i18n";

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

function MemberRow({ chatId, member, canPromote }: { chatId: number; member: ChatMember; canPromote: boolean }) {
  const s = useCommonStyles();
  const kick = useKick(chatId);
  const ban = useBan(chatId);
  const mute = useMute(chatId);
  const unmute = useUnmute(chatId);
  const promote = usePromote(chatId);
  const demote = useDemote(chatId);

  const anyPending = kick.isPending || ban.isPending || mute.isPending || unmute.isPending || promote.isPending || demote.isPending;
  const anyError = kick.error ?? ban.error ?? mute.error ?? unmute.error ?? promote.error ?? demote.error;
  const target = { identity_id: member.identity_id };

  return (
    <TableRow>
      <TableCell>
        <TableCellLayout>
          <Text weight="semibold">{member.display_name}</Text>
          {member.username && <Caption1 className={s.muted}> @{member.username}</Caption1>}
        </TableCellLayout>
      </TableCell>
      <TableCell>
        <div className={s.row}>
          <Button size="small" disabled={anyPending} onClick={() => mute.mutate(target)}>
            {t("moderation.mute")}
          </Button>
          <Button size="small" disabled={anyPending} onClick={() => unmute.mutate(target)}>
            {t("moderation.unmute")}
          </Button>
          {canPromote && (
            <Button size="small" disabled={anyPending} onClick={() => promote.mutate(target)}>
              {t("moderation.promote")}
            </Button>
          )}
          {canPromote && (
            <Button size="small" disabled={anyPending} onClick={() => demote.mutate(target)}>
              {t("moderation.demote")}
            </Button>
          )}
          <Button size="small" appearance="outline" disabled={anyPending} onClick={() => kick.mutate(target)}>
            {t("moderation.kick")}
          </Button>
          <Button size="small" appearance="outline" disabled={anyPending} onClick={() => ban.mutate(target)}>
            {t("moderation.ban")}
          </Button>
        </div>
        {anyError && <Caption1 style={{ color: "var(--colorPaletteRedForeground1)" }}>{errorMessage(anyError, t("moderation.actionFailed"))}</Caption1>}
      </TableCell>
    </TableRow>
  );
}

function MembersSection({ chatId, canPromote }: { chatId: number; canPromote: boolean }) {
  const { data, isPending, isError } = useChatMembers(chatId);
  const [query, setQuery] = useState("");

  const members = (data?.items ?? []).filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return m.display_name.toLowerCase().includes(q) || (m.username ?? "").toLowerCase().includes(q);
  });

  return (
    <Section
      title={t("moderation.members")}
      action={
        <SearchBox
          aria-label={t("moderation.searchMembersLabel")}
          placeholder={t("moderation.searchMembersPlaceholder")}
          value={query}
          onChange={(_, d) => setQuery(d.value)}
        />
      }
    >
      {isPending && <Spinner label={t("moderation.loadingMembers")} />}
      {isError && <Body1>{t("moderation.loadMembersFailed")}</Body1>}
      {data && members.length === 0 && <EmptyState text={t("moderation.noMembersMatch")} />}
      {data && members.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>{t("moderation.columnMember")}</TableHeaderCell>
              <TableHeaderCell>{t("moderation.columnActions")}</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <MemberRow key={m.identity_id} chatId={chatId} member={m} canPromote={canPromote} />
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
  );
}

function PinSection({ chatId }: { chatId: number }) {
  const s = useCommonStyles();
  const pin = usePin(chatId);
  const unpin = useUnpin(chatId);
  const [messageId, setMessageId] = useState("");

  return (
    <Section title={t("moderation.pinUnpin")}>
      <Field label={t("moderation.nativeMessageId")} hint={t("moderation.nativeMessageIdHint")}>
        <Input value={messageId} onChange={(_, d) => setMessageId(d.value)} />
      </Field>
      <div className={s.row}>
        <Button appearance="primary" disabled={!messageId.trim() || pin.isPending} onClick={() => pin.mutate({ message_id: messageId.trim() })}>
          {t("moderation.pin")}
        </Button>
        <Button disabled={unpin.isPending} onClick={() => unpin.mutate(undefined)}>
          {t("moderation.unpinCurrent")}
        </Button>
      </div>
      {pin.isError && (
        <MessageBar intent="error">
          <MessageBarBody>{errorMessage(pin.error, t("moderation.pinFailed"))}</MessageBarBody>
        </MessageBar>
      )}
      {unpin.isError && (
        <MessageBar intent="error">
          <MessageBarBody>{errorMessage(unpin.error, t("moderation.unpinFailed"))}</MessageBarBody>
        </MessageBar>
      )}
    </Section>
  );
}

const redactModes = [
  { value: "lastn", label: t("moderation.redactModeLastN") },
  { value: "user", label: t("moderation.redactModeUser") },
  { value: "text", label: t("moderation.redactModeText") },
  { value: "regex", label: t("moderation.redactModeRegex") },
] as const;

function RedactSection({ chatId }: { chatId: number }) {
  const redact = useRedact(chatId);
  const { data: members } = useChatMembers(chatId);

  const [mode, setMode] = useState<(typeof redactModes)[number]["value"]>("lastn");
  const [n, setN] = useState("10");
  const [identityId, setIdentityId] = useState<number | undefined>(undefined);
  const [substring, setSubstring] = useState("");
  const [pattern, setPattern] = useState("");

  const memberOptions = members?.items ?? [];
  const canSubmit =
    mode === "lastn" ? true : mode === "user" ? identityId !== undefined : mode === "text" ? substring.trim().length > 0 : pattern.trim().length > 0;

  const submit = () => {
    const parsedN = Number(n);
    const nValue = Number.isFinite(parsedN) && parsedN > 0 ? parsedN : undefined;
    let input: RedactInput;
    if (mode === "lastn") input = { mode: "lastn", n: nValue };
    else if (mode === "user") {
      if (identityId === undefined) return;
      input = { mode: "user", identity_id: identityId, n: nValue };
    } else if (mode === "text") input = { mode: "text", substring: substring.trim() };
    else input = { mode: "regex", pattern: pattern.trim() };
    redact.mutate(input);
  };

  return (
    <Section title={t("moderation.redact")}>
      <ToggleButtonGroup ariaLabel={t("moderation.redactModeGroupLabel")} value={mode} options={redactModes} onChange={setMode} />

      {(mode === "lastn" || mode === "user") && (
        <Field label={t("moderation.howMany")}>
          <Input type="number" min={1} value={n} onChange={(_, d) => setN(d.value)} style={{ width: 120 }} />
        </Field>
      )}
      {mode === "user" && (
        <Field label={t("moderation.member")}>
          <Dropdown
            placeholder={t("moderation.selectMember")}
            selectedOptions={identityId !== undefined ? [String(identityId)] : []}
            value={memberOptions.find((m) => m.identity_id === identityId)?.display_name ?? ""}
            onOptionSelect={(_, d) => setIdentityId(d.optionValue ? Number(d.optionValue) : undefined)}
          >
            {memberOptions.map((m) => (
              <Option key={m.identity_id} value={String(m.identity_id)} text={m.display_name}>
                {m.display_name}
              </Option>
            ))}
          </Dropdown>
        </Field>
      )}
      {mode === "text" && (
        <Field label={t("moderation.substring")}>
          <Input value={substring} onChange={(_, d) => setSubstring(d.value)} />
        </Field>
      )}
      {mode === "regex" && (
        <Field label={t("moderation.pattern")} hint={t("moderation.patternHint")}>
          <Input value={pattern} onChange={(_, d) => setPattern(d.value)} />
        </Field>
      )}

      {redact.isError && (
        <MessageBar intent="error">
          <MessageBarBody>{errorMessage(redact.error, t("moderation.redactFailed"))}</MessageBarBody>
        </MessageBar>
      )}

      <Button appearance="primary" disabled={!canSubmit || redact.isPending} onClick={submit} style={{ alignSelf: "flex-start" }}>
        {t("moderation.delete")}
      </Button>
    </Section>
  );
}

export default function ModerationPage() {
  const s = useCommonStyles();
  const { data: chats } = useMyChats();
  const { data: session } = useSession();
  const [chatId, setChatId] = useState<number | undefined>(undefined);

  const chatOptions = chats?.items ?? [];
  const canPromote = isAdmin(session) && !!session?.authenticated && session.roles.owner;

  return (
    <div className={s.page}>
      <PageHeader title={t("moderation.title")} description={t("moderation.description")} />

      <Section title={t("moderation.chat")}>
        <Dropdown
          aria-label={t("moderation.selectChat")}
          placeholder={t("moderation.selectChat")}
          selectedOptions={chatId ? [String(chatId)] : []}
          value={chatOptions.find((c) => c.id === chatId)?.title ?? chatOptions.find((c) => c.id === chatId)?.native_chat_id ?? ""}
          onOptionSelect={(_, d) => setChatId(d.optionValue ? Number(d.optionValue) : undefined)}
        >
          {chatOptions.map((c) => (
            <Option key={c.id} value={String(c.id)} text={c.title ?? c.native_chat_id}>
              {c.title ?? c.native_chat_id}
            </Option>
          ))}
        </Dropdown>
      </Section>

      {chatId && (
        <>
          <MembersSection chatId={chatId} canPromote={canPromote} />
          <PinSection chatId={chatId} />
          <RedactSection chatId={chatId} />
        </>
      )}
    </div>
  );
}
