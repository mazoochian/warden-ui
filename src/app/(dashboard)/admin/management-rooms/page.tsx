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
} from "@fluentui/react-components";
import { EmptyState, PageHeader, PlatformBadge, Section, useCommonStyles } from "@/components/ui-kit";
import { useChats } from "@/hooks/useAdminDirectory";
import { useBindManagementRoom, useManagementRooms, useUnbindManagementRoom } from "@/hooks/useManagementRooms";
import { ApiError } from "@/lib/api";
import { t } from "@/lib/i18n";

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

function formatCreatedAt(seconds: number) {
  return new Date(seconds * 1000).toLocaleString();
}

function chatLabel(title: string | null, nativeChatId: string) {
  return title ?? nativeChatId;
}

function BindForm() {
  const s = useCommonStyles();
  const { data: chats } = useChats();
  const bind = useBindManagementRoom();

  const [controlChatId, setControlChatId] = useState<number | undefined>(undefined);
  const [targetChatId, setTargetChatId] = useState<number | undefined>(undefined);

  const chatOptions = chats?.items ?? [];
  const canSubmit = Boolean(controlChatId) && Boolean(targetChatId) && controlChatId !== targetChatId;

  const submit = () => {
    if (!controlChatId || !targetChatId) return;
    bind.mutate({ control_chat_id: controlChatId, target_chat_id: targetChatId }, { onSuccess: () => setTargetChatId(undefined) });
  };

  return (
    <Section title={t("adminManagementRooms.newBinding")}>
      <div className={s.formGrid}>
        <Field label={t("adminManagementRooms.controlChat")} hint={t("adminManagementRooms.controlChatHint")}>
          <Dropdown
            placeholder={t("adminManagementRooms.selectChat")}
            selectedOptions={controlChatId ? [String(controlChatId)] : []}
            value={controlChatId ? chatLabel(chatOptions.find((c) => c.id === controlChatId)?.title ?? null, chatOptions.find((c) => c.id === controlChatId)?.native_chat_id ?? "") : ""}
            onOptionSelect={(_, d) => setControlChatId(d.optionValue ? Number(d.optionValue) : undefined)}
          >
            {chatOptions.map((c) => (
              <Option key={c.id} value={String(c.id)} text={chatLabel(c.title, c.native_chat_id)}>
                {chatLabel(c.title, c.native_chat_id)}
              </Option>
            ))}
          </Dropdown>
        </Field>

        <Field label={t("adminManagementRooms.targetChat")} hint={t("adminManagementRooms.targetChatHint")}>
          <Dropdown
            placeholder={t("adminManagementRooms.selectChat")}
            selectedOptions={targetChatId ? [String(targetChatId)] : []}
            value={targetChatId ? chatLabel(chatOptions.find((c) => c.id === targetChatId)?.title ?? null, chatOptions.find((c) => c.id === targetChatId)?.native_chat_id ?? "") : ""}
            onOptionSelect={(_, d) => setTargetChatId(d.optionValue ? Number(d.optionValue) : undefined)}
          >
            {chatOptions.map((c) => (
              <Option key={c.id} value={String(c.id)} text={chatLabel(c.title, c.native_chat_id)}>
                {chatLabel(c.title, c.native_chat_id)}
              </Option>
            ))}
          </Dropdown>
        </Field>
      </div>

      {bind.isError && (
        <MessageBar intent="error">
          <MessageBarBody>{errorMessage(bind.error, t("adminManagementRooms.bindFailed"))}</MessageBarBody>
        </MessageBar>
      )}

      <Button appearance="primary" disabled={!canSubmit || bind.isPending} onClick={submit} style={{ alignSelf: "flex-start" }}>
        {t("adminManagementRooms.bind")}
      </Button>
    </Section>
  );
}

export default function AdminManagementRoomsPage() {
  const s = useCommonStyles();
  const { data, isPending, isError } = useManagementRooms();
  const unbind = useUnbindManagementRoom();

  return (
    <div className={s.page}>
      <PageHeader title={t("adminManagementRooms.title")} description={t("adminManagementRooms.description")} />

      <BindForm />

      <Section title={t("adminManagementRooms.bindings")}>
        {isPending && <Spinner label={t("adminManagementRooms.loading")} />}
        {isError && <Body1>{t("adminManagementRooms.loadFailed")}</Body1>}
        {data && data.items.length === 0 && <EmptyState text={t("adminManagementRooms.none")} />}
        {data && data.items.length > 0 && (
          <Table size="small">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>{t("adminManagementRooms.columnControl")}</TableHeaderCell>
                <TableHeaderCell>{t("adminManagementRooms.columnTarget")}</TableHeaderCell>
                <TableHeaderCell>{t("adminManagementRooms.columnPlatform")}</TableHeaderCell>
                <TableHeaderCell>{t("adminManagementRooms.columnBound")}</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((b) => (
                <TableRow key={`${b.control_chat_id}-${b.target_chat_id}`}>
                  <TableCell>
                    <TableCellLayout>
                      <Text weight="semibold">{chatLabel(b.control_title, b.control_native_chat_id)}</Text>
                    </TableCellLayout>
                  </TableCell>
                  <TableCell>{chatLabel(b.target_title, b.target_native_chat_id)}</TableCell>
                  <TableCell>
                    <PlatformBadge platform={b.control_platform} />
                  </TableCell>
                  <TableCell>{formatCreatedAt(b.created_at)}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => unbind.mutate({ controlChatId: b.control_chat_id, targetChatId: b.target_chat_id })}
                      disabled={unbind.isPending}
                    >
                      {t("adminManagementRooms.unbind")}
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
