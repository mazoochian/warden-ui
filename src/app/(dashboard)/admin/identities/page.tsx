"use client";

import { useIdentities } from "@/hooks/useAdminDirectory";
import { PageHeader, PlatformBadge, Section, useCommonStyles } from "@/components/ui-kit";
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
  return seconds ? new Date(seconds * 1000).toLocaleString() : "never";
}

export default function AdminIdentitiesPage() {
  const s = useCommonStyles();
  const router = useRouter();
  const { data, isPending, isError } = useIdentities();
  const [query, setQuery] = useState("");

  const rows = data?.items.filter((i) => i.display_name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className={s.page}>
      <PageHeader title="Users" description="Every real person the bot has seen, bot-wide (excludes bot accounts)." />

      {isPending && <Spinner label="Loading users..." />}
      {isError && <Section title="Users">Failed to load users.</Section>}

      {rows && (
        <Section
          title={`${rows.length} user${rows.length === 1 ? "" : "s"}`}
          action={<SearchBox placeholder="Filter" value={query} onChange={(_, d) => setQuery(d.value ?? "")} />}
        >
          <Table size="small" aria-label="Users">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>User</TableHeaderCell>
                <TableHeaderCell>Platform</TableHeaderCell>
                <TableHeaderCell>Credits</TableHeaderCell>
                <TableHeaderCell>Last seen</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((identity) => (
                <TableRow
                  key={identity.id}
                  className={s.clickableRow}
                  onClick={() => router.push(`/admin/identities/${identity.id}`)}
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
                        Bot admin
                      </Badge>
                    )}
                    {identity.is_allowed && (
                      <Badge appearance="tint" shape="square">
                        Allowed
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
