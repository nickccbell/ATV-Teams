export const type = "copilot_local";
export const label = "GitHub Copilot CLI (local)";

/**
 * GitHub's OAuth device-flow endpoints. The Copilot CLI authenticates against
 * github.com using a standard OAuth device-code flow.
 *
 * - Device code endpoint:   POST https://github.com/login/device/code
 * - Token poll endpoint:    POST https://github.com/login/oauth/access_token
 *
 * `read:user` is required to identify the authenticated user;
 * `copilot` is the scope GitHub Copilot itself requests.
 */
export const GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code";
export const GITHUB_OAUTH_TOKEN_URL = "https://github.com/login/oauth/access_token";
export const COPILOT_OAUTH_SCOPES = ["read:user", "copilot"] as const;

/**
 * Recommended default models exposed in the agent creation form. The actual
 * model used at runtime is selected by the Copilot CLI from the user's
 * Copilot entitlements; this list is a UX hint only.
 */
export const DEFAULT_COPILOT_LOCAL_MODEL = "gpt-4.1";

export const models = [
  { id: DEFAULT_COPILOT_LOCAL_MODEL, label: DEFAULT_COPILOT_LOCAL_MODEL },
  { id: "gpt-5", label: "gpt-5" },
  { id: "claude-sonnet-4.5", label: "claude-sonnet-4.5" },
  { id: "o3-mini", label: "o3-mini" },
];

export const agentConfigurationDoc = `# copilot_local agent configuration

Adapter: copilot_local

Use when:
- You want ATV-Teams to drive the GitHub Copilot CLI on the host machine
- Your operator has a GitHub account with Copilot entitlements and has completed
  the OAuth device flow for this company
- You want to reuse the same Copilot subscription you use in the IDE for
  autonomous agent work

Don't use when:
- The host machine doesn't have the \`copilot\` CLI installed
- Nobody has completed OAuth setup for this company yet (do that first via the
  Copilot OAuth flow exposed in the agent settings UI)
- You need a simple one-shot script execution — use the \`process\` adapter

Core fields:
- cwd (string, optional): default absolute working directory for the agent
  process (created if missing when possible)
- instructionsFilePath (string, optional): absolute path to a markdown
  instructions file prepended to the prompt at runtime
- model (string, optional): preferred Copilot model id. The Copilot CLI may
  override this based on the user's entitlements.
- promptTemplate (string, optional): run prompt template
- command (string, optional): defaults to "copilot"
- extraArgs (string[], optional): additional CLI args appended after built-in flags
- env (object, optional): KEY=VALUE environment variables
- credentialSecretKey (string, optional): the \`company_secrets\` key under which
  the OAuth access token for this company is stored. When set, the token is
  injected into the agent process as GH_TOKEN at runtime.

Operational fields:
- timeoutSec (number, optional): run timeout in seconds
- graceSec (number, optional): SIGTERM grace period in seconds

Notes:
- The OAuth device flow is the only supported way to obtain a token. ATV-Teams
  never asks the operator to paste a personal access token.
- Tokens are stored encrypted at rest in \`company_secrets\` (provider:
  \`local_encrypted\`) and are scoped per-company. They are never written to
  prompts or logs and are redacted from \`onMeta\` invocation env dumps.
- The Copilot CLI manages its own session/context internally; this adapter
  does not currently chain sessions across runs.
- A note about scope: this PR ships the OAuth state machine and token
  persistence boundary. The user-facing OAuth UI (device-code dialog) and the
  full \`copilot\` CLI exec wiring are tracked as Phase 3 follow-ups.
`;
