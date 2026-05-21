import { describe, it, expect, vi } from "vitest";
import {
  DEFAULT_COPILOT_SECRET_KEY,
  createInMemoryTokenStore,
  withActivityLog,
  type CopilotTokenStore,
} from "./token-persistence.js";

const COMPANY_A = "00000000-0000-0000-0000-aaaaaaaaaaaa";
const COMPANY_B = "00000000-0000-0000-0000-bbbbbbbbbbbb";

describe("createInMemoryTokenStore", () => {
  it("round-trips a token via put + retrieve", async () => {
    const store = createInMemoryTokenStore();

    const meta = await store.put({
      companyId: COMPANY_A,
      secretKey: DEFAULT_COPILOT_SECRET_KEY,
      payload: {
        accessToken: "gho_token",
        tokenType: "bearer",
        scope: "read:user copilot",
        githubLogin: "octocat",
      },
    });
    expect(meta.secretKey).toBe(DEFAULT_COPILOT_SECRET_KEY);
    expect(meta.githubLogin).toBe("octocat");
    expect(meta.scope).toBe("read:user copilot");
    expect(meta.storedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const retrieved = await store.retrieve({
      companyId: COMPANY_A,
      secretKey: DEFAULT_COPILOT_SECRET_KEY,
    });
    expect(retrieved).toEqual({
      accessToken: "gho_token",
      tokenType: "bearer",
      scope: "read:user copilot",
      githubLogin: "octocat",
    });
  });

  it("returns null when no token is stored under the given key", async () => {
    const store = createInMemoryTokenStore();
    const out = await store.retrieve({
      companyId: COMPANY_A,
      secretKey: DEFAULT_COPILOT_SECRET_KEY,
    });
    expect(out).toBeNull();
  });

  it("scopes tokens per company — token in A is invisible to B", async () => {
    const store = createInMemoryTokenStore();
    await store.put({
      companyId: COMPANY_A,
      secretKey: DEFAULT_COPILOT_SECRET_KEY,
      payload: {
        accessToken: "tokA",
        tokenType: "bearer",
        scope: "read:user copilot",
      },
    });
    const fromB = await store.retrieve({
      companyId: COMPANY_B,
      secretKey: DEFAULT_COPILOT_SECRET_KEY,
    });
    expect(fromB).toBeNull();
  });

  it("revoke() removes the token; subsequent retrieve() returns null", async () => {
    const store = createInMemoryTokenStore();
    await store.put({
      companyId: COMPANY_A,
      secretKey: DEFAULT_COPILOT_SECRET_KEY,
      payload: {
        accessToken: "gone-soon",
        tokenType: "bearer",
        scope: "read:user copilot",
      },
    });
    await store.revoke({ companyId: COMPANY_A, secretKey: DEFAULT_COPILOT_SECRET_KEY });

    const retrieved = await store.retrieve({
      companyId: COMPANY_A,
      secretKey: DEFAULT_COPILOT_SECRET_KEY,
    });
    expect(retrieved).toBeNull();
    const meta = await store.describe({
      companyId: COMPANY_A,
      secretKey: DEFAULT_COPILOT_SECRET_KEY,
    });
    expect(meta).toBeNull();
  });

  it("put() replaces an existing token under the same key (rotation)", async () => {
    const store = createInMemoryTokenStore();
    await store.put({
      companyId: COMPANY_A,
      secretKey: DEFAULT_COPILOT_SECRET_KEY,
      payload: { accessToken: "old", tokenType: "bearer", scope: "read:user" },
    });
    await store.put({
      companyId: COMPANY_A,
      secretKey: DEFAULT_COPILOT_SECRET_KEY,
      payload: {
        accessToken: "new",
        tokenType: "bearer",
        scope: "read:user copilot",
        githubLogin: "octocat",
      },
    });
    const retrieved = await store.retrieve({
      companyId: COMPANY_A,
      secretKey: DEFAULT_COPILOT_SECRET_KEY,
    });
    expect(retrieved?.accessToken).toBe("new");
    expect(retrieved?.scope).toBe("read:user copilot");
    expect(retrieved?.githubLogin).toBe("octocat");
  });

  it("retrieve() returns a copy so callers cannot mutate stored bytes", async () => {
    const store = createInMemoryTokenStore();
    await store.put({
      companyId: COMPANY_A,
      secretKey: DEFAULT_COPILOT_SECRET_KEY,
      payload: { accessToken: "v1", tokenType: "bearer", scope: "" },
    });
    const first = await store.retrieve({
      companyId: COMPANY_A,
      secretKey: DEFAULT_COPILOT_SECRET_KEY,
    });
    if (first) first.accessToken = "tampered";
    const second = await store.retrieve({
      companyId: COMPANY_A,
      secretKey: DEFAULT_COPILOT_SECRET_KEY,
    });
    expect(second?.accessToken).toBe("v1");
  });

  it("supports custom secretKey per agent (multiple Copilot accounts in one company)", async () => {
    const store: CopilotTokenStore = createInMemoryTokenStore();
    await store.put({
      companyId: COMPANY_A,
      secretKey: "copilot_oauth_token_team_lead",
      payload: { accessToken: "lead", tokenType: "bearer", scope: "" },
    });
    await store.put({
      companyId: COMPANY_A,
      secretKey: "copilot_oauth_token_ops",
      payload: { accessToken: "ops", tokenType: "bearer", scope: "" },
    });
    const lead = await store.retrieve({
      companyId: COMPANY_A,
      secretKey: "copilot_oauth_token_team_lead",
    });
    const ops = await store.retrieve({
      companyId: COMPANY_A,
      secretKey: "copilot_oauth_token_ops",
    });
    expect(lead?.accessToken).toBe("lead");
    expect(ops?.accessToken).toBe("ops");
  });
});

describe("withActivityLog", () => {
  it("emits activity events on put and revoke (not on retrieve)", async () => {
    const inner = createInMemoryTokenStore();
    const events: Array<Record<string, unknown>> = [];
    const store = withActivityLog(inner, (event) => {
      events.push(event);
    });

    await store.put({
      companyId: COMPANY_A,
      secretKey: DEFAULT_COPILOT_SECRET_KEY,
      payload: {
        accessToken: "tokA",
        tokenType: "bearer",
        scope: "read:user copilot",
        githubLogin: "octocat",
      },
    });
    await store.retrieve({
      companyId: COMPANY_A,
      secretKey: DEFAULT_COPILOT_SECRET_KEY,
    });
    await store.revoke({ companyId: COMPANY_A, secretKey: DEFAULT_COPILOT_SECRET_KEY });

    expect(events).toEqual([
      {
        kind: "copilot_token_put",
        companyId: COMPANY_A,
        secretKey: DEFAULT_COPILOT_SECRET_KEY,
        githubLogin: "octocat",
        scope: "read:user copilot",
      },
      {
        kind: "copilot_token_revoked",
        companyId: COMPANY_A,
        secretKey: DEFAULT_COPILOT_SECRET_KEY,
      },
    ]);
  });

  it("never logs the raw access token", async () => {
    const inner = createInMemoryTokenStore();
    const onActivity = vi.fn();
    const store = withActivityLog(inner, onActivity);

    await store.put({
      companyId: COMPANY_A,
      secretKey: DEFAULT_COPILOT_SECRET_KEY,
      payload: {
        accessToken: "this-token-must-never-appear-in-logs",
        tokenType: "bearer",
        scope: "",
      },
    });

    for (const call of onActivity.mock.calls) {
      const serialized = JSON.stringify(call);
      expect(serialized).not.toContain("this-token-must-never-appear-in-logs");
    }
  });
});
