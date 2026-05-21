import pc from "picocolors";

/**
 * Format a single line of `copilot` CLI stdout for the `paperclipai run --watch`
 * terminal viewer. Keeps the output close to the CLI's native rendering: the
 * Copilot CLI already prints colored, chat-style output, so we mostly preserve
 * lines and only colorize lines that we recognize.
 */
export function printCopilotStreamEvent(raw: string, _debug: boolean): void {
  const line = raw.trimEnd();
  if (!line) return;

  if (/^assistant:/i.test(line)) {
    console.log(pc.green(line));
    return;
  }
  if (/^>\s/.test(line)) {
    console.log(pc.green(line));
    return;
  }
  if (/^error:/i.test(line)) {
    console.log(pc.red(line));
    return;
  }
  if (/^(?:tool|action):/i.test(line)) {
    console.log(pc.yellow(line));
    return;
  }
  console.log(line);
}
