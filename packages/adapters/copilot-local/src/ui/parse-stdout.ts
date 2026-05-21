import type { TranscriptEntry } from "@paperclipai/adapter-utils";

/**
 * Stdout parser for the Copilot CLI run viewer.
 *
 * The standalone `copilot` CLI emits human-readable text by default. Until a
 * stable JSONL streaming mode is documented, this parser falls back to
 * surfacing each non-empty line as a `stdout` entry, with a light heuristic
 * that turns lines beginning with `>` or `assistant:` into `assistant`
 * entries so the run viewer feels like a chat.
 */
export function parseCopilotStdoutLine(line: string, ts: string): TranscriptEntry[] {
  const text = line.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "");
  const trimmed = text.trimEnd();
  if (!trimmed) return [];

  const assistantPrefix = /^(?:assistant:|>\s)/i;
  if (assistantPrefix.test(trimmed)) {
    return [
      {
        kind: "assistant",
        ts,
        text: trimmed.replace(assistantPrefix, "").trimStart(),
      },
    ];
  }
  if (/^error:/i.test(trimmed)) {
    return [{ kind: "stderr", ts, text: trimmed }];
  }
  return [{ kind: "stdout", ts, text: trimmed }];
}
