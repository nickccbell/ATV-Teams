import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";
import {
  describeAdapterExecutionTarget,
  readAdapterExecutionTarget,
  resolveAdapterExecutionTargetTimeoutSec,
  runAdapterExecutionTargetProcess,
} from "@paperclipai/adapter-utils/execution-target";
import {
  asBoolean,
  asNumber,
  asString,
  asStringArray,
  buildInvocationEnvForLogs,
  buildPaperclipEnv,
  ensureAbsoluteDirectory,
  ensurePathInEnv,
  joinPromptSections,
  parseObject,
  readPaperclipIssueWorkModeFromContext,
  renderTemplate,
  renderPaperclipWakePrompt,
  stringifyPaperclipWakePayload,
  DEFAULT_PAPERCLIP_AGENT_PROMPT_TEMPLATE,
} from "@paperclipai/adapter-utils/server-utils";
import { parseCopilotOutput } from "./parse.js";

const SENSITIVE_ENV_KEY_RE = /(token|key|secret|password|cookie|authorization)/i;

function normalizeEnvConfig(input: unknown): Record<string, string> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof v === "string" && v.length > 0) out[k] = v;
  }
  return out;
}

function pickToken(env: Record<string, string>, hostEnv: NodeJS.ProcessEnv): string | null {
  // Precedence matches the Copilot CLI itself:
  //   COPILOT_GITHUB_TOKEN > GH_TOKEN > GITHUB_TOKEN
  // Look first in operator-configured adapter env (so a per-agent token
  // beats the host shell), then fall back to the host process env so
  // local_trusted operators who have already run `copilot login` on the
  // host don't need to re-paste a token.
  const order = ["COPILOT_GITHUB_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"] as const;
  for (const key of order) {
    const fromConfig = env[key]?.trim();
    if (fromConfig) return fromConfig;
  }
  for (const key of order) {
    const fromHost = (hostEnv[key] ?? "").trim();
    if (fromHost) return fromHost;
  }
  return null;
}

function resolveCopilotHome(agentId: string, hostEnv: NodeJS.ProcessEnv): string {
  // Per-agent COPILOT_HOME so concurrent agents on one host don't share
  // session state, plugin caches, or auth files. The Copilot CLI honors
  // COPILOT_HOME as its config root.
  const base =
    (hostEnv.PAPERCLIP_COPILOT_HOME_ROOT && hostEnv.PAPERCLIP_COPILOT_HOME_ROOT.trim()) ||
    path.join(os.homedir(), ".paperclip", "adapter-runtime", "copilot-local", "homes");
  return path.join(base, agentId);
}

/**
 * On Windows the npm-installed `copilot` command is `copilot.cmd`, a
 * batch shim that re-parses the command line. Multi-line prompts with
 * quotes or newlines get torn apart by cmd.exe before they ever reach
 * the JS entry point, which then yields cryptic
 * "error: too many arguments" failures from Commander.
 *
 * To avoid the .cmd round-trip we resolve the bundled `npm-loader.js`
 * and invoke it directly via `node`, so process args travel through the
 * Win32 ARGV array intact. We probe the standard locations npm uses for
 * global installs; if none match the operator can override via
 * `adapter_config.commandLauncher`.
 */
async function resolveCopilotEntry(
  hostEnv: NodeJS.ProcessEnv,
): Promise<{ command: string; prefixArgs: string[] } | null> {
  if (process.platform !== "win32") return null;
  const npmPrefix = hostEnv.npm_config_prefix?.trim();
  const appData = hostEnv.APPDATA?.trim();
  const localAppData = hostEnv.LOCALAPPDATA?.trim();
  const programFiles = hostEnv.PROGRAMFILES?.trim();
  const candidates = [
    npmPrefix ? path.join(npmPrefix, "node_modules", "@github", "copilot", "npm-loader.js") : null,
    appData ? path.join(appData, "npm", "node_modules", "@github", "copilot", "npm-loader.js") : null,
    localAppData
      ? path.join(localAppData, "npm", "node_modules", "@github", "copilot", "npm-loader.js")
      : null,
    programFiles
      ? path.join(programFiles, "nodejs", "node_modules", "@github", "copilot", "npm-loader.js")
      : null,
  ].filter((p): p is string => typeof p === "string");
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return { command: "node", prefixArgs: [candidate] };
    } catch {
      /* try next */
    }
  }
  return null;
}

