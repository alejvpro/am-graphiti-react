# Tagging contract review

Reviewed 2026-11-05. Scope: source and stored Git objects only; no application execution or live metadata verification. This report is the only project-file change. No fetch, checkout, merge, install, build, API call, Music/database write, scheduler inspection, or deployment was performed. The discovery/playlist utility repositories were excluded.

The legacy phone client fills the previous audit's missing-client gap. Its basic song writes exist, but the complete proposed UI cannot safely be connected to the existing bridge. Stable write identity, truthful completion/error handling, metadata-preserving mutations, and cache reconciliation are prerequisites for live writes. Album objects/collections have neither an implemented grammar nor a first-track resolver in the inspected app. These are distinct from native album-status support.

## 1. Inputs, authority, and source baseline

All four supplied paths exist and were readable:

- Client: `/Users/alejandroveloz/Sites/am-graphiti-jquery`.
- Mac app: `/Users/alejandroveloz/Documents/alej-music-osx`.
- Prior audit: [report.txt](/Users/alejandroveloz/Documents/alejmusic-audit/report.txt).
- Desired contract: [design.md](/Users/alejandroveloz/Documents/alejmusic-audit/design.md).

No applicable AGENTS.md was found in either repository, the audit directory, or their filesystem ancestry. Hidden-file-aware repository/audit searches were included. No access denial occurred. Earlier uploaded snapshots mentioned in design §11 were not supplied and are not treated as evidence. Generated reference images were not needed or inspected.

Authority: explicit user decisions in the design override implementation; current source establishes existing behavior, not approval to reproduce it. The prior audit supplies context; this review independently rechecks the relevant Mac source and newly available phone client. Running binary revision, deployed frontend revision, actual library metadata, playlist rules, and network exposure remain unverified.

| Source | Inspected state | Implication |
|---|---|---|
| Client `main` | `f6c27a6`, clean; equals stored `origin/main` | Relevant implementation is the single `index.html`; README only describes copying that file to hosting. Deployment is not proven. |
| Mac checkout `caching` | `433bbb9` (2025-07-25); tracked files clean; equals stored `origin/caching` | Preserve untracked `.DS_Store`, workspace `xcuserdata/`, and project `xcuserdata/alejandroveloz.xcuserdatad/`. |
| Mac local `quickUpdates` | `fdd5efb` | Shared base with caching; caching adds one search-cache commit. |
| Mac stored `origin/quickUpdates` | `8361487`; three commits beyond local quickUpdates | Adds `74e131c` re-tag positioning, `127b5c5` Funk genre, `8361487` NFC convenience. **Potentially stale remote-tracking evidence**, not current upstream truth. |
| Mac local/stored `master` | `9210d83`; caching is 21 commits ahead | Old implementation lacks the tagging HTTP bridge and modern field handling; unsuitable as React contract baseline. |

All remote-tracking comparisons here are potentially stale; no fetch was authorized. `caching...origin/quickUpdates` is 1 versus 3 commits, sharing `fdd5efb`. No branch was switched or merged.

Relevant client history: `8c11432` initial tagging site; `b2bde63` language tags; `69cd696` tag logic; `1238647` Mood; `3f377fb` re; `6e25f3a` Energy/Mood population; `64362e5` Energy unset label. The last two commits change network address selection, not metadata semantics. Relevant Mac history includes `a32f65f` process/nltags changes, `dc44aab` language tags, `4664425`/`aaf753f` Energy endpoint/explicit target, `fdd5efb` Mood, and `433bbb9` caching.

### Evidence key

References below use these files and checkout line numbers unless a branch is explicitly named:

- **C**: [client index.html](/Users/alejandroveloz/Sites/am-graphiti-jquery/index.html). Controls 221–323; phone flag inventory 360–440; requests 625–888; refresh 903–1017; population 1035–1113.
- **M**: [Mac AppDelegate.m](/Users/alejandroveloz/Documents/alej-music-osx/alejmusic/AppDelegate.m). Tag map 615–683; routes 780–1131; cache/search/JSON 1134–1246; native editors 1752–2067; formatter 2071–2187; album status/matching 2215–2287.
- **X**: [MainMenu.xib](/Users/alejandroveloz/Documents/alej-music-osx/alejmusic/Base.lproj/MainMenu.xib). Short theme labels around 1995–2094; UC tooltip around 992 and updateComment outlet 161.
- **H**: [Music.h](/Users/alejandroveloz/Documents/alej-music-osx/alejmusic/Music.h). `persistentID` 206; track `databaseID` 374, `discNumber` 378, `trackNumber` 423. Header capability does not establish an API.

