/**
 * Output parser for the `copilot` CLI.
 *
 * The standalone GitHub Copilot CLI emits text-formatted streaming output by
 * default. A formal JSONL streaming mode is not yet documented as stable,
 * so this parser is intentionally minimal: it extracts a "looks like the
 * final answer" summary and reports a generic error string when the CLI
 * exits non-zero with a recognizable error pattern. As GitHub stabilizes a
 * machine-readable output mode, expand this parser accordingly.
 */

import type { UsageSummary } from "@paperclipai/adapter-utils";

export interface ParsedCopilotOutput {
  summary: string;
  errorMessage: string | null;
  /** True if the output suggests the user needs to (re-)authenticate. */
  loginRequired: boolean;
  /**
   * Cumulative token totals reported by Copilot CLI in its session footer, if
   * present. The CLI prints something like:
   *   `Tokens     ↑ 749.6k (619.5k cached)  · ↓ 10.9k`
   * `↑` is total input (including cached), `↓` is output, and the cached
   * count is a subset of input. Values are cumulative for the lifetime of
   * the Copilot session id, NOT a delta for a single run — heartbeat.ts
   * derives per-run deltas via `resolveNormalizedUsageForSession` using the
   * session id, so cumulative is the correct shape to return here.
   */
  usage: UsageSummary | null;
}

const LOGIN_REQUIRED_PATTERNS = [
  /not\s+logged\s+in/i,
  /authentication\s+(?:is\s+)?required/i,
  /run\s+`?copilot\s+(?:auth|login)`?/i,
  /please\s+sign\s+in/i,
  /unauthorized/i,
  /invalid\s+(?:token|credentials)/i,
];

export function detectCopilotLoginRequired(text: string): boolean {
  return LOGIN_REQUIRED_PATTERNS.some((re) => re.test(text));
}

export function parseCopilotOutput(stdout: string, stderr = ""): ParsedCopilotOutput {
  const combined = `${stdout}\n${stderr}`;
  const loginRequired = detectCopilotLoginRequired(combined);

  const cleaned = stripAnsi(stdout);

  const paragraphs = cleaned
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const summary = paragraphs.length > 0 ? paragraphs[paragraphs.length - 1] : cleaned.trim();

  let errorMessage: string | null = null;
  if (loginRequired) {
    errorMessage =
      "GitHub Copilot CLI reports that authentication is required. Re-run the OAuth device flow for this company.";
  } else if (/error:/i.test(combined) && /\bcopilot\b/i.test(combined)) {
    const firstErrorLine = combined
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => /error:/i.test(l));
    errorMessage = firstErrorLine ?? "Copilot CLI reported an error.";
  }

  const usage = parseCopilotUsageFromOutput(cleaned);

  return { summary, errorMessage, loginRequired, usage };
}

/**
 * Strip ANSI escape sequences (CSI / OSC / cursor controls) from CLI output.
 * Broader than a single-character class so that hyperlink (OSC 8) and
 * report-mode (`?25l`) sequences emitted by `copilot` don't break downstream
 * regex matching.
 */
function stripAnsi(text: string): string {
  return text
    .replace(/\x1B\][^\x07\x1B]*(?:\x07|\x1B\\)/g, "") // OSC sequences (incl. hyperlinks)
    .replace(/\x1B\[[\?!]?[0-9;:]*[A-Za-z]/g, "") // CSI sequences
    .replace(/\x1B[=>]/g, ""); // application keypad mode toggles
}

/**
 * Parse a numeric token value like `749.6k`, `1.2M`, `1,234`, or `42`. Returns
 * a non-negative integer or `null` if the token doesn't look like a number.
 */
function parseTokenCount(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, "");
  // Optional leading dot (e.g. `.5k`), optional decimal, optional k/m/b/g suffix.
  const match = trimmed.match(/^(\d*\.?\d+)\s*([kmbg])?$/i);
  if (!match) return null;
  const base = Number.parseFloat(match[1]!);
  if (!Number.isFinite(base) || base < 0) return null;
  const suffix = (match[2] ?? "").toLowerCase();
  const multiplier =
    suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : suffix === "b" || suffix === "g" ? 1_000_000_000 : 1;
  return Math.max(0, Math.floor(base * multiplier));
}

/**
 * Recognize a Copilot CLI session-footer "Tokens" line and extract input,
 * cached-input, and output token totals. Returns `null` if no recognizable
 * line is present. When the CLI prints multiple footers (multi-turn
 * sessions), the LAST occurrence wins because the CLI reports running
 * totals.
 *
 * We intentionally require the literal `Tokens` label plus at least the
 * input arrow `↑` and a numeric value — this avoids parsing arbitrary
 * agent-authored prose that mentions the word "tokens".
 */
export function parseCopilotUsageFromOutput(text: string): UsageSummary | null {
  // ANSI is already stripped by callers, but match defensively.
  const cleaned = text.includes("\x1B") ? stripAnsi(text) : text;
  const lines = cleaned.split(/\r?\n/);

  // Number pattern reused below: digits (with optional comma thousand separators
  // or a decimal point) and an optional k/m/b/g suffix.
  const NUM = "((?:\\d{1,3}(?:,\\d{3})+|\\d*\\.?\\d+)(?:\\s*[kmbgKMBG])?)";
  const tokenLineRe = new RegExp(
    // `Tokens` label, optional separator, then `↑` (or unicode escape \u2191) and a number.
    // Cached-input parenthetical is optional. Output `↓` (\u2193) is optional too.
    `\\btokens\\b[^\\n]*?(?:↑|\\u2191|\\^|\\bin\\b)\\s*` +
      NUM +
      `(?:\\s*\\(([^)]*?cached[^)]*)\\))?` +
      `(?:[^\\n]*?(?:↓|\\u2193|\\bout\\b)\\s*` + NUM + `)?`,
    "i",
  );

  let lastMatch: RegExpMatchArray | null = null;
  for (const line of lines) {
    if (!/tokens/i.test(line)) continue;
    const m = line.match(tokenLineRe);
    if (m) lastMatch = m;
  }
  if (!lastMatch) return null;

  const inputTokens = parseTokenCount(lastMatch[1] ?? "");
  if (inputTokens === null) return null;

  let cachedInputTokens: number | null = null;
  const cachedInside = lastMatch[2] ?? "";
  if (cachedInside) {
    const cachedNumMatch = cachedInside.match(new RegExp(NUM));
    if (cachedNumMatch) cachedInputTokens = parseTokenCount(cachedNumMatch[1] ?? "");
  }

  const outputTokens = parseTokenCount(lastMatch[3] ?? "") ?? 0;

  // Clamp: cached input must be a subset of input.
  const cached =
    cachedInputTokens !== null
      ? Math.min(Math.max(0, cachedInputTokens), inputTokens)
      : 0;

  const result: UsageSummary = {
    inputTokens,
    outputTokens,
    cachedInputTokens: cached,
  };

  if (inputTokens === 0 && outputTokens === 0 && cached === 0) return null;
  return result;
}

/**
 * Whether the given output indicates the previously-persisted session is no
 * longer valid. The Copilot CLI doesn't expose stable session IDs today, so
 * this always returns false; kept for parity with other adapter parse modules
 * that expose an `is<Agent>UnknownSessionError` helper.
 */
export function isCopilotUnknownSessionError(_text: string): boolean {
  return false;
}
