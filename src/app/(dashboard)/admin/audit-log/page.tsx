"use client";

import { useState } from "react";
import {
  Body1,
  Button,
  Caption1,
  Input,
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
import { t } from "@/lib/i18n";
import { useAuditLog } from "@/hooks/useAuditLog";

function formatAt(ts: number) {
  return new Date(ts * 1000).toLocaleString();
}

export default function AuditLogPage() {
  const s = useCommonStyles();
  const [actionFilter, setActionFilter] = useState("");
  const [cursors, setCursors] = useState<(number | null)[]>([null]);
  const cursor = cursors[cursors.length - 1];

  const activeAction = actionFilter.trim().length > 0 ? actionFilter.trim() : null;
  const { data, isLoading } = useAuditLog(cursor, activeAction);

  const resetPaging = () => setCursors([null]);

  return (
    <div className={s.page}>
      <PageHeader title={t("adminAuditLog.title")} description={t("adminAuditLog.description")} />

      <Section title={t("adminAuditLog.filter")}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Input
            aria-label={t("adminAuditLog.filterLabel")}
            placeholder={t("adminAuditLog.filterPlaceholder")}
            value={actionFilter}
            onChange={(_, data) => {
              setActionFilter(data.value);
              resetPaging();
            }}
            style={{ minWidth: "260px" }}
          />
          {actionFilter && (
            <Button
              appearance="subtle"
              onClick={() => {
                setActionFilter("");
                resetPaging();
              }}
            >
              {t("adminAuditLog.clear")}
            </Button>
          )}
        </div>
      </Section>

      <Section title={t("adminAuditLog.entries")}>
        {isLoading && <Body1 className={s.muted}>{t("adminAuditLog.loading")}</Body1>}
        {!isLoading && (data?.items.length ?? 0) === 0 && <EmptyState text={t("adminAuditLog.none")} />}
        {!isLoading && (data?.items.length ?? 0) > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>{t("adminAuditLog.columnWhen")}</TableHeaderCell>
                <TableHeaderCell>{t("adminAuditLog.columnAccount")}</TableHeaderCell>
                <TableHeaderCell>{t("adminAuditLog.columnAction")}</TableHeaderCell>
                <TableHeaderCell>{t("adminAuditLog.columnTarget")}</TableHeaderCell>
                <TableHeaderCell>{t("adminAuditLog.columnDetail")}</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <Caption1>{formatAt(e.at)}</Caption1>
                  </TableCell>
                  <TableCell>
                    <TableCellLayout>{e.account_id ?? <Caption1 className={s.muted}>{t("adminAuditLog.system")}</Caption1>}</TableCellLayout>
                  </TableCell>
                  <TableCell>
                    <Text weight="semibold">{e.action}</Text>
                  </TableCell>
                  <TableCell>{e.target ?? <Caption1 className={s.muted}>{t("adminAuditLog.dash")}</Caption1>}</TableCell>
                  <TableCell>
                    {e.detail ? (
                      <Caption1 style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{e.detail}</Caption1>
                    ) : (
                      <Caption1 className={s.muted}>{t("adminAuditLog.dash")}</Caption1>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
          {cursors.length > 1 && (
            <Button appearance="secondary" onClick={() => setCursors((prev) => prev.slice(0, -1))}>
              {t("adminAuditLog.previousPage")}
            </Button>
          )}
          {data?.next_cursor != null && (
            <Button appearance="secondary" onClick={() => setCursors((prev) => [...prev, data.next_cursor as number])}>
              {t("adminAuditLog.nextPage")}
            </Button>
          )}
        </div>
      </Section>
    </div>
  );
}
