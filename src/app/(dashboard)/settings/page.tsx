"use client";

import { MySettings, useMySettings, useSetMySettings } from "@/hooks/useMySettings";
import { Body1, Button, Field, Input, Spinner, Title2, makeStyles, tokens } from "@fluentui/react-components";
import { useState } from "react";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
    maxWidth: "500px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  choices: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
  },
});

const dateFormats: { value: MySettings["date_format"]; label: string }[] = [
  { value: "mdy", label: "M/D/Y" },
  { value: "dmy", label: "D/M/Y" },
  { value: "ymd", label: "Y-M-D" },
];

const timeFormats: { value: MySettings["time_format"]; label: string }[] = [
  { value: "h24", label: "24h" },
  { value: "h12", label: "12h (AM/PM)" },
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
  const styles = useStyles();
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
    <div className={styles.form}>
      <Field
        label="UTC offset"
        hint="Signed hours[:minutes], e.g. +3:30, -5, +0."
        validationState={offsetInvalid ? "error" : "none"}
        validationMessage={offsetInvalid ? "Couldn't parse that offset." : undefined}
      >
        <Input value={offsetText} onChange={(_, d) => setOffsetText(d.value)} />
      </Field>

      <Field label="Date format">
        <div className={styles.choices}>
          {dateFormats.map((f) => (
            <Button
              key={f.value}
              appearance={dateFormat === f.value ? "primary" : "secondary"}
              onClick={() => setDateFormat(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </Field>

      <Field label="Time format">
        <div className={styles.choices}>
          {timeFormats.map((f) => (
            <Button
              key={f.value}
              appearance={timeFormat === f.value ? "primary" : "secondary"}
              onClick={() => setTimeFormat(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </Field>

      <Button
        appearance="primary"
        disabled={offsetInvalid || setSettings.isPending}
        onClick={save}
        style={{ alignSelf: "flex-start" }}
      >
        Save
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const styles = useStyles();
  const { data, isPending, isError } = useMySettings();

  return (
    <div className={styles.root}>
      <Title2>Personal Settings</Title2>
      <Body1>
        Your reminder timezone (a fixed UTC offset -- see ARCHITECTURE.md for why not a real IANA zone) and how dates
        get formatted when Warden shows them to you.
      </Body1>

      {isPending && <Spinner label="Loading settings..." />}
      {isError && <Body1>Failed to load settings.</Body1>}
      {data && <SettingsForm key={JSON.stringify(data)} initial={data} />}
    </div>
  );
}
