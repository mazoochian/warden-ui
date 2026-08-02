"use client";

import { useMemo, useState } from "react";
import {
  Badge,
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
  Dropdown,
  MessageBar,
  MessageBarBody,
  Option,
  Text,
  Textarea,
} from "@fluentui/react-components";
import { PageHeader, PlatformBadge, Section, useCommonStyles } from "@/components/ui-kit";
import { t } from "@/lib/i18n";
import { useMyChats } from "@/hooks/useMyChats";
import { useSession } from "@/hooks/useSession";
import { useAutoScroll, useBotViewFeed, useBotViewSend } from "@/hooks/useBotView";
import { ApiError } from "@/lib/api";

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function BotViewPage() {
  const s = useCommonStyles();
  const { data: session } = useSession();
  const { data: chats, isLoading: chatsLoading } = useMyChats();
  const [chatId, setChatId] = useState<number | null>(null);
  const { events, connected } = useBotViewFeed(chatId);
  const feedRef = useAutoScroll(events.length);
  const send = useBotViewSend();

  const [draft, setDraft] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedChat = useMemo(() => chats?.items.find((c) => c.id === chatId) ?? null, [chats, chatId]);

  if (session?.authenticated && !session.roles.owner) {
    return (
      <div className={s.page}>
        <PageHeader title={t("botView.title")} description={t("botView.ownerOnlyDescription")} />
        <MessageBar intent="warning">
          <MessageBarBody>{t("botView.ownerOnlyWarning")}</MessageBarBody>
        </MessageBar>
      </div>
    );
  }

  const doSend = () => {
    if (chatId === null || draft.trim().length === 0) return;
    send.mutate(
      { chat_id: chatId, text: draft },
      {
        onSuccess: () => {
          setDraft("");
          setConfirmOpen(false);
        },
      },
    );
  };

  return (
    <div className={s.page}>
      <PageHeader title={t("botView.title")} description={t("botView.description")} />

      <Section title={t("botView.chat")}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <Dropdown
            aria-label={t("botView.selectChat")}
            placeholder={chatsLoading ? t("botView.loadingChats") : t("botView.selectChat")}
            value={selectedChat ? (selectedChat.title ?? selectedChat.native_chat_id) : ""}
            selectedOptions={chatId !== null ? [String(chatId)] : []}
            onOptionSelect={(_, data) => setChatId(data.optionValue ? Number(data.optionValue) : null)}
          >
            {chats?.items.map((c) => (
              <Option key={c.id} value={String(c.id)} text={c.title ?? c.native_chat_id}>
                {c.title ?? c.native_chat_id}
              </Option>
            ))}
          </Dropdown>
          {chatId !== null && (
            <>
              {selectedChat && <PlatformBadge platform={selectedChat.platform} />}
              <Badge appearance="tint" color={connected ? "success" : "danger"}>
                {connected ? t("botView.live") : t("botView.reconnecting")}
              </Badge>
            </>
          )}
        </div>
      </Section>

      {chatId !== null && (
        <>
          <Section title={t("botView.liveMessages")}>
            <div
              ref={feedRef}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                maxHeight: "420px",
                overflowY: "auto",
                paddingRight: "4px",
              }}
            >
              {events.length === 0 && <Caption1 className={s.muted}>{t("botView.nothingYet")}</Caption1>}
              {events.map((ev, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                    <Text weight="semibold">{ev.sender}</Text>
                    <Caption1 className={s.muted}>{formatTime(ev.ts)}</Caption1>
                  </div>
                  {ev.text && <Body1>{ev.text}</Body1>}
                </div>
              ))}
            </div>
          </Section>

          <Section title={t("botView.replyAsBot")}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <MessageBar intent="warning">
                <MessageBarBody>{t("botView.replyWarning")}</MessageBarBody>
              </MessageBar>
              <Textarea
                aria-label={t("botView.messageLabel")}
                placeholder={t("botView.messagePlaceholder")}
                value={draft}
                onChange={(_, data) => setDraft(data.value)}
                resize="vertical"
              />
              {send.error && (
                <MessageBar intent="error">
                  <MessageBarBody>{errorMessage(send.error, t("botView.sendFailed"))}</MessageBarBody>
                </MessageBar>
              )}
              <Dialog open={confirmOpen} onOpenChange={(_, data) => setConfirmOpen(data.open)}>
                <DialogTrigger disableButtonEnhancement>
                  <Button appearance="primary" disabled={draft.trim().length === 0}>
                    {t("botView.sendAsBot")}
                  </Button>
                </DialogTrigger>
                <DialogSurface>
                  <DialogBody>
                    <DialogTitle>{t("botView.confirmTitle")}</DialogTitle>
                    <DialogContent>
                      <Body1>
                        {t("botView.confirmBody", { chat: selectedChat?.title ?? selectedChat?.native_chat_id ?? "" })}
                      </Body1>
                      <div
                        style={{
                          marginTop: "10px",
                          padding: "10px",
                          borderRadius: "4px",
                          background: "var(--colorNeutralBackground3, #f3f2f1)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {draft}
                      </div>
                    </DialogContent>
                    <DialogActions>
                      <Button appearance="secondary" onClick={() => setConfirmOpen(false)}>
                        {t("botView.cancel")}
                      </Button>
                      <Button appearance="primary" disabled={send.isPending} onClick={doSend}>
                        {send.isPending ? t("botView.sending") : t("botView.send")}
                      </Button>
                    </DialogActions>
                  </DialogBody>
                </DialogSurface>
              </Dialog>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
