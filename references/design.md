# AlejMusic Tagging UI Implementation Specification

**Status:** Consolidated design and requirements for Command Center review.  
**Implementation priority:** Mobile first.  
**Scope:** Tagging interface, existing metadata semantics, interaction requirements, and responsive desktop direction.

This document does not select a backend architecture, authorize a tag migration, or assume that proposed infrastructure has been implemented.

The reviewed specification should become a versioned reference in the React repository. This design chat can continue helping interpret and refine tagging semantics, while Command Center coordinates changes that affect other parts of AlejMusic.

## 1. Authority and scope

### 1.1 Source precedence

When sources disagree, use this order:

1. Explicit user decisions and subsequent corrections.
2. Written requirements consolidated here.
3. Existing implementation, as evidence of current behavior—not automatically the desired behavior.
4. Generated renders, as visual references.

Generated images contain mistakes. They must not create new tags, change selection rules, remove required controls, or redefine metadata semantics.

Before implementation, reconcile uncertain storage mappings against the existing code and the broader project’s tagging rules. Do not silently normalize, rename, or migrate tags.

### 1.2 Product purpose

AlejMusic is a personal music-tagging system that reads and edits Music.app metadata. Its current components include:

- A macOS application written primarily in Objective-C.
- A mobile HTML/JavaScript client.
- A server in the Mac application that provides information and accepts edits.
- Music.app smart playlists that use the stored metadata.
- Marvis on iPhone, whose capabilities and album-completeness detection differ from Music.app smart playlists.

The current mobile now-playing workflow uses manual refresh and Last.fm. Direct access to the Mac’s actual playback state is desired, but is not assumed to exist.

The eventual goal is a responsive web interface that can also replace the native desktop tagging UI. Replacing that UI does not by itself remove the Mac’s role in accessing Music.app.

### 1.3 Selected mobile design

The selected design is **Option B: small labels above controls that use the available width**.

Approved principles:

- Controls take priority over large artwork.
- Keep high information density without making touch targets impractical.
- Preserve the familiar order of the existing mobile workflow.
- Keep lyric flags, word flags, and themes directly accessible.
- Keep Rating, Favorite, Energy, and Mood near the top.
- Show selected states with checks, text, or another non-color indicator.
- Use clean white surfaces, subtle borders, readable text, and restrained color.
- Use compact album artwork and a discoverable album-tag entry.
- Do not replace immediate song tagging with a persistent Track / Album tab switch.

The user initially emphasized momentary listening observations, but subsequently clarified that Autotune, Scratch, and Horns are relatively infrequent. **They should remain below the lyric/theme controls in the familiar order.**

### 1.4 Desktop status

A dense desktop concept has been rendered. It explores four simultaneously visible areas:

1. Song controls and metadata.
2. Lyrics and listening tags.
3. Additional musical characteristics.
4. Playlist membership and Flight.

This is **exploratory**, not a fully approved desktop layout.

The recommendation is one app with shared state, field definitions, and editing behavior, using different arrangements at different widths. This recommendation has not been finalized as a required component structure or breakpoint system.

No exact breakpoints have been approved.

## 2. Mobile page hierarchy

The intended main-page order is:

| Position | Section | Contents |
|---|---|---|
| 1 | Song identity and page actions | Song title, artist, refresh, lock/pin affordance, save feedback |
| 2 | Editable metadata summaries | Ordered genre summary; First heard date |
| 3 | Album summary card | Small artwork, album identity, active album-tag summary, chevron |
| 4 | Rating and Favorite | Half-star rating, numeric value, clear control, independent heart |
| 5 | Energy | Unset plus 1–6 |
| 6 | Mood | Unset, Negative, Neutral, Positive |
| 7 | Appeal | Mainstream; Should be mainstream |
| 8 | People | Suzible, Genpop, Lari, Fam |
| 9 | Language/content review flags | `nltags`, `nolang`, `lang` |
| 10 | Severity | PG13, R, NC17 |
| 11 | Specific words | `s`, `h`, `n`, `b`, `f`, `p`, `c`, `fa` |
| 12 | Themes | Individually selectable theme flags |
| 13 | Musical details | Autotune, Scratch, Horns |
| 14 | To do | `gclean`, `gdirty`, `features` |
| 15 | Secondary-view entry points | More song tags, Metadata, Album status, Playlists |

**Appeal placement qualification:** The user proposed placing Mainstream / Should be mainstream alongside Mood. The subsequent render places a separate Appeal row immediately below Mood. This is the current working interpretation, rather than a change to Mood’s meaning.

All main-page controls need not fit into one physical viewport. Generated images are not proof of fit on an iPhone with browser chrome and safe areas. Preserve useful density while allowing scrolling.

