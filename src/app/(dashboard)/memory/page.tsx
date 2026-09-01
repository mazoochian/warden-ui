"use client";

import { Body1, Button, Spinner, Table, TableBody, TableCell, TableRow, Text } from "@fluentui/react-components";
import { EmptyState, PageHeader, Section, useCommonStyles } from "@/components/ui-kit";
import { useForgetMemory, useMemory } from "@/hooks/useMemory";
import { t } from "@/lib/i18n";

function formatCreatedAt(seconds: number) {
  return new Date(seconds * 1000).toLocaleDateString();
}

export default function MemoryPage() {
  const s = useCommonStyles();
  const { data, isPending, isError } = useMemory();
  const forget = useForgetMemory();

  return (
    <div className={s.page}>
      <PageHeader title={t("memory.title")} description={t("memory.description")} />

      <Section title={t("memory.saved")}>
        {isPending && <Spinner label={t("memory.loading")} />}
        {isError && <Body1>{t("memory.loadFailed")}</Body1>}
        {data && data.items.length === 0 && <EmptyState text={t("memory.none")} />}
        {data && data.items.length > 0 && (
          <Table>
            <TableBody>
              {data.items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell style={{ whiteSpace: "pre-wrap" }}>
                    <Text>{m.text}</Text>
                  </TableCell>
                  <TableCell style={{ whiteSpace: "nowrap" }}>{formatCreatedAt(m.created_at)}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => forget.mutate(m.id)} disabled={forget.isPending}>
                      {t("memory.forget")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}
