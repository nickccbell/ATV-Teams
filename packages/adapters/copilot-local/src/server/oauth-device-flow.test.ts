import { describe, it, expect, vi } from "vitest";
import {
  CancelledError,
  DeviceFlowError,
  createFetchTransport,
  runDeviceFlow,
  type AccessTokenPollResult,
  type DeviceCodeResponse,
  type DeviceFlowTransport,
} from "./oauth-device-flow.js";

const CLIENT_ID = "Iv1.abc123";

function fakeDeviceCode(overrides: Partial<DeviceCodeResponse> = {}): DeviceCodeResponse {
  return {
    device_code: "device-123",
    user_code: "WDJB-MJHT",
    verification_uri: "https://github.com/login/device",
    interval: 5,
    expires_in: 900,
    ...overrides,
  };
}

/** Build a transport that returns a scripted sequence of poll responses. */
function makeScriptedTransport(
  deviceCode: DeviceCodeResponse,
  pollResponses: AccessTokenPollResult[],
): { transport: DeviceFlowTransport; pollCount: () => number } {
  let pollIndex = 0;
  const transport: DeviceFlowTransport = {
    requestDeviceCode: vi.fn(async () => deviceCode),
    pollAccessToken: vi.fn(async () => {
      const next = pollResponses[pollIndex] ?? { kind: "pending" as const };
      pollIndex += 1;
      return next;
    }),
  };
  return { transport, pollCount: () => pollIndex };
}

