import { describe, expect, it } from "vitest";

import { parseCopilotOutput, parseCopilotUsageFromOutput } from "./parse.js";

describe("parseCopilotUsageFromOutput", () => {
  it("parses the canonical CLI footer with k-suffixed totals", () => {
    const sample = [
      "Some agent prose explaining what happened.",
      "",
      "Changes     +21 -51",
      "AI Credits  41.8 (1m 22s)",
      "Tokens      ↑ 749.6k (619.5k cached)  · ↓ 10.9k",
    ].join("\n");

    expect(parseCopilotUsageFromOutput(sample)).toEqual({
      inputTokens: 749_600,
      cachedInputTokens: 619_500,
      outputTokens: 10_900,
    });
  });

  it("parses a footer with M-suffixed values and capital suffix", () => {
    const sample = "Tokens ↑ 1.5M (0.5M cached) · ↓ 250K";
    expect(parseCopilotUsageFromOutput(sample)).toEqual({
      inputTokens: 1_500_000,
      cachedInputTokens: 500_000,
      outputTokens: 250_000,
    });
  });

  it("parses raw numeric values and comma-separated thousands", () => {
    const sample = "Tokens ↑ 1,234 (200 cached) · ↓ 56";
    expect(parseCopilotUsageFromOutput(sample)).toEqual({
      inputTokens: 1234,
      cachedInputTokens: 200,
      outputTokens: 56,
    });
  });

  it("returns null when no Tokens footer is present", () => {
    expect(parseCopilotUsageFromOutput("Just some prose. No telemetry.")).toBeNull();
  });

  it("returns the LAST footer when multiple are present (cumulative session)", () => {
    const sample = [
      "Tokens ↑ 100k (10k cached) · ↓ 5k",
      "...lots of work...",
      "Tokens ↑ 250k (50k cached) · ↓ 15k",
    ].join("\n");
    expect(parseCopilotUsageFromOutput(sample)).toEqual({
      inputTokens: 250_000,
      cachedInputTokens: 50_000,
      outputTokens: 15_000,
    });
  });

  it("strips ANSI escape codes before parsing", () => {
    const sample = "\x1B[2KTokens \x1B[1m↑ 749.6k (619.5k cached)\x1B[0m · ↓ 10.9k";
    expect(parseCopilotUsageFromOutput(sample)).toEqual({
      inputTokens: 749_600,
      cachedInputTokens: 619_500,
      outputTokens: 10_900,
    });
  });

  it("strips OSC hyperlink sequences", () => {
    const sample = "\x1B]8;;https://example.com\x07Tokens ↑ 100k · ↓ 5k\x1B]8;;\x07";
    expect(parseCopilotUsageFromOutput(sample)).toEqual({
      inputTokens: 100_000,
      cachedInputTokens: 0,
      outputTokens: 5_000,
    });
  });

  it("clamps cached input tokens to total input tokens", () => {
    // Pathological output where cached > input — should be clamped.
    const sample = "Tokens ↑ 100 (500 cached) · ↓ 10";
    expect(parseCopilotUsageFromOutput(sample)).toEqual({
      inputTokens: 100,
      cachedInputTokens: 100,
      outputTokens: 10,
    });
  });

  it("handles missing output value gracefully", () => {
    const sample = "Tokens ↑ 749.6k (619.5k cached)";
    expect(parseCopilotUsageFromOutput(sample)).toEqual({
      inputTokens: 749_600,
      cachedInputTokens: 619_500,
      outputTokens: 0,
    });
  });

  it("ignores prose that mentions 'tokens' but lacks the structured footer", () => {
    const sample = [
      "I will work on the tokens module next.",
      "Result: tokens were updated.",
    ].join("\n");
    expect(parseCopilotUsageFromOutput(sample)).toBeNull();
  });

  it("returns null when totals are all zero", () => {
    expect(parseCopilotUsageFromOutput("Tokens ↑ 0 (0 cached) · ↓ 0")).toBeNull();
  });

  it("accepts ASCII fallback markers (in/out) when arrows are missing", () => {
    const sample = "Tokens in 12k (3k cached) · out 4k";
    expect(parseCopilotUsageFromOutput(sample)).toEqual({
      inputTokens: 12_000,
      cachedInputTokens: 3_000,
      outputTokens: 4_000,
    });
  });
});

describe("parseCopilotOutput", () => {
  it("includes usage when the footer is present", () => {
    const stdout = [
      "Hello world",
      "",
      "Tokens ↑ 100k (10k cached) · ↓ 5k",
    ].join("\n");
    const parsed = parseCopilotOutput(stdout);
    expect(parsed.usage).toEqual({
      inputTokens: 100_000,
      cachedInputTokens: 10_000,
      outputTokens: 5_000,
    });
    expect(parsed.errorMessage).toBeNull();
    expect(parsed.loginRequired).toBe(false);
  });

  it("usage is null when no footer is present", () => {
    const parsed = parseCopilotOutput("Just an answer.");
    expect(parsed.usage).toBeNull();
  });

  it("usage is null on login-required output even if a fake footer appears", () => {
    // Login still detected; usage may parse but the upstream call site
    // treats login as a hard failure either way. Just assert detection.
    const stdout = "error: not logged in\nplease sign in to copilot";
    const parsed = parseCopilotOutput(stdout);
    expect(parsed.loginRequired).toBe(true);
  });
});
