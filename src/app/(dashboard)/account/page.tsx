"use client";

import { useInvalidateSession } from "@/hooks/useSession";
import { SessionListItem, useRevokeSession, useSessions } from "@/hooks/useSessions";
import {
  Badge,
  Body1,
  Button,
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
import { DesktopRegular, DismissRegular } from "@fluentui/react-icons";
import { useRouter } from "next/navigation";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    maxWidth: "800px",
  },
});

function formatTimestamp(seconds: number) {
  return new Date(seconds * 1000).toLocaleString();
}

function SessionRow({ session }: { session: SessionListItem }) {
  const revoke = useRevokeSession();
  const invalidateSession = useInvalidateSession();
  const router = useRouter();

  const handleRevoke = () => {
    revoke.mutate(session.id, {
      onSuccess: () => {
        invalidateSession();
        if (session.current) router.replace("/login");
      },
    });
  };

  return (
    <TableRow>
      <TableCell>
        <TableCellLayout media={<DesktopRegular />}>
          {session.user_agent ?? "Unknown device"}
          {session.current && (
            <Badge appearance="filled" color="brand" style={{ marginLeft: tokens.spacingHorizontalS }}>
              This device
            </Badge>
          )}
        </TableCellLayout>
      </TableCell>
      <TableCell>{formatTimestamp(session.created_at)}</TableCell>
      <TableCell>{formatTimestamp(session.expires_at)}</TableCell>
      <TableCell>
        <Button
          size="small"
          appearance="subtle"
          icon={<DismissRegular />}
          onClick={handleRevoke}
          disabled={revoke.isPending}
        >
          {session.current ? "Log out" : "Revoke"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function AccountPage() {
  const styles = useStyles();
  const { data, isPending, isError } = useSessions();

  return (
    <div className={styles.root}>
      <Title2>Account &amp; Sessions</Title2>
      <Body1>
        Every browser currently signed in to your account. Revoking a session ends it immediately, wherever it is.
      </Body1>

      {isPending && <Spinner label="Loading sessions..." />}
      {isError && <Body1>Failed to load sessions.</Body1>}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Device</TableHeaderCell>
              <TableHeaderCell>Signed in</TableHeaderCell>
              <TableHeaderCell>Expires</TableHeaderCell>
              <TableHeaderCell></TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
