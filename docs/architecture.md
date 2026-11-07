# Architecture and capability inventory

React 19, TypeScript, Vite, ordinary CSS; no router, global state framework, persistence, external fonts or image services. One responsive component tree uses the same controls and state across widths.

`tags.ts` centralizes labels/exact stored tokens. `api.ts` owns tuple identity, typed route construction, validation, encoding, response checks, timeout (8 seconds) and serialized legacy requests. All routes are GET. Rating is integer 0–100 (UI steps of 10); loved is exactly true/false; Energy is 0–6; Mood is 0–3. `/tag` submits one exact token with add/remove. `createRealTransport` contains the controlled GET/fetch implementation but is unused and disabled by default. App composes only `SampleService.transport`; there is no endpoint or activation UI.

`sample.ts` provides realistic envelopes and preserving sample mutations. This simulator does not claim full parity with Foundation whitespace scanning, native UC timestamp behavior, errors or Music persistence. Normalization is shared with eventual real responses. Raw unknown metadata survives read normalization. The optional interpreted tag list is retained but raw Comments drives exact UI membership; it is never rebuilt for transport.

`store.ts` holds the two demonstration targets for this session. Confirmed metadata plus pending intents form the displayed value; projections never become API payloads. A single short-lived promise chain serializes user-initiated writes (including across targets for simplicity). Every command captures its title/artist/album. Pending intents keep newer UI choices from regressing when an earlier save returns. Failed edits roll back that intent; uncertain outcomes stop subsequent already-queued writes for that target until a deliberate fresh sample read. No durable/offline queue or automatic retry exists. Timeout only ends waiting; it does not cancel server execution. Late results cannot update UI after timeout.

`App.tsx` separately tracks simulated detected playback, resolved metadata/editing target and pin. Lookup generation rejects older refresh responses; target mutation revision rejects reads begun before newer edits. Opening a secondary view captures its target and sample album state. Native modal dialogs supply focus containment/Escape; scroll/focus restore on close. Preview drafts are local to the editor and discarded on Cancel/close; unsupported Set operations remain disabled.

| Capability | Implemented contract | R1 behavior |
|---|---|---|
| Song lookup | /song_info, tuple identity, selection diagnostics | Sample read, loading/no-match/failed/ambiguous states |
| Rating, clear | /rate, 0–100 | Functional sample directly interactive half-stars, number |
| Favorite | /loved | Functional independent sample heart |
| Energy / Mood | /energy, /mood | Functional sample, explicit independent unset |
| Main song and More song tags | /tag | Functional independent sample checkboxes |
| Metadata lyric review and to-do | /tag | Functional, shared state with main |
| Flight | /tag, flight | Functional sample song flag |
| prop / strack | /tag primitives exist | Disabled inside genre draft pending save-timing decision |
| Genre ordering | Read genre; no setter | Four-slot local preview draft, remove/reorder; Set disabled |
| First heard | Raw Grouping only; no setter | Date/Today/fill-missing preview; Set disabled |
| Tagging process | No safe dedicated operation | Read-only including distinct legacy unpro |
| Album status | No album-wide setter/aggregate read | Read-only choices, explicit all-track scope; mixed sample state |
| Album objects/art/formats/collections | No reader/resolver/writer | Sample preview/drawer, read-only; empty/unavailable/failure distinguished |
| Playlist membership | No HTTP endpoint | Explicit illustrative lists, sample-only refresh, stale warning |
| Playback / Last.fm | No usable detection contract in R1 | Manual sample alternation, pin/unpin only |
| Live API | Legacy contract exists, activation unauthorized | Controlled transport code inactive; zero live requests |

Limitations and open decisions: production transport/authentication/HTTPS require another milestone; no disk persistence guarantee; existing backend concurrency limitations remain. Define genre flag timing, malformed/multiple first-heard dates, process replacement of unpro, album first-track resolution/grammar/colors/art media/unknown collections and partial album failures with Command Center before real domain editing. Placeholder artwork and simple object silhouettes intentionally bound album-shell effort. Desktop uses a wider, bounded two-column control layout; no exploratory four-column requirement is assumed.

R1.1 changes presentation only; api.ts, store.ts, tags.ts and sample.ts remain unchanged. Rating.tsx adds direct pointer/touch and roving-radio keyboard interaction. Human-readable date summaries do not mutate raw Grouping. Genre suggestions are only existing read-model genre values, not an invented vocabulary.
