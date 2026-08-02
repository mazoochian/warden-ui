"use client";

import { useChats } from "@/hooks/useAdminDirectory";
import { clickableRowProps, PageHeader, PlatformBadge, Section, useCommonStyles } from "@/components/ui-kit";
import { t } from "@/lib/i18n";
import {
  Badge,
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
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminChatsPage() {
  const s = useCommonStyles();
  const router = useRouter();
  const { data, isPending, isError } = useChats();
  const [query, setQuery] = useState("");

  const rows = data?.items.filter((c) => (c.title ?? c.native_chat_id).toLowerCase().includes(query.toLowerCase()));

  return (
    <div className={s.page}>
      <PageHeader title={t("adminChats.title")} description={t("adminChats.description")} />

      {isPending && <Spinner label={t("adminChats.loading")} />}
      {isError && <Section title={t("adminChats.title")}>{t("adminChats.loadFailed")}</Section>}

      {rows && (
        <Section
          title={rows.length === 1 ? t("adminChats.countOne") : t("adminChats.countOther", { count: rows.length })}
          action={
            <SearchBox
              aria-label={t("adminChats.filterLabel")}
              placeholder={t("adminChats.filterPlaceholder")}
              value={query}
              onChange={(_, d) => setQuery(d.value ?? "")}
            />
          }
        >
          <Table size="small" aria-label={t("adminChats.tableLabel")}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>{t("adminChats.columnChat")}</TableHeaderCell>
                <TableHeaderCell>{t("adminChats.columnPlatform")}</TableHeaderCell>
                <TableHeaderCell>{t("adminChats.columnMembers")}</TableHeaderCell>
                <TableHeaderCell>{t("adminChats.columnMessages")}</TableHeaderCell>
                <TableHeaderCell>{t("adminChats.columnDigest")}</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((chat) => (
                <TableRow
                  key={chat.id}
                  className={s.clickableRow}
                  {...clickableRowProps(() => router.push(`/admin/chats/${chat.id}`))}
                >
                  <TableCell>
                    <TableCellLayout>
                      <Text weight="semibold">{chat.title ?? chat.native_chat_id}</Text>
                    </TableCellLayout>
                  </TableCell>
                  <TableCell>
                    <PlatformBadge platform={chat.platform} />
                  </TableCell>
                  <TableCell>{chat.member_count.toLocaleString()}</TableCell>
                  <TableCell>{chat.message_count.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge appearance="tint" color={chat.digest_enabled ? "success" : "informative"} shape="square">
                      {chat.digest_enabled ? t("adminChats.digestOn") : t("adminChats.digestOff")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}
    </div>
  );
}
