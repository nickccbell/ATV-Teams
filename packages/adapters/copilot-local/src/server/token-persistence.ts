/**
 * Token persistence boundary for the Copilot OAuth adapter.
 *
 * Design
 * ------
 * OAuth access tokens for GitHub Copilot must be retrievable (we use them to
 * authenticate the `copilot` CLI process). That rules out hash-and-verify
 * storage like the `agent_api_keys` table — those entries store SHA-256
 * hashes that cannot be reversed.
 *
 * The right place for retrievable, encrypted-at-rest, company-scoped secrets
 * in ATV-Teams is the `company_secrets` table with the `local_encrypted`
 * provider. To keep this adapter testable in isolation and free of a DB
 * dependency, we define a pluggable `CopilotTokenStore` interface here; the
 * server wires it to the real `company_secrets` service when registering the
 * adapter.
 *
 * Conventions
 * -----------
 * - Each company has at most one Copilot token at a time. The default secret
 *   key is `copilot_oauth_token`. Operators can pick a custom key per agent
 *   by setting `adapterConfig.credentialSecretKey`.
 * - Tokens are never written to logs. The store implementation MUST redact
 *   token values in any error message or audit event it emits.
 * - The persistence API returns opaque "secret key" identifiers, not the
 *   token value itself. To use a token at runtime, callers must call
 *   `store.retrieve(...)` which performs the real secret read.
 */

export interface StoredCopilotToken {
  /**
   * The company-scoped secret key under which the token is stored. Stable
   * across token rotations for a given (company, key) pair.
   */
  secretKey: string;
  /**
   * GitHub username the token belongs to. May be null if the calling code
   * did not look it up; useful for the UI to render "connected as @username".
   */
  githubLogin: string | null;
  /**
   * Space- or comma-separated scope list returned by the GitHub token endpoint.
   */
  scope: string;
  /**
   * ISO timestamp of when the token was stored. Used in the UI to show
   * "connected on …".
   */
  storedAt: string;
}

export interface CopilotTokenPayload {
  /** The OAuth access token returned by GitHub. */
  accessToken: string;
  /** GitHub-reported token type (typically "bearer"). */
  tokenType: string;
  /** Scope string returned by the GitHub token endpoint. */
  scope: string;
  /** Optional GitHub username for the authenticated user. */
  githubLogin?: string | null;
}

export interface CopilotTokenStore {
  /**
   * Persist a new Copilot OAuth token for the given company under the given
   * secret key. Implementations must encrypt the token at rest.
   */
  put(input: {
    companyId: string;
    secretKey: string;
    payload: CopilotTokenPayload;
  }): Promise<StoredCopilotToken>;
  /**
   * Retrieve the plaintext access token for use at runtime. Returns null if
   * no token is stored under that key.
   */
  retrieve(input: {
    companyId: string;
    secretKey: string;
  }): Promise<CopilotTokenPayload | null>;
  /**
   * Mark the token as revoked. Implementations must delete the secret or
   * mark it as inactive such that subsequent `retrieve()` calls return null.
   */
  revoke(input: { companyId: string; secretKey: string }): Promise<void>;
  /**
   * Return public metadata about a stored token (no plaintext). Used by the
   * UI to render "connected as @user, scope=..., stored on ...".
   */
  describe(input: {
    companyId: string;
    secretKey: string;
  }): Promise<StoredCopilotToken | null>;
}

export const DEFAULT_COPILOT_SECRET_KEY = "copilot_oauth_token";

/**
 * Reference, in-memory implementation. Suitable for tests and for early-stage
 * dev environments where the DB persistence layer is not yet wired. Tokens
 * live only in process memory and are lost on restart.
 */
export function createInMemoryTokenStore(): CopilotTokenStore {
  // Keyed by `${companyId}::${secretKey}`.
  const cells = new Map<string, { payload: CopilotTokenPayload; meta: StoredCopilotToken }>();
  const cellKey = (companyId: string, secretKey: string) => `${companyId}::${secretKey}`;

  return {
    async put({ companyId, secretKey, payload }) {
      const meta: StoredCopilotToken = {
        secretKey,
        githubLogin: payload.githubLogin ?? null,
        scope: payload.scope,
        storedAt: new Date().toISOString(),
      };
      // Defensive copy so callers can't mutate stored bytes after the fact.
      cells.set(cellKey(companyId, secretKey), {
        payload: { ...payload, githubLogin: payload.githubLogin ?? null },
        meta,
      });
      return meta;
    },
    async retrieve({ companyId, secretKey }) {
      const cell = cells.get(cellKey(companyId, secretKey));
      if (!cell) return null;
      // Return a copy so the caller can't mutate stored state.
      return { ...cell.payload };
    },
    async revoke({ companyId, secretKey }) {
      cells.delete(cellKey(companyId, secretKey));
    },
    async describe({ companyId, secretKey }) {
      return cells.get(cellKey(companyId, secretKey))?.meta ?? null;
    },
  };
}

/**
 * Compose a `CopilotTokenStore` with a hook that emits an activity-log entry
 * each time a token is created/revoked. Used by the server registration code
 * to satisfy AGENTS.md §8 "write activity log entries for mutations".
 */
export function withActivityLog(
  inner: CopilotTokenStore,
  onActivity: (event: {
    kind: "copilot_token_put" | "copilot_token_revoked";
    companyId: string;
    secretKey: string;
    githubLogin?: string | null;
    scope?: string;
  }) => Promise<void> | void,
): CopilotTokenStore {
  return {
    async put(input) {
      const meta = await inner.put(input);
      await onActivity({
        kind: "copilot_token_put",
        companyId: input.companyId,
        secretKey: input.secretKey,
        githubLogin: input.payload.githubLogin ?? null,
        scope: input.payload.scope,
      });
      return meta;
    },
    retrieve: inner.retrieve.bind(inner),
    async revoke(input) {
      await inner.revoke(input);
      await onActivity({
        kind: "copilot_token_revoked",
        companyId: input.companyId,
        secretKey: input.secretKey,
      });
    },
    describe: inner.describe.bind(inner),
  };
}