## 2. Field-to-code/API matrix

**Status legend:** Supported = existing semantic primitive exists; Partly = exists with gaps/unsafe behavior; Missing = required implementation not found; Unresolved = product or storage decision remains. “Supported” never means approved for immediate live use: all existing HTTP writes inherit the identity/error/transport blockers in §3.

### Common song-tag contract (T)

Unless specified otherwise, every token in the song-flag table is stored in the targeted song's **Comments** (`MusicTrack.comment`), read as raw `comment` and `interpreted.tags` through GET `/song_info?name&artist&album`, and writable through GET `/tag` with the same identity plus `tag=<exact token>&type=add|remove`. Native equivalent: `commentCheckboxClicked:` → `addRemoveTag:add:` (M 2006–2036).

T appends on add without deduplication; removes every case-sensitive substring occurrence on remove, without token-boundary checks; any HTTP type other than `add` takes the remove path. No tag allowlist, dependency validation, or exclusivity enforcement is present. It then runs the shared formatter and, when the native updateComment switch is enabled (default on), updates/adds `@yyMMddHHmmss` in Comments. This is a tagging timestamp, **not First heard**. Other properties are not directly assigned, but unrelated Comments are not guaranteed lossless preservation; see §3. No language/severity cascade is implemented. Generic `/tag` availability does not implement a domain-specific process setter or album operation.

| Display / action | Exact property/token and scope | Read/write or native method | Validation, clearing, preservation, status |
|---|---|---|---|
| Rating, numeric stars, Clear | Song `rating`, 0–100; stars = rating / 20 | `/song_info`; GET `/rate?…&rating`; native `ratingClicked:` M 1752 | Client offers 0,10,…100; 0 clears. Backend parses a decimal then integer, without range/step validation. Only rating assigned, no comment-date update. **Supported primitive / partly validated**. |
| Favorite heart | Song `loved` Boolean, independent of rating | `/song_info`; GET `/loved?…&loved=true|false`; `loveClicked:` | Only exact `true` means yes; any other input means no. Clears to false; only loved assigned. **Supported primitive**, modern Music UI naming/runtime behavior not tested. |
| Energy: unset, 1–6 | Song Comments `e1`…`e6`; absence = unset | GET `/energy?…&energy=0…6`; `setNewEnergy:onOptionalTrack:` M 1941 | 0 removes e1–e6; otherwise constructs eN, without range validation. Removal uses substrings, then shared formatter/timestamp. Invalid/non-number can become 0; 7 can write e7. **Partly**. |
| Mood: unset, Negative, Neutral, Positive | Song Comments absence / `m-` / `m.` / `m+` | GET `/mood?…&mood=0|1|2|3`; `setNewMood:onOptionalTrack:` M 1981 | 0 clears all three substrings; 1/2/3 map exactly as shown. Other integers do nothing but still return success; message incorrectly says “energy set.” Shared formatter/timestamp. **Partly**; Neutral is not unset. |
| Genres: four ordered slots, remove/reorder, Set/Cancel | Song `genre`, nonempty slot values joined by `, ` | Read `/song_info`; native `genreSetClicked:` M 1771; **no HTTP genre setter** | Native joins four values, all blank clears, no dedupe or comma validation; UI reads by splitting comma. Unknown dropdown values may not round-trip through native selection (M 1625). Native also reformats Comments/updates timestamp. Legacy optional album overwrite exists, explicitly excluded from new mobile UI. **Partly: native present, HTTP missing**. |
| First heard date, Today/picker, Set/Cancel | Song `grouping`, date text `yyyy/MM/dd` plus context | Raw read `/song_info`; native `groupingSetClicked:` M 1823; **no HTTP setter** | Native rebuilds entire Grouping from date/context; no clear-date path. Read regex M 1530 is unanchored and checks digits, not strict calendar validity. No-date input resets context to empty in native UI, risking loss. Today shortcut/new Cancel flow are client work. **Partly / preservation missing**. |
| Also fill missing First heard on album | Desired: selected song first, then only missing dates on matching album tracks | Same native grouping method; `getAllTracksForCurrentAlbum` | Legacy album mode only fills entirely empty Grouping and does not unconditionally set selected song. Copies the same date AND context to all eligible tracks. New missing-date detection and lossless per-track merge required; preserve already dated singles and album tags. **Missing desired behavior**. |
| Progress None / In progress / Processed / Not processing | Song Comments absence / `inprogress` / `processed` / `notprocessing`; legacy `unpro` distinct | Read token list; native `processClicked:` / `setNewProcess:` M 1887–1928; **no dedicated HTTP setter** | Setter clears four process strings including unpro. In progress and Not processing first add `[nltags]`; Processed does not remove it. None clears process, does not clear nltags. Process setter alone uses updateDate:NO; preliminary nltags add can update timestamp. Generic `/tag` lacks these semantics. **Partly; unpro handling unresolved**. |
| Album status Full / Incomplete / Trimmed, Set | Every matching album track's Comments: `full`, `incomplete`, `trimmed` (lowercase, no brackets) | Read only current song via `/song_info`; native `albumClicked:` / `setAlbumCompletion:` M 2215–2257; **no HTTP album setter or aggregate read** | Removes all three substrings per track, appends chosen value; shared formatting, updateDate:NO. GUI offers no clear; internal empty string could clear but is not exposed/validated. Mixed statuses not summarized. **Partly; clearing unresolved**. |

