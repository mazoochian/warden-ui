"use client";

import { useInvalidateSession } from "@/hooks/useSession";
import { SessionListItem, useRevokeSession, useSessions } from "@/hooks/useSessions";
import { PageHeader, Section, useCommonStyles } from "@/components/ui-kit";
import {
  Badge,
  Button,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableCellLayout,
  TableHeader,
  TableHeaderCell,
  TableRow,
  tokens,
} from "@fluentui/react-components";
import { DesktopRegular, DismissRegular } from "@fluentui/react-icons";
import { useRouter } from "next/navigation";

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
  const s = useCommonStyles();
  const { data, isPending, isError } = useSessions();

  return (
    <div className={s.page}>
      <PageHeader
        title="Account & Sessions"
        description="Every browser currently signed in to your account. Revoking a session ends it immediately, wherever it is."
      />

      {isPending && <Spinner label="Loading sessions..." />}
      {isError && <Section title="Sessions">Failed to load sessions.</Section>}

      {data && (
        <Section title={`${data.items.length} active session${data.items.length === 1 ? "" : "s"}`}>
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
        </Section>
      )}
    </div>
  );
}
