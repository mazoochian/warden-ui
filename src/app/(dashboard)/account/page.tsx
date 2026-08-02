"use client";

import { useInvalidateSession } from "@/hooks/useSession";
import { SessionListItem, useRevokeSession, useSessions } from "@/hooks/useSessions";
import { PageHeader, Section, useCommonStyles } from "@/components/ui-kit";
import { t } from "@/lib/i18n";
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
          {session.user_agent ?? t("account.unknownDevice")}
          {session.current && (
            <Badge appearance="filled" color="brand" style={{ marginLeft: tokens.spacingHorizontalS }}>
              {t("account.thisDevice")}
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
          {session.current ? t("account.logOut") : t("account.revoke")}
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
      <PageHeader title={t("account.title")} description={t("account.description")} />

      {isPending && <Spinner label={t("account.loading")} />}
      {isError && <Section title={t("account.title")}>{t("account.loadFailed")}</Section>}

      {data && (
        <Section title={data.items.length === 1 ? t("account.sessionCountOne") : t("account.sessionCountOther", { count: data.items.length })}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>{t("account.columnDevice")}</TableHeaderCell>
                <TableHeaderCell>{t("account.columnSignedIn")}</TableHeaderCell>
                <TableHeaderCell>{t("account.columnExpires")}</TableHeaderCell>
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