### Every specified song flag

Each row inherits T including its clearing behavior, timestamp side effect, and preservation limitation. Exact spellings here are verified in M's tag map, not inferred from UI captions. “HTTP only in client” means the generic route can carry the token; it does not mean the phone already renders that control.

| Proposed display | Exact stored token(s), respectively | Existing reach and support |
|---|---|---|
| Mainstream; Should be mainstream | `main`; `shtream` | Native map; not in current phone inventory. T supports both independently. **Supported primitive**; move near Mood per design. |
| Suzible; Genpop; Lari; Fam | `suzible`; `genpop`; `lari`; `fam` | All native; phone has first two only. **Supported primitive**, add Lari/Fam to main UI. |
| nltags; nolang; lang | `[nltags]`; `[nolang]`; `[lang]` | Native and phone; independent checkboxes, no automatic clearing. **Partly / intended rules unresolved**; lyric review distinct from sung language and Music explicit-content status. |
| PG13; R; NC17 | `[pg13]`; `[r]`; `[nc17]` | Native and phone; no exclusivity/cascade. **Partly / intended rules unresolved**. No G control or `[x]` alias established. |
| s; h; n; b; f; p; c; fa | `[s]`; `[h]`; `[n]`; `[b]`; `[f]`; `[p]`; `[c]`; `[fa]` | Native and phone. **Supported independent primitives**; intended interactions with review/severity still open. Keep abbreviations. |
| Sensual; Sexual; Vulgar; Violence | `[sensual]`; `[sexual]`; `[vulgar]`; `[violence]` | Native short captions `[sens]`, `[se]`, `[vlr]`, `[vlc]` are NOT stored tokens; phone uses full stored strings. **Supported mappings**, design verification targets corrected. |
| Guns; Drugs; Problematic; re | `[guns]`; `[drugs]`; `[problematic]`; `[re]` | Native and phone. **Supported primitives**; re meaning unresolved, do not merge controls. |
| Misogyny; LGBTphobic | `[misogyny]`; `[lgptphobic]` | Native captions `[mys]` / `[phobic]`; phone stores same full strings. **Supported mapping**. `lgptphobic` spelling is exact legacy storage; do not silently “fix” it. |
| Autotune; Scratch; Horns | `autotune`; `scratch`; `horns` | Native and phone. **Supported primitives**; keep below lyric/theme controls. |
| To do: gclean; gdirty; features | `gclean`; `gdirty`; `features` | Native and phone. **Supported independent flags**; no acquisition/title/artist editing occurs. Duplicate Metadata controls must share state. |
| Genre flags prop; strack | `prop`; `strack` | Native map; T HTTP possible, absent phone controls. **Supported primitive**, prop definition and draft versus immediate save timing unresolved. |
| Language sung/spoken en; es; ja; ko; zh; pt | `[en]`; `[es]`; `[ja]`; `[ko]`; `[zh]`; `[pt]` | Native map, T HTTP possible; absent phone controls. **Supported multi-select primitives**; no invented multi token. |
| Region uk | `[uk]` | Native map, T HTTP possible. **Supported token / meaning unresolved**. |
| Synthetic; Acoustic; Percussion; Bass; Bounce | `synthetic`; `acoustic`; `percussion`; `bass`; `bounce` | Native map, T HTTP possible. **Supported independent primitives**. |
| Female; Male; Instrumental; vnstrumental | `[female]`; `[male]`; `instrumental`; `vnstrumental` | Native map, T HTTP possible. **Supported mapping**; do not infer exclusivity. Exact unusual vnstrumental spelling confirmed. |
| Rap Aggressive; Fast; Lyrical; Story; Serious | `aggressive`; `fast`; `lyrical`; `story`; `serious` | Native map, T HTTP possible. **Supported independent primitives**; Serious is not a content-severity flag. |
| Switch; Skit; Interlude; Live | `switch`; `skit`; `interlude`; `live` | Native map, T HTTP possible. **Supported tokens**, Switch meaning unresolved. |
| Day; Night | `day`; `night` | Native map, T HTTP possible. **Supported tokens / interpretation unresolved**. |
| Flight / Take Flight | Song Comments `flight` | Native map, T HTTP possible; absent phone control. **Supported primitive**; goes in Playlists, distinct from album `cFlight`. |

