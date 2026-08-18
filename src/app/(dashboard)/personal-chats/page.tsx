"use client";

import { useState } from "react";
import {
  Body1,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  MessageBar,
  MessageBarBody,
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
  Textarea,
} from "@fluentui/react-components";
import Link from "next/link";
import { PageHeader, Section, TableScroll, useCommonStyles } from "@/components/ui-kit";
import { t } from "@/lib/i18n";
import { useSession } from "@/hooks/useSession";
import { ApiError } from "@/lib/api";
import {
  TelegramUserChat,
  useSendTelegramUserMessage,
  useSummarizeTelegramUserChat,
  useTelegramUserChats,
} from "@/hooks/useTelegramUserChats";
import { useTelegramUserStatus } from "@/hooks/useTelegramUserLogin";

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export default function PersonalChatsPage() {
  const s = useCommonStyles();
  const { data: session } = useSession();
  const status = useTelegramUserStatus();
  const [query, setQuery] = useState("");
  const chats = useTelegramUserChats(query);

  const [summarizeTarget, setSummarizeTarget] = useState<TelegramUserChat | null>(null);
  const [sendTarget, setSendTarget] = useState<TelegramUserChat | null>(null);

  // Same double gate `/bot-view` uses: the nav link is already hidden for
  // a non-owner (see `AppShell.tsx`'s `owner` check), this is the
  // belt-and-suspenders case for someone navigating here directly by URL.
  if (session?.authenticated && !session.roles.owner) {
    return (
      <div className={s.page}>
        <PageHeader title={t("personalChats.title")} description={t("personalChats.ownerOnlyDescription")} />
        <MessageBar intent="warning">
          <MessageBarBody>{t("personalChats.ownerOnlyWarning")}</MessageBarBody>
        </MessageBar>
      </div>
    );
  }

  // Renders a real explanation here (not nothing, unlike
  // `TelegramPersonalAccountSection` on Settings) -- that section hides
  // itself because it sits on a page everyone sees regardless; this page
  // only exists because the owner navigated to it directly, so silence
  // would just look broken.
  if (status.notConfigured) {
    return (
      <div className={s.page}>
        <PageHeader title={t("personalChats.title")} description={t("personalChats.description")} />
        <Section title={t("personalChats.title")}>
          <Text>{t("personalChats.notConfigured")}</Text>
        </Section>
      </div>
    );
  }

  const ready = status.data?.auth_state === "ready";

  return (
    <div className={s.page}>
      <PageHeader title={t("personalChats.title")} description={t("personalChats.description")} />

      {status.isPending && <Spinner label={t("personalChats.loading")} />}

      {status.data && !ready && (
        <MessageBar intent="warning">
          <MessageBarBody>
            {t("personalChats.notReady")}{" "}
            <Link href="/settings">{t("personalChats.notReadyLink")}</Link>
          </MessageBarBody>
        </MessageBar>
      )}

      {ready && (
        <Section
          title={
            chats.data
              ? chats.data.chats.length === 1
                ? t("personalChats.countOne")
                : t("personalChats.countOther", { count: chats.data.chats.length })
              : t("personalChats.title")
          }
          action={
            <SearchBox
              aria-label={t("personalChats.filterLabel")}
              placeholder={t("personalChats.filterPlaceholder")}
              value={query}
              onChange={(_, d) => setQuery(d.value ?? "")}
            />
          }
        >
          {chats.isPending && <Spinner label={t("personalChats.loading")} />}
          {chats.isError && <Text>{t("personalChats.loadFailed")}</Text>}
          {chats.data && chats.data.chats.length === 0 && <Text>{t("personalChats.empty")}</Text>}

          {chats.data && chats.data.chats.length > 0 && (
            <TableScroll label={t("personalChats.tableLabel")} minWidth={560}>
              <Table size="small" aria-label={t("personalChats.tableLabel")}>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>{t("personalChats.columnChat")}</TableHeaderCell>
                    <TableHeaderCell>{t("personalChats.columnActions")}</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chats.data.chats.map((c) => (
                    <TableRow key={c.native_chat_id}>
                      <TableCell>
                        <TableCellLayout>
                          <Text weight="semibold">{c.title}</Text>
                        </TableCellLayout>
                      </TableCell>
                      <TableCell>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <Button size="small" onClick={() => setSummarizeTarget(c)}>
                            {t("personalChats.summarizeButton")}
                          </Button>
                          <Button size="small" onClick={() => setSendTarget(c)}>
                            {t("personalChats.sendButton")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableScroll>
          )}
        </Section>
      )}

      <SummarizeDialog target={summarizeTarget} onClose={() => setSummarizeTarget(null)} />
      <SendDialog target={sendTarget} onClose={() => setSendTarget(null)} />
    </div>
  );
}

/** One shared dialog for every row rather than one per row -- `target`
 * (which chat, or `null` for closed) lives in the parent. `key={target.
 * native_chat_id}` on the inner body remounts it fresh for each chat
 * opened, so a stale summary from the previously-viewed chat never
 * flashes before the new one loads. */
function SummarizeDialog({ target, onClose }: { target: TelegramUserChat | null; onClose: () => void }) {
  return (
    <Dialog open={target !== null} onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface>{target && <SummarizeDialogBody key={target.native_chat_id} target={target} onClose={onClose} />}</DialogSurface>
    </Dialog>
  );
}

function SummarizeDialogBody({ target, onClose }: { target: TelegramUserChat; onClose: () => void }) {
  const summarize = useSummarizeTelegramUserChat();

  return (
    <DialogBody>
      <DialogTitle>{t("personalChats.summarizeTitle", { chat: target.title })}</DialogTitle>
      <DialogContent>
        {!summarize.data && !summarize.isPending && !summarize.isError && (
          <Body1>{t("personalChats.summarizeHint")}</Body1>
        )}
        {summarize.isPending && <Spinner label={t("personalChats.summarizing")} />}
        {summarize.isError && (
          <MessageBar intent="error">
            <MessageBarBody>{errorMessage(summarize.error, t("personalChats.summarizeFailed"))}</MessageBarBody>
          </MessageBar>
        )}
        {summarize.data && (
          <div
            style={{
              marginTop: "10px",
              padding: "10px",
              borderRadius: "4px",
              background: "var(--colorNeutralBackground3, #f3f2f1)",
              whiteSpace: "pre-wrap",
            }}
          >
            {summarize.data.summary}
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button appearance="secondary" onClick={onClose}>
          {t("personalChats.close")}
        </Button>
        {!summarize.data && (
          <Button
            appearance="primary"
            disabled={summarize.isPending}
            onClick={() => summarize.mutate({ chat_id: target.native_chat_id })}
          >
            {summarize.isPending ? t("personalChats.summarizing") : t("personalChats.summarizeButton")}
          </Button>
        )}
      </DialogActions>
    </DialogBody>
  );
}

function SendDialog({ target, onClose }: { target: TelegramUserChat | null; onClose: () => void }) {
  return (
    <Dialog open={target !== null} onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface>{target && <SendDialogBody key={target.native_chat_id} target={target} onClose={onClose} />}</DialogSurface>
    </Dialog>
  );
}

function SendDialogBody({ target, onClose }: { target: TelegramUserChat; onClose: () => void }) {
  const [draft, setDraft] = useState("");
  const send = useSendTelegramUserMessage();

  const doSend = () => {
    if (draft.trim().length === 0) return;
    send.mutate({ chat_id: target.native_chat_id, message: draft }, { onSuccess: onClose });
  };

  return (
    <DialogBody>
      <DialogTitle>{t("personalChats.sendTitle", { chat: target.title })}</DialogTitle>
      <DialogContent>
        <Textarea
          aria-label={t("personalChats.messageLabel")}
          placeholder={t("personalChats.messagePlaceholder")}
          value={draft}
          onChange={(_, d) => setDraft(d.value)}
          resize="vertical"
        />
        {send.isError && (
          <MessageBar intent="error">
            <MessageBarBody>{errorMessage(send.error, t("personalChats.sendFailed"))}</MessageBarBody>
          </MessageBar>
        )}
      </DialogContent>
      <DialogActions>
        <Button appearance="secondary" onClick={onClose}>
          {t("personalChats.cancel")}
        </Button>
        <Button appearance="primary" disabled={draft.trim().length === 0 || send.isPending} onClick={doSend}>
          {send.isPending ? t("personalChats.sending") : t("personalChats.sendButton")}
        </Button>
      </DialogActions>
    </DialogBody>
  );
}
