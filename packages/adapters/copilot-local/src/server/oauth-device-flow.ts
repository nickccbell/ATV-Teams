/**
 * GitHub OAuth device flow — pure state machine + HTTP transport.
 *
 * RFC 8628 (OAuth 2.0 Device Authorization Grant) describes the protocol.
 * GitHub's implementation is documented at:
 *   https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
 *
 * This module is deliberately dependency-free (no Node fs/process imports)
 * so it can be unit-tested with a mocked fetch implementation.
 *
 * Flow:
 *   1) requestDeviceCode(clientId, scopes) →
 *        { device_code, user_code, verification_uri, interval, expires_in }
 *   2) The operator opens `verification_uri` in a browser and enters `user_code`.
 *   3) pollAccessToken(clientId, device_code) is polled at >= `interval` seconds
 *      until it returns a terminal status:
 *        - success:  { kind: "success", access_token, token_type, scope }
 *        - pending:  { kind: "pending" }                  // keep polling
 *        - slow_down:{ kind: "slow_down", retry_after_seconds } // bump interval
 *        - denied:   { kind: "denied" }
 *        - expired:  { kind: "expired" }
 *        - error:    { kind: "error", error, error_description }
 *
 *   `runDeviceFlow()` composes the two steps into a single driver with a
 *   pluggable sleeper, suitable both for production (real timers) and tests
 *   (fake timers).
 */

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  /** Polling interval in seconds, as instructed by the server. */
  interval: number;
  /** Lifetime of `device_code` in seconds. */
  expires_in: number;
}

export type AccessTokenPollResult =
  | {
      kind: "success";
      access_token: string;
      token_type: string;
      scope: string;
    }
  | { kind: "pending" }
  | { kind: "slow_down"; retry_after_seconds: number }
  | { kind: "denied" }
  | { kind: "expired" }
  | { kind: "error"; error: string; error_description?: string };

export interface DeviceFlowTransport {
  /**
   * POST https://github.com/login/device/code with form-encoded body
   * `client_id=...&scope=...`. Must return the parsed JSON body.
   */
  requestDeviceCode(input: { clientId: string; scopes: readonly string[] }): Promise<DeviceCodeResponse>;
  /**
   * POST https://github.com/login/oauth/access_token with form-encoded body
   * `client_id=...&device_code=...&grant_type=urn:ietf:params:oauth:grant-type:device_code`.
   * Must return the parsed JSON body interpreted as an `AccessTokenPollResult`.
   */
  pollAccessToken(input: { clientId: string; deviceCode: string }): Promise<AccessTokenPollResult>;
}

export interface RunDeviceFlowOptions {
  clientId: string;
  scopes?: readonly string[];
  transport: DeviceFlowTransport;
  /**
   * Invoked exactly once after the device code is obtained, before polling
   * begins. The UI should render `user_code` + `verification_uri` here.
   */
  onUserCode: (code: DeviceCodeResponse) => void | Promise<void>;
  /**
   * Pluggable sleeper. Defaults to real `setTimeout`. Tests should pass a
   * fake that resolves immediately and records the requested delays.
   */
  sleep?: (ms: number) => Promise<void>;
  /**
   * If supplied, cancels the flow when it fires. The promise rejects with
   * `CancelledError`.
   */
  signal?: AbortSignal;
  /**
   * Optional clock for measuring `expires_in`. Defaults to `Date.now`.
   * Tests can pass a deterministic clock.
   */
  now?: () => number;
}

export class DeviceFlowError extends Error {
  readonly code: string;
  readonly description: string | null;
  constructor(code: string, description: string | null = null) {
    super(description ? `${code}: ${description}` : code);
    this.name = "DeviceFlowError";
    this.code = code;
    this.description = description;
  }
}

export class CancelledError extends Error {
  constructor() {
    super("Device flow was cancelled.");
    this.name = "CancelledError";
  }
}

export interface RunDeviceFlowSuccess {
  access_token: string;
  token_type: string;
  scope: string;
}

const DEFAULT_SCOPES = ["read:user", "copilot"] as const;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Drives the GitHub OAuth device flow to completion. Returns the access
 * token on success; throws `DeviceFlowError` on denied/expired/error, and
 * `CancelledError` if `signal` aborts mid-flow.
 */