Out-of-UI content: native map also has `irock`; no removal is authorized. `[nyrics]` is mentioned in the design/prior discussion but has no dedicated control in the inspected map; preserve it as unknown content. Existing extra or malformed metadata must not be discarded on load or unrelated edits.

### Album drawer: Grouping is a separate domain

**Scope for every row below:** desired album representation in the reliably resolved **first album track's Grouping**, not current song Comments and not all album tracks. There is no album-tag reader/writer/parser, first-track resolver, or token-specific native GUI method in the inspected implementation. Generic native free-text Grouping editing is not an album object API. `/song_info` only returns the queried song's raw Grouping; `/tag` would write Comments on that song and is the wrong endpoint.

| Display / action | Exact storage evidence | Validation, clearing, preservation, support |
|---|---|---|
| LEGO: None / To make / Made, color/detail | Design examples `mLEGO`, `oLEGO`, `oLEGOGreen`; **not implemented tokens in inspected app** | Full grammar/color list and status/detail merge absent; None must eventually remove only its own token. Preserve details across status changes. **Missing / unresolved grammar**. |
| Token; MiniD | Names only; exact stored forms not verified in code | Do not invent mToken/oMiniD by analogy. **Missing / unresolved**. |
| Wallpaper; Art; Totem | Only design Totem examples `wTotemWheel`, `oTotemWheel`; exact Wallpaper/Art forms unverified | Multiple art media, craft/purchase prefix rules, details, None, wanted/owned coexistence not implemented. Preserve unrelated Grouping/date. **Missing / unresolved**. |
| MP3; CD; Vinyl; Cassette (independent) | Design Vinyl examples `wVinyl`, `oVinylColorBlue`; other full forms unverified | Want/Owned/None grammar and detail boundaries absent. **Missing / unresolved**; no mutual exclusion inferred. |
| Suzy; Fam; Sleep; World | Design `cSuzy`; `cFam`; `cSleep`; `cWorld` | Exact design tokens, no code implementation found. Independent selection, stable positions; removing one must preserve others/date/context. **Missing API/parser**. |
| Instrumentality; Evening Voices; Soul Food; Summertime | Design `cInstrumental`; `cVoices`; `cSoul`; `cSummer` | Same first-track scope and preservation. **Missing API/parser**. |
| Future Bounce; White Lightning; Take Flight | Design `cBounce`; `cLightning`; `cFlight` | Same scope; cFlight is not song flight. **Missing API/parser**. |
| cThunder / Flying ⚡ Pimp | Design says `cThunder` exists; display mapping unconfirmed | Preserve unknowns; do not equate these. **Unresolved**, blocked only affected collection mapping. |
| Album summary, art, chevron, empty invitation | Derived active tags, album identity/art | Native artwork reading exists M 1468, HTTP JSON has no artwork. Album summary/resolution endpoint absent. Do not show “no tags” on failure. **Missing backend**, fixture UI can proceed. |
| Inferred Complete | No existing inference found | Distinct from manual full; never auto-add full or gate drawer by its absence. Multi-disc/partial-album rules open. **Missing / unresolved**. |

