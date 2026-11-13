# System-aware appearance — R2.5

Dark mode minimizes emitted light with true-black viewport, body, app container, desktop surroundings, buttons and sheets. Light mode retains the approved R2.4.1 styling. No playback, API, mode, target, rating or tag behavior changes. Personal `.env.local` is untouched.

## Legacy source evidence

Read-only `am-graphiti-jquery/index.html`: lines 17–21 use white `#fff` / black text in light mode; 24–50 follow `prefers-color-scheme: dark`, with body/select/button `#000` backgrounds and `#888` text. Checkboxes/radios use `#555` fill, `#888` outlines and `#673ab7` checked outlines. This is gray, not an off-white palette; no separate link-color rule was found. Lines 8–14 declare black browser theme color and reference touch icons/manifest. Lines 334–348 update theme-color with matchMedia and its change listener; no manual theme switch is present. `site.webmanifest` uses standalone display but white theme/background colors, so it is not evidence of an entirely black Home Screen launch. React does not copy that manifest or alter shortcut/install behavior.

## React palette

| Purpose | Dark value |
|---|---|
| Viewport, surfaces, controls | `#000000` |
| Primary text | `#c8c8c8` |
| Secondary text | `#8f98a5` |
| Default outlines | `#30343b` |
| Selected borders, small native indicators | `#7099c7` |
| Selected text | `#9bbce1` |
| Focus ring | `#96b8df` |
| Favorite | `#c77589` |
| Verified feedback | `#8bad94` |
| Error/uncertainty text | `#d5aa76` |
| Disabled text | `#858e9c` |

Compact React text uses lighter primary gray than legacy #888 for readability. Selected buttons stay black, with blue outlines/text and inset bars; Energy/Mood also underline their value. Native checks, radio state, filled/outlined Favorite and accessible checked/pressed labels retain non-color cues. Checkbox text weight remains unchanged to prevent chip wrapping shifts. Disabled selections retain checked indicators with muted outlines/text. Notices and errors use black surfaces with subdued outlined frames, not large bright panels. Small artwork/object illustrations remain recognizable; the light sleeve/CD/cassette illustrations are toned down in dark mode.

## Startup and system changes

`index.html` declares `color-scheme`, separate light/dark `theme-color` metadata, and an inline critical black background for dark preference before the bundle loads. `style.css` uses one dark media block after the existing light styles, with native dark form rendering. CSS responds immediately to system appearance changes without reload, timers, storage or JavaScript theme state. Root/body/main and sheet backgrounds cover safe areas and empty regions; modal backdrop is translucent black.

Chrome fixture tests block JS/CSS assets on the production sample page and verify that its initial HTML canvas is black. This checks the app-controlled loading surface, not iOS's cached launch snapshot, splash screen or Safari chrome rendering. Home Screen shortcut status-bar/overscroll presentation and appearance changes while suspended still need physical iPhone confirmation. No new install manifest or status-bar override is introduced.

## Validation and local review

Checks: `npm test`, `VITE_PLAYBACK_MODE=sample npm run build`, `npm run test:browser`, `git diff --check`. Browser tests intercept external traffic and cover light/dark phone/desktop views, all secondary sheets, black controls, selected/disabled/error states, keyboard focus, unchanged geometry, single-row rating, appearance changes without reload, and initial dark HTML with app assets blocked.

Screenshots are ignored under `test-results/`: `theme-light-402x874.png`, `theme-dark-402x874.png`, `theme-dark-402x714.png`, `theme-dark-390x844.png`, `theme-dark-1440x900.png`, `theme-dark-album-info.png`, `theme-dark-album-bottom.png`, `theme-dark-uncertain.png`, and `theme-comparison-402x874.png` (side by side). Normal loaded pages have zero horizontal/vertical overflow at requested sizes; dark and light control dimensions agree. Native-control appearance is browser-owned and may vary on Safari.

For a safe loopback-only sample preview, without changing `.env.local`:

```sh
VITE_PLAYBACK_MODE=sample npm run build
npm run preview -- --port 4173
# http://127.0.0.1:4173/react-preview/
```

Switch macOS/iOS appearance or emulate prefers-color-scheme in browser developer tools. The built preview is sample-only and is not a write-enabled upload package. Alternatively run `VITE_PLAYBACK_MODE=sample npm run dev -- --port 5173` and open `http://127.0.0.1:5173/react-preview/`. No live calls, deployment or physical-device verification are performed by this milestone.

Final R2.5 checks: **81 component/API tests, 29 browser tests, production sample build and git diff --check passed**. Direct screenshot inspection covered all requested sizes, the light/dark comparison, Album info top/bottom and uncertainty feedback. The loaded normal page retains zero horizontal/vertical overflow at requested sizes, and geometry equality is tested across a live theme change. All network traffic in tests is fixture-only; no live service calls, metadata writes, deployment or physical Safari verification occurred.
