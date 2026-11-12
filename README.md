# AlejMusic React · R2.1

Mobile-first tagging interface. **Sample mode by default; live writes are blocked.** Optional Last.fm + Mac read-only integration is prepared but requires owner configuration and a later authorized live preview. No personal values are included.

Requires the existing Node 22 runtime (tested 22.23.4) and npm (tested 10.9.9).

```sh
npm ci
npm run dev
# Open http://127.0.0.1:5173/react-preview/
npm test
npm run build
npm run preview
npm run test:browser
```

The browser suite uses installed Google Chrome on this Mac; update `playwright.config.ts`'s executable path for another machine. Preview binds only to loopback. No deployment is configured. The workspace is on main with R1.1 and R1.2 checkpoints. This milestone creates no commit, remote change or deployment.

Use “SAMPLE · Scenarios” to select lookup/album states or verified, failed, uncertain and delayed saves. Refresh alternates simulated playback A/B; Pin retains the editing target. Open editors retain their original target even when the main page follows another sample. A deliberate sample read clears an uncertain write block; there are no automatic retries. Reload resets in-memory fixtures. Unavailable Set buttons never save.

See [architecture and capability inventory](docs/architecture.md), [reference and contract decisions](docs/references.md), and [validation notes](docs/validation.md). Original `references/` remains unchanged.

R1.1 follows the original Option B renders with all main controls visible on one screen in tested 402×874 and reduced 402×714 viewports. Stars accept half-star taps/clicks and arrow keys; Home/End select 0.5/5 and Clear unsets. No rating slider remains. Main chips use 25–27px heights to achieve density; half-star targets are narrower and physical-device touch review is still needed. Expanded diagnostics, errors or long metadata may scroll naturally.

See [screen reconciliation and height budget](docs/design-reconciliation.md). Browser artifacts include full-page screenshots and measured viewport/content heights under ignored `test-results/`; these tests use Chrome, not physical iPhone Safari.

R1.2: open **Album info** from the compact album preview for status, Collections, objects, art and formats (all album saves remain unavailable). Main secondary links are More song tags, Metadata and Playlists. Genre/date editors stay accessible from their main-page summaries; Metadata focuses on progress, lyric review and to-do.


R2.1 defaults the static Vite base to `/react-preview/`, preserving the legacy site's root for a later S3 prefix-only upload. No router/fallback is needed for sheets. See [playback, routing, read-only configuration and preview prerequisites](docs/playback-integration.md). Keep personal configuration in ignored `.env.local`; `VITE_` values become public bundle contents, so no secrets/session tokens are allowed. Do not activate personal read-only configuration or contact services during implementation-only work. Tests use synthetic configuration and intercept external traffic.

R2.1.1 Mac song reads default to 60 seconds (`VITE_MAC_READ_TIMEOUT_MS`). Pending lookups show “Still looking up this song…” after three seconds and offer Cancel lookup. Cancel stops browser waiting; Music.app may continue. Pinned metadata survives canceled/failed/timed-out refreshes. No automatic retry occurs.

R2.3 adds explicitly configured `VITE_PLAYBACK_MODE=write-enabled` for supported song edits; sample remains the default and read-only still blocks writes. Do not activate writes or deploy without separate approval. `VITE_MAC_ROUTING=automatic` (default) uses the legacy public-IP service, with manual overrides in Connection; see integration notes for home-IP changes and HTTP-to-LAN browser restrictions. Personal `.env.local` remains unchanged by implementation. For fixture browser validation, build with `VITE_PLAYBACK_MODE=sample npm run build` before `npm run test:browser`.