Old location strings `iKia`, `iGoleta`, `iLiving`, `iGuest`, `iStudio` are excluded from UI by design, not candidates for deletion. All album changes must preserve these, unknown tokens, date, and free text. The examples above do not constitute an approved complete grammar.

### Playlist, playback, refresh, and presentation actions

| Field/action | Existing storage/scope and implementation | Contract assessment |
|---|---|---|
| In / Not in playlists; Refresh playlists | Native `updateSmartPlaylists:` → `updateSmartPlaylistViews` M 1685; membership search by name + albumArtist + album. Universe is startup-discovered playlist names containing `🎛`, excluding names containing `Zekieh` (M 324–336), with marker stripped for display. | **Native supported, HTTP missing**. Refresh searches existing playlists; does not request smart-playlist recomputation or rediscover playlist catalog. Not-in is relative to that universe, not every Music playlist. Duplicate playlist names overwrite name-map entries. After edits mark results stale; no automatic confirmed recomputation. |
| Manual playlist membership checkboxes | Native `playlistCheckboxClicked:`, add via `duplicateTo:`, remove via `delete` on playlist instance M 2190,2290–2325 | Native functionality exists separately, **no HTTP route**; not requested as membership toggles in new UI. Do not import this behavior into reported rows. |
| Manual phone Refresh / song source | C 903: Last.fm recent track with nowplaying flag, then `/song_info` | **Partly**: same Last.fm identity aborts with “Track has not changed,” so cannot reread edited metadata. Selector offers Last.fm; local option commented out. Need separate metadata reread from source refresh. |
| Actual OS now playing / follow | Mac gets Music playerState/currentTrack and notifications M 744,1273; GET `/now_playing` M 797 returns only status/message | **Native capability exists; useful HTTP payload missing**. Route name does not mean playback state is exposed. No HTTP play/pause/previous/next. |
| Previous / next / playpause | Native `prevClicked:`, `nextClicked:`, `trackInfoClicked:` M 2203–2212 | Native supported, HTTP missing; inclusion in new UI unapproved. |
| Pin/lock, resume follow, fixed editor targets | No metadata token; client state | **Missing**. Fixed album target is explicit desired behavior; follow default/interval and song-change notice are open. |
| Save feedback, Pending/Saved/Failed; loading/unavailable/empty | No stored tag; request state | Existing spinner and alerts do not satisfy full state contract. **Partly / missing truthful completion**; explicit errors/ambiguous/no-song/disconnected/partial states needed. |
| Secondary open/close, Set/Cancel, scroll restoration, shared repeated controls | UI state, not Music metadata | Mostly **missing client UI**. Can be built against fixtures. Unsaved-dismiss/retry ordering require focused decisions; no durable queue/offline capability approved. |
| NFC copy (desktop only) | Stored `origin/quickUpdates:alejmusic/AppDelegate.m`, `copyNfcToClipboard:` around 1664 | Native clipboard method; **absent checkout and HTTP**. Builds `shortcuts://run-shortcut?name=Music&input=text&text=` + encoded first 10 characters of album + `%0A` + encoded first 10 of albumArtist, using URLQueryAllowedCharacterSet. Unguarded substringToIndex:10 can fail for short names; preserve intent, review boundaries before reuse. No new URL scheme should be invented. |
| UC | X tooltip says “Update comment timestamp”; outlet `updateComment`, native state consulted by `setComment:` | Existing technical meaning is verified, resolving the design's unexplained-label gap. It is not a song flag. No HTTP control; exposing it in React is a separate decision. |
| Responsive Option B / desktop exploration | UI only | Mobile hierarchy, non-color states, compact art, visible themes can proceed with fixtures. Desktop columns/breakpoints are not approved; no persistent Track/Album replacement switch. |

## 3. Verified conflicts and write-contract gaps

### Exact tokens and parser boundaries

The desktop XIB captions are the source of several misleading abbreviations. `[sens]`, `[se]`, `[vlr]`, `[vlc]`, `[mys]`, and `[phobic]` map to `[sensual]`, `[sexual]`, `[vulgar]`, `[violence]`, `[misogyny]`, and `[lgptphobic]`. The phone corroborates the full stored strings. Do not implement the short captions as new tokens or fix spelling without an authorized migration.