## 3. Storage domains

These three domains must remain distinct.

| Domain | Applies to | Storage / interpretation |
|---|---|---|
| Song metadata and song tags | The explicitly targeted song | Music.app properties and existing song tag fields |
| Album status | Every matching album track currently in the library | Status markers in each track’s Comments |
| Album objects, formats, art, and collections | The album, represented by its first track | Grouping field of the resolved first track |

First heard is another use of Grouping. Editing dates must preserve album tags and unrelated grouping content.

Do not infer storage locations merely from UI grouping. For example, putting Flight in the Playlists view does not turn it into an album collection tag.

### 3.1 Display labels versus stored tokens

Readable display labels may differ from stored strings. UI wording must not implicitly rename stored tags.

Specific-word abbreviations should remain abbreviated. The user does not want the full offensive words displayed.

Existing token boundaries matter: Music.app smart playlists often rely on string matching. The user deliberately chose unusual names to reduce accidental matches, and later introduced bracketed language tags. A future normalization or bracket migration is separate work.

## 4. Main song fields

### 4.1 Rating, Favorite, Energy, and Mood

| Field | Display / choices | Established behavior | Storage verification |
|---|---|---|---|
| Rating | 0–5 in half-star increments; numeric value alongside stars | Direct selection; clear returns to unrated/zero | Earlier code review indicated 0–100 in increments of 10; verify the adapter |
| Favorite | Heart | Independent of rating | Confirm the exact Music.app property and current API behavior |
| Energy | Unset, 1, 2, 3, 4, 5, 6 | Single selected value; explicit unset available | Existing examples use `e1`–`e6`; confirm serialization and clearing |
| Mood | Unset, Negative, Neutral, Positive | Single selected value; unset is distinct from Neutral | Confirm exact stored representation |

Do not remove Energy or Mood in anticipation of a future Spotify/audio-analysis integration. Such integrations were discussed as possibilities, not adopted dependencies.

### 4.2 Appeal and People

| Display label | Existing token | Meaning |
|---|---|---|
| Mainstream | `main` | Mainstream recognition, such as having been on the radio |
| Should be mainstream | `shtream` | The user believes the song deserved broader appeal |
| Suzible | `suzible` | Suitable for the Suzy playlist listened to with the user’s partner |
| Genpop | `genpop` | Music the user would play for or show a broad audience across many ages |
| Lari | `lari` | Suitable for the sister’s playlist |
| Fam | `fam` | Suitable for the family playlist |

These are individual toggles. No exclusivity between Mainstream and Should be mainstream was established.

All four People choices belong on the main mobile page. Remove Lari and Fam from More song tags.

“Suzible” remains the working control label from Option B. The name of the associated playlist may be Suzy; this does not change the stored `suzible` token.

### 4.3 Lyric assessment and language-content flags

“Language” in this main-page section refers to lyrical content/profanity assessment. It is separate from the sung/spoken language codes in More song tags.

| Display | Token | Meaning / qualification |
|---|---|---|
| `nltags` | `[nltags]` | Lyrics have not been sufficiently assessed/tagged; unknown content for relevant playlist eligibility |
| `nolang` | `[nolang]` | No bad language |
| `lang` | `[lang]` | Existing language-content flag; exact distinction from severity and word flags needs confirmation |
| PG13 | `[pg13]` | User-assessed language/content threshold |
| R | `[r]` | User-assessed language/content threshold |
| NC17 | `[nc17]` | User-assessed language/content threshold |

The user also mentioned **G** in describing playlist thresholds, but a separate G control was not established in the selected UI. Do not silently add `[g]`, substitute `[x]` for `[nc17]`, or infer that one is an alias of another.

**Selection rules remain partly unresolved.** The baseline UI uses checkboxes. A render using radio buttons is not approval to enforce exclusivity among severity values or the three review/content flags.

Do not automatically cascade or clear these flags without confirming existing behavior and intended rules.

Music.app’s own explicit-content flag is distinct from these custom tags. Some playlists use that flag together with `[nolang]` or custom language thresholds.

### 4.4 Specific-word flags

Preserve this order:

| Display | Token |
|---|---|
| `s` | `[s]` |
| `h` | `[h]` |
| `n` | `[n]` |
| `b` | `[b]` |
| `f` | `[f]` |
| `p` | `[p]` |
| `c` | `[c]` |
| `fa` | `[fa]` |

These represent increasingly objectionable specific words in the user’s system. Multiple flags can apply.

Do not expand their meanings in the main UI. Exact word definitions have not been documented here and must not be guessed.

Lyric APIs were discussed as a possible future aid for detecting explicit words. No automatic lyric classification or external API dependency is required for the first implementation.