export async function runDeviceFlow(options: RunDeviceFlowOptions): Promise<RunDeviceFlowSuccess> {
  const scopes = options.scopes ?? DEFAULT_SCOPES;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;

  throwIfAborted(options.signal);

  const code = await options.transport.requestDeviceCode({
    clientId: options.clientId,
    scopes,
  });

  await options.onUserCode(code);

  const start = now();
    // GitHub server-provided `interval` is the minimum allowed; clamp to >= 1s
    // to avoid hammering the endpoint if a buggy server returns 0, and use
    // `Math.ceil` so a fractional interval is rounded UP and we never sleep
    // less than the server requested.
    let intervalSec = Math.max(1, Math.ceil(code.interval));
  const expiresAtMs = start + code.expires_in * 1000;

  // First wait — RFC 8628 §3.4 says the client SHOULD wait at least `interval`
  // seconds between attempts, starting after the device code is granted.
  while (true) {
    throwIfAborted(options.signal);
    await sleep(intervalSec * 1000);
    throwIfAborted(options.signal);

    if (now() >= expiresAtMs) {
      throw new DeviceFlowError("expired_token", "Device code expired before authorization completed.");
    }

    const result = await options.transport.pollAccessToken({
      clientId: options.clientId,
      deviceCode: code.device_code,
    });

    switch (result.kind) {
      case "success":
        return {
          access_token: result.access_token,
          token_type: result.token_type,
          scope: result.scope,
        };
      case "pending":
        continue;
      case "slow_down":
        // Per RFC 8628 §3.5, on slow_down the client MUST increase the
        // polling interval by 5 seconds, OR honour any explicit retry hint
        // provided by the server (GitHub returns an `interval` field).
        intervalSec = Math.max(intervalSec + 5, Math.ceil(result.retry_after_seconds || 0));
        continue;
      case "denied":
        throw new DeviceFlowError("access_denied", "The user denied the authorization request.");
      case "expired":
        throw new DeviceFlowError("expired_token", "Device code expired before authorization completed.");
      case "error":
        throw new DeviceFlowError(result.error, result.error_description ?? null);
    }
  }
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new CancelledError();
}

/**
 * Default `fetch`-based transport. Pass a custom `fetchImpl` to integrate
 * with a particular network stack (e.g. proxied fetch, undici, or a mock).
 */
export function createFetchTransport(
  options: {
    deviceCodeUrl?: string;
    tokenUrl?: string;
    fetchImpl?: typeof fetch;
  } = {},
): DeviceFlowTransport {
  const deviceCodeUrl = options.deviceCodeUrl ?? "https://github.com/login/device/code";
  const tokenUrl = options.tokenUrl ?? "https://github.com/login/oauth/access_token";
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async requestDeviceCode({ clientId, scopes }) {
      const body = new URLSearchParams({
        client_id: clientId,
        scope: scopes.join(" "),
      });
      const response = await fetchImpl(deviceCodeUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new DeviceFlowError(
          "device_code_request_failed",
          `HTTP ${response.status} from ${deviceCodeUrl}: ${text.slice(0, 200)}`,
        );
      }
      const json = (await response.json()) as Record<string, unknown>;
      const deviceCode = readString(json.device_code);
      const userCode = readString(json.user_code);
      const verificationUri = readString(json.verification_uri);
      const interval = readNumber(json.interval);
      const expiresIn = readNumber(json.expires_in);
      if (!deviceCode || !userCode || !verificationUri || interval === null || expiresIn === null) {
        throw new DeviceFlowError(
          "device_code_response_malformed",
          "Device-code response missing required fields.",
        );
      }
      return {
        device_code: deviceCode,
        user_code: userCode,
        verification_uri: verificationUri,
        interval,
        expires_in: expiresIn,
      };
    },

    async pollAccessToken({ clientId, deviceCode }) {
      const body = new URLSearchParams({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      });
      const response = await fetchImpl(tokenUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new DeviceFlowError(
          "token_request_failed",
          `HTTP ${response.status} from ${tokenUrl}: ${text.slice(0, 200)}`,
        );
      }
      const json = (await response.json()) as Record<string, unknown>;

      const accessToken = readString(json.access_token);
      if (accessToken) {
        return {
          kind: "success",
          access_token: accessToken,
          token_type: readString(json.token_type) ?? "bearer",
          scope: readString(json.scope) ?? "",
        };
      }

      const errorCode = readString(json.error);
      const errorDescription = readString(json.error_description) ?? undefined;
      switch (errorCode) {
        case "authorization_pending":
          return { kind: "pending" };
        case "slow_down": {
          const retryAfter = readNumber(json.interval) ?? 0;
          return { kind: "slow_down", retry_after_seconds: retryAfter };
        }
        case "access_denied":
          return { kind: "denied" };
        case "expired_token":
          return { kind: "expired" };
        default:
          return {
            kind: "error",
            error: errorCode ?? "unknown_error",
            ...(errorDescription ? { error_description: errorDescription } : {}),
          };
      }
    },
  };
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}
