"use client";

import { useState } from "react";
import {
  Body1,
  Button,
  Dropdown,
  Field,
  Input,
  Link,
  MessageBar,
  MessageBarBody,
  Option,
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
import { EmptyState, PageHeader, Section, useCommonStyles } from "@/components/ui-kit";
import { useMyChats } from "@/hooks/useMyChats";
import { ApiError } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useCreateWatch, useDeleteWatch, useWatches } from "@/hooks/useWatches";

function NewWatchForm() {
  const s = useCommonStyles();
  const { data: chats } = useMyChats();
  const createWatch = useCreateWatch();

  const [chatId, setChatId] = useState<number | undefined>(undefined);
  const [feedUrl, setFeedUrl] = useState("");

  const chatOptions = chats?.items ?? [];
  const canSubmit = Boolean(chatId) && /^https?:\/\//.test(feedUrl.trim());

  const submit = () => {
    if (!chatId) return;
    createWatch.mutate({ chat_id: chatId, feed_url: feedUrl.trim() }, { onSuccess: () => setFeedUrl("") });
  };

  return (
    <Section title={t("watches.newWatch")}>
      <div className={s.formGrid}>
        <Field label={t("watches.chatLabel")}>
          <Dropdown
            placeholder={t("watches.selectChat")}
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
        </Field>

        <Field label={t("watches.feedUrlLabel")}>
          <Input value={feedUrl} onChange={(_, d) => setFeedUrl(d.value)} placeholder={t("watches.feedUrlPlaceholder")} />
        </Field>
      </div>

      {createWatch.isError && (
        <MessageBar intent="error">
          <MessageBarBody>{createWatch.error instanceof ApiError ? createWatch.error.message : t("watches.createFailed")}</MessageBarBody>
        </MessageBar>
      )}

      <Button appearance="primary" disabled={!canSubmit || createWatch.isPending} onClick={submit} style={{ alignSelf: "flex-start" }}>
        {t("watches.add")}
      </Button>
    </Section>
  );
}

export default function WatchesPage() {
  const s = useCommonStyles();
  const { data, isPending, isError } = useWatches();
  const deleteWatch = useDeleteWatch();

  return (
    <div className={s.page}>
      <PageHeader title={t("watches.title")} description={t("watches.description")} />

      <NewWatchForm />

      <Section title={t("watches.watching")}>
        {isPending && <Spinner label={t("watches.loading")} />}
        {isError && <Body1>{t("watches.loadFailed")}</Body1>}
        {data && data.items.length === 0 && <EmptyState text={t("watches.none")} />}
        {data && data.items.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>{t("watches.columnChat")}</TableHeaderCell>
                <TableHeaderCell>{t("watches.columnFeed")}</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <TableCellLayout>
                      <Text weight="semibold">{w.chat_title ?? `Chat #${w.chat_id}`}</Text>
                    </TableCellLayout>
                  </TableCell>
                  <TableCell>
                    <Link href={w.feed_url} target="_blank" rel="noreferrer">
                      {w.feed_url}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => deleteWatch.mutate(w.id)} disabled={deleteWatch.isPending}>
                      {t("watches.unwatch")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}
