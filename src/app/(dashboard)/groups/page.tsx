"use client";

import { useMyChats } from "@/hooks/useMyChats";
import { clickableRowProps, EmptyState, PageHeader, PlatformBadge, Section, useCommonStyles } from "@/components/ui-kit";
import { t } from "@/lib/i18n";
import { Spinner, Table, TableBody, TableCell, TableCellLayout, TableHeader, TableHeaderCell, TableRow, Text } from "@fluentui/react-components";
import { useRouter } from "next/navigation";

export default function GroupsPage() {
  const s = useCommonStyles();
  const router = useRouter();
  const { data, isPending, isError } = useMyChats();

  return (
    <div className={s.page}>
      <PageHeader title={t("groups.title")} description={t("groups.description")} />

      {isPending && <Spinner label={t("groups.loading")} />}
      {isError && <Section title={t("groups.title")}>{t("groups.loadFailed")}</Section>}

      {data && (
        <Section title={data.items.length === 1 ? t("groups.countOne") : t("groups.countOther", { count: data.items.length })}>
          {data.items.length === 0 && <EmptyState text={t("groups.noneAdmin")} />}
          {data.items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>{t("groups.columnChat")}</TableHeaderCell>
                  <TableHeaderCell>{t("groups.columnPlatform")}</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((chat) => (
                  <TableRow
                    key={chat.id}
                    className={s.clickableRow}
                    {...clickableRowProps(() => router.push(`/groups/${chat.id}`))}
                  >
                    <TableCell>
                      <TableCellLayout>
                        <Text weight="semibold">{chat.title ?? chat.native_chat_id}</Text>
                      </TableCellLayout>
                    </TableCell>
                    <TableCell>
                      <PlatformBadge platform={chat.platform} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>
      )}
    </div>
  );
}