### 4.5 Themes

The main page keeps these directly visible:

| Display label | Existing token shown in desktop reference | Qualification |
|---|---|---|
| Sensual | `[sens]` | Mobile legacy display used a longer label |
| Sexual | `[se]` | Confirm exact mapping in code |
| Vulgar | `[vlr]` | Confirm exact mapping in code |
| Violence | `[vlc]` | Confirm exact mapping in code |
| Guns | `[guns]` | Existing tag |
| Drugs | `[drugs]` | Existing tag |
| Problematic | `[problematic]` | User judgment |
| `re` | `[re]` | Meaning unresolved; preserve as its own control |
| Misogyny | `[mys]` | Subjective thematic assessment |
| LGBTphobic | Exact stored token needs confirmation | Existing mobile label; desktop reference is cropped |

Treat the abbreviated token mappings above as **verification targets**, particularly where the mobile screenshot and desktop screenshot use different text.

`re`, Misogyny, and LGBTphobic are separate controls. Generated labels such as “re Misogyny” are errors.

Themes remain independent multi-select flags. Do not introduce a hidden Themes section based on an abandoned comparison render.

### 4.6 Musical details and to-dos

| Display | Token | Meaning |
|---|---|---|
| Autotune | `autotune` | Audible characteristic |
| Scratch | `scratch` | Scratching, including a momentary occurrence |
| Horns | `horns` | Horn presence, including a momentary solo/sample |
| `gclean` | `gclean` | To-do: obtain a clean version |
| `gdirty` | `gdirty` | To-do: obtain an explicit/dirty version |
| `features` | `features` | To-do: add missing featured artists to title/artist metadata |

The last three are task flags. Selecting them does not perform an acquisition or edit artist/title text automatically.

Do not assume `gclean` and `gdirty` are mutually exclusive without verifying the intended rule.

## 5. Secondary views

All secondary editors must clearly identify the song or album they target. Closing returns to the prior page position.

### 5.1 Genres

The genre editor contains:

- Up to four ordered genre slots.
- Existing values, empty “Add genre” slots, removal controls, and a means to reorder.
- Order by prominence.
- The first genre is primary.
- Explicit **Set genres** and **Cancel** actions.
- Genre-related flags `prop` and `strack`.

| Field | Meaning / behavior |
|---|---|
| Ordered genres | Stored as a comma-separated sequence; earlier code review indicated `, ` joining |
| `prop` | User believes it means “primarily pop”; tentative |
| `strack` | Soundtrack |

Order is meaningful throughout, even though some Music.app smart playlist rules can only conveniently test “begins with.”

**Remove “Apply genres to all songs on this album” from mobile.** The user does not want to batch-apply hyper-specific genres while unable to keep the whole album’s song genres in mind.

Rare desktop bulk editing was mentioned as something the user might do on a computer. It was not approved as a required feature of the new desktop UI.

The save timing of `prop` and `strack` inside the explicit-save genre editor remains to be resolved: immediate independent toggles versus inclusion in the draft applied by Set genres.

### 5.2 First heard

First heard means **the date the user first heard the song**, which can differ from Music.app’s Date Added.

The editor includes:

- Editable date.
- Date picker/calendar.
- Today shortcut.
- Explicit **Set date** and **Cancel**.
- Optional checkbox: **Also fill missing first-heard dates on this album**.

Required behavior:

1. Apply the chosen date to the targeted song.
2. If the album option is selected, fill missing dates on matching album tracks.
3. Preserve existing dates on other tracks, including previously dated singles.
4. Preserve unrelated Grouping content.

Earlier code review indicated a date prefix such as `yyyy/MM/dd` combined with grouping context. It also indicated that the old album operation only filled entirely empty Grouping fields.

The intended new behavior is **missing first-heard date**, not **empty Grouping field**. An album track may already contain other grouping content or album tags.

Exact date parsing, malformed-date handling, and the grouping-context editor need confirmation before implementation.

### 5.3 More song tags

This view contains additional musical characteristics.

| Group | Choices in intended order | Notes |
|---|---|---|
| Language sung or spoken | `en`, `es`, `ja`, `ko`, `zh`, `pt` | Multi-select; existing bracketed forms must be verified |
| Region | `uk` | Confirm exact geographic/tagging meaning; do not generalize |
| Sound | Synthetic, Acoustic, Percussion, Bass, Bounce | Existing tokens appear as `synthetic`, `acoustic`, `percussion`, `bass`, `bounce` |
| Vocals | Female, Male, Instrumental, `vnstrumental` | Female/Male belong to the existing singing-vocals classification |
| Rap | Aggressive, Fast, Lyrical, Story, Serious | Independent descriptors |
| Structure & performance | Switch, Skit, Interlude, Live | “Switch” meaning still needs confirmation |
| Time | Day, Night | Exact interpretation not fully clarified |

