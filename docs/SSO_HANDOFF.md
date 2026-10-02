# IMS child-app SSO handoff

IMS is the identity provider. Sales and AtWork (HR) are separate apps. An authenticated IMS user who clicks **Sales** or **HR** in the sidebar does not type a second password. IMS issues a short-lived signed JWT and redirects the browser to that app's callback.

This repository implements the issuer only. Each child app implements `GET /api/sso/callback`.

## Launch

```
GET /api/sso/launch?app=sales|hr
```

| Check | Sales | HR |
| --- | --- | --- |
| Session | Valid `erp_session` cookie (middleware + `requireAuth`) | Same |
| Permission | Any authenticated user | `employees:employee:read` (`*` and system users pass) |
| Password change pending | Rejected (403) | Rejected (403) |

Unknown `app` values return 400. Missing or invalid session returns 401. HR without permission returns 403. If `SSO_SHARED_SECRET` is unset or shorter than 32 characters, the route returns 500 and does not redirect.

Success is **302** to:

```
{SALES_APP_URL}/api/sso/callback?token=<jwt>
{HR_APP_URL}/api/sso/callback?token=<jwt>
```

The redirect is not cached (`Cache-Control: no-store`) and sets `Referrer-Policy: no-referrer` so the token is less likely to leak on the next navigation. The token is never written to the audit log. The audit row is `SSO_LAUNCH` with `{ app }` only.

Sidebar links are same-origin anchors (same tab) to `/api/sso/launch?app=sales` and `/api/sso/launch?app=hr`. The browser follows the 302. HR stays behind `employees:employee:read`, matching the previous sidebar gate.

## Token

| | |
| --- | --- |
| Algorithm | HS256 only. Header `alg` is `HS256`. |
| Key | `SSO_SHARED_SECRET` (shared with the child app). Distinct from `JWT_SECRET`. |
| Lifetime | 90 seconds (`exp` / `iat`) |
| One-time | Unique `jti` per launch |

Claims (no password, hash, or session cookie):

| Claim | Meaning |
| --- | --- |
| `sub` | IMS user id |
| `email` | User email |
| `username` | IMS username |
| `name` | Display name (`fullName`) |
| `aud` | `sales` or `hr` — must match the app that received the redirect |
| `jti` | Unique id for this handoff |
| `iat` | Issued-at (seconds) |
| `exp` | Expiry (seconds), about 90s after `iat` |

IMS does not keep a redemption ledger. The child app must treat `jti` as single-use.

## Environment

See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `SSO_SHARED_SECRET` | HS256 key shared with Sales and HR. `openssl rand -base64 48`. Minimum 32 characters. Not `JWT_SECRET`. |
| `SALES_APP_URL` | Sales origin. Default `https://sales.eastafricanspirit.co.tz`. |
| `HR_APP_URL` | AtWork origin. Default `https://atwork.eastafricanspirit.co.tz`. |

Only `http:` and `https:` bases are accepted. The callback path is always `/api/sso/callback` on that base. Query values from the user never choose the redirect host.

`/api/webhooks/sales` is unchanged. It still authenticates with `SALES_WEBHOOK_SECRET` and is a public webhook path in middleware. It does not use this handoff token.

## Child app callback (not in this repo)

`GET /api/sso/callback?token=...` should:

1. Verify the JWT with `SSO_SHARED_SECRET`, algorithm pinned to HS256 (reject `none` and any asymmetric alg).
2. Require `aud` equal to this app (`sales` or `hr`), and require `exp` still in the future.
3. Reject a `jti` that was already redeemed (store it until after `exp`).
4. Map `sub` / `email` / `username` to a local user. Do not trust a password claim — there is none.
5. Create the child app's own session, then redirect to a URL that does not include `token` (browser history will still have held it briefly).
6. Do not log the raw token.

Clock skew of a few seconds is reasonable. Do not accept tokens older than `exp`.