function inheritWindowsBaseEnv(hostEnv: NodeJS.ProcessEnv): Record<string, string> {
  // `runChildProcess` replaces process.env entirely with what we hand it,
  // so on Windows we must preserve the variables Node + the CLI need to
  // find `copilot.cmd`/`.ps1`, locate the user profile, and load DLLs.
  // On non-Windows this is harmless (the keys are mostly Windows-only).
  const inherit = [
    "PATH",
    "Path",
    "PATHEXT",
    "SYSTEMROOT",
    "WINDIR",
    "USERPROFILE",
    "HOMEDRIVE",
    "HOMEPATH",
    "APPDATA",
    "LOCALAPPDATA",
    "PROGRAMFILES",
    "PROGRAMFILES(X86)",
    "PROGRAMDATA",
    "COMSPEC",
    "TEMP",
    "TMP",
    "HOME",
    "LANG",
    "LC_ALL",
  ];
  const out: Record<string, string> = {};
  for (const key of inherit) {
    const v = hostEnv[key];
    if (typeof v === "string" && v.length > 0) out[key] = v;
  }
  return out;
}

/**
 * Execution entry point for the copilot_local adapter.
 *
 * Drives the GitHub Copilot CLI (`@github/copilot`) in non-interactive
 * "prompt mode" with autopilot enabled, scoped to the agent's configured
 * working directory.
 *
 * Authentication strategy
 * -----------------------
 * The Copilot CLI itself reads tokens from (in precedence order)
 * COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN. We mirror that order
 * and accept either:
 *
 *   1. an operator-configured `adapter_config.env.{COPILOT_GITHUB_TOKEN,
 *      GH_TOKEN, GITHUB_TOKEN}` value, or
 *   2. a token already present on the ATV-Teams host process env (the
 *      `local_trusted` deployment path).
 *
 * Full DB-backed retrieval of OAuth device-flow tokens (the
 * `credentialSecretKey` path) is wired through the server registration
 * layer; see `oauth-device-flow.ts` and `token-persistence.ts`. When
 * neither path yields a token we fail fast with a structured
 * `copilot_login_required` error.
 *
 * Session resume
 * --------------
 * The Copilot CLI's `--session-id` flag (v1.0.51+, 2026-05-20) accepts a
 * UUID and either resumes a known session or starts a new one under that
 * id. We always pass an id so subsequent heartbeats can re-attach; the
 * id is round-tripped through `AdapterExecutionResult.sessionParams`.
 */