Important meanings:

- **`vnstrumental`**: beatmaker/instrumental music with vocal samples throughout, without a lead rapper/singer in the usual sense. Earlier user text used a different spelling, but prior source review recorded `vnstrumental`; verify the exact stored string.
- **Serious**: subjects such as politics or tough living conditions. It is not automatically a “bad content” tag.

Do not include:

- Lari or Fam—they move to the main People section.
- Mainstream or Should be mainstream—they move near Mood.
- Flight—it moves to Playlists.
- An invented `multi` language choice.

### 5.4 Metadata

This view includes:

- Genre summary and edit shortcut.
- First heard summary and edit shortcut.
- Tagging progress.
- The lyric-review flag.
- The same to-do flags as the main page.

Repeated controls must reflect the same underlying song state.

#### Tagging progress

| Display label | Existing stored value | Meaning |
|---|---|---|
| None | Absence/clearing of a process value; exact legacy behavior requires review | No current process selection |
| In progress | `inprogress` | In-depth tagging has begun |
| Processed | `processed` | User considers processing complete |
| Not processing | `notprocessing` | Not worth processing now; may exclude from processing playlists |

Earlier source review reported:

- Setting In progress adds `[nltags]`.
- Setting Not processing adds `[nltags]`.
- Setting Processed does **not** automatically clear `[nltags]`.
- The process setter removes existing process markers, including legacy `unpro`, before applying a replacement.

These behaviors should be checked against the code in the implementation repository before being treated as a verified API contract.

**Process state and lyric review are distinct.** A Processed song can still contain `[nltags]`, and relevant playlists can exclude it for that reason.

#### Legacy `unpro`

The user added `unpro` to almost all songs predating the system to exclude them until favorites could be revisited.

Do not:

- Treat `unpro` as equivalent to None.
- Silently convert it to Not processing.
- Remove it merely by displaying the new UI.

How to display an existing `unpro` value remains unresolved. This needs an explicit decision before enabling progress editing on such tracks.

#### Unused lyric-text to-do

The user recalled a tag called `nyrics`; prior review recorded `[nyrics]`. It denotes a desire to add actual lyric text to non-Apple Music tracks through Music.app.

It is unused in practice and should be omitted from this UI. Preserve existing stored content.

### 5.5 Album status

This is separate from album objects/formats/collections.

| Status | Meaning |
|---|---|
| Full | Manual marker used by Music.app smart playlists to treat tracks as belonging to a full album |
| Incomplete | The album has not been fully heard yet |
| Trimmed | The album was heard in full and some tracks were subsequently deleted |

Scope:

- Write the chosen status to **every matching album track currently in the library**.
- Store in each track’s **Comments**.
- Preserve unrelated comment content.
- Clearly indicate album-wide scope.
- Use an explicit **Set album status** action.

The exact token spelling, replacement behavior, and ability to clear an existing status need verification.

**Full is not merely an automatically detected library fact.**

The user may deliberately delay applying Full until tracks have been rated. In a demonstrated playlist chain, tracks without Full remain eligible, whereas Full tracks must satisfy additional rules including a rating above 1.5 stars and not being a skit. Prematurely applying Full can therefore hide unrated tracks from listening queues.

A complete album must not automatically receive Full.

### 5.6 Playlists

The Playlists view contains two separate concepts:

1. Editable song tag: **Flight / Take Flight**, for the airplane playlist.
2. Reported playlist membership.

Membership interface:

- In playlists.
- Not in playlists.
- Explicit **Refresh playlists** action.
- Notice when edits may have made the displayed results stale.

Membership rows are reported results, not manual membership toggles.

Do not promise that editing a tag immediately recomputes Music.app smart playlists or updates the displayed lists. Refresh feedback should describe actual results.

The exact universe of playlists used for “Not in playlists,” and membership-fetch behavior, should follow verified existing functionality.

## 6. Album summary and album-tag drawer

The drawer is an established component from a separate design discussion. This specification integrates it without redesigning its internal UI.

### 6.1 Entry point

A compact album summary card sits between song information and song-specific controls.

It includes:

- Small artwork.
- Album identity.
- Chevron.
- Short summary of active album tags.

Examples:

- “LEGO · To make”
- “Vinyl · Owned”
- “3 collections”

Only active items appear in the summary. An untagged album needs a discoverable invitation to add album tags.

These are example summaries, not a requirement to display every active tag in the card. Overflow and prioritization remain to be refined.

### 6.2 Drawer behavior

