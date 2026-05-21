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

export interface ParsedCopilotOutput {
  summary: string;
  errorMessage: string | null;
  /** True if the output suggests the user needs to (re-)authenticate. */
  loginRequired: boolean;
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

  // Strip ANSI escape codes the CLI emits when it detects a TTY mistakenly.
  const cleaned = stdout.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "");

  // Take the last non-empty paragraph as a rough summary.
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

  return { summary, errorMessage, loginRequired };
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