M `orderedTokens:` splits on literal spaces. Exact case-sensitive membership recognizes process/status/Energy/Mood; generic bracketed strings are only classified by beginning `[` and ending `]`. Native checkbox detection instead uses case-sensitive substring search (M 1643), and mutation removal also uses substring replacement. Thus read, display, and mutation boundaries disagree. Tab/newline-separated content does not have a robust common grammar. Removing `main` can damage a longer unrelated word containing it; removing `e1` can alter an unknown e10-like string. These are source-derived counterexamples, not claims about actual library values.

The formatter reorders all Comments, collapses spaces, and retains only the last recognized play-count/date/rating/process/album/Energy/Mood token in each single-value category. Unknown generic tokens generally survive but lossless preservation is not guaranteed. Its date classifier searches for `@[0-9]{10}` without anchors while the timestamp writer emits 12 digits and replaces `@[0-9]{12}`. Numeric and rating regex classification can also misclassify unrelated text. A safe adapter must retain unknown content and patch only exact owned tokens; do not use full field reconstruction from visible controls or automatically normalize stored tags. Decide preservation/repair handling for conflicting recognized tokens separately from displaying them.

### Process and lyric review

Native None visibly includes legacy unpro because no unpro radio exists (M 1575), but setting None explicitly removes unpro. That is a legacy UI mismatch, not permission to map it. Processed preserves nltags; In progress/Not processing add it before process replacement. A series of generic `/tag` calls cannot reproduce this as an atomic, validated operation and may update timestamps differently. Existing unpro must be shown as a distinct legacy state or protected read-only until a decision is made; merely loading it must never write.

### Grouping, dates, and album identity

Native date parsing can match a date anywhere, and calendar construction is not strict validation. Native single-song save replaces the whole Grouping; if its read found no date it has already cleared context. Album mode skips nonempty Grouping, including the selected song, and could copy current-song album tags/context into other tracks if reused unchanged. The desired behavior is explicitly different: always set the target song; only fill missing dates on others; preserve each track's own remaining Grouping. Date clear/malformed/multiple-date behavior needs a defined narrow grammar.

Existing album lookup searches by album and filters exact **albumArtist + album** (M 2261). It returns all matches without first-track sorting, disc handling, edition distinction, duplicate checks, or transaction results. No code resolves the first track. Header trackNumber/discNumber properties are available but do not settle policy: missing track 1, multiple disc track-1 candidates, duplicated editions, blank albumArtist, compilations and partial albums require explicit handling. Do not choose the first search result. Resolve once to stable IDs and present scope/ambiguity before any album write.

Manual `full` is a playlist-affecting decision. Existing code applies it only by explicit native action; no completeness inference was found. New inferred Complete must not auto-write full or become a prerequisite for album tags. Aggregated status reads also need a mixed-state representation; current `/song_info` cannot certify album-wide consistency.

### Duplicate identity and cache

M search first asks Music by name then compares lowercased name/artist/album exactly. `/song_info` rejects zero or multiple exact matches, but every mutation chooses `matches[0]` whenever at least one exists. JSON exposes no persistentID or databaseID; the hidden client song selector has no complete selection-to-stable-write path. A duplicate chosen by the user still cannot be reliably addressed by this API. Missing query values are not validated before dictionary construction; null metadata also lacks robust serialization handling.

Caching stores both scripting references and JSON snapshots, including no-match results, under unescaped `name|artist|album` keys, count limit 100 (not a freshness TTL). There is no mutation/native-edit invalidation, external-change invalidation, or force-refresh option. Mutation responses serialize the selected track afresh, while subsequent song_info can return the old cached JSON. Identity changes/deletions and separator-key collisions are further reasons not to cache the current result bundle unchanged. This applies to checked-out caching; local quickUpdates and stored origin/quickUpdates do not contain this cache. A new client alone cannot invalidate it.

### Response truth and asynchronous selection

Application status 400 is a JSON field; handlers construct responseWithJSONObject without setting corresponding transport failure status. Success follows a ScriptingBridge setter and immediate serialization without explicit scripting-error handling or confirmed durable readback. “200” is not proof that Music accepted and persisted the requested value. Mood out-of-range can return success without changing anything. Unknown paths receive generic Hello World HTML; the phone's `/alive` checks only truthy body and HTTP 200, so it is not a meaningful capability/readiness check.