- Opens as a nearly full-height, vertically scrolling sheet.
- Clearly identifies the album.
- Has an obvious close control.
- Returns to the prior page position on close.
- Keeps its album target fixed while open, even if playback changes.
- Uses explicit status choices rather than repeated-tap cycling.
- Saves ordinary album choices immediately, with visible feedback.

Desktop presentation remains open; a side sheet was a possible adaptation, not an approved replacement for the established behavior.

### 6.3 Resolution and completeness

Album tags are stored in the **Grouping field of the album’s first track**.

The backend needs to resolve the album and its first track from the song being viewed.

The original handoff described checking whether the song belonged to a full album. A later explicit correction establishes:

> Absence of the manual Full marker must never gate album tagging.

The user may add album tags before adding Full because rating-dependent playlists need to retain unrated songs.

Keep these separate:

| Concept | Meaning |
|---|---|
| Full | Manual Comments marker controlling playlist treatment |
| Complete | Potential inferred backend field based on the album’s tracks |
| Album tagging availability | Whether a reliable album and writable first-track target can be resolved |

Do not show “no tags” when lookup failed or the target is unavailable.

Exact completeness inference, multi-disc first-track resolution, ambiguous album matching, and behavior for genuinely partial albums are not finalized. Do not invent a resolver or choose an arbitrary first track.

### 6.4 Established drawer contents

| Section | Contents |
|---|---|
| Album objects | LEGO, Token, MiniD—one row of three equally sized options |
| Art & wallpaper | Wallpaper, Art, Totem |
| Music formats | MP3, CD, Vinyl, Cassette—independent choices |
| Collections | Multi-select readable collection names |

Object definitions:

- **LEGO:** Flat square 2×2 tile with album-art sticker on a smooth front; thin noticeable colored edge; no exposed front studs.
- **Token:** Thick circular NFC token with circular artwork and painted edge.
- **MiniD:** Small burned CD in a flexible clear sleeve with a square printed insert; subtle plastic sheen; not a rigid jewel case.
- **Wallpaper:** Album artwork shown on a Mac display.
- **Art:** Entry point for multiple art mediums.
- **Totem:** A real object related to imagery on the cover; distinct from Token. Generic object/keepsake icon, optionally accompanied by a tag-derived detail such as Wheel.

Crafts generally use **None / To make / Made**. Purchases use **None / Want / Owned**.

Details are optional and should be preserved when status changes. Object color and status color are separate concepts.

All editable album choices must be derivable from Grouping text. No separate notes, uploaded images, or new metadata store is required.

#### Example album tokens

| Token | Meaning |
|---|---|
| `mLEGO` | Want to make LEGO representation |
| `oLEGO` | Made/own LEGO representation |
| `oLEGOGreen` | Made/own using the Green tile |
| `wTotemWheel` | Want a wheel totem |
| `oTotemWheel` | Own a wheel totem |
| `wVinyl` | Want vinyl |
| `oVinylColorBlue` | Own blue vinyl |

These examples do not define a complete parser grammar or all supported combinations.

LEGO has an approximately 30–40-color list to be supplied during implementation. Whether color can be selected during To make remains a possibility to finalize.

Multiple art mediums should be supported. Candidate mediums include Graphite or Ink, Colored Pencil, Markers, Paint (Solid), Paint (Water Colors), Paint (Textured), Collage, Clay, and Undetermined.

Doodle/general make-art relationships, the Art-card interaction versus Add art type, and multiple-medium summaries remain open.

#### Collections

| Token | Display |
|---|---|
| `cSuzy` | Suzy |
| `cFam` | Fam |
| `cSleep` | Sleep |
| `cWorld` | World |
| `cInstrumental` | Instrumentality |
| `cVoices` | Evening Voices |
| `cSoul` | Soul Food |
| `cSummer` | Summertime |
| `cBounce` | Future Bounce |
| `cLightning` | White Lightning |
| `cFlight` | Take Flight |

`cThunder` also exists. Its display mapping is unconfirmed. “Flying ⚡ Pimp” appeared in collection screenshots, but its mapping was not established. Neither should be silently removed or equated.

Collection positions stay stable during multi-selection.

Ignore old location controls such as `iKia`, `iGoleta`, `iLiving`, `iGuest`, and `iStudio`; ignoring them in the interface does not authorize deleting stored values.

## 7. Editing, refresh, and playback behavior

### 7.1 Current and future song sources

Current mobile behavior:

- Manual refresh.
- Now-playing information fetched through Last.fm.

Desired future behavior:

- Obtain the actual OS/Music.app playback state.
- Allow the user to remain locked on a previous song.

The UI must not imply that direct OS playback integration or automatic following is already implemented.

The default follow mode, refresh interval, and exact “resume following” interaction remain open.

### 7.2 Editing targets

