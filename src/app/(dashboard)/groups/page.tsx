"use client";

import { useMyChats } from "@/hooks/useMyChats";
import {
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

export default function GroupsPage() {
  const styles = useStyles();
  const router = useRouter();
  const { data, isPending, isError } = useMyChats();

  return (
    <div className={styles.root}>
      <Title2>My Groups</Title2>
      <Body1>
        Chats you currently administer -- live-checked against the platform every time, not cached, so a demotion
        there takes effect here immediately too.
      </Body1>

      {isPending && <Spinner label="Loading groups..." />}
      {isError && <Body1>Failed to load groups.</Body1>}
      {data?.items.length === 0 && <Body1>You&apos;re not a live admin of any chat the bot knows about.</Body1>}

      {data && data.items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Chat</TableHeaderCell>
              <TableHeaderCell>Platform</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((chat) => (
              <TableRow key={chat.id} className={styles.row} onClick={() => router.push(`/groups/${chat.id}`)}>
                <TableCell>
                  <TableCellLayout>{chat.title ?? chat.native_chat_id}</TableCellLayout>
                </TableCell>
                <TableCell>{chat.platform}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
