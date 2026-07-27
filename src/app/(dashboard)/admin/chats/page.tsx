"use client";

import { useChats } from "@/hooks/useAdminDirectory";
import {
  Badge,
  Body1,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableCellLayout,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Title2,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { useRouter } from "next/navigation";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  row: {
    cursor: "pointer",
  },
});

export default function AdminChatsPage() {
  const styles = useStyles();
  const router = useRouter();
  const { data, isPending, isError } = useChats();

  return (
    <div className={styles.root}>
      <Title2>Chats</Title2>
      <Body1>Every chat the bot has ever seen a message in, bot-wide (not just chats you administer).</Body1>

      {isPending && <Spinner label="Loading chats..." />}
      {isError && <Body1>Failed to load chats.</Body1>}

      {data && (
        <Table>
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
            {data.items.map((chat) => (
              <TableRow key={chat.id} className={styles.row} onClick={() => router.push(`/admin/chats/${chat.id}`)}>
                <TableCell>
                  <TableCellLayout>{chat.title ?? chat.native_chat_id}</TableCellLayout>
                </TableCell>
                <TableCell>{chat.platform}</TableCell>
                <TableCell>{chat.member_count}</TableCell>
                <TableCell>{chat.message_count}</TableCell>
                <TableCell>
                  {chat.digest_enabled && (
                    <Badge appearance="tint" color="brand">
                      On
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