Core requirement:

**An incoming now-playing update must not redirect an edit to another song or album.**

For the album drawer, the target is explicitly fixed for the entire open session.

For song editors, the design intent is likewise to retain the song being edited. The exact UI for reporting “now playing has changed” while continuing to edit the older song remains to be finalized.

Pending requests and save acknowledgments must remain associated with the original target.

A refresh or playback update must not discard a draft silently.

### 7.3 Save behavior

| Interaction | Intended behavior |
|---|---|
| Ordinary song flags | Immediate save |
| Rating, Favorite, Energy, Mood | Immediate save |
| Album-tag status/detail choices | Immediate save |
| Genres | Explicit Set genres |
| First heard | Explicit Set date |
| Album status | Explicit Set album status |
| Playlist membership | Read-only results, explicitly refreshed |

Open details:

- `prop` and `strack` save timing within Genres.
- Handling close/dismiss with unsaved explicit-editor changes.
- Retry, rollback, and ordering of rapid successive edits.
- Partial success in album-wide writes.

Do not silently choose these behaviors during implementation if they materially affect metadata integrity.

## 8. Application states

### 8.1 Established requirements

| State | Required distinction |
|---|---|
| Loading | Metadata/album lookup is in progress |
| Loaded with no tags | Successful lookup; empty tag state |
| Album unavailable | No usable album-edit target |
| Lookup failed | Attempt failed; not equivalent to no tags |
| Saving | Write has been initiated and completion is not yet confirmed |
| Saved | Completion has been confirmed |
| Save failed | Clearly identify failure; do not claim success |
| Pending | If commands are queued, accepted/queued is not the same as completed |
| Playlist results stale | Tags changed; displayed membership may be out of date |

The interface must not rely solely on color to communicate state.

### 8.2 States requiring implementation-level definition

These are necessary considerations, but their exact UX was not approved in the design discussion:

- Disconnected from the Mac/bridge.
- Now-playing source unavailable.
- No current song.
- Song metadata unavailable or only partially available.
- Ambiguous song/album identity.
- Reconnection behavior.
- Partial album-write failure.
- Save conflict or externally changed metadata.

Do not collapse these into “no tags” or a successful empty result.

Suggested treatments—such as preserving last-known data with a disconnected notice—need review against the actual API and cache behavior.

### 8.3 Offline and queues

Offline editing, durable client queues, and automatic retry were not approved as first-implementation features.

If the chosen backend later queues commands, the UI must show Pending until completion is confirmed. That conditional requirement does not itself authorize an offline implementation or select SQS or any other infrastructure.

## 9. Responsive design

### 9.1 Mobile

- Single scrolling page using Option B hierarchy.
- Compact identity and artwork.
- Lyrics/themes remain exposed.
- Secondary views reduce main-page clutter.
- Familiar order matters more than rearranging tags around theoretical detection urgency.
- Restore scroll position after closing a secondary view.

### 9.2 Desktop

The exploratory design exposes more controls at once and keeps playlist results visible alongside tagging.

Its goals are:

- Roughly comparable information density to the original native desktop app.
- Less repeated opening and closing of secondary views.
- Shared semantics with mobile.
- No large hero artwork or decorative dashboard cards that consume useful space.

Copy NFC link is a desktop convenience from the existing app. It copies a custom URL assembled from album/artist information for physical NFC objects. It is not needed on mobile. Exact URL construction must follow verified existing code.

The old UC control remains unexplained. Do not assign it a new meaning.

### 9.3 Shared versus separate presentations

**Recommended, not formally finalized:** shared field components, state, validation, serialization, and save behavior, with different mobile and desktop arrangements.

Two separate frontends with duplicated tagging logic were not selected.

No exact breakpoints, tablet layout, independent-column scrolling, or desktop drawer geometry were approved.

Mobile implementation should avoid unnecessarily coupling control behavior to one screen arrangement, while not expanding scope into completing desktop first.

## 10. Reference images and corrections

Where generated filenames are known, they identify the artifact. Clear descriptions remain useful if files are renamed when copied into the repository.

