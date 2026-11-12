# R2.1 playback/read-only preview boundary

Implementation only. No live Last.fm/Mac traffic, uploads, DNS changes, Music writes or runtime verification were performed. Sample remains the default. The owner reports HTTP S3 static website hosting at `alejmusic.alejandroveloz.com` (CNAME to its us-east-1 S3 website endpoint); `/` remains jQuery. The API hostname is reported to resolve to `104.172.227.53`. These handoff facts were not independently queried. Apache is not part of this plan. Dynamic DNS/cron operation is unverified and untouched.

## Legacy observations

Read-only source inspection: `am-graphiti-jquery/index.html` at `f6c27a695f29b67c2c20c59c95d28d61ccdfd722`.

- Refresh calls HTTPS `https://ws.audioscrobbler.com/2.0/`, method `user.getRecentTracks`, with a literal username and API key in query parameters, `format=json`, and `nowplaying=true`. No authentication/session flow was found in this path. No literal personal configuration/key was copied into React.
- Only `track[0]['@attr'].nowplaying === 'true'` confirms playback; title is `name`, artist/album are `#text`. Missing/false now-playing data triggers alerts. It does not deliberately treat a latest scrobble as current. It lacks a Last.fm request timeout/catch in this path and does not clear earlier identity reliably when playback stops or fails. A stale provider now-playing flag cannot establish real device playback freshness.
- Identical title/artist/album causes “Track has not changed” and skips `/song_info`. Otherwise it sends the tuple, with an 8-second Mac timeout. Body status 200 supplies `match`; older failure handling offers candidates/alerts and lacks current truthful state isolation.
- Routing asks `whosplaying.alejandroveloz.com/ip.php` for the browser's public address (2-second timeout), compares a hardcoded home IP, then chooses Internal or External. Internal uses a separately hardcoded LAN address (observed `192.168.1.32`); External uses `http://api.alejmusic.alejandroveloz.com:7305`. Local is `http://localhost:7305` and disabled on iOS. Manual address entry also exists. It probes `/alive` twice (1.5-second timeout), which the implemented contract says is not readiness evidence.

R2.1 does not reproduce these public-IP/readiness probes. Their availability, home-IP freshness and asserted lack of home hairpin access are unverified. Configured Internal/External routing is selected manually, explicitly separate from playback discovery. There is no network autodetection, automatic fallback, polling or retry.

## Contract actually used

Mac committed baseline: **2c33cb3e7dc4954d12ae975b6d2088ac9ee7904a**, read with `git show …:docs/api/legacy-v0.md`. No backend working-tree change is a dependency.

`GET /song_info?name=…&artist=…&album=…` returns body `status`, `message`, chosen `match`, result arrays and `selection`. Title is required; artist/album parameters are required strings and may explicitly be empty. Matching uses lowercase name/artist/album (not albumArtist). Normalized reads accept casing differences while rejecting other target changes. No persistent-ID targeting exists.

Ordinary playback and metadata-only refreshes **omit `refresh`**, including unchanged playback. The backend serializes current metadata even on a cached resolution. Explicit low-level `refresh` accepts only Boolean values encoded as `true`/`false`; `true` forces a new candidate search and is not used by ordinary UI refreshes. No `/now_playing`, readiness probes or unsupported cache parameters are used.

Success selects only `match`; `results` and `matches` never select a record or establish ambiguity. Validate the application status, message, arrays, selected Song and selection diagnostics. Valid status-400/null-match envelopes distinguish no-match from application errors; malformed envelopes, invalid JSON/HTML, network failure, timeout and cancellation remain separate outcomes. Requests are simple credential-free GETs without headers or bodies. All three UTF-8 query keys are present, preserving the actual name/artist/album strings, including explicit empty artist/album.

`selection.ambiguous` is Boolean; `matchCount` describes the last full resolution and can exceed singleton cache-hit array lengths. Preserve `selectedIdentity.libraryId` and `persistentID` for diagnostics only. For successive successful reads of the same requested tuple, compare provided identifiers against the first observed selection. An unexpected difference displays a nonblocking warning and retains existing editor metadata, including a pinned target; it is not declared a backend error. Subsequent changed selections continue to warn until the frontend session is restarted. Legacy-v0 cannot select a specific duplicate by ID. No duplicate picker or persistent-ID targeting is introduced.