C request callbacks overwrite global `singleSong` and repopulate controls regardless of which song is now selected. A delayed save for A arriving after refresh to B can restore A; reversed responses for two edits can regress UI state. Opacity/spinner do not disable inputs; null singleSong is possible during refresh; shared spinner hides when any request finishes. Failure paths sometimes repaint from whichever global value currently exists, and application-status failures can leave an optimistic checked state. Last.fm failures also lack a complete top-level catch. No cancellation, per-target version check, or draft protection is present.

Required boundary: commands capture immutable target identity, field/scope and request/version; acknowledgments update only that target, with per-field sequencing/conflict handling. Preserve drafts on incoming playback changes. Do not silently retry ambiguous writes after timeout: completion may be unknown. Show Saved only after backend-confirmed result, distinguish failed/unknown/partial/pending, and mark membership stale after relevant edits.

## 4. Prioritized decisions (only affected controls need wait)

| Priority / decision | What is already settled | Blocks |
|---|---|---|
| P0: legacy unpro presentation and explicit replacement consent | Not None, not auto-converted, never removed by load | Progress edits on unpro songs only; other fixture controls continue. |
| P0: language/review/severity dependencies; meaning of lang and whether G has any explicit representation | Existing checkboxes independent; no invented G/x, no implicit cascade; nltags distinct from processing | Real writes whose semantics depend on these relationships. Word/theme display can proceed with verified mappings. |
| P0: album identity/first-track policy, ambiguous/partial/multi-disc behavior | No Full gating; no arbitrary target | All real drawer/collection writes and safe album-wide targeting. Song-only controls independent. |
| P0: date missing/malformed/multiple-date detection; whether/how to clear; free-text context editing | Always set selected song; fill only missing dates elsewhere; preserve other content | Date writes; malformed fixtures can be displayed without repair. |
| P0: full album token grammar, craft/purchase status prefixes, detail preservation, wanted/owned coexistence | Examples/case and collection tokens documented; no blanket migration | Object/format/art writes. Confirmed collection toggles could follow once resolver and preserving token parser exist. |
| P1: clear album status, mixed status UX and partial album failure/retry policy | Lowercase exact markers; all matched current library tracks; explicit Set | Album-status clear/bulk enablement; not song flags. |
| P1: prop definition, prop/strack draft timing; unsaved-editor dismissal and rapid-edit conflict UX | Four ordered genres, no mobile album-wide genres, explicit Set/Cancel | Genre flag save UX / affected draft transitions. |
| P1: re, uk, switch, Day/Night meanings; cThunder / Flying ⚡ Pimp mapping | re and all exact song tokens verified; do not rename or collapse | Help text / uncertain collection choice; do not guess semantics. |
| P2: follow/pin default, polling, changed-song notice; desktop layout, album summary overflow/art medium UI/colors | Fixed open-editor/drawer targets, truthful states, mobile first | Automatic follow / final visual polish; not fixture state architecture. |

Not open product questions: long theme token mappings, loved property, rating scale, Mood encoding, vnstrumental spelling, legacy process side effects, and UC's existing timestamp role are verified here. Implementation still needs decisions on whether to expose UC and how to make timestamp policy explicit without relying on a native checkbox.

## 5. Baseline and reconciliation recommendation

Use the clean client `f6c27a6` plus Mac common base `fdd5efb` as the reproducible semantic reference; keep checked-out `433bbb9` as the observed environment baseline. Do not use master as the modern API foundation or deploy an unchanged caching snapshot for React. This is a source recommendation, not a branch operation or authorization to change the running app.

In a later separately authorized implementation milestone:

1. Establish running binary/frontend revisions and, if authorized, fetch to verify upstream before selecting an integration checkout. Preserve current untracked files and every branch.
2. Review the three stored quickUpdates-only commits individually: retain re layout intent, consider Funk in genre choices, and repair short-string/encoding behavior before reusing NFC. MainMenu.xib and AppDelegate.m both require reconciliation; copying only source misses wiring/layout changes.
3. Evaluate caching as a separate optimization after correctness. Prefer uncached fresh metadata initially, or cache only stable identity resolution with explicit invalidation and fresh serialization; do not carry stale JSON behavior into the contract. A blind branch merge would combine features but retain the listed identity/parser/error problems.
4. Add target-specific domain operations and source-level verification around the chosen baseline. Do not wire generic tag calls as substitutes for process/date/album semantics. No unrelated playlist utilities need participate.

