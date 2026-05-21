import type { AdapterSessionCodec } from "@paperclipai/adapter-utils";

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Session codec for the Copilot adapter.
 *
 * The standalone `copilot` CLI does not currently expose stable session/thread
 * IDs we can chain across runs, so this codec is a permissive pass-through:
 * it preserves any session metadata the caller chose to persist (`cwd`,
 * `workspaceId`, optional `sessionId`) without imposing structure. When
 * GitHub's CLI ships a stable resume mechanism, this is the place to wire
 * it in.
 */
export const sessionCodec: AdapterSessionCodec = {
  deserialize(raw: unknown) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const sessionId = readNonEmptyString(record.sessionId) ?? readNonEmptyString(record.session_id);
    const cwd = readNonEmptyString(record.cwd);
    const workspaceId = readNonEmptyString(record.workspaceId) ?? readNonEmptyString(record.workspace_id);
    if (!sessionId && !cwd && !workspaceId) return null;
    return {
      ...(sessionId ? { sessionId } : {}),
      ...(cwd ? { cwd } : {}),
      ...(workspaceId ? { workspaceId } : {}),
    };
  },
  serialize(params: Record<string, unknown> | null) {
    if (!params) return null;
    const sessionId = readNonEmptyString(params.sessionId) ?? readNonEmptyString(params.session_id);
    const cwd = readNonEmptyString(params.cwd);
    const workspaceId = readNonEmptyString(params.workspaceId) ?? readNonEmptyString(params.workspace_id);
    if (!sessionId && !cwd && !workspaceId) return null;
    return {
      ...(sessionId ? { sessionId } : {}),
      ...(cwd ? { cwd } : {}),
      ...(workspaceId ? { workspaceId } : {}),
    };
  },
  getDisplayId(params: Record<string, unknown> | null) {
    if (!params) return null;
    return readNonEmptyString(params.sessionId) ?? readNonEmptyString(params.session_id);
  },
};

export { execute } from "./execute.js";
export { testEnvironment } from "./test.js";
export { parseCopilotOutput, isCopilotUnknownSessionError, detectCopilotLoginRequired } from "./parse.js";
export {
  runDeviceFlow,
  createFetchTransport,
  DeviceFlowError,
  CancelledError,
  type DeviceCodeResponse,
  type AccessTokenPollResult,
  type DeviceFlowTransport,
  type RunDeviceFlowOptions,
  type RunDeviceFlowSuccess,
} from "./oauth-device-flow.js";
export {
  createInMemoryTokenStore,
  withActivityLog,
  DEFAULT_COPILOT_SECRET_KEY,
  type CopilotTokenStore,
  type CopilotTokenPayload,
  type StoredCopilotToken,
} from "./token-persistence.js";
