# AlejMusic React project guidance

- Sample mode is the default. R2.1 prepares configurable read-only playback; never contact the Mac API, Last.fm, Music.app or production tagging services without a separately explicit user authorization. Do not activate personal read-only configuration or enable live calls as part of routine fixes. Read-only transports reject every route except /song_info; the separate write-enabled transport permits only the five validated song primitives with deliberate configuration.
- Do not commit, push, deploy, initialize a repository, upgrade runtimes, or modify sibling/native repositories unless explicitly authorized.
- Preserve `references/`. Precedence: explicit decisions/corrections in design.md and current user requirements, written tagging spec, committed implemented backend capability, existing behavior, generated images.
- API contract baseline: `2c33cb3e7dc4954d12ae975b6d2088ac9ee7904a` from `/Users/alejandroveloz/Documents/alej-music-osx`; use Git objects, not uncommitted files. Proposed v1 is not implemented.
- Keep API encoding/normalization in src/api.ts, sample transport in src/sample.ts, target-aware mutation state in src/store.ts, exact control tokens in src/tags.ts.
- Never rebuild real Comments from displayed controls. Preserve raw/unknown metadata, `unpro`, `lgptphobic`, `vnstrumental`, and independent checkbox semantics. Album Grouping never uses /tag.
- Every mutation captures its tuple target; retain sequencing, uncertainty blocks, pending projections, read-generation checks, and fixed secondary targets.
- `npm test`, `npm run build`, and `npm run test:browser` are the checks. Browser tests launch loopback-only Vite and installed local Chrome. Inspect screenshots after visual changes. Keep generated output ignored.
- Keep mobile hierarchy authoritative; do not infer exclusivity, album grammar, first-track resolution, process semantics, or additional endpoints.

## R1.1 visual guidance

- Mobile 1 remains the visual authority; Mobile 0b is only the physical-iPhone density benchmark. Preserve every main group in order; no hidden groups, zoom/scaling, clipping, or alternate quick/full mode.
- Maintain measured loaded-fixture tests at 402×874 and 402×714, plus 390×844 and 430×932. R2.4.1 returns rating to one row: loaded 402×714 fits with zero overflow (16px with the explicit 34px bottom allowance); preserve natural scrolling and access to every control. Emulate safe-area allowances explicitly; do not claim physical Safari validation.
- R2.4 rating overrides the earlier star rendering: src/Rating.tsx exposes eleven labeled radios from 0/unset through 5 in half steps, roving focus and arrow/Home/End selection. Keep numeric display and independent Favorite last; no X clear button, range slider or popup. R2.4.1 phone targets are one row including Favorite, approximately 29–30px wide and 44px tall, with repeated visible ½ labels but explicit accessible star values.
- Keep sample diagnostics in the compact disclosure. Errors/uncertainty must remain visible even when their messages require scrolling. Compact targets are an explicit density tradeoff, not accessibility certification.

## R1.2 navigation override

- R1.2 supersedes earlier reference organization: the album preview alone opens Album info, ordered Album status, Collections, Album objects, Art & wallpaper, Music formats. Never gate sections on Full or conflate all-track Comments status with first-track Grouping tags.
- Main secondary navigation: More song tags, Metadata, Playlists. Metadata contains progress, lyric review and to-do; Genres/First heard retain their main-page entry points and standalone editors.

## R2.1 playback/read-only integration

- No real Last.fm or Mac requests during implementation/test work. Use synthetic fixtures and interception before dispatch; never copy the legacy key or private config into source.
- playback.ts owns Last.fm normalization, integration.ts owns manual routing and playback session generations, http.ts owns bounded read fetches. Keep detected playback, resolved target and pin distinct; recent scrobbles are never current playback.
- No automatic playback calls, polling, readiness probes or sample fallback. R2.3 permits bounded legacy public-IP detection before reads, with explicit External fallback. Explicit same-song Refresh must reread metadata; metadata-only refresh remains independent of detection.
- Read-only UI and SongStore guards complement transport allowlisting. No sample album tags/artwork/membership may masquerade as live library data. Live writes require VITE_PLAYBACK_MODE=write-enabled and separate supervised deployment/testing; never change personal .env.local to enable writes during implementation.
- Vite base defaults to /react-preview/. S3 prefix-only preview is separate Level 1 work; never change the existing root jQuery website. No Apache configuration is applicable.
- Build before test:browser; it verifies sample dev, configured read-only dev (fake origins intercepted), and the built static preview on loopback ports 5173/5174/4173. See docs/playback-integration.md for contract and config boundaries.

- R2.1.1: keep Mac read/slow defaults centralized in read-policy.ts (60,000ms / 3,000ms). LegacyClient owns the Mac deadline and forwards AbortSignal; never reintroduce a competing transport eight-second timeout. Cancellation advances the existing session generation, clears progress, aborts client waiting and preserves pinned metadata; it cannot certify Music.app cancellation. Last.fm/sample mutation policies are separate.

- R2.1.2: normal /song_info reads omit refresh, retain all three UTF-8 tuple keys (empty artist/album allowed), and use match plus selection diagnostics rather than candidate-array lengths. Preserve raw comment; interpreted.tags is lossy. Selected IDs are diagnostics only; unexpected changes warn and retain existing editor metadata.

## R2.3 editing and routing

- Keep .env.local unchanged during implementation. Mock all Last.fm, public-IP and Mac traffic. Build browser-test static output with `VITE_PLAYBACK_MODE=sample npm run build` so personal read-only configuration does not activate the production fixture preview.
- network routing lives in routing.ts: bounded legacy IP query, configurable home public-IP reference, cached until resume/online/connection-change, manual overrides and Automatic. No /alive or write probes. Changed WAN IP requires updating the reference; detection failure falls back visibly to External.
- Live controls retain confirmed values until verified; pending live edits block repeated taps. Capture tuple and transport origin at submission, serialize writes, and never retry uncertainty. Refresh reconciles; duplicate identity changes retain prior metadata and block further edits. Route changes require a metadata read before further live editing.
