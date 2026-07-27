"use client";

import { useMyChats } from "@/hooks/useMyChats";
import { EmptyState, PageHeader, PlatformBadge, Section, useCommonStyles } from "@/components/ui-kit";
import { Spinner, Table, TableBody, TableCell, TableCellLayout, TableHeader, TableHeaderCell, TableRow, Text } from "@fluentui/react-components";
import { useRouter } from "next/navigation";

export default function GroupsPage() {
  const s = useCommonStyles();
  const router = useRouter();
  const { data, isPending, isError } = useMyChats();

  return (
    <div className={s.page}>
      <PageHeader
        title="My Groups"
        description="Chats you currently administer -- live-checked against the platform every time, not cached, so a demotion there takes effect here immediately too."
      />

      {isPending && <Spinner label="Loading groups..." />}
      {isError && <Section title="Groups">Failed to load groups.</Section>}

      {data && (
        <Section title={`${data.items.length} group${data.items.length === 1 ? "" : "s"}`}>
          {data.items.length === 0 && <EmptyState text="You're not a live admin of any chat the bot knows about." />}
          {data.items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Chat</TableHeaderCell>
                  <TableHeaderCell>Platform</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((chat) => (
                  <TableRow key={chat.id} className={s.clickableRow} onClick={() => router.push(`/groups/${chat.id}`)}>
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
