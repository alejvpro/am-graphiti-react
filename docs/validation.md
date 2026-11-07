# Validation history

## R1 · 2026-11-06

Validated locally on 2026-11-06 with Node 22.23.4 / npm 10.9.9 and installed Google Chrome. All tests use fixtures or injected executors; no Mac, Last.fm, Music.app or production API was contacted.

- `npm run build`: TypeScript strict check and Vite production build passed.
- `npm test`: 15 passing API/state/component tests. Covers exact encodings/tokens, unknown metadata preservation, half stars/clear, independent Favorite, unset values, People/severity/themes, More groups, shared repeated flags, unpro, disabled editors, pin/fixed targets, loading/no-match/ambiguity, failed rollback, rapid writes, target-isolated delayed results and uncertainty without retry. Real transport is tested using an injected fake executor only.
- `npm run test:browser`: 6 passing local Chrome tests. Four viewport workflows cover 390×844, 430×932, 768×1024, 1440×900; assert no horizontal overflow, successful sample saves, scroll restoration, drawer scrolling to collections, and zero external requests. Additional workflows verify failed/uncertain feedback, delayed A save while B is visible, draft cancellation, keyboard modal containment/Escape, secondary shells, and distinct empty/unavailable/failed album summaries.
- Direct screenshot review: main pages at requested widths; More tags and album sheets, including lower collections; mobile Metadata, Genres, First heard, Album status and Playlists. Screenshots are generated under ignored `test-results/`: `main-WIDTH.png`, `more-WIDTH.png`, `album-WIDTH.png`, `album-bottom-WIDTH.png`, `secondary-NAME-390.png`. Browser tests recreate this evidence.

The first build attempt ran before dependency installation completed and could not find tsc. Re-running after installation passed. The first browser attempt could not bind 127.0.0.1 inside the sandbox (EPERM); the authorized loopback suite passed with sandbox escalation. No remaining test/build failures. npm emitted a transitive whatwg-encoding deprecation warning; no runtime upgrade was performed.

Visual validation is local desktop Chrome at emulated viewport sizes, not physical iOS Safari or a screen-reader certification. Album artwork is a placeholder and object icons are bounded CSS/emoji approximations. Date editing uses the native browser date input; unsupported Set operations remain disabled. No live behavior or Music persistence has been validated or claimed.

Manual review: run `npm run dev`, open http://127.0.0.1:5173, and use browser responsive mode at the four sizes above. Open the scenario controls, try failed/uncertain/delayed saves, pin A and refresh to B, and open each secondary view. Observe that every success says Sample and unavailable editors cannot apply. Stop the local server with Ctrl-C.


## R1.1 · 2026-11-07

Final commands: `npm test` (17 tests), `npm run build` (strict TypeScript + Vite), `npm run test:browser` (11 local Chrome tests). Test executors remain sample/injected-only. Six viewport workflows assert zero external requests, zero horizontal/vertical page overflow in the loaded fixture, and viewport access to all 59 main controls plus all four secondary links. They also exercise sample saves, fixed dialog identity and scroll restoration. Additional tests cover half-star touch/keyboard and numeric/clear/Favorite consistency, no slider, stable checked-chip dimensions, one-row People, failed/uncertain save feedback/no retry, delayed A results while B is visible, disabled draft saves, modal focus/Escape, distinct album states, and expanded-diagnostics scroll restoration. Existing API/state tests and shared-state/pin/legacy-unpro protections remain.

Direct visual review includes final main screenshots at 402×874, 402×714, 390×844, 430×932, 768×1024 and 1440×900; explicit safe-area simulations; More tags, album cards/collections, Metadata, Genres, First heard, Album status and Playlists; and an enlarged high-DPR half-star detail. All are Chrome renderings. Device-scale/touch emulation is used for the half-star test; ordinary viewport tests validate CSS geometry, not iOS rendering. Physical iPhone Safari and assistive-technology testing remain pending.

The final screenshots and machine-readable measurements live in ignored `test-results/`: `main-WIDTHxHEIGHT.png`, `budget-WIDTHxHEIGHT.json`, `main-402x874-safe-area.png`, `main-402x714-safe-area.png`, `more-WIDTHxHEIGHT.png`, `album-WIDTHxHEIGHT.png`, `album-bottom-WIDTHxHEIGHT.png`, and `secondary-NAME-390.png`. Full-page captures do not crop overflow. See [design reconciliation](design-reconciliation.md) for source assumptions, the measured height budget, and touch/readability tradeoffs.

Intermediate checks exposed reduced-height overflow, an outdated textbox selector after datalist enhancement, a removed test import, and insufficient space with the additional bottom safe-area simulation. Layout/test corrections resolved them; final results supersede intermediate runs. No dependencies or runtime upgrades were needed. Tests launch an owned loopback-only preview and stop it on completion; no production or existing service was changed.
