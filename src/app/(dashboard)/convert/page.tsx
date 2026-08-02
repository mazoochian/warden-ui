"use client";

import { useRef, useState } from "react";
import {
  Body1,
  Button,
  Caption1,
  Dropdown,
  Field,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from "@fluentui/react-components";
import { ArrowUploadRegular } from "@fluentui/react-icons";
import { PageHeader, Section, useCommonStyles } from "@/components/ui-kit";
import { t } from "@/lib/i18n";
import { candidateTargets, extOf } from "@/lib/convertFormats";

const useStyles = makeStyles({
  dropzone: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    ...shorthands.padding("40px", "20px"),
    ...shorthands.border("2px", "dashed", tokens.colorNeutralStroke2),
    borderRadius: tokens.borderRadiusLarge,
    cursor: "pointer",
    color: tokens.colorNeutralForeground3,
    textAlign: "center",
  },
  dropzoneActive: {
    ...shorthands.border("2px", "dashed", tokens.colorBrandStroke1),
    backgroundColor: tokens.colorBrandBackground2,
  },
});

/** Downloads the converted file the same way a normal browser file
 * download would -- the response body *is* the file (see API.md), not
 * JSON, so this bypasses `apiFetch` entirely and reads
 * `Content-Disposition` for the suggested filename. */
async function convertAndDownload(file: File, targetFormat: string): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  form.append("target_format", targetFormat);

  const res = await fetch("/api/v1/convert", { method: "POST", credentials: "include", body: form });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      // Non-JSON error body -- fall back to the status text.
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const downloadName = match?.[1] ?? `converted.${targetFormat}`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = downloadName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ConvertPage() {
  const s = useCommonStyles();
  const styles = useStyles();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targets = file ? candidateTargets(extOf(file.name)) : [];

  const pickFile = (f: File | null) => {
    setFile(f);
    setTarget("");
    setError(null);
  };

  const submit = async () => {
    if (!file || !target) return;
    setIsConverting(true);
    setError(null);
    try {
      await convertAndDownload(file, target);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("convert.conversionFailed"));
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className={s.page}>
      <PageHeader title={t("convert.title")} description={t("convert.description")} />

      <Section title={t("convert.file")}>
        {/* A native <label> would be the simplest way to make this
            click-to-browse, but the file input has to stay reachable for
            the drag-and-drop handlers below too, so this is a
            role="button" div instead -- tabIndex + onKeyDown make Enter/
            Space activate it the same way a real button would, since a
            plain onClick div (the previous state of this code) is
            invisible to keyboard-only and screen-reader users entirely. */}
        <div
          className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ""}`}
          role="button"
          tabIndex={0}
          aria-label={file ? t("convert.dropzoneWithFile", { name: file.name }) : t("convert.dropzoneEmpty")}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) pickFile(dropped);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            tabIndex={-1}
            aria-hidden="true"
            style={{ display: "none" }}
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <ArrowUploadRegular fontSize={28} />
          {file ? (
            <Text weight="semibold">{file.name}</Text>
          ) : (
            <Body1>{t("convert.dropzoneText")}</Body1>
          )}
        </div>

        {file && targets.length === 0 && <Caption1 className={s.muted}>{t("convert.unsupportedType")}</Caption1>}

        {file && targets.length > 0 && (
          <Field label={t("convert.targetFormat")}>
            <Dropdown
              placeholder={t("convert.selectFormat")}
              selectedOptions={target ? [target] : []}
              value={target}
              onOptionSelect={(_, d) => setTarget(d.optionValue ?? "")}
            >
              {targets.map((fmt) => (
                <Option key={fmt} value={fmt}>
                  {fmt}
                </Option>
              ))}
            </Dropdown>
          </Field>
        )}

        {error && (
          <MessageBar intent="error">
            <MessageBarBody>{error}</MessageBarBody>
          </MessageBar>
        )}

        <Button appearance="primary" disabled={!file || !target || isConverting} onClick={submit} style={{ alignSelf: "flex-start" }}>
          {isConverting ? <Spinner size="tiny" /> : t("convert.convert")}
        </Button>
      </Section>
    </div>
  );
}
