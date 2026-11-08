# AlejMusic React project guidance

- R1 is local and sample-only. Never contact the Mac API, Last.fm, Music.app or production tagging services without a separately explicit user authorization. Do not enable `createRealTransport` as part of routine fixes.
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
- Maintain one-screen loaded-fixture tests at 402×874 and 402×714, plus 390×844 and 430×932. Emulate safe-area allowances explicitly; do not claim physical Safari validation.
- Rating uses src/Rating.tsx: five stars, ten half-star radios, roving keyboard focus, arrow/Home/End selection. Keep numeric display, Clear and independent Favorite; no range slider.
- Keep sample diagnostics in the compact disclosure. Errors/uncertainty must remain visible even when their messages require scrolling. Compact targets are an explicit density tradeoff, not accessibility certification.

## R1.2 navigation override

- R1.2 supersedes earlier reference organization: the album preview alone opens Album info, ordered Album status, Collections, Album objects, Art & wallpaper, Music formats. Never gate sections on Full or conflate all-track Comments status with first-track Grouping tags.
- Main secondary navigation: More song tags, Metadata, Playlists. Metadata contains progress, lyric review and to-do; Genres/First heard retain their main-page entry points and standalone editors.
