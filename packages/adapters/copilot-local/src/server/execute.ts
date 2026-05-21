import type { AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";
import { asString, parseObject } from "@paperclipai/adapter-utils/server-utils";

/**
 * Execution entry point for the copilot_local adapter.
 *
 * Status (Phase 2): scaffold-only.
 *
 * The OAuth device flow and token persistence layers are fully implemented
 * and tested in this PR (see oauth-device-flow.ts, token-persistence.ts).
 * Wiring those into a full `copilot` CLI process invocation — including
 * prompt rendering, session resume, output parsing, and runtime services —
 * is tracked as a Phase 3 follow-up so this PR stays focused and reviewable.
 *
 * For now, `execute()` fails fast with a structured error explaining what's
 * still missing. This is intentional: returning a half-wired execution path
 * would risk silent partial runs against the upstream Copilot CLI before the
 * adapter is feature-complete.
 */
export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const config = parseObject(ctx.config);
  const credentialSecretKey = asString(config.credentialSecretKey, "").trim();

  const message = credentialSecretKey
    ? "The copilot_local adapter scaffold is wired and an OAuth credential is configured, " +
      "but the `copilot` CLI invocation is not yet implemented in this build. Track Phase 3 " +
      "of the ATV-Teams Copilot adapter rollout."
    : "The copilot_local adapter scaffold is wired, but no OAuth credential has been configured " +
      "for this agent yet. Complete the GitHub OAuth device flow and set `credentialSecretKey` " +
      "on this agent.";

  await ctx.onLog("stderr", `${message}\n`);

  return {
    exitCode: 1,
    signal: null,
    timedOut: false,
    errorMessage: message,
    errorCode: "copilot_local_not_yet_implemented",
    provider: "github",
    biller: "github",
    model: asString(config.model, "").trim() || null,
    billingType: "subscription",
  };
}