## 6. Stages and first bounded React milestone

### Start with fixtures; no live writes

Proposed first milestone: **mobile Option B contract prototype on this Mac mini**, with transport replaced by a deterministic fixture adapter. Repository selection/scaffolding is a later authorized step; this review selects no new repository name.

Build the specified main order, compact identity/album entry, rating half-stars with numeric value and clear, independent Favorite, Energy unset+1–6, Mood unset distinct from Neutral, all People and lyric/theme/to-do controls. Add secondary view shells and shared state for duplicate fields; explicit draft Set/Cancel for genres/date/status, fixed album drawer identity and scroll restoration. Render unknown raw metadata without editing it. Distinguish unavailable, loading, empty, ambiguous, failed, saving, simulated-saved, partial and stale membership states. Clearly label the entire prototype as fixture data; unsupported backend features must be disabled or explicitly simulated, not appear to save real metadata.

Bounded acceptance scenarios: A save completes after selection moves to B; rapid edits acknowledge out of order; playback changes during a draft/drawer; duplicate songs; legacy unpro+nltags; unknown Comments; date plus cSuzy/oLEGO in Grouping; malformed dates; multi-disc/missing-first-track album; mixed album statuses; failed/partial writes; stale membership. Fixture tests should verify target isolation and preserving transformations, not merely mirror rendering. Do not claim an album grammar is final from example fixtures.

### Before any real writes

Backend requirements apply independently of unresolved visual choices:

- Stable target identifiers scoped to library/source, reject ambiguous resolution, expose necessary identity/disc/track fields and capabilities. Use domain-specific mutations with input validation; mutating GETs must not be the future contract.
- Lossless exact-token patches for Comments/Grouping, preservation checks, explicit timestamp policy, conflict/version detection, and serialization per target. Process operation must carry its nltags effects consistently.
- Fresh readback and explicit scripting errors; proper transport/application errors and per-target completion. Album operations need resolved target lists and per-track outcomes, not one optimistic success.
- Remove/fix cached JSON and define invalidation for HTTP/native/external edits. Fresh-read capability required; membership refresh is a separate read.
- Add missing APIs only when needed: genre, date and missing-date fill, process, album status and mixed reads, first-track album tags, playlist membership, artwork, actual playback payload. Native methods using `_currentTrack` must be refactored to explicit captured targets before exposure.

A first live-write slice can be rating/Favorite only after common identity/transport/error/cache guarantees pass; later enable independent flag groups, then domain editors as their blockers resolve. Fixture development does not depend on choosing album resolver policy or future hosting architecture.

### Authentication and HTTPS boundary

The app starts HTTP on 7305 with wildcard CORS and no handler authentication/TLS setup; the client uses HTTP endpoints and public/LAN/manual routing. An HTTPS React deployment cannot simply call these HTTP URLs reliably because of mixed-content/browser restrictions. CORS is not authentication. Existing `/ip`, address probing, `/alive`, or Last.fm keys are not a future authorization model.

Define an authenticated HTTPS application boundary before real writes: who may submit mutations, how requests reach the Mac, how the Mac authenticates them, browser-origin/CSRF rules if applicable, and how completion returns to the requesting target. Keep Music.app access in the Mac integration layer and secrets out of frontend bundles/URLs/logs. This is an interface/security requirement, not a selection of AWS components, tunnel/proxy design, queue, offline mode, or deployment architecture. If future transport queues commands, accepted/Pending must remain distinct from completed/Saved.

## 7. Command-center handoff

**Review output only; implementation remains unstarted.** Newly located phone source verifies basic song fields and full bracketed theme tokens. Mac GUI functionality exceeds HTTP coverage: genres, dates, processing, album status, playlist membership and playback require distinct API work; `/now_playing` is a stub. Album objects/collections need a grammar and first-track resolver, with Full never gating availability. Preserve unpro and unknown metadata. Correct identity, substring mutation, date merge, stale caching and asynchronous acknowledgment behavior before live writes. Preserve caching and quickUpdates work; all stored upstream comparisons may be stale. Next authorization should be a bounded fixture-only mobile React milestone, with no project-name or AWS commitment and a small set of affected-control decisions tracked separately.
