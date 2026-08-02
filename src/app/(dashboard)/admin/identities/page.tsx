"use client";

import { useIdentities } from "@/hooks/useAdminDirectory";
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
  tokens,
} from "@fluentui/react-components";
import { useState } from "react";
import { useRouter } from "next/navigation";

function formatLastSeen(seconds: number | null) {
  return seconds ? new Date(seconds * 1000).toLocaleString() : t("adminIdentities.never");
}

export default function AdminIdentitiesPage() {
  const s = useCommonStyles();
  const router = useRouter();
  const { data, isPending, isError } = useIdentities();
  const [query, setQuery] = useState("");

  const rows = data?.items.filter((i) => i.display_name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className={s.page}>
      <PageHeader title={t("adminIdentities.title")} description={t("adminIdentities.description")} />

      {isPending && <Spinner label={t("adminIdentities.loading")} />}
      {isError && <Section title={t("adminIdentities.title")}>{t("adminIdentities.loadFailed")}</Section>}

      {rows && (
        <Section
          title={rows.length === 1 ? t("adminIdentities.countOne") : t("adminIdentities.countOther", { count: rows.length })}
          action={
            <SearchBox
              aria-label={t("adminIdentities.filterLabel")}
              placeholder={t("adminIdentities.filterPlaceholder")}
              value={query}
              onChange={(_, d) => setQuery(d.value ?? "")}
            />
          }
        >
          <Table size="small" aria-label={t("adminIdentities.tableLabel")}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>{t("adminIdentities.columnUser")}</TableHeaderCell>
                <TableHeaderCell>{t("adminIdentities.columnPlatform")}</TableHeaderCell>
                <TableHeaderCell>{t("adminIdentities.columnCredits")}</TableHeaderCell>
                <TableHeaderCell>{t("adminIdentities.columnLastSeen")}</TableHeaderCell>
                <TableHeaderCell>{t("adminIdentities.columnStatus")}</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((identity) => (
                <TableRow
                  key={identity.id}
                  className={s.clickableRow}
                  {...clickableRowProps(() => router.push(`/admin/identities/${identity.id}`))}
                >
                  <TableCell>
                    <TableCellLayout>
                      <Text weight="semibold">{identity.display_name}</Text>
                      {identity.username && <span> (@{identity.username})</span>}
                    </TableCellLayout>
                  </TableCell>
                  <TableCell>
                    <PlatformBadge platform={identity.platform} />
                  </TableCell>
                  <TableCell>{identity.credits.toLocaleString()}</TableCell>
                  <TableCell>{formatLastSeen(identity.last_seen)}</TableCell>
                  <TableCell>
                    {identity.is_bot_admin && (
                      <Badge appearance="filled" color="brand" shape="square" style={{ marginRight: tokens.spacingHorizontalXS }}>
                        {t("adminIdentities.botAdmin")}
                      </Badge>
                    )}
                    {identity.is_allowed && (
                      <Badge appearance="tint" shape="square">
                        {t("adminIdentities.allowed")}
                      </Badge>
                    )}
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
