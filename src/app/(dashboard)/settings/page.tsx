"use client";

import { MySettings, useMySettings, useSetMySettings } from "@/hooks/useMySettings";
import { PageHeader, Section, ToggleButtonGroup, useCommonStyles } from "@/components/ui-kit";
import { t } from "@/lib/i18n";
import { Button, Field, Input, Spinner } from "@fluentui/react-components";
import { useState } from "react";

const dateFormats: { value: MySettings["date_format"]; label: string }[] = [
  { value: "mdy", label: t("settings.dateFormatMdy") },
  { value: "dmy", label: t("settings.dateFormatDmy") },
  { value: "ymd", label: t("settings.dateFormatYmd") },
];

const timeFormats: { value: MySettings["time_format"]; label: string }[] = [
  { value: "h24", label: t("settings.timeFormatH24") },
  { value: "h12", label: t("settings.timeFormatH12") },
];

function formatOffset(minutes: number) {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}${m ? ":" + String(m).padStart(2, "0") : ""}`;
}

function parseOffset(text: string): number | null {
  const match = /^([+-])(\d{1,2})(?::(\d{2}))?$/.exec(text.trim());
  if (!match) return null;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = match[3] ? Number(match[3]) : 0;
  if (hours > 14 || minutes > 59) return null;
  return sign * (hours * 60 + minutes);
}

/** Seeds its editable state directly from `initial` (no effect needed --
 * mounted fresh, via `key`, whenever the loaded data actually changes). */
function SettingsForm({ initial }: { initial: MySettings }) {
  const setSettings = useSetMySettings();

  const [offsetText, setOffsetText] = useState(formatOffset(initial.utc_offset_minutes));
  const [dateFormat, setDateFormat] = useState(initial.date_format);
  const [timeFormat, setTimeFormat] = useState(initial.time_format);

  const offsetMinutes = parseOffset(offsetText);
  const offsetInvalid = offsetMinutes === null;

  const save = () => {
    if (offsetMinutes === null) return;
    setSettings.mutate({ utc_offset_minutes: offsetMinutes, date_format: dateFormat, time_format: timeFormat });
  };

  return (
    <Section title={t("settings.timezoneFormatting")}>
      <Field
        label={t("settings.utcOffset")}
        hint={t("settings.utcOffsetHint")}
        validationState={offsetInvalid ? "error" : "none"}
        validationMessage={offsetInvalid ? t("settings.utcOffsetError") : undefined}
      >
        <Input value={offsetText} onChange={(_, d) => setOffsetText(d.value)} />
      </Field>

      <Field label={t("settings.dateFormat")}>
        <ToggleButtonGroup ariaLabel={t("settings.dateFormat")} value={dateFormat} options={dateFormats} onChange={setDateFormat} />
      </Field>

      <Field label={t("settings.timeFormat")}>
        <ToggleButtonGroup ariaLabel={t("settings.timeFormat")} value={timeFormat} options={timeFormats} onChange={setTimeFormat} />
      </Field>

      <Button
        appearance="primary"
        disabled={offsetInvalid || setSettings.isPending}
        onClick={save}
        style={{ alignSelf: "flex-start" }}
      >
        {t("settings.save")}
      </Button>
    </Section>
  );
}

export default function SettingsPage() {
  const s = useCommonStyles();
  const { data, isPending, isError } = useMySettings();

  return (
    <div className={s.page}>
      <PageHeader title={t("settings.title")} description={t("settings.description")} />

      {isPending && <Spinner label={t("settings.loading")} />}
      {isError && <Section title={t("settings.title")}>{t("settings.loadFailed")}</Section>}
      {data && <SettingsForm key={JSON.stringify(data)} initial={data} />}
    </div>
  );
}