export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { agent, runtime, config, context, onLog, onMeta, authToken } = ctx;
  const hostEnv = process.env;

  // --- prompt assembly ---
  const promptTemplate = asString(config.promptTemplate, DEFAULT_PAPERCLIP_AGENT_PROMPT_TEMPLATE);
  const renderedPrompt = renderTemplate(promptTemplate, {
    agent: { id: agent.id, name: agent.name },
    runId: ctx.runId,
  });
  const wakeSection = renderPaperclipWakePrompt(context.paperclipWake, {
    resumedSession: typeof runtime.sessionDisplayId === "string" && runtime.sessionDisplayId.length > 0,
  });
  const instructionsPath = asString(config.instructionsFilePath, "").trim();
  let instructionsBody = "";
  if (instructionsPath) {
    try {
      instructionsBody = await fs.readFile(instructionsPath, "utf8");
    } catch (err) {
      await onLog(
        "stderr",
        `[copilot_local] failed to read instructionsFilePath ${instructionsPath}: ${
          err instanceof Error ? err.message : String(err)
        }\n`,
      );
    }
  }
  const prompt = joinPromptSections([renderedPrompt, instructionsBody, wakeSection]);
  if (!prompt) {
    const message =
      "Copilot adapter could not build a non-empty prompt (no promptTemplate, no instructionsFilePath, no wake payload).";
    await onLog("stderr", `${message}\n`);
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: message,
      errorCode: "copilot_prompt_empty",
      provider: "github",
      biller: "github",
      model: asString(config.model, "") || null,
      billingType: "subscription",
    };
  }

  // --- cwd resolution ---
  // Priority: operator-configured `adapterConfig.cwd` > heartbeat-assigned
  // workspace > host process cwd. We override the heartbeat fallback for
  // Copilot because operators typically point a local Copilot agent at a
  // specific repo on disk, not the per-agent "scratch" workspace dir.
  const workspaceContext = parseObject(context.paperclipWorkspace);
  const workspaceCwd = asString(workspaceContext.cwd, "");
  const configuredCwd = asString(config.cwd, "");
  const cwd = configuredCwd || workspaceCwd || process.cwd();
  await ensureAbsoluteDirectory(cwd, { createIfMissing: true });

  // --- token ---
  const envConfig = normalizeEnvConfig(config.env);
  const token = pickToken(envConfig, hostEnv);
  if (!token) {
    const message =
      "GitHub Copilot CLI requires authentication, but no token was found. " +
      "Either set COPILOT_GITHUB_TOKEN (or GH_TOKEN, GITHUB_TOKEN) in the agent's adapter_config.env, " +
      "or ensure the ATV-Teams host has the token set in its process env. " +
      "Personal access tokens must be fine-grained with the 'Copilot Requests' permission; " +
      "classic `ghp_` tokens are not supported by Copilot CLI.";
    await onLog("stderr", `${message}\n`);
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: message,
      errorCode: "copilot_login_required",
      provider: "github",
      biller: "github",
      model: asString(config.model, "") || null,
      billingType: "subscription",
    };
  }

  // --- env assembly ---
  const copilotHome = resolveCopilotHome(agent.id, hostEnv);
  await fs.mkdir(copilotHome, { recursive: true });
  const paperclipEnv = buildPaperclipEnv(agent);
  const baseEnv = ensurePathInEnv({
    ...inheritWindowsBaseEnv(hostEnv),
    ...paperclipEnv,
    PAPERCLIP_RUN_ID: ctx.runId,
    COPILOT_HOME: copilotHome,
    GH_TOKEN: token,
  }) as Record<string, string>;
  // Bridge metadata for downstream Copilot tools that might call back
  // into the ATV-Teams API. We only set PAPERCLIP_API_KEY if the operator
  // didn't supply one in adapter_config.env.
  const explicitApiKey = envConfig.PAPERCLIP_API_KEY?.trim();
  if (!explicitApiKey && authToken) {
    baseEnv.PAPERCLIP_API_KEY = authToken;
  }
  const wakeTaskId = asString(context.taskId, "") || asString(context.issueId, "");
  if (wakeTaskId) baseEnv.PAPERCLIP_TASK_ID = wakeTaskId;
  const wakeReason = asString(context.wakeReason, "");
  if (wakeReason) baseEnv.PAPERCLIP_WAKE_REASON = wakeReason;
  const issueWorkMode = readPaperclipIssueWorkModeFromContext(context);
  if (issueWorkMode) baseEnv.PAPERCLIP_ISSUE_WORK_MODE = issueWorkMode;
  const wakePayloadJson = stringifyPaperclipWakePayload(context.paperclipWake);
  if (wakePayloadJson) baseEnv.PAPERCLIP_WAKE_PAYLOAD_JSON = wakePayloadJson;
  // Merge operator-supplied env LAST so it can override any of the above,
  // but never let it clobber the token we just resolved above unless the
  // operator explicitly provided a token in config.env (in which case
  // `token` already came from there).
  for (const [k, v] of Object.entries(envConfig)) {
    baseEnv[k] = v;
  }

  // --- command args ---
  const configuredCommand = asString(config.command, "").trim();
  let command = configuredCommand || "copilot";
  let prefixArgs: string[] = [];
  if (!configuredCommand) {
    const entry = await resolveCopilotEntry(hostEnv);
    if (entry) {
      command = entry.command;
      prefixArgs = entry.prefixArgs;
    }
  }
  const autopilot = asBoolean(config.autopilot, true);
  const maxAutopilotContinues = asNumber(config.maxAutopilotContinues, 25);
  const allowAll = asBoolean(config.allowAll, true);
  const denyTools = asStringArray(config.denyTools);
  const allowTools = asStringArray(config.allowTools);
  const addDirs = asStringArray(config.addDirs);
  const extraArgs = asStringArray(config.extraArgs);
  const model = asString(config.model, "").trim();
  const sessionId =
    asString(runtime.sessionDisplayId, "") ||
    (typeof runtime.sessionParams?.sessionId === "string"
      ? (runtime.sessionParams.sessionId as string)
      : "") ||
    randomUUID();

  const args: string[] = [
    ...prefixArgs,
    "-p",
    prompt,
    "--session-id",
    sessionId,
    "--add-dir",
    cwd,
  ];
  for (const dir of addDirs) {
    if (dir && dir !== cwd) {
      args.push("--add-dir", dir);
    }
  }
  if (autopilot) {
    args.push("--autopilot");
    args.push("--max-autopilot-continues", String(maxAutopilotContinues));
  }
  if (allowAll) args.push("--allow-all");
  for (const tool of allowTools) args.push("--allow-tool", tool);
  for (const tool of denyTools) args.push("--deny-tool", tool);
  if (model) args.push("--model", model);
  for (const arg of extraArgs) args.push(arg);

  // --- timeout/grace ---
  const executionTarget = readAdapterExecutionTarget({
    executionTarget: ctx.executionTarget,
    legacyRemoteExecution: ctx.executionTransport?.remoteExecution,
  });
  const timeoutSec = resolveAdapterExecutionTargetTimeoutSec(
    executionTarget,
    asNumber(config.timeoutSec, 0),
  );
  const graceSec = asNumber(config.graceSec, 20);

  // --- emit invocation metadata BEFORE spawning so the run log shows the
  //     command/env even if the spawn fails. Redact secrets. ---
  const envForLogs = buildInvocationEnvForLogs(baseEnv, { runtimeEnv: baseEnv });
  // Defense in depth: explicitly redact any token-shaped key the helper
  // didn't catch (some token env keys don't include the standard markers).
  for (const k of Object.keys(envForLogs)) {
    if (SENSITIVE_ENV_KEY_RE.test(k)) {
      envForLogs[k] = "***REDACTED***";
    }
  }
  // Also redact the prompt arg in case a previous step inlined a token.
  // (Copilot's own permission system means the prompt is otherwise safe
  // to log; ATV-Teams persists it for replay/debugging.)
  const argsForLogs = args.map((arg) => (arg === prompt ? "<prompt>" : arg));
  await onMeta?.({
    adapterType: "copilot_local",
    command,
    commandArgs: argsForLogs,
    cwd,
    env: envForLogs,
    prompt,
    promptMetrics: { length: prompt.length },
    context: {
      sessionId,
      copilotHome,
      executionTarget: executionTarget
        ? describeAdapterExecutionTarget(executionTarget)
        : "local",
    },
  });

  // --- run ---
  let stdoutBuf = "";
  let stderrBuf = "";
  const captureLog = async (stream: "stdout" | "stderr", chunk: string) => {
    if (stream === "stdout") stdoutBuf += chunk;
    else stderrBuf += chunk;
    await onLog(stream, chunk);
  };

  const result = await runAdapterExecutionTargetProcess(
    ctx.runId,
    executionTarget,
    command,
    args,
    {
      cwd,
      env: baseEnv,
      timeoutSec,
      graceSec,
      onLog: captureLog,
      onSpawn: ctx.onSpawn,
    },
  );

  // --- parse output ---
  const parsed = parseCopilotOutput(stdoutBuf, stderrBuf);

  // Persist the session id regardless of success — operators commonly
  // re-run a failed agent, and resuming the same session preserves any
  // partial context Copilot built up.
  const sessionParams: Record<string, unknown> = { sessionId, cwd };
  if (workspaceContext.workspaceId && typeof workspaceContext.workspaceId === "string") {
    sessionParams.workspaceId = workspaceContext.workspaceId;
  }

  if (parsed.loginRequired) {
    return {
      exitCode: result.exitCode ?? 1,
      signal: result.signal,
      timedOut: result.timedOut,
      errorMessage:
        parsed.errorMessage ??
        "GitHub Copilot CLI reports that authentication is required. Re-run the OAuth device flow.",
      errorCode: "copilot_login_required",
      provider: "github",
      biller: "github",
      model: model || null,
      billingType: "subscription",
      sessionId,
      sessionParams,
      sessionDisplayId: sessionId,
      summary: parsed.summary || null,
    };
  }

  const succeeded = !result.timedOut && (result.exitCode === 0 || result.exitCode === null);
  return {
    exitCode: result.exitCode,
    signal: result.signal,
    timedOut: result.timedOut,
    errorMessage: succeeded ? parsed.errorMessage ?? null : parsed.errorMessage ?? "Copilot CLI exited non-zero.",
    errorCode: succeeded
      ? null
      : result.timedOut
      ? "copilot_timeout"
      : parsed.errorMessage
      ? "copilot_run_error"
      : "copilot_run_failed",
    provider: "github",
    biller: "github",
    model: model || null,
    billingType: "subscription",
    sessionId,
    sessionParams,
    sessionDisplayId: sessionId,
    summary: parsed.summary || null,
  };
}
