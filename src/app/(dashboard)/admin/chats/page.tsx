"use client";

import { useChats } from "@/hooks/useAdminDirectory";
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
      <PageHeader
        title="Chats"
        description="Every chat the bot has ever seen a message in, bot-wide (not just chats you administer)."
      />

      {isPending && <Spinner label="Loading chats..." />}
      {isError && <Section title="Chats">Failed to load chats.</Section>}

      {rows && (
        <Section
          title={`${rows.length} chat${rows.length === 1 ? "" : "s"}`}
          action={<SearchBox placeholder="Filter" value={query} onChange={(_, d) => setQuery(d.value ?? "")} />}
        >
          <Table size="small" aria-label="Chats">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Chat</TableHeaderCell>
                <TableHeaderCell>Platform</TableHeaderCell>
                <TableHeaderCell>Members</TableHeaderCell>
                <TableHeaderCell>Messages</TableHeaderCell>
                <TableHeaderCell>Digest</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((chat) => (
                <TableRow key={chat.id} className={s.clickableRow} onClick={() => router.push(`/admin/chats/${chat.id}`)}>
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
                      {chat.digest_enabled ? "On" : "Off"}
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
