"use client";

import { ConfigEntry, useSetConfigValue } from "@/hooks/useAdminConfig";
import { Section, ToggleButtonGroup } from "@/components/ui-kit";
import { t } from "@/lib/i18n";
import { Badge, Body1, Button, Field, Input, tokens } from "@fluentui/react-components";
import { useState } from "react";

export const replyLengthKey = "WARDEN_LLM_REPLY_LENGTH";

type Mode = "off" | "tokens" | "words" | "paragraphs";

const modes: { value: Mode; label: string }[] = [
  { value: "paragraphs", label: t("replyLength.paragraphs") },
  { value: "words", label: t("replyLength.words") },
  { value: "tokens", label: t("replyLength.tokens") },
  { value: "off", label: t("replyLength.off") },
];

const defaultAmounts: Record<Exclude<Mode, "off">, number> = { paragraphs: 1, words: 80, tokens: 400 };

/** Mirrors the backend's `qa.ReplyLength.parse`: "<n> <unit>[s]" or "off"/"0"/"". */
function parseReplyLength(raw: string): { mode: Mode; amount: number } {
  const trimmed = raw.trim().toLowerCase();
  const match = /^(\d+)\s+(token|word|paragraph)s?$/.exec(trimmed);
  if (!match) return { mode: "off", amount: defaultAmounts.paragraphs };
  return { mode: `${match[2]}s` as Mode, amount: Number(match[1]) };
}

function formatReplyLength(mode: Mode, amount: number) {
  if (mode === "off") return "off";
  const unit = mode.slice(0, -1);
  return `${amount} ${amount === 1 ? unit : mode}`;
}

/** Seeds its state from `entry` -- remounted via `key` when the saved value changes. */
export function ReplyLengthSetting({ entry }: { entry: ConfigEntry }) {
  const setValue = useSetConfigValue();
  const initial = parseReplyLength(entry.value);
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [amountText, setAmountText] = useState(String(initial.amount));

  const amount = Number(amountText);
  const amountInvalid = mode !== "off" && (!/^\d+$/.test(amountText.trim()) || amount < 1 || amount > 100000);
  const next = formatReplyLength(mode, amount);
  const dirty = next !== formatReplyLength(initial.mode, initial.amount);

  const changeMode = (m: Mode) => {
    setMode(m);
    if (m !== "off" && m !== mode) setAmountText(String(defaultAmounts[m]));
  };

  return (
    <Section
      title={t("replyLength.title")}
      action={
        entry.is_override ? (
          <Badge appearance="tint" color="brand" shape="square">
            {t("adminConfig.overridden")}
          </Badge>
        ) : undefined
      }
    >
      <Body1>{t("replyLength.description")}</Body1>

      <Field label={t("replyLength.unit")}>
        <ToggleButtonGroup ariaLabel={t("replyLength.unit")} value={mode} options={modes} onChange={changeMode} />
      </Field>

      {mode !== "off" && (
        <Field
          label={t(`replyLength.amount.${mode}`)}
          hint={t(`replyLength.hint.${mode}`)}
          validationState={amountInvalid ? "error" : "none"}
          validationMessage={amountInvalid ? t("replyLength.amountError") : undefined}
        >
          <Input
            type="number"
            min={1}
            max={100000}
            value={amountText}
            onChange={(_, d) => setAmountText(d.value)}
            style={{ maxWidth: "10rem" }}
          />
        </Field>
      )}
      {mode === "off" && <Body1 style={{ color: tokens.colorNeutralForeground3 }}>{t("replyLength.hint.off")}</Body1>}

      <Button
        appearance="primary"
        disabled={!dirty || amountInvalid || setValue.isPending}
        onClick={() => setValue.mutate({ key: replyLengthKey, value: next })}
        style={{ alignSelf: "flex-start" }}
      >
        {t("adminConfig.save")}
      </Button>
      {setValue.isError && <Body1 style={{ color: tokens.colorPaletteRedForeground1 }}>{t("replyLength.saveFailed")}</Body1>}
    </Section>
  );
}
