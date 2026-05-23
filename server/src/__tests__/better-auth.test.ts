import { afterEach, describe, expect, it, vi } from "vitest";
import type { BetterAuthOptions } from "better-auth";
import { getCookies } from "better-auth/cookies";
import {
  buildBetterAuthAdvancedOptions,
  buildGithubSocialProvider,
  deriveAuthCookiePrefix,
  deriveAuthTrustedOrigins,
} from "../auth/better-auth.js";

const ORIGINAL_INSTANCE_ID = process.env.PAPERCLIP_INSTANCE_ID;

afterEach(() => {
  if (ORIGINAL_INSTANCE_ID === undefined) delete process.env.PAPERCLIP_INSTANCE_ID;
  else process.env.PAPERCLIP_INSTANCE_ID = ORIGINAL_INSTANCE_ID;
});

describe("Better Auth cookie scoping", () => {
  it("derives an instance-scoped cookie prefix", () => {
    expect(deriveAuthCookiePrefix("default")).toBe("paperclip-default");
    expect(deriveAuthCookiePrefix("PAP-1601-worktree")).toBe("paperclip-PAP-1601-worktree");
  });

  it("uses PAPERCLIP_INSTANCE_ID for the Better Auth cookie prefix", () => {
    process.env.PAPERCLIP_INSTANCE_ID = "sat-worktree";

    const advanced = buildBetterAuthAdvancedOptions({ disableSecureCookies: false });

    expect(advanced).toEqual({
      cookiePrefix: "paperclip-sat-worktree",
    });
    expect(getCookies({ advanced } as BetterAuthOptions).sessionToken.name).toBe(
      "paperclip-sat-worktree.session_token",
    );
  });

  it("keeps local http auth cookies non-secure while preserving the scoped prefix", () => {
    process.env.PAPERCLIP_INSTANCE_ID = "pap-worktree";

    expect(buildBetterAuthAdvancedOptions({ disableSecureCookies: true })).toEqual({
      cookiePrefix: "paperclip-pap-worktree",
      useSecureCookies: false,
    });
  });

  it("adds hostname port variants for authenticated mode on non-default ports", () => {
    const trustedOrigins = deriveAuthTrustedOrigins({
      deploymentMode: "authenticated",
      authBaseUrlMode: "auto",
      authPublicBaseUrl: undefined,
      allowedHostnames: ["Board.Example.Test"],
      port: 3101,
    } as Parameters<typeof deriveAuthTrustedOrigins>[0]);

    expect(trustedOrigins).toEqual(expect.arrayContaining([
      "https://board.example.test",
      "http://board.example.test",
      "https://board.example.test:3101",
      "http://board.example.test:3101",
    ]));
  });

  it("prefers an explicit resolved listen port over the configured port", () => {
    const trustedOrigins = deriveAuthTrustedOrigins({
      deploymentMode: "authenticated",
      authBaseUrlMode: "auto",
      authPublicBaseUrl: undefined,
      allowedHostnames: ["board.example.test"],
      port: 3100,
    } as Parameters<typeof deriveAuthTrustedOrigins>[0], { listenPort: 3101 });

    expect(trustedOrigins).toEqual(expect.arrayContaining([
      "https://board.example.test:3101",
      "http://board.example.test:3101",
    ]));
    expect(trustedOrigins).not.toContain("https://board.example.test:3100");
    expect(trustedOrigins).not.toContain("http://board.example.test:3100");
  });
});

describe("buildGithubSocialProvider", () => {
  it("returns null when no client id/secret is configured", () => {
    expect(buildGithubSocialProvider({})).toBeNull();
    expect(buildGithubSocialProvider({ GITHUB_CLIENT_ID: "id-only" })).toBeNull();
    expect(buildGithubSocialProvider({ GITHUB_CLIENT_SECRET: "secret-only" })).toBeNull();
  });

  it("reads GITHUB_CLIENT_ID/SECRET and requests user:email scope", () => {
    const provider = buildGithubSocialProvider({
      GITHUB_CLIENT_ID: "gh-id",
      GITHUB_CLIENT_SECRET: "gh-secret",
    });
    expect(provider).not.toBeNull();
    expect(provider!.clientId).toBe("gh-id");
    expect(provider!.clientSecret).toBe("gh-secret");
    expect(provider!.scope).toEqual(expect.arrayContaining(["user:email"]));
  });

  it("falls back to ATV_TEAMS_GITHUB_* env names", () => {
    const provider = buildGithubSocialProvider({
      ATV_TEAMS_GITHUB_CLIENT_ID: "atv-id",
      ATV_TEAMS_GITHUB_CLIENT_SECRET: "atv-secret",
    });
    expect(provider).not.toBeNull();
    expect(provider!.clientId).toBe("atv-id");
    expect(provider!.clientSecret).toBe("atv-secret");
  });

  it("prefers unprefixed GITHUB_CLIENT_* when both prefixes are set", () => {
    const provider = buildGithubSocialProvider({
      GITHUB_CLIENT_ID: "wins",
      GITHUB_CLIENT_SECRET: "wins-secret",
      ATV_TEAMS_GITHUB_CLIENT_ID: "loses",
      ATV_TEAMS_GITHUB_CLIENT_SECRET: "loses-secret",
    });
    expect(provider!.clientId).toBe("wins");
    expect(provider!.clientSecret).toBe("wins-secret");
  });

  it("passes through profile email when present without calling /user/emails", async () => {
    const fetchMock = vi.fn();
    const provider = buildGithubSocialProvider(
      { GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "secret" },
      fetchMock as unknown as typeof fetch,
    );
    const result = await provider!.mapProfileToUser(
      { email: "alice@example.com", name: "Alice", avatar_url: "https://example.com/a.png" },
      { accessToken: "tkn" },
    );
    expect(result).toEqual({
      email: "alice@example.com",
      name: "Alice",
      image: "https://example.com/a.png",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to GitHub /user/emails when the profile email is null", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { email: "secondary@example.com", primary: false, verified: true },
        { email: "primary@example.com", primary: true, verified: true },
        { email: "unverified@example.com", primary: false, verified: false },
      ],
    });
    const provider = buildGithubSocialProvider(
      { GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "secret" },
      fetchMock as unknown as typeof fetch,
    );
    const result = await provider!.mapProfileToUser(
      { email: null, name: "Bob", avatar_url: null },
      { accessToken: "ghp_token" },
    );
    expect(result.email).toBe("primary@example.com");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/user/emails",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer ghp_token" }),
      }),
    );
  });

  it("returns null email when /user/emails fails and no profile email", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    const provider = buildGithubSocialProvider(
      { GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "secret" },
      fetchMock as unknown as typeof fetch,
    );
    const result = await provider!.mapProfileToUser(
      { email: null, name: "Carol", avatar_url: null },
      { accessToken: "tkn" },
    );
    expect(result.email).toBeNull();
  });

  it("does not call /user/emails when there is no access token", async () => {
    const fetchMock = vi.fn();
    const provider = buildGithubSocialProvider(
      { GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "secret" },
      fetchMock as unknown as typeof fetch,
    );
    const result = await provider!.mapProfileToUser(
      { email: null, name: "Dan", avatar_url: null },
      null,
    );
    expect(result.email).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
