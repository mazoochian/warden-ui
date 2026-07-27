"use client";

import { useIdentities } from "@/hooks/useAdminDirectory";
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

function formatLastSeen(seconds: number | null) {
  return seconds ? new Date(seconds * 1000).toLocaleString() : "never";
}

export default function AdminIdentitiesPage() {
  const styles = useStyles();
  const router = useRouter();
  const { data, isPending, isError } = useIdentities();

  return (
    <div className={styles.root}>
      <Title2>Users</Title2>
      <Body1>Every real person the bot has seen, bot-wide (excludes bot accounts).</Body1>

      {isPending && <Spinner label="Loading users..." />}
      {isError && <Body1>Failed to load users.</Body1>}

      {data && (
        <Table>
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
            {data.items.map((identity) => (
              <TableRow
                key={identity.id}
                className={styles.row}
                onClick={() => router.push(`/admin/identities/${identity.id}`)}
              >
                <TableCell>
                  <TableCellLayout>
                    {identity.display_name}
                    {identity.username && <span> (@{identity.username})</span>}
                  </TableCellLayout>
                </TableCell>
                <TableCell>{identity.platform}</TableCell>
                <TableCell>{identity.credits}</TableCell>
                <TableCell>{formatLastSeen(identity.last_seen)}</TableCell>
                <TableCell>
                  {identity.is_bot_admin && (
                    <Badge appearance="filled" color="brand" style={{ marginRight: tokens.spacingHorizontalXS }}>
                      Bot admin
                    </Badge>
                  )}
                  {identity.is_allowed && <Badge appearance="tint">Allowed</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