| Reference | Role | Corrections / interpretation |
|---|---|---|
| Original native desktop screenshot; latest attachment `B91F06A2-B8C2-4C28-96AB-5D8F100B46F5(3).png` | Existing feature and density reference | Not the new layout specification. UC unresolved. Old compact labels do not establish new control semantics |
| Original narrow browser mobile screenshot with Name / Artist / Album placeholders | Existing mobile feature reference | Taken in a narrow desktop browser, not a phone |
| Actual iPhone screenshot showing the existing dense page | Density and familiar-order reference | Do not reproduce low contrast, oversized raw labels, or placeholder/loading presentation |
| “B · Labels above”; supplied reference filename `F9A3FF83-56BD-4E46-9419-1AE3464A0515.png` | Selected mobile visual direction | Add Lari/Fam and Appeal; separate `re` from Misogyny; retain all unset controls |
| “AlejMusic · Editing details”; `D855D8FD-40B5-46AF-AFAA-330E4706CE9F.jpeg` | Earlier Genres / First heard / More song tags | Remove album-wide genres; move People/Appeal/Flight out of More song tags; preserve existing dates |
| “AlejMusic · Organization & results”; `1406CC51-A974-4B1D-BBD5-227D05AE1895.jpeg` | Earlier Metadata / Album status / Playlists | Full must not be described solely as library completeness; add Flight to Playlists; preserve process/lyric separation |
| Latest main mobile render; `exec-1e728ed4-5ad6-4fa4-a90b-1cc7cddde4fd.png` | Latest main-page arrangement | Missing Energy unset control. Does not prove fit with phone/browser safe areas |
| Latest Genres / First heard; `exec-b60e9da7-c447-4068-b9d2-9d362f6fab58.png` | Updated editor references | Date behavior and metadata preservation are governed by this specification, not calendar artwork |
| Latest More song tags / Metadata; `exec-c8fe1152-f8bc-41e0-82fe-37a6812d5822.png` | Updated secondary views | Duplicate Saved indicators are unnecessary. Processed with unchecked `nltags` is an example, not automatic clearing |
| Latest Album status / Playlists; `exec-81b798e6-c552-4345-87bc-718278527282.png` | Updated album-status and membership views | Membership entries are illustrative. Full and album-tag availability remain separate |
| “AlejMusic music tagging workbench.png”; generated as `exec-65d643d4-7920-43c9-8170-2eaf15bbb229.png` | Exploratory desktop concept | Missing Energy and Mood unset controls; missing numeric rating; invented `multi`; merged `re` theme labels; severity radios do not establish exclusivity |
| Original “Album tag drawer” / “Collapsed album preview” / “Art icon direction” board | Established album component direction | Fictional artwork; isolated card placement is not page layout; MiniD must be a flexible sleeve; art samples are not an extra UI section |

Additional desktop caveat: placing Album status beneath Lyrics was a space-fitting experiment. It was not approved as its final location.

Generated artwork and selected tag values are illustrative, not verified metadata for the example Vince Staples song.

## 11. Existing-code verification

Earlier discussion included files named `AppDelegate(1).m` and `alejmusic(1).html`, plus playlist screenshots. The implementation team should recheck the current repository version rather than assuming those snapshots are current.

Verify:

1. Every exact token, bracket convention, capitalization, and storage field.
2. Rating and Favorite properties.
3. Energy/Mood encoding and unset behavior.
4. Language/severity selection and clearing rules.
5. Theme-label mappings.
6. Process side effects, especially `[nltags]` and legacy `unpro`.
7. Genre delimiter/order handling.
8. First-heard date parsing and preservation of unrelated Grouping content.
9. Album matching, first-track resolution, and album-status replacement.
10. Playlist-refresh behavior and list scope.
11. NFC URL construction.
12. Any legacy refresh controls not yet represented in the design.

An observed legacy implementation bug is not automatically a requirement to preserve.

The source review and user explanations establish that current playlist behavior depends on tag strings. They do not authorize broad token refactoring.

## 12. Open decisions

### 12.1 Resolve before the affected controls write real metadata

- Exact field/tag mappings and parser boundaries.
- Language, review, and severity dependencies or exclusivity.
- Whether G is an explicit tag/control, an absence of other flags, or something else.
- Meaning of `lang` relative to severity and specific words.
- Meaning and storage of `re`.
- Exact LGBTphobic token.
- Exact `vnstrumental` spelling and mapping.
- Handling/display of existing `unpro`.
- First-heard malformed/missing-date detection.
- Album identity and first-track resolution, including multi-disc and ambiguous cases.
- Clearing album status and exact status markers.
- Error behavior for partial album-wide writes.

### 12.2 UI decisions still open

- Exact Appeal placement beyond the current row below Mood.
- `prop` definition and `prop`/`strack` save timing.
- Meaning of Switch, Region, and Day/Night where labels alone are insufficient.
- Unsaved-draft dismissal behavior.
- Main-page follow/pin default and notification when playback changes.
- Whether selected flags receive additional help text.
- Final desktop layout, responsive transitions, and scrolling model.
- Legacy UC and previous/next controls.
- Editable grouping-context text beyond First heard.

### 12.3 Album-component questions owned with the album design discussion

