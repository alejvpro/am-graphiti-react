# R1.1 design reconciliation

Authority: this milestone, written design/corrections, committed API capabilities, existing behavior, then renders. Mobile 1 specifies appearance; Mobile 0b demonstrates density only. All nine supplied images were viewed before editing. Findings below were recorded before major changes; implementation and measured results follow below.

| Screen | Approved intent | R1 difference and classification | Cause/evidence | R1.1 changes / remaining boundary |
|---|---|---|---|---|
| Main | Compact navy/white Option B; labels above controls; small album; direct stars | Slider, several diagnostic lines, large padding and equal-width wrapping are density/fidelity regressions. Explicit unset, independent checkboxes and honest status are improvements. | Confirmed: 44px minimum controls, 11px group padding, separate status/banner/playback/footer, passive stars plus range input in App/CSS. Motivation of general form accessibility is inference. | Remove slider; direct half-stars; consolidate diagnostics; compact all established groups without hiding any; preserve safety and semantics. |
| More tags | Small content-sized chips, orderly sections, fixed song | Full-width Region/last-item tiles and large gaps are regressions; fixed identity is an improvement. | Confirmed flex-grow on every chip and repeated status notes; inferred implementation simplicity. | Content-sized chips, consistent selected blue/checks and compact sections. Keep all tokens. |
| Metadata | Summary rows, progress list, lyric flag, to-do | Raw date and lengthy API explanations weaken hierarchy; distinct unpro/read-only progress are necessary improvements/limitations. | Confirmed JSX paragraphs and unavailable setter. | Human date, structured summaries, short capability notice; keep shared supported controls and read-only process. |
| Genres | Four ordered select-like slots; primary note; flags; Set/Cancel | Plain text slots and verbose notes differ; remove/up buttons are a lightweight accessible alternative to dragging. Disabled Set is necessary. | Confirmed inputs and no vocabulary source in frontend. | Improve bordered rows/numbering and use only existing source-backed values as optional datalist suggestions; retain text entry for unknown values. No invented genre catalog or batch assignment. |
| First heard | Date/calendar, Today, missing-date fill, Set/Cancel | Native date picker is an intentional platform improvement; API prose is excessive. | Confirmed native input and missing setter. | Keep native picker; human-readable date, concise preservation note and unavailable state. No Grouping writes. |
| Album status | Descriptive Full/Incomplete/Trimmed cards; explicit album scope | Bare radio rows omit explanations: fidelity regression. Disabled operation is necessary. | Confirmed label-only rows and absent album-wide API. | Restore descriptions/cards and Full warning; consolidate unavailable explanation. |
| Playlists | Flight, refresh, stale warning, readable membership lists | Essentials present; technical paragraph and stretched Flight control differ. Sample labeling is necessary. | Confirmed JSX and equal-growth checkbox. | Concise sample label, blue refresh affordance, compact chips and list rows. Membership remains read-only. |
| Album drawer | Artwork/identity header, object/art/format cards, independent collection chips | Placeholder symbols and stretched collections differ; read-only shell is necessary, not a failed album editor. | Confirmed CSS/emoji silhouettes; no album resolver/grammar/API. | Move compact art into header, improve sleeve/tile/disc/display/cassette silhouettes and status dots; content-sized collections. Final custom art and all writes deferred. |
| Desktop | Dense usable workspace; four-column image exploratory | 740px cap and stretched controls waste space: modest layout regression. | Confirmed max-width and two equal columns; no evidence four columns approved. | Wider two-column layout, bounded controls, shared mobile logic. Complete workbench deferred. |

R1 improvements deliberately retained: captured targets, pinning, stale-read guards, ordered mutations, uncertainty blocking/no retry, shared flags, modal focus/Escape/scroll restoration, raw unknown metadata and legacy unpro, exact tokens, Energy/Mood unset, unavailable domain saves and native date picker. API/store/sample modules need no redesign.

## Implemented result and density tradeoffs

The complete main page retains every established section in order. Diagnostics now live inside one compact SAMPLE disclosure; visible save feedback stays next to identity/actions. Interactive half-stars replace the range slider; the SVG drawing avoids glyph-dependent half-star rendering. Checkbox styling uses blue plus actual check marks and fixed border widths, so selection never changes dimensions. Themes and secondary chips are content-sized; People stays in one row. Desktop grows from a 740px cap to 1120px with two columns, without introducing the exploratory workbench.

