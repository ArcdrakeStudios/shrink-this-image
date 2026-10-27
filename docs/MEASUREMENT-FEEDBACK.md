# Optional counts and voluntary feedback

Image compression and sample creation remain local. Optional collection is a
separate host integration. The page uses neutral EN/DE availability text: feedback
needs confirmation from this site's service. A missing API produces a readable
failure and keeps the feedback draft. Static preview has no intake/storage;
local UI availability does not establish activation. Production configuration is
unchanged and collection is not activated by this package.

The copied `dist/shared/measurement-feedback-client.mjs` and adjacent
`measurement-contract.mjs` implement the shared v1 contract. Preserve both together.
The product code is `shrink`. No browser secret, user identifier, file, filename,
URL, query string, settings or compression result belongs in an event payload.

## Request contract

The endpoint is configured by the serving host through exact root-relative routes,
independent of the app subpath. It is never pinned to a preview origin:

- `POST /api/events`: only `{product:"shrink",event:"tool_start"}` or another
  allowlisted event: `page_view`, `play_start`, `play_complete`, `feedback_open`,
  `tool_start`, `tool_complete`. Shrink uses page entry, feedback opening and actual
  compression start/success; it does not emit game events.
- `POST /api/feedback`: `{product:"shrink",category,message,replyTo?}`. Category is
  `bug`, `idea`, `usability` or `other`. Trimmed message length is 1–2000 JavaScript
  string code units, allowing tabs/newlines and rejecting other controls. A reply
  email is optional; omit it when blank. Supplied email must have a valid email
  shape, no controls and at most 254 code units. Unknown fields are rejected.

Requests use JSON, same-origin mode, no cookies/referrer, no redirects and no
query string. The host requires a same-origin Origin header, valid UTF-8 and a
maximum 12,000-byte body. Acceptance requires HTTP 202 with exactly `{ok:true}`
for events or `{ok:true,id}` with a valid UUIDv4 feedback receipt. Extra fields or
missing/malformed receipts fail closed. The client preserves the shared bounded
error vocabulary (`invalid`, `origin`, `product`, `method`, `size`, `type`, `rate`,
`unavailable`, `capacity`) and normalizes other failures to `unavailable`. It
requires each error's exact status/code pair; malformed responses become
`unavailable`. One 10-second deadline bounds fetch and response JSON reading,
aborts the request and restores form controls. The client does not retry, queue
or save drafts to persistent storage. A failed network
receipt can follow a successful write: the UI does not promise nothing was saved.

## Consent and notices

Usage counts default off. Every event checks `arcdrake.analytics.v1` again; GPC
and DNT override opt-in. Opt-out stays available during compression. Allow does
not resend previous page/actions. Feedback is independent and requires explicit
Send; opening or typing never submits it. The yes/no choice is shared by products
on the same origin. Language changes preserve form state and receipts.
If storage is unavailable the choice applies on this page and the UI explains
that limit. Failed opt-out persistence best-effort clears old permission; if both
write and removal fail, a saved opt-in may survive reload or in another tab. The
client gates same-page clients and rechecks persisted cross-tab opt-outs.

The full visible EN/DE notices describe Arcdrake as recipient, authorized triage
operators/agents, no reply guarantee, connection metadata processing by the
hosting/abuse provider, current plus 89 prior UTC days of action totals, and
30-day feedback visibility. Hourly physical purge is subject to platform failure;
provider backup retention must be verified separately and authorized exports
must expire no later than the feedback. Counts are action totals, with no unique
visitor claim. Existing links are Tools `/privacy/` and company `/contact/`,
including their `/de/` variants. Review the host notices alongside activation.

## Host integration and rollback

The host must forward only these exact APIs to the private shared service through
the `MEASUREMENT_FEEDBACK` service binding. A missing binding must return 503 JSON
rather than success or static HTML. Preserve the original HTTPS request URL,
Origin and trusted platform `CF-Connecting-IP`; forwarded headers are not an
identity authority. Backend `HOST_PRODUCTS` must map exact reviewed HTTPS origins
to allowed product IDs including `shrink`. No wildcard origins, public
cross-origin intake or wildcard CORS. The backend must have no public routes,
workers.dev or preview endpoint. Keep privileged triage/abuse secrets server-side;
never include them in public config or assets. The CSP allows only same-origin
connections and needs to agree with the hosting wrapper's policy.

In a separately authorized activation, integrate the shared backend/configuration,
retention, rate limits, backup/export rules and host privacy notices; then verify
service binding URL/Origin/platform-IP propagation with synthetic data. Test
unauthorized triage denial and expiry/cleanup, delete synthetic feedback, and
check the EN/DE browser flow. Keep availability copy neutral and claim activation
only after verification. No resource, account, paid service or deployment is
created by packaging.

To disable intake, remove the client integration and forwarding together or serve
explicit 503 while keeping local image processing and normal contact/static
routing available. Keep cleanup running until stored feedback expires or is
deliberately deleted; rollback must not incidentally destroy the store.