describe("runDeviceFlow", () => {
  it("returns the access token when polling succeeds on the first attempt", async () => {
    const deviceCode = fakeDeviceCode();
    const { transport, pollCount } = makeScriptedTransport(deviceCode, [
      {
        kind: "success",
        access_token: "gho_xyz",
        token_type: "bearer",
        scope: "read:user copilot",
      },
    ]);
    const onUserCode = vi.fn();
    const sleeps: number[] = [];

    const result = await runDeviceFlow({
      clientId: CLIENT_ID,
      transport,
      onUserCode,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    expect(result.access_token).toBe("gho_xyz");
    expect(result.token_type).toBe("bearer");
    expect(result.scope).toBe("read:user copilot");
    expect(onUserCode).toHaveBeenCalledOnce();
    expect(onUserCode).toHaveBeenCalledWith(deviceCode);
    expect(pollCount()).toBe(1);
    // First sleep should be `interval * 1000` per RFC 8628 §3.4 ("after the device
    // code is granted, wait at least `interval` seconds before polling").
    expect(sleeps).toEqual([5000]);
  });

  it("keeps polling while the server returns authorization_pending", async () => {
    const { transport, pollCount } = makeScriptedTransport(fakeDeviceCode(), [
      { kind: "pending" },
      { kind: "pending" },
      { kind: "success", access_token: "gho_done", token_type: "bearer", scope: "" },
    ]);
    const sleeps: number[] = [];

    const result = await runDeviceFlow({
      clientId: CLIENT_ID,
      transport,
      onUserCode: () => {},
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    expect(result.access_token).toBe("gho_done");
    expect(pollCount()).toBe(3);
    // Three sleeps of 5 seconds each (interval default).
    expect(sleeps).toEqual([5000, 5000, 5000]);
  });

  it("backs off on slow_down per RFC 8628 (+5s minimum)", async () => {
    const { transport } = makeScriptedTransport(fakeDeviceCode({ interval: 5 }), [
      { kind: "slow_down", retry_after_seconds: 0 },
      { kind: "success", access_token: "gho_ok", token_type: "bearer", scope: "" },
    ]);
    const sleeps: number[] = [];

    await runDeviceFlow({
      clientId: CLIENT_ID,
      transport,
      onUserCode: () => {},
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    // 5s initial; then +5s after slow_down → 10s.
    expect(sleeps).toEqual([5000, 10000]);
  });

  it("honours an explicit retry interval from slow_down when larger", async () => {
    const { transport } = makeScriptedTransport(fakeDeviceCode({ interval: 5 }), [
      { kind: "slow_down", retry_after_seconds: 30 },
      { kind: "success", access_token: "gho_ok", token_type: "bearer", scope: "" },
    ]);
    const sleeps: number[] = [];

    await runDeviceFlow({
      clientId: CLIENT_ID,
      transport,
      onUserCode: () => {},
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    // 5s initial; slow_down with explicit retry of 30s wins over +5s minimum.
    expect(sleeps).toEqual([5000, 30000]);
  });

  it("throws DeviceFlowError(access_denied) when the user denies", async () => {
    const { transport } = makeScriptedTransport(fakeDeviceCode(), [{ kind: "denied" }]);

    const promise = runDeviceFlow({
      clientId: CLIENT_ID,
      transport,
      onUserCode: () => {},
      sleep: async () => {},
    });

    await expect(promise).rejects.toBeInstanceOf(DeviceFlowError);
    await expect(promise).rejects.toMatchObject({ code: "access_denied" });
  });

  it("throws DeviceFlowError(expired_token) when the server returns expired", async () => {
    const { transport } = makeScriptedTransport(fakeDeviceCode(), [{ kind: "expired" }]);

    const promise = runDeviceFlow({
      clientId: CLIENT_ID,
      transport,
      onUserCode: () => {},
      sleep: async () => {},
    });

    await expect(promise).rejects.toMatchObject({ code: "expired_token" });
  });

  it("throws DeviceFlowError(expired_token) when the local clock passes expires_in", async () => {
    // Force a long poll loop that exceeds expires_in. We control time via `now`
    // so we don't rely on real timers.
    const deviceCode = fakeDeviceCode({ interval: 5, expires_in: 10 });
    const { transport } = makeScriptedTransport(deviceCode, [
      { kind: "pending" },
      { kind: "pending" },
      { kind: "pending" },
    ]);

    let virtualNow = 0;
    const promise = runDeviceFlow({
      clientId: CLIENT_ID,
      transport,
      onUserCode: () => {},
      sleep: async (ms) => {
        virtualNow += ms;
      },
      now: () => virtualNow,
    });

    await expect(promise).rejects.toMatchObject({ code: "expired_token" });
  });

  it("surfaces unknown server errors as DeviceFlowError with the original code", async () => {
    const { transport } = makeScriptedTransport(fakeDeviceCode(), [
      { kind: "error", error: "incorrect_client_credentials", error_description: "bad client" },
    ]);

    const promise = runDeviceFlow({
      clientId: CLIENT_ID,
      transport,
      onUserCode: () => {},
      sleep: async () => {},
    });

    await expect(promise).rejects.toMatchObject({
      code: "incorrect_client_credentials",
      description: "bad client",
    });
  });

  it("aborts immediately when the AbortSignal is already aborted", async () => {
    const { transport } = makeScriptedTransport(fakeDeviceCode(), [
      { kind: "success", access_token: "ignored", token_type: "bearer", scope: "" },
    ]);
    const controller = new AbortController();
    controller.abort();

    const promise = runDeviceFlow({
      clientId: CLIENT_ID,
      transport,
      onUserCode: () => {},
      sleep: async () => {},
      signal: controller.signal,
    });

    await expect(promise).rejects.toBeInstanceOf(CancelledError);
    expect(transport.requestDeviceCode).not.toHaveBeenCalled();
  });

  it("aborts mid-poll when the AbortSignal fires", async () => {
    const { transport } = makeScriptedTransport(fakeDeviceCode(), [
      { kind: "pending" },
      { kind: "pending" },
      { kind: "success", access_token: "should-not-reach", token_type: "bearer", scope: "" },
    ]);
    const controller = new AbortController();

    const sleeps: number[] = [];
    const promise = runDeviceFlow({
      clientId: CLIENT_ID,
      transport,
      onUserCode: () => {},
      sleep: async (ms) => {
        sleeps.push(ms);
        if (sleeps.length === 2) controller.abort();
      },
      signal: controller.signal,
    });

    await expect(promise).rejects.toBeInstanceOf(CancelledError);
  });
});

describe("createFetchTransport", () => {
  it("posts form-encoded device-code requests and parses the response", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("https://github.com/login/device/code");
      expect(init?.method).toBe("POST");
      const headers = init?.headers as Record<string, string>;
      expect(headers["Accept"]).toBe("application/json");
      expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
      const body = init?.body as string;
      const params = new URLSearchParams(body);
      expect(params.get("client_id")).toBe(CLIENT_ID);
      expect(params.get("scope")).toBe("read:user copilot");
      return new Response(
        JSON.stringify({
          device_code: "dc",
          user_code: "WDJB-MJHT",
          verification_uri: "https://github.com/login/device",
          interval: 5,
          expires_in: 900,
        }),
        { status: 200 },
      );
    });

    const transport = createFetchTransport({ fetchImpl: fetchImpl as unknown as typeof fetch });
    const out = await transport.requestDeviceCode({
      clientId: CLIENT_ID,
      scopes: ["read:user", "copilot"],
    });
    expect(out.device_code).toBe("dc");
    expect(out.interval).toBe(5);
  });

  it("decodes authorization_pending → pending", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: "authorization_pending" }), { status: 200 }),
    );
    const transport = createFetchTransport({ fetchImpl: fetchImpl as unknown as typeof fetch });
    const result = await transport.pollAccessToken({
      clientId: CLIENT_ID,
      deviceCode: "dc",
    });
    expect(result.kind).toBe("pending");
  });

  it("decodes slow_down with explicit interval", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: "slow_down", interval: 30 }), { status: 200 }),
    );
    const transport = createFetchTransport({ fetchImpl: fetchImpl as unknown as typeof fetch });
    const result = await transport.pollAccessToken({
      clientId: CLIENT_ID,
      deviceCode: "dc",
    });
    expect(result).toEqual({ kind: "slow_down", retry_after_seconds: 30 });
  });

  it("decodes access_denied and expired_token", async () => {
    for (const errorCode of ["access_denied", "expired_token"]) {
      const fetchImpl = vi.fn(
        async () => new Response(JSON.stringify({ error: errorCode }), { status: 200 }),
      );
      const transport = createFetchTransport({ fetchImpl: fetchImpl as unknown as typeof fetch });
      const result = await transport.pollAccessToken({
        clientId: CLIENT_ID,
        deviceCode: "dc",
      });
      expect(result.kind).toBe(errorCode === "access_denied" ? "denied" : "expired");
    }
  });

  it("decodes successful access_token responses", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "gho_abc",
            token_type: "bearer",
            scope: "read:user,copilot",
          }),
          { status: 200 },
        ),
    );
    const transport = createFetchTransport({ fetchImpl: fetchImpl as unknown as typeof fetch });
    const result = await transport.pollAccessToken({
      clientId: CLIENT_ID,
      deviceCode: "dc",
    });
    expect(result).toEqual({
      kind: "success",
      access_token: "gho_abc",
      token_type: "bearer",
      scope: "read:user,copilot",
    });
  });

  it("throws DeviceFlowError on non-2xx HTTP responses", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    const transport = createFetchTransport({ fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(
      transport.requestDeviceCode({ clientId: CLIENT_ID, scopes: ["read:user"] }),
    ).rejects.toBeInstanceOf(DeviceFlowError);
  });

  it("throws DeviceFlowError when the device-code response is missing required fields", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ device_code: "dc" }), { status: 200 }),
    );
    const transport = createFetchTransport({ fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(
      transport.requestDeviceCode({ clientId: CLIENT_ID, scopes: ["read:user"] }),
    ).rejects.toMatchObject({ code: "device_code_response_malformed" });
  });
});
