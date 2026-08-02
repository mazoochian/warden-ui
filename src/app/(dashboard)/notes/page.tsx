"use client";

import { useState } from "react";
import {
  Body1,
  Button,
  Dropdown,
  Field,
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
  Textarea,
} from "@fluentui/react-components";
import { EmptyState, PageHeader, Section, useCommonStyles } from "@/components/ui-kit";
import { useMyChats } from "@/hooks/useMyChats";
import { ApiError } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useCreateNote, useDeleteNote, useNotes } from "@/hooks/useNotes";

function formatCreatedAt(seconds: number) {
  return new Date(seconds * 1000).toLocaleString();
}

/** Mirrors `/note add <text>` -- a flat freeform primitive covering notes,
 * shopping lists, wishlists, packing lists, etc. (see warden's own
 * `store/notes.zig` doc comment), so this is a plain textarea, not a
 * typed-list builder. */
function NewNoteForm() {
  const s = useCommonStyles();
  const { data: chats } = useMyChats();
  const createNote = useCreateNote();

  const [chatId, setChatId] = useState<number | undefined>(undefined);
  const [text, setText] = useState("");

  const chatOptions = chats?.items ?? [];
  const canSubmit = Boolean(chatId) && text.trim().length > 0 && text.trim().length <= 1000;

  const submit = () => {
    if (!chatId) return;
    createNote.mutate({ chat_id: chatId, text: text.trim() }, { onSuccess: () => setText("") });
  };

  return (
    <Section title={t("notes.newNote")}>
      <div className={s.formGrid}>
        <Field label={t("notes.chatLabel")}>
          <Dropdown
            placeholder={t("notes.selectChat")}
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
      </div>

      <Field label={t("notes.textLabel")} hint={t("notes.textHint", { count: text.length })} validationState={text.length > 1000 ? "error" : "none"}>
        <Textarea value={text} onChange={(_, d) => setText(d.value)} rows={3} />
      </Field>

      {createNote.isError && (
        <MessageBar intent="error">
          <MessageBarBody>{createNote.error instanceof ApiError ? createNote.error.message : t("notes.saveFailed")}</MessageBarBody>
        </MessageBar>
      )}

      <Button appearance="primary" disabled={!canSubmit || createNote.isPending} onClick={submit} style={{ alignSelf: "flex-start" }}>
        {t("notes.addNote")}
      </Button>
    </Section>
  );
}

export default function NotesPage() {
  const s = useCommonStyles();
  const { data, isPending, isError } = useNotes();
  const deleteNote = useDeleteNote();

  return (
    <div className={s.page}>
      <PageHeader title={t("notes.title")} description={t("notes.description")} />

      <NewNoteForm />

      <Section title={t("notes.saved")}>
        {isPending && <Spinner label={t("notes.loading")} />}
        {isError && <Body1>{t("notes.loadFailed")}</Body1>}
        {data && data.items.length === 0 && <EmptyState text={t("notes.none")} />}
        {data && data.items.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>{t("notes.columnChat")}</TableHeaderCell>
                <TableHeaderCell>{t("notes.columnText")}</TableHeaderCell>
                <TableHeaderCell>{t("notes.columnAdded")}</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((n) => (
                <TableRow key={n.id}>
                  <TableCell>
                    <TableCellLayout>
                      <Text weight="semibold">{n.chat_title ?? t("notes.chatFallback", { id: n.chat_id })}</Text>
                    </TableCellLayout>
                  </TableCell>
                  <TableCell style={{ whiteSpace: "pre-wrap" }}>{n.text}</TableCell>
                  <TableCell>{formatCreatedAt(n.created_at)}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => deleteNote.mutate(n.id)} disabled={deleteNote.isPending}>
                      {t("notes.delete")}
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
