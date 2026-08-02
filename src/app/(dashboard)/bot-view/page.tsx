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
        <PageHeader title="Bot View" description="Watch a chat live and reply as the bot." />
        <MessageBar intent="warning">
          <MessageBarBody>
            Bot View is owner-only -- it lets whoever uses it post messages real users will see as coming from the bot
            itself, so it isn&apos;t extended to bot admins the way most other admin actions are.
          </MessageBarBody>
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
      <PageHeader
        title="Bot View"
        description="Live incoming messages for a chat, and a confirmation-gated compose box to reply as the bot itself."
      />

      <Section title="Chat">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <Dropdown
            aria-label="Select a chat"
            placeholder={chatsLoading ? "Loading chats..." : "Select a chat"}
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
                {connected ? "Live" : "Reconnecting..."}
              </Badge>
            </>
          )}
        </div>
      </Section>

      {chatId !== null && (
        <>
          <Section title="Live incoming messages">
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
              {events.length === 0 && (
                <Caption1 className={s.muted}>
                  Nothing yet -- new messages sent in this chat will appear here as they arrive.
                </Caption1>
              )}
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

          <Section title="Reply as the bot">
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <MessageBar intent="warning">
                <MessageBarBody>
                  Anything sent below is posted as the bot itself -- real users see it exactly like an automated
                  reply, with no way to tell it came from here.
                </MessageBarBody>
              </MessageBar>
              <Textarea
                aria-label="Message to send as the bot"
                placeholder="Type a message to send as the bot..."
                value={draft}
                onChange={(_, data) => setDraft(data.value)}
                resize="vertical"
              />
              {send.error && (
                <MessageBar intent="error">
                  <MessageBarBody>{errorMessage(send.error, "Failed to send.")}</MessageBarBody>
                </MessageBar>
              )}
              <Dialog open={confirmOpen} onOpenChange={(_, data) => setConfirmOpen(data.open)}>
                <DialogTrigger disableButtonEnhancement>
                  <Button appearance="primary" disabled={draft.trim().length === 0}>
                    Send as bot...
                  </Button>
                </DialogTrigger>
                <DialogSurface>
                  <DialogBody>
                    <DialogTitle>Send this as the bot?</DialogTitle>
                    <DialogContent>
                      <Body1>
                        This will be posted in <strong>{selectedChat?.title ?? selectedChat?.native_chat_id}</strong>{" "}
                        exactly as if the bot sent it automatically -- real users won&apos;t be able to tell it came
                        from you.
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
                        Cancel
                      </Button>
                      <Button appearance="primary" disabled={send.isPending} onClick={doSend}>
                        {send.isPending ? "Sending..." : "Send"}
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
