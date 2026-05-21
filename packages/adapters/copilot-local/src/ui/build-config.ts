import type { CreateConfigValues } from "@paperclipai/adapter-utils";
import { DEFAULT_COPILOT_LOCAL_MODEL } from "../index.js";

function parseEnvVars(text: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    env[key] = value;
  }
  return env;
}

function parseExtraArgs(value: string): string[] {
  return value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Build the `adapterConfig` JSON blob for a new copilot_local agent.
 *
 * Fields kept intentionally minimal — full set is documented in
 * `agentConfigurationDoc` at the package root.
 */
export function buildCopilotLocalConfig(v: CreateConfigValues): Record<string, unknown> {
  const ac: Record<string, unknown> = {};
  if (v.cwd) ac.cwd = v.cwd;
  if (v.instructionsFilePath) ac.instructionsFilePath = v.instructionsFilePath;
  if (v.promptTemplate) ac.promptTemplate = v.promptTemplate;
  ac.model = v.model || DEFAULT_COPILOT_LOCAL_MODEL;
  if (v.command) ac.command = v.command;
  if (v.extraArgs) ac.extraArgs = parseExtraArgs(v.extraArgs);
  const envFromText = v.envVars ? parseEnvVars(v.envVars) : {};
  const envFromBindings =
    v.envBindings && typeof v.envBindings === "object" && !Array.isArray(v.envBindings)
      ? (v.envBindings as Record<string, unknown>)
      : {};
  const env: Record<string, unknown> = { ...envFromText, ...envFromBindings };
  if (Object.keys(env).length > 0) ac.env = env;
  ac.timeoutSec = 0;
  ac.graceSec = 15;
  return ac;
}
