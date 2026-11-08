# AlejMusic React · R1.1

Mobile-first tagging interface. **Sample mode only; Music.app is untouched.** No API URL, credentials, Last.fm, external artwork, or live service requests are configured.

Requires the existing Node 22 runtime (tested 22.23.4) and npm (tested 10.9.9).

```sh
npm ci
npm run dev
# Open http://127.0.0.1:5173
npm test
npm run build
npm run preview
npm run test:browser
```

The browser suite uses installed Google Chrome on this Mac; update `playwright.config.ts`'s executable path for another machine. Preview binds only to loopback. No deployment is configured. The owner initialized Git after R1; the workspace is on main with no commits. No commit, remote or deployment is created by this milestone.

Use “SAMPLE · Scenarios” to select lookup/album states or verified, failed, uncertain and delayed saves. Refresh alternates simulated playback A/B; Pin retains the editing target. Open editors retain their original target even when the main page follows another sample. A deliberate sample read clears an uncertain write block; there are no automatic retries. Reload resets in-memory fixtures. Unavailable Set buttons never save.

See [architecture and capability inventory](docs/architecture.md), [reference and contract decisions](docs/references.md), and [validation notes](docs/validation.md). Original `references/` remains unchanged.

R1.1 follows the original Option B renders with all main controls visible on one screen in tested 402×874 and reduced 402×714 viewports. Stars accept half-star taps/clicks and arrow keys; Home/End select 0.5/5 and Clear unsets. No rating slider remains. Main chips use 25–27px heights to achieve density; half-star targets are narrower and physical-device touch review is still needed. Expanded diagnostics, errors or long metadata may scroll naturally.

See [screen reconciliation and height budget](docs/design-reconciliation.md). Browser artifacts include full-page screenshots and measured viewport/content heights under ignored `test-results/`; these tests use Chrome, not physical iPhone Safari.

R1.2: open **Album info** from the compact album preview for status, Collections, objects, art and formats (all album saves remain unavailable). Main secondary links are More song tags, Metadata and Playlists. Genre/date editors stay accessible from their main-page summaries; Metadata focuses on progress, lyric review and to-do.