At short viewport heights, theme text uses 12px with 12px checks to achieve two rows; other main chips use 13px text. Chip heights are 25px (short viewports) or 27px; summary links and the disclosure are smaller. Each half-star has a roughly 16.5×30px hit region. These are deliberate density compromises, not a claim of full touch-target accessibility compliance. Keyboard focus, ten labeled rating radios, arrows/Home/End, Clear, semantic checkboxes and text/check selection feedback remain. Sheets use larger targets. No browser zoom, whole-app transforms, hidden sections or clipped main overflow are used.

Fit claims apply to the loaded representative fixture with diagnostics closed. Long titles/genres, error/uncertainty details, ambiguity warnings, expanded diagnostics, larger accessibility text or different platform font metrics may require ordinary scrolling; all controls stay available. No height cap or hidden overflow prevents that. Physical iPhone Safari review remains pending.

Viewport evidence: [Apple panel specifications](https://support.apple.com/en-us/125090) list 1206×2622 physical pixels. [Effective Viewport's device measurements](https://effectiveviewport.com/devices/apple-iphone-17-pro/) report DPR 3, 402×874 device CSS size, 402×714 expanded-chrome portrait viewport, 402×754 collapsed-chrome viewport, and 62/34 top/bottom safe areas. These are reference assumptions, not measurements of the user's device. Chrome tests report their actual innerWidth/innerHeight/visualViewport heights. We test 402×874 and 402×714 geometry, explicitly simulate standalone 62px top + 34px bottom, and separately reserve 34px bottom at 402×714. This does not reproduce Safari's dynamic toolbar behavior or assert how every Safari configuration combines env() insets with chrome. The app uses viewport-fit=cover and env(safe-area-inset-*) padding on real devices.

The pre-edit R1 baseline measured 1741px document height at 402×874 (1703.95px main content). R1.1 height tables below are generated from final browser measurements. Region heights represent occupied vertical slots including the following gap; desktop shares rows, so its individual region slots are not additive. All measurements are CSS pixels.

| Browser-reported viewport | Main content height | Document height | Vertical overflow |
|---|---:|---:|---:|
| 402×874 | 761.39 | 874 | 0 |
| 402×714 | 680.39 | 714 | 0 |
| 390×844 | 761.39 | 844 | 0 |
| 430×932 | 761.39 | 932 | 0 |
| 768×1024 | 839.00 | 1024 | 0 |
| 1440×900 | 803.00 | 900 | 0 |
| 402×874 + 62px top / 34px bottom | 851.39 | 874 | 0 |
| 402×714 + 34px bottom | 711.39 | 714 | 0 |

### Reduced-height region budget (402×714)

| Region | Occupied height |
|---|---:|
| Sample header | 17.00 |
| Song identity/actions/save | 45.39 |
| Metadata summaries | 41.00 |
| Album preview | 46.00 |
| Rating/Favorite | 45.00 |
| Energy/Mood | 80.00 |
| Appeal/People | 78.00 |
| Language/content and severity | 80.00 |
| Specific words/Themes | 108.00 |
| Musical details/To do | 82.00 |
| Secondary navigation | 55.00 |
| Bottom padding | 3.00 |
| Total content | 680.39 |

Available height is 714px; normal reduced-height content leaves 33.61px. Replacing the 3px bottom padding with a conservative 34px safe allowance produces 711.39px, leaving 2.61px, with zero scroll overflow. The largest grouped region is Specific words/Themes (108px); Energy/Mood and review/severity are 80px each. All 59 main inputs/buttons and four secondary links passed viewport-access assertions. Full-height layout uses larger chips and three theme rows. Expanded diagnostics/exception messages deliberately retain normal scrolling rather than hiding information.

Final review: all seven secondary screens reconciled; supported controls remain functional in sample mode and every deferred save remains disabled/read-only. No new dependency, endpoint, domain parser, backend change or state-management redesign was introduced. Final custom album artwork, full genre vocabulary, production transport and missing domain operations remain outside this milestone. No Command Center decision blocks local R1.1 review; acceptance of the compact touch sizes and actual Safari behavior should be checked on the user's phone.

## R1.2 approved information architecture

R1.2 supersedes the reference images' separate Album status destination and album-drawer order. The main album preview opens **Album info**, ordered: Album status → Collections → Album objects → Art & wallpaper → Music formats. Status retains its explicit disabled Set action, all-track Comments scope and manual Full warning; the remaining sections retain first-track Grouping scope and read-only sample presentation. Full is never inferred, applied automatically or required for any section. Empty, unavailable, failed and mixed sample states stay distinct; missing data does not hide the sections.

Main secondary navigation is now More song tags, Metadata, Playlists. Metadata omits duplicate genre/date summaries; their main-page summaries and standalone editors remain. Progress (including unpro), lyric review and shared to-do controls are preserved. The existing fixed-target modal, focus/close restoration and single scrolling sheet body are reused. API, tokens, state management, main tagging controls and desktop arrangement are unchanged.

### R1.2.1 compact Album status

Approved refinement: replace stacked status cards/descriptions with one horizontal Full / Incomplete / Trimmed radio segment row, retaining native checked indicators plus selected styling. Existing sample status text (unset, mixed, unavailable/unknown) remains authoritative; no choice is inferred or saved. Choices and Set remain disabled. One short note covers album-wide scope and Full’s smart-playlist implications. Collections follows the compact editor immediately; its sample-data state is shown within that section. First-track Grouping/read-only information remains at the bottom. Other sections, main controls, API and target handling are unchanged.


## R2.4 — precise rating selector

Physical-iPhone feedback supersedes the five-star split-hit-area design. Eleven outlined, individually labeled radios are ordered 0, ½, 1, 1½, 2, 2½, 3, 3½, 4, 4½, 5; the independent Favorite heart follows. Zero means unset and replaces the right-side X. Phones use six columns across two rows; desktop uses one row. Numeric display, keyboard roving focus/arrows/Home/End, selected-state dimensions and screen-reader semantics remain. Each position sends its index × 10 (0–100); live display waits for verified backend state. No state/API/routing or unrelated control-layout changes.

Measured Chrome emulation: targets are 61.16–61.17 × 44px at 402px width and 59.16–59.17 × 44px at 390px, with 3px gaps. The 44px height intentionally takes priority over the older zero-overflow reduced-height goal.

| Viewport | Main content height | Document height | Vertical overflow |
|---|---:|---:|---:|
| 402×714 | 746.39px | 746px | 32px |
| 402×874 | 827.39px | 874px | 0px |
| 390×844 | 827.39px | 844px | 0px |

The existing conservative safe-area simulations report 43px overflow at 402×874 (62px top/34px bottom) and 63px at 402×714 (34px bottom). All controls remain reachable by natural scrolling; nothing is clipped, hidden or scaled. Inspected full-page screenshots at all three requested phone dimensions. Physical-iPhone touch acceptance remains pending; emulated touch tests exercise all eleven positions. Unsupported writes, Favorite independence and R2.3 protections are unchanged. Local validation uses a sample production build; personal .env.local is unchanged and no live requests are made.

R2.4 validation: 81 component/API tests, 23 browser tests, the production sample validation build and `git diff --check` pass. Browser tests cover single-tap selection of every position, exact callback values, keyboard behavior, independent Favorite, removed X/slider, unchanged save/routing protections and measured natural scrolling. Initial zero-overflow assertions were replaced with the measured R2.4 height budgets; all final checks pass.


## R2.4.1 — single-row rating experiment

Explicit user refinement supersedes R2.4's two-row layout. Visible order is 0, ½, 1, ½, 2, ½, 3, ½, 4, ½, 5, Favorite. Each repeated ½ has its full accessible value (0.5/1.5/2.5/3.5/4.5 stars). Backend mapping, controlled selection, numeric display, keyboard handling, Favorite and save/routing safeguards are unchanged. Only rating labels/layout, affected tests and guidance changed.

Phone controls use one row with 2px gaps and 44px height. Actual widths are approximately 30px at 402px and 29px at 390px (heart rounds to 28.984px). Targets are narrower than R2.4's 59–61px; this is the user's requested usability experiment, not a claim of 44×44px targets or physical touch validation. Full labels remain available to screen readers.

| Viewport | Main content height | R2.4 overflow | R2.4.1 overflow |
|---|---:|---:|---:|
| 402×714 | 699.39px | 32px | 0px |
| 402×874 | 780.39px | 0px | 0px |
| 390×844 | 780.39px | 0px | 0px |

The rating region is 47px shorter; surrounding controls are unchanged. Conservative safe-area simulations improve from 43px to 0px at 402×874 and 63px to 16px at 402×714. No wrapping, horizontal scrolling, clipping or whole-app scaling is used. Personal .env.local is unchanged; dist is a sample validation build, not a new live-upload package.

R2.4.1 validation: 81 component/API tests, 23 browser tests, production sample validation build and `git diff --check` passed. Inspected screenshots at 402×874, 402×714 and 390×844: all twelve targets share one row with readable labels, distinct borders and no horizontal overflow. Existing emulated-touch coverage exercises all eleven accessible rating values and independent Favorite. Physical-iPhone acceptance of the narrower targets remains pending.