- Complete token grammar and supported combinations.
- LEGO colors and selection during To make.
- Multiple art-medium presentation.
- Doodle/general make-art relationships.
- Art-card versus Add art type behavior.
- Wanted and owned variants coexisting.
- `cThunder` and Flying ⚡ Pimp mappings.
- Summary prioritization when many album tags are active.

### 12.4 Ready to implement after contract verification

- Selected Option B styling and hierarchy.
- Rating/Favorite/Energy/Mood controls with unset behavior.
- Main-page People expansion.
- Familiar lyric/theme ordering and abbreviated word flags.
- Genre editor with four ordered slots and no mobile album bulk action.
- First heard editor with preservation requirements.
- More song tags organization.
- Metadata view with separate process and lyric review.
- Album-status scope and explicit application.
- Flight placement and playlist refresh.
- Album preview integration and pinned drawer targeting.
- Clear save/lookup state distinctions.

Open questions should block only the affected behavior, not force another general redesign.

## 13. First mobile implementation acceptance checklist

### Layout and controls

- [ ] Uses Option B’s compact labels-above layout.
- [ ] Preserves familiar main-page order and exposes Themes.
- [ ] Includes all four People controls.
- [ ] Includes Rating numeric value, half-star selection, clear, and independent Favorite.
- [ ] Includes Energy unset plus 1–6.
- [ ] Includes Mood unset separately from Neutral.
- [ ] Keeps `re`, Misogyny, and LGBTphobic separate.
- [ ] Does not introduce render-invented tags.
- [ ] Works at actual phone widths without clipped controls or unusable touch targets.

### Editing semantics

- [ ] Every mutation targets an explicit song or resolved album.
- [ ] Playback changes cannot redirect an open editor or pending write.
- [ ] Ordinary controls save immediately with truthful feedback.
- [ ] Genres, First heard, and Album status use explicit Set actions.
- [ ] Duplicate controls across views stay synchronized.
- [ ] Existing unknown/unrelated metadata is preserved.
- [ ] Legacy `unpro` is not silently reinterpreted.

### Metadata and albums

- [ ] Genres preserve order and support up to four values.
- [ ] Mobile Genres has no album-wide apply option.
- [ ] First heard edits preserve other tracks’ existing dates.
- [ ] Date changes preserve unrelated Grouping content.
- [ ] Album status applies to matching tracks’ Comments.
- [ ] Album tags write only to the resolved first track’s Grouping.
- [ ] Full is not inferred or applied automatically.
- [ ] Absence of Full does not disable album tagging.
- [ ] Lookup failure/unavailable target is distinct from an untagged album.

### Playback, membership, and states

- [ ] Refresh behavior accurately reflects the source implemented in the milestone.
- [ ] Pin/follow behavior is defined and does not discard edits.
- [ ] Flight is editable in Playlists.
- [ ] Membership results are read-only and refreshable.
- [ ] Stale membership is indicated after relevant edits.
- [ ] Saving, Saved, and Failed are distinguishable.
- [ ] Pending is used if—and only if—the write contract includes queued completion.
- [ ] Closing secondary views restores the prior page position.

### Scope

- [ ] No unapproved tag migration or backend architecture change.
- [ ] No assumption that future playback, lyric-analysis, offline, or queue features already exist.
- [ ] Album drawer details remain coordinated with its separate specification.
- [ ] Written requirements and corrections override render errors.

## Command Center handoff summary

This design chat has established substantial **tagging semantics as well as UI requirements**. The reviewed specification should become a versioned reference in the React repository, with future changes coordinated through Command Center.

**Selected mobile design:** Option B, compact labels above controls, familiar order, small album preview, directly accessible lyric/theme flags, and secondary editors. Implement mobile first.

**Critical rules:**

- Song tags, album status, and first-track album tags are different storage scopes.
- Album status is written to matching tracks’ Comments.
- Album objects/formats/collections are stored in the first track’s Grouping.
- First-heard edits must preserve grouping content and existing dates on other tracks.
- Manual Full and inferred Complete are different concepts.
- Absence of Full must never gate album tagging.
- Processed does not automatically clear `[nltags]`.
- Legacy `unpro` must not be silently mapped or removed.
- Playback changes must not redirect edits.
- Render errors are explicitly cataloged and do not alter requirements.

**Desktop:** A dense four-column concept exists, but its arrangement is exploratory. Shared tagging behavior with separate responsive presentations is recommended; exact layout and breakpoints are unapproved.

**Before real writes:** Verify current code mappings, language/severity dependencies, legacy process handling, and album/date resolution. No backend architecture, tag-format migration, or automatic classification was selected here.

**Recommended next milestone:** Review this specification against the current code-inspection results, resolve the write-contract blockers, then give a focused implementation chat and Codex the approved mobile specification plus the reference images and correction table.