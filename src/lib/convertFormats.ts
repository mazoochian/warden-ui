/**
 * Mirrors `features/convert.zig`'s extension tables and `candidateTargets`
 * exactly (family-equality, plus the pdf-source-only-to-txt special case)
 * -- kept in lockstep by hand, same as `convert_flow.zig`'s own button
 * list on the bot side, since duplicating this small/stable list here is
 * what lets the target-format dropdown only ever offer combinations the
 * server will actually accept.
 */
const documentExts = ["txt", "md", "html", "htm", "docx", "odt", "rtf", "pdf"];
const imageExts = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff"];
const avExts = ["mp3", "wav", "ogg", "opus", "flac", "aac", "m4a", "mp4", "webm", "mov", "mkv", "avi"];

export type Family = "document" | "image" | "audio_video" | "unknown";

export function familyOf(ext: string): Family {
  const e = ext.toLowerCase();
  if (documentExts.includes(e)) return "document";
  if (imageExts.includes(e)) return "image";
  if (avExts.includes(e)) return "audio_video";
  return "unknown";
}

export function extOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(dot + 1).toLowerCase() : "";
}

/** Every valid target extension for a file whose extension is `sourceExt`. */
export function candidateTargets(sourceExt: string): string[] {
  const ext = sourceExt.toLowerCase().replace(/^\./, "");
  const family = familyOf(ext);
  if (family === "unknown") return [];
  // pdftotext is the only supported pdf-as-source path -- txt is the sole target.
  if (family === "document" && ext === "pdf") return ["txt"];
  const list = family === "document" ? documentExts : family === "image" ? imageExts : avExts;
  return list.filter((e) => e !== ext);
}
