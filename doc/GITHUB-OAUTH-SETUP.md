# GitHub OAuth Setup

Status: Optional sign-in provider for ATV-Teams
Date: 2026-03-02

## 1. Purpose

ATV-Teams supports signing in with a GitHub account in addition to email +
password. This document explains how to register a GitHub OAuth App and wire it
into your ATV-Teams instance.

> GitHub OAuth is opt-in. If `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` are not
> configured, the server starts normally with email + password sign-in only and
> the "Continue with GitHub" button on the sign-in page returns a clear error.

## 2. Register a GitHub OAuth App

1. Go to <https://github.com/settings/developers> → **OAuth Apps** → **New OAuth App**.
2. Fill in:
   - **Application name**: `ATV-Teams` (or `ATV-Teams (local dev)`, etc.)
   - **Homepage URL**: your public ATV-Teams URL, e.g. `https://atv-teams.example.com`
     - For local development use `http://localhost:3100`
   - **Authorization callback URL**: `<HOMEPAGE_URL>/api/auth/callback/github`
     - Local dev: `http://localhost:3100/api/auth/callback/github`
3. Click **Register application**.
4. On the next page, click **Generate a new client secret** and copy the value
   immediately — GitHub only shows it once.
5. Copy the **Client ID** as well.

## 3. Configure ATV-Teams

Set the following environment variables before starting the server:

```env
GITHUB_CLIENT_ID=Iv1.example1234567890
GITHUB_CLIENT_SECRET=ghs_exampleSecretValue
```

Both variables also accept the `ATV_TEAMS_` prefix
(`ATV_TEAMS_GITHUB_CLIENT_ID`, `ATV_TEAMS_GITHUB_CLIENT_SECRET`) for forward
compatibility. If both are set, the unprefixed names win.

Restart the server. The sign-in page will now show **Continue with GitHub**.

## 4. Required OAuth Scopes

ATV-Teams requests the following scopes:

- `read:user` — read basic profile (name, avatar)
- `user:email` — read the user's verified email addresses

The `user:email` scope is required because GitHub returns `email: null` for any
user whose primary email is private. The server falls back to GitHub's
`GET /user/emails` API and selects the user's primary verified address.

## 5. Local Development Notes

- For loopback (`http://localhost:3100`) cookies, Better Auth is automatically
  configured with `useSecureCookies: false` so the browser accepts the session
  cookie over plain HTTP. This only applies when `PAPERCLIP_PUBLIC_URL` (or the
  configured base URL) starts with `http://`.
- The callback URL must match exactly — including scheme, host, and port — what
  you registered on GitHub. If you change the port (e.g. `PORT=3101`), update
  the OAuth App's callback URL accordingly.
- You can register multiple OAuth Apps (one per environment) and swap the
  `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` pair via your `.env` file.

## 6. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Button shows but click reports "GitHub sign-in is not configured" | Server has no `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` set — restart with env vars present. |
| Redirected to GitHub, then back with `redirect_uri_mismatch` | The callback URL on the OAuth App does not match `<BASE_URL>/api/auth/callback/github`. Update it on GitHub. |
| Sign-in completes but user lands on the sign-in page again | Session cookie blocked. Check that `PAPERCLIP_PUBLIC_URL` matches the URL the browser is using, and verify the cookie was set under the right host. |
| Sign-in completes but the resulting account has no email | The user has private emails and your OAuth App did not request `user:email`. Re-register the app with the documented scopes. |

## 7. Security Notes

- Treat `GITHUB_CLIENT_SECRET` as a secret. Never commit it. Use a secrets
  manager or your platform's environment configuration.
- For `authenticated + public` deployments, always pair GitHub OAuth with HTTPS
  (`PAPERCLIP_PUBLIC_URL=https://…`) so the OAuth callback and the session
  cookie travel over TLS.
- The `mapProfileToUser` callback never persists the GitHub access token; the
  token is only used in-flight to fetch the primary verified email when GitHub
  returns `email: null`.