Favorite reads `loved`. Energy/Mood and checkbox membership derive from exact raw `comment` tokens, never invented top-level fields. Preserve raw Comments, Grouping, unknown fields and legacy `unpro`. `interpreted.tags` is lossy and cannot reconstruct Comments. Album/playlist data and unsupported writes remain unavailable.

R2.1.2 cross-check: committed backend HEAD **4038d29e2135e1385516a4f1a72b843d5f6e0b50** (optimized 6D candidate), using `docs/api/legacy-v0.md`, `tests/fixtures/api/legacy-v0.json`, `alejmusic/AppDelegate.m`, `alejmusic/AMSongLookup.m`, and `alejmusic/AMSongMutations.m`. The requested `docs/api/contract-review.md` does not exist in that Git tree. Historical fixtures identify an older source revision and are supporting evidence only. The reported running build remains **2c33cb3 (6B.2)**; HEAD is not assumed to be running. Both expose the same documented external contract. No backend working-tree edits or live requests were used. Live CORS, running-build verification, browser permissions and physical iPhone Wi-Fi/cellular checks remain pending separately authorized preview work. Manual Internal/External selection remains intentional.


## Implementation

- `playback.ts`: typed Last.fm source/normalizer. Requires explicit string title/artist and album presence. Explicitly blank artist and album strings are allowed; a missing album is invalid and never silently replaced. Array/singleton track shapes are accepted. Only the literal now-playing flag confirms current playback; recent scrobbles retain identity/date diagnostics but do not trigger library resolution. No age-based playback claim is invented.
- `integration.ts`: configured route selection, exact `/song_info` allowlist, generation-guarded manual playback session. Detected playback, resolved library target and pin remain distinct. Pinned A survives detected B and failed/stopped playback; unpin explicitly resumes the last confirmed detected identity. Metadata-only refresh reads the pinned tuple or detected current tuple without another Last.fm request. Older Last.fm/lookup responses and route-invalidated results cannot replace newer targets. Open sheets retain their captured target.
- `api.ts`: existing model normalization and tuple request encoding. Both its older optional real transport and the integration transport reject mutations before fetch. `store.ts` additionally refuses editing in read-only mode; the UI disables all song mutations and draft edits. Sample editing retains the existing pipeline. No sample-to-live fallback exists.
- `read-policy.ts` centralizes Mac read (60,000ms), slow-lookup (3,000ms) and Last.fm read (8,000ms) defaults. `LegacyClient.read` owns the Mac deadline via `http.ts` and passes its AbortSignal through the transport; there is no competing eight-second Mac fetch timer. Standalone transports use the same Mac default. Generic service-specific errors avoid credential-bearing logs; redirects and ambient credentials remain disabled. Sample mutation timeout/uncertainty behavior stays unchanged.

Last.fm detection runs only when Refresh is pressed. Startup/configuration/route changes never contact external services. In read-only mode, album objects/collections/status and membership remain explicitly unavailable, with no sample selections or playlist lists presented as library facts. Album title/artist, supported song metadata, genre and a conservatively recognized first-heard date are read from the Mac response. Artwork remains an illustrative placeholder; there is no artwork endpoint.

## Configuration for a later authorized preview

Copy `.env.example` to ignored `.env.local`. Do not do this with personal values during fixture-only work. Set:

```dotenv
VITE_PLAYBACK_MODE=read-only
VITE_BASE_PATH=/react-preview/
VITE_LASTFM_USERNAME=<owner-supplied username>
VITE_LASTFM_API_KEY=<owner-supplied client-distributable public API key>
VITE_MAC_ROUTE=internal
VITE_MAC_READ_TIMEOUT_MS=60000
VITE_MAC_INTERNAL_ORIGIN=http://<confirmed LAN address>:7305
VITE_MAC_EXTERNAL_ORIGIN=http://api.alejmusic.alejandroveloz.com:7305
# Optional, for a browser on the Mac itself only:
VITE_MAC_LOCAL_ORIGIN=http://localhost:7305
```

Vite variables are compiled into public JavaScript. Ignoring `.env.local` protects Git history, not bundle confidentiality. The owner must supply a key permitted for public client use under Last.fm's provider terms; no shared secret, password, session key or authentication token belongs here. No provider credential/authentication flow is implemented or assumed verified. Invalid explicit read-only configuration shows an error and sends no request; it never falls back to sample.

At home Wi-Fi, select the confirmed Internal LAN origin. On cellular, select External. The phone browser makes the request; localhost means that phone, not the mini. An address configured for another network may fail until manually changed. The Connection disclosure provides route selection and independent library refresh. Missing alternate origins cannot be selected. Every configured origin is validated; embedded credentials, paths, query strings, fragments and non-HTTP(S) origins are rejected. Configuration alone is not proof of reachability or authorization.

## Static S3 preview build

```sh
npm ci
npm test
npm run build
npm run test:browser
npm run preview -- --port 4173
# Open http://127.0.0.1:4173/react-preview/
```

`npm run dev` uses `http://127.0.0.1:5173/react-preview/`. Vite base defaults to `/react-preview/`; built JS/CSS URLs use that prefix. A later separately authorized root build can use `VITE_BASE_PATH=/ npm run build`. There is no history router: sheets do not change the URL, and reloading the prefix index needs no SPA fallback. Root promotion is not prepared or performed here.

A later Level 1 deployment must verify the actual S3 bucket, owner credentials/region, prefix index behavior, content types and current root contents before uploading **only the contents of dist into the react-preview/ prefix**. Do not upload the repo, env files or tests, alter root jQuery objects, or change DNS. Confirm the owner-supplied Last.fm/public-key policy, LAN origin, current running Mac candidate/contract, actual CORS behavior for the HTTP frontend origin, port forwarding/external reachability and browser local-network permission behavior before an authorized physical Wi-Fi/cellular test. HTTPS/authenticated transport, root promotion, polling, smart-playlist refresh and all Music writes remain separate milestones.

## Fixture validation

Synthetic Last.fm and Mac envelopes live in `tests/fixtures/integration.ts`. Unit tests exercise missing/incomplete/recent/current identities, empty album versus absent album, provider errors/timeouts, malformed/no-match/ambiguous Mac responses, casing, raw unknown fields, route choices, mutation denial, unchanged-track rereads, pin/unpin and out-of-order detection/lookup completion. Browser tests use explicit fake `.invalid` origins and intercept every external request before dispatch; unexpected external URLs are aborted. A second loopback Vite server tests configured read-only mode without personal values. A loopback static preview server verifies the actual production JS/CSS paths and reload at `/react-preview/`. No test is evidence of real Last.fm, DNS, CORS, Mac performance or physical Safari operation.

R2.1 validation: **41 unit/component tests, 18 browser tests and the production build passed**. Direct screenshot inspection covered sample and configured read-only modes at 402×714, 402×874, 390×844 and 1440×900; all normal loaded layouts had zero page overflow. Existing sample content remained 680.39px at 402×714. Final assets were verified under `/react-preview/assets/`, including a static-build reload. Screenshots are ignored under `test-results/read-only-WIDTHxHEIGHT.png` and `main-WIDTHxHEIGHT.png`. Chrome emulation is not physical iPhone Safari validation. Initial build import wiring was corrected before final successful checks; no failing checks remain.


## R2.1.1 slow lookup and cancellation

Audit retained existing manual routing, generation guards, same-song metadata rereads, read-only enforcement and pin/source separation. The previous duplicated eight-second Mac deadline was corrected without changing API formats. `VITE_MAC_READ_TIMEOUT_MS` configures **only Mac song reads** (default 60,000ms; positive integer timer durations required). Historical fresh lookups exceeded 30 seconds. Last.fm remains at eight seconds; sample mutations keep their prior eight-second timeout. Nothing retries automatically.

At Mac lookup start, Cancel lookup is available. After 3,000ms still pending, the client shows **Still looking up this song…**. This is a local elapsed-time indication, not server progress. Completion, failure, cancellation, replacement, route change and unmount clean up the slow timer. Normal loaded-page density is unchanged; exceptional feedback can scroll naturally.

Cancel stops browser waiting, aborts fetch where supported, clears pending/slow feedback and advances the existing request generation. It **does not prove that Music.app stopped processing**. Even an executor ignoring AbortSignal cannot update the editor after cancellation or timeout. Deadlines abort with a typed timeout outcome; explicit cancellation has its own canceled outcome. No-match, network failure, malformed response and other backend failures remain distinct, with ambiguous selected matches still viewable. A deliberate manual Refresh after any terminal result is allowed.

Pinned metadata refresh uses the captured pinned tuple and keeps its existing data on cancellation, timeout, network failure, malformed response or no-match. Detecting B while A is pinned still does not dispatch a B lookup; canceling A's metadata refresh cannot redirect it to B. Unpin explicitly resumes the detected target. Older requests cannot clear a newer request's slow timer or overwrite its result.

Manual Internal at home / External on cellular is an intentional **temporary preview-stage difference** from jQuery's automatic public-IP routing. No discovery, probes or fallback requests were added. S3 rollout remains jQuery at `/`, React at `/react-preview/`; deployment, actual Mac build/CORS/performance verification and physical iPhone Wi-Fi/cellular validation remain pending and separately authorized.

R2.1.1 validation: **53 unit/component tests, 21 browser tests and the production build passed**. Fake timers cover completion before 3s, the slow threshold, the exact 60s limit and a configured override, abort/late-result cleanup, no retries, explicit recovery, overlapping refreshes and pinned metadata preservation across terminal outcomes. Controlled browser clocks exercise slow/cancel/timeout flows without waiting 60 real seconds; all external requests are intercepted. Directly inspected loading and slow screenshots at 402×714 and pinned slow feedback at 402×874. Loaded layouts still fit; exceptional progress remains accessible without clipping. No live service or physical Safari verification was performed.

R2.1.2 validation: **65 component/API tests, 22 browser tests, production build and `git diff --check` passed**. Added source-contract fixtures for exact Unicode/empty query keys, omitted/explicit refresh, authoritative match selection, cached duplicate diagnostics, selected-ID changes, lossy interpreted metadata and malformed/application-error envelopes. Existing timeout/cancel/pinning/out-of-order/read-only/sample/subpath checks pass. Directly inspected loaded 402×714, pinned slow 402×874 and selected-identity warning screenshots. Normal loaded content remains within both tested iPhone heights; exceptional warnings scroll naturally and retain all controls. Browser execution required loopback binding outside the default sandbox; service requests were intercepted, with no live traffic.


## R2.3 — supported editing and automatic routing (supersedes earlier restrictions)

Modes: `VITE_PLAYBACK_MODE=sample` is the default; `read-only` preserves all read-only guards; **`write-enabled`** deliberately enables only `/rate` (rating 0–100, including 0), `/loved` (true/false), `/energy` (0–6), `/mood` (0–3), and `/tag` (exact supported token, add/remove). Every request captures name/artist/album and the current transport origin. No refresh parameter or whole Comments replacement is sent with a mutation. Unsupported process/album/genre/date/membership writes remain unavailable. Existing personal `.env.local` is not changed to enable writes; deployment and real-library tests require separate Level 1 approval.

Live controls show confirmed values while saving; they are temporarily disabled for that song, preventing repeated taps from issuing duplicate requests. Existing global serialization is retained. Verified responses update authoritative metadata; failed responses leave prior data and show failure. Backend uncertainty, a lost/malformed response or mutation deadline (60 seconds for live writes, separate from the configurable read deadline) blocks subsequent edits without retry. Manual metadata refresh reconciles, waiting for queued writes first; reads begun before newer edits cannot overwrite those edits. Refresh preserves pinning and captured secondary targets. Selected identity changes during a verified write are conservatively treated as uncertain, retain prior editor data and require inspection. Ambiguity remains a nonblocking warning; legacy-v0 cannot target a persistent ID. Even a normal refresh cannot prove which duplicate was originally intended.

Legacy routing evidence: jQuery `index.html:351–352` sets IP/ping deadlines to 2s/1.5s; `491–492` hardcodes home WAN and LAN IPs; `495` invokes detection at startup; `514–549` queries `http://whosplaying.alejandroveloz.com/ip.php`, trims the text and compares it to the hardcoded home IP. Matching selects Internal and disables External; differing selects External. Missing/failed detection alerts and can leave origins unset. `559–577` constructs the origins; `593` and `613` probe `/alive` only to alert, without selecting another route. No recurring refresh/resume detection or DNS-based home-IP tracking is implemented there. A WAN address change breaks its home comparison.

React defaults `VITE_MAC_ROUTING=automatic`. Before the first Mac lookup, a shared 2-second, credential-free request to that same existing IP service selects Internal on an exact comparison to `VITE_MAC_HOME_PUBLIC_IP` (legacy default `104.172.227.53`), otherwise External. Detection failure visibly falls back to configured External rather than assuming LAN. It never probes `/alive` or uses writes to test connectivity. Detection is cached; repeated metadata operations do not query again. Visibility return, online and supported connection-change events invalidate the decision and cancel obsolete reads; the next explicit read reevaluates. No automatic playback polling or metadata writes occur on resume. The Connection selector offers Automatic, Internal, External and optional Local, and shows the active route and detection outcome. Manual choice lasts for the app session, survives network events, and makes no detection requests until Automatic is selected again. Reload restores configured routing.

There is no browser DNS-resolution API here. `/ip` on the public Mac origin cannot reliably supply the current home IP when home hairpin access fails, and probing the private origin encounters browser restrictions. No new DNS-over-HTTPS service or infrastructure is introduced. Therefore a changed home WAN IP must be reflected in `VITE_MAC_HOME_PUBLIC_IP` and rebuilt; until then Automatic selects External even at home. If that route is unreachable there, use manual Internal. The existing HTTP IP service's actual availability/CORS is unverified by this milestone. Detection cannot overcome Chrome's confirmed HTTP-public-site-to-private-LAN restriction. A network error can represent browser policy, not an unavailable Mac; External remains manually selectable. Public-IP matching identifies the network only, not authentication or device trust.

An in-flight write always uses its captured origin. Route selection/resume never redirects it, retries it, or clears its uncertainty. Route changes disable new UI/store edits until metadata has been explicitly refreshed; existing pinned/secondary targets remain fixed. Tests intercept the IP service and all other remote requests. Physical-device editing, home routing, detection service CORS and supervised verified/failed/uncertain real-library behavior remain pending. The user's reported 5G read-only success is preserved as handoff evidence, not testing performed in this milestone.

Local fixture review: `VITE_PLAYBACK_MODE=sample npm run build`, `npm test`, `npm run test:browser`. The fixture suite starts loopback sample, read-only and write-enabled servers with synthetic configuration; the production preview server serves the sample build at `/react-preview/`. Build output is not a newly approved upload package.

R2.3 validation: **79 component/API tests, 23 browser tests, production sample validation build and `git diff --check` passed**. Mocked coverage includes all five mutation primitives, pending-tap suppression, captured routes/targets, serialization, failed/uncertain/network/timeout outcomes, no retry, reconciliation, duplicate-ID changes, stale-read protection, Automatic home/remote/failure choices, manual override, resume/online invalidation and no repeated per-operation detection. Directly inspected write-enabled and uncertain screenshots at 402×714: normal content fits without scrolling; exceptional feedback remains visible with natural scrolling. Existing sample/read-only lifecycle, target isolation, responsive sizes and preview-subpath checks pass. Initial test failures exposed a native-fetch binding error and test assumptions about immediate checkbox state; corrected before the final successful suite. No live service, write or deployment test was performed. Personal `.env.local` remains read-only and untouched; ignored dist is a sample validation build, not a new live upload package.
