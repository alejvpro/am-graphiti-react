import {createIntegration,type IntegrationOptions,type ApiRoute} from './integration';
import {Rating} from './Rating';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {LegacyClient,keyOf,tokensOf,type Song} from './api';
import {SampleService,samples,type Scenario,type SaveMode} from './sample';
import {SongStore,project} from './store';
import {mainGroups,moreGroups,todo,collections,type Tag} from './tags';
const scenarios:Scenario[]=['Loaded song','No tags','No match','Loading','Ambiguous match','Failed lookup','Album unavailable','Album lookup failed','No album tags','Mixed album status'];
type View='More song tags'|'Metadata'|'Playlists'|'Genres'|'First heard'|'Album info';
const noSubscribe=()=>()=>{};
const noSession=()=>undefined;
export function App({service,integration}: {service?:SampleService;integration?:IntegrationOptions}) {
 const [runtime]=useState(()=>{
  const sample=service??new SampleService();const sampleClient=new LegacyClient(sample.transport);
  let store:SongStore;
  const live=integration?createIntegration(integration,(song,selection)=>store.load(song,selection)):undefined;
  const client=live?.client??sampleClient;store=new SongStore(client,!!live);
  return {service:sample,client,store,live};
 });
 const liveState=useSyncExternalStore(runtime.live?.session.subscribe??noSubscribe,runtime.live?.session.snapshot??noSession);
 const readOnly=!!runtime.live;
 const {store,client}=runtime;
 useSyncExternalStore(store.subscribe,store.snapshot);
 const [playback,setPlayback]=useState(0),[target,setTarget]=useState(keyOf(samples[0])),[samplePinned,setPinned]=useState(false);
 const [scenario,setScenario]=useState<Scenario>('Loaded song'),[sampleLoad,setLoad]=useState('Loading metadata…');
 const pinned=liveState?.pinned??samplePinned;
 const activeTarget=liveState?liveState.targetKey??'':target;
 const load=liveState?(liveState.targetKey?'':liveState.message):sampleLoad;
 const [editor,setEditor]=useState<{view:View;key:string;scenario:Scenario}|null>(null);
 const generation=useRef(0),scroll=useRef(0),opener=useRef<HTMLElement|null>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 async function resolve(index:number,choice:Scenario){
  const expectedRevision=store.entries[keyOf(samples[index])]?.revision??0;
  const gen=++generation.current;setLoad('Loading metadata…');runtime.service.scenario=choice;
  if(choice==='Loading') return;
  try {const result=await client.read(samples[index]);if(gen!==generation.current)return;if((store.entries[keyOf(result.song)]?.revision??0)===expectedRevision)store.load(result.song,result.selection);setTarget(keyOf(result.song));setLoad('');}
  catch(e){if(gen===generation.current)setLoad(e instanceof Error?e.message:'Metadata unavailable');}
 }
 useEffect(()=>{if(!readOnly)void resolve(0,'Loaded song');return()=>runtime.live?.session.dispose();},[]);
 useEffect(()=>{
  if(!editor)return;
  dialog.current?.showModal();
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{document.body.style.overflow=previous;window.scrollTo(0,scroll.current);opener.current?.focus({preventScroll:true});};
 },[!!editor]);
 function open(view:View){scroll.current=window.scrollY;opener.current=document.activeElement as HTMLElement;setEditor({view,key:activeTarget,scenario:readOnly?'Album unavailable':scenario});}
 function close(){dialog.current?.close();setEditor(null);}
 function refresh(){if(runtime.live){void runtime.live.session.refresh();return;}const next=1-playback;setPlayback(next);if(!pinned)void resolve(next,scenario);}
 function chooseScenario(value:Scenario){setScenario(value);runtime.service.scenario=value;if(!pinned)void resolve(value==='No tags'?1:playback,value);}
 const entry=store.entries[activeTarget],song=entry?project(entry):null;
 const albumSummary=(state:Scenario)=>state==='Album unavailable'?'Album information unavailable':state==='Album lookup failed'?'Album lookup failed':state==='No album tags'||state==='No tags'?'No album tags · Preview available':'LEGO · To make · Vinyl · Owned · 3 collections';
 function tags(group:string,items:Tag[],key=activeTarget){const e=store.entries[key];if(!e)return null;const s=project(e),selected=tokensOf(s);return <fieldset data-group={group} className={`tag-group ${group==='Specific words'?'words':''}`}><legend>{group}</legend><div className="choices">{items.map(([label,token])=><label className="check" key={token}><input type="checkbox" checked={selected.has(token)} disabled={e.uncertain||readOnly} onChange={event=>void store.edit(s,{field:'tag',token,value:event.target.checked})}/><span>{label}</span></label>)}</div></fieldset>;}
 function summaries(s:Song){return <div className="summaries"><button onClick={()=>open('Genres')}><span>{s.genre.split(', ').join(' · ')||'No genres'}</span><span aria-hidden="true">✎</span></button><button onClick={()=>open('First heard')}><span>First heard · {displayDate(s)}</span><span aria-hidden="true">✎</span></button></div>;}
 const fixed=editor?store.entries[editor.key]:null, fixedSong=fixed?project(fixed):null;
 return <><main>
 {readOnly?<> <details className="lab"><summary>READ ONLY · Connection</summary><div className="lab-controls"><label>Mac API route<select aria-label="Mac API route" value={runtime.live?.getRoute()} onChange={e=>runtime.live?.setRoute(e.target.value as ApiRoute)}>{(['internal','external','local'] as ApiRoute[]).filter(r=>integration?.config.origins[r]).map(r=><option key={r} value={r}>{r==='local'?'Local (this browser’s machine)':r}</option>)}</select></label><button disabled={liveState?.detected?.kind!=='now-playing'&&!pinned} onClick={()=>void runtime.live?.session.refreshLibrary()}>Refresh library metadata</button></div><p>{liveState?.message}</p><p>Detected playback: {liveState?.detected&&'identity' in liveState.detected?`${liveState.detected.identity.name} / ${liveState.detected.identity.artist} / ${liveState.detected.identity.album}`:'No confirmed current song'}</p><p>Last.fm identifies playback; the Mac API supplies library metadata. All writes are disabled. Localhost refers to the device running this browser.</p></details>
</>:<> <details className="lab"><summary>SAMPLE · Scenarios</summary><div className="lab-controls"><label>Scenario<select aria-label="Scenario" value={scenario} onChange={e=>chooseScenario(e.target.value as Scenario)}>{scenarios.map(s=><option key={s}>{s}</option>)}</select></label><label>Next sample saves<select aria-label="Next sample saves" onChange={e=>runtime.service.mode=e.target.value as SaveMode}><option value="verified">Verified</option><option value="failed">Failed</option><option value="uncertain">Uncertain / timeout</option><option value="delayed">Delayed (1.6 seconds)</option></select></label></div><p>Music.app is untouched. Refresh alternates sample playback A / B. Last.fm and Mac playback are disconnected.</p><p className="target-note">Sample playback: {samples[playback].name}{pinned?' · Editing target pinned':''}</p><p>Song controls simulate supported API primitives; unavailable Set actions cannot save.</p></details>
</>}
 <header className={`identity ${entry?.uncertain||entry?.status.startsWith('Save failed')?'has-error':''}`}><div><h1>{load?'Song metadata':song?.name??'Song metadata'}</h1><p>{load?'No resolved song':song?.artist??'No resolved song'}</p></div><div className="actions"><button onClick={refresh} aria-label={readOnly?"Refresh playback and library":"Refresh sample playback"} title="Refresh playback and library"><ActionIcon kind="refresh"/></button><button aria-pressed={pinned} onClick={()=>{if(runtime.live){if(pinned)void runtime.live.session.resume();else runtime.live.session.pin();return;}setPinned(!pinned);if(pinned)void resolve(playback,scenario);}} aria-label={pinned?'Unpin editing target':'Pin editing target'}><ActionIcon kind={pinned?'locked':'unlocked'}/></button></div>
 <p role="status" className={`save-status ${entry?.uncertain?'warning':''}`}>{readOnly?liveState?.message:entry?.status==='Sample loaded · no live connection'?'Ready':entry?.status==='✓ Sample save verified'?'✓ Sample saved':entry?.status??'Loading sample…'}</p></header>
 {liveState?.pending&&<div className="lookup-progress">{liveState.slow&&<p role="status">Still looking up this song…</p>}<button onClick={()=>runtime.live?.session.cancel()}>Cancel lookup</button><small>Stops browser waiting; Music.app may continue.</small></div>}
 {entry?.uncertain&&<button onClick={()=>void resolve(samples.findIndex(s=>keyOf(s)===target),scenario)}>Inspect target again (sample read)</button>}
 {load?<section className="empty" role="status"><h2>{readOnly?liveState?.message:load==='Loading metadata…'?load:load==='no matches found'?'No matching song':'Metadata lookup failed'}</h2><p>{load==='Loading metadata…'?'Waiting for sample metadata.':load}</p><p>No controls are enabled for an unresolved target.</p></section>:song&&entry&&<>
 {entry.selection?.identityChanged&&<p className="warning" role="status">Backend selected identity changed for this song. Previous metadata retained; legacy-v0 cannot target a specific duplicate.</p>}
 {entry.selection?.ambiguous&&<p className="warning">⚠ {entry.selection.warning??'Multiple matching records; deterministic selection is not confirmed as the intended recording.'}</p>}
 {summaries(song)}
 <button aria-label={`Open Album info for ${song.album}`} title="Open Album info" className="album-preview" onClick={()=>open('Album info')}><Artwork/><span><strong>Album info · {song.album}</strong><small>{readOnly?'Album tags unavailable':albumSummary(scenario)}</small></span><span aria-hidden="true">›</span></button>
 <div className="main-controls"><section className="rating-section"><h2>Rating <small>{song.rating/20} / 5</small></h2><div className="rating-line"><Rating value={song.rating} disabled={entry.uncertain||readOnly} onChange={value=>void store.edit(song,{field:'rating',value})}/><button disabled={entry.uncertain||readOnly} onClick={()=>void store.edit(song,{field:'rating',value:0})} aria-label="Clear rating">×</button><button className="heart" aria-label="Favorite" aria-pressed={song.loved} disabled={entry.uncertain||readOnly} onClick={()=>void store.edit(song,{field:'loved',value:!song.loved})}>{song.loved?'♥':'♡'}</button></div></section>
 <fieldset><legend>Energy</legend><div className="segments energy">{['Unset','1','2','3','4','5','6'].map((label,i)=><button key={label} aria-pressed={energy(song)===i} disabled={entry.uncertain||readOnly} onClick={()=>void store.edit(song,{field:'energy',value:i})}>{label}</button>)}</div></fieldset>
 <fieldset><legend>Mood</legend><div className="segments">{['Unset','Negative','Neutral','Positive'].map((label,i)=><button key={label} aria-pressed={mood(song)===i} disabled={entry.uncertain||readOnly} onClick={()=>void store.edit(song,{field:'mood',value:i})}>{label}</button>)}</div></fieldset>
 {mainGroups.map(([group,items])=><div className={['Specific words','Themes'].includes(group)?'wide-group':undefined} key={group}>{tags(group,items)}</div>)}</div>
 <nav className="secondary" aria-label="Secondary editors">{(['More song tags','Metadata','Playlists'] as View[]).map(v=><button key={v} onClick={()=>open(v)}>{v} <span aria-hidden="true">›</span></button>)}</nav>
</>}
 </main>
 {editor&&fixedSong&&fixed&&<dialog ref={dialog} onCancel={e=>{e.preventDefault();close();}} aria-labelledby="editor-title"><div className="sheet-header">{editor.view==='Album info'&&<Artwork/>}<div><h2 id="editor-title">{editor.view}</h2><p>{editor.view.startsWith('Album')?fixedSong.album:fixedSong.name}<br/>{fixedSong.artist}</p></div><button aria-label="Close editor" onClick={close}>×</button></div><div className="sheet-content"><p className="fixed-note">{readOnly?'Read only':'Sample'} · Fixed {editor.view.startsWith('Album')?'album':'song'} target</p>
 {['More song tags','Metadata','Playlists'].includes(editor.view)&&<p role="status" className="save-status">{fixed.status}</p>}
 {editor.view==='More song tags'&&moreGroups.map(([group,items])=><div key={group}>{tags(group,items,editor.key)}</div>)}
 {editor.view==='Metadata'&&<><fieldset disabled><legend>Tagging progress · Read only</legend>{[['None',''],['In progress','inprogress'],['Processed','processed'],['Not processing','notprocessing'],['Legacy unpro · preserved','unpro']].map(([label,value])=><label className="radio-row" key={label}><input type="radio" name="process" checked={processOf(fixedSong)===value} readOnly/>{label}</label>)}</fieldset><p className="notice">Progress is read-only. Lyric review is separate; Processed does not clear nltags.</p>{tags('Lyric review',[['nltags · Needs lyric tagging','[nltags]']],editor.key)}{tags('To do',todo,editor.key)}<details><summary>Preserved raw metadata</summary><p>Comments: {fixedSong.comment||'(empty)'}</p><p>Grouping: {fixedSong.grouping||'(empty)'}</p></details></>}
 {editor.view==='Genres'&&<GenreDraft readOnly={readOnly} key={editor.key} song={fixedSong} onClose={close}/>}
 {editor.view==='First heard'&&<DateDraft readOnly={readOnly} key={editor.key} song={fixedSong} onClose={close}/>}
 {editor.view==='Playlists'&&<>{tags('Playlist tags',[['Flight / Take Flight','flight']],editor.key)}<h3>Playlist membership</h3><p className="notice">{readOnly?'Playlist membership unavailable · No HTTP membership endpoint':'Sample membership · Read only.'}</p><button disabled={readOnly} className="playlist-refresh" onClick={()=>store.refreshMembership(editor.key)}>{readOnly?'Refresh playlists · Unavailable':'↻ Refresh sample playlists'}</button>{fixed.stale&&<p className="warning">Tags changed · Membership may be stale. Sample refresh does not recompute smart playlists.</p>}{!readOnly&&<><h3>In playlists</h3><ul className="playlist-list">{['Nightly Raps','Lyrical Miracle','Scratch'].map(p=><li key={p}>♫ {p}</li>)}</ul><h3>Not in playlists</h3><ul className="playlist-list">{['House Party','Sun Roof','Umi Says','Beach House'].map(p=><li key={p}>♫ {p}</li>)}</ul></>}</>}
 {editor.view==='Album info'&&<><AlbumStatus sample={!readOnly} state={editor.scenario} onClose={close}/><AlbumDrawer sample={!readOnly} state={editor.scenario}/></>}
 </div></dialog>}
 </>;
}
function energy(s:Song){return Number([...tokensOf(s)].find(t=>/^e[1-6]$/.test(t))?.slice(1)??0);}
function mood(s:Song){const t=tokensOf(s);return t.has('m-')?1:t.has('m.')?2:t.has('m+')?3:0;}
function processOf(s:Song){return ['unpro','inprogress','processed','notprocessing'].filter(t=>tokensOf(s).has(t))[0]??'';}
function firstDate(s:Song){return /^\d{4}\/\d{2}\/\d{2}(?=\s|$)/.exec(s.grouping)?.[0];}
function displayDate(s:Song){return formatDate(firstDate(s));}
function formatDate(raw?:string){if(!raw)return 'Unavailable';const [year,month,day]=raw.split('/').map(Number);const date=new Date(year,month-1,day);return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day?date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):raw;}
function ActionIcon({kind}:{kind:'refresh'|'locked'|'unlocked'}){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==='refresh'?<><path d="M20 6v5h-5"/><path d="M19.4 10a8 8 0 1 0 .1 5M20 11l-4-6"/></>:<><rect x="5" y="10" width="14" height="11" rx="2" fill="currentColor"/><path d={kind==='locked'?'M8 10V6a4 4 0 0 1 8 0v4':'M8 10V6a4 4 0 0 1 8-1'}/></>}</svg>;}
function Artwork(){return <span className="artwork" role="img" aria-label="Illustrative album artwork placeholder"><span/></span>;}
function Footer({cancel,label}:{cancel:()=>void;label:string}){return <div className="editor-footer"><button onClick={cancel}>Cancel</button><button disabled title="No implemented API setter">{label} · Unavailable</button></div>;}
function GenreDraft({song,onClose,readOnly=false}:{song:Song;onClose:()=>void;readOnly?:boolean}){
 const [draft,setDraft]=useState(()=>Array.from({length:4},(_,i)=>song.genre.split(', ')[i]??''));
 return <><p className="notice">Preview only · Genre saving is unavailable.</p><p>Ordered by prominence. First genre is primary.</p><datalist id="existing-genres">{song.genre.split(', ').filter(Boolean).map(g=><option key={g} value={g}/>)}</datalist>{draft.map((g,i)=><div className="genre-row" key={i}><span className="slot-number">{i+1}</span><input readOnly={readOnly} list="existing-genres" aria-label={`Genre slot ${i+1}`} placeholder="Add genre" value={g} onChange={e=>setDraft(draft.map((v,n)=>n===i?e.target.value:v))}/><button aria-label={`Move genre ${i+1} up`} disabled={readOnly||i===0} onClick={()=>{const next=[...draft];[next[i-1],next[i]]=[next[i],next[i-1]];setDraft(next);}}>↑</button><button disabled={readOnly} aria-label={`Remove genre ${i+1}`} onClick={()=>setDraft(draft.map((v,n)=>n===i?'':v))}>×</button></div>)}<fieldset disabled><legend>Genre tags · Preview only</legend>{['prop','strack'].map(t=><label className="check" key={t}><input type="checkbox" checked={tokensOf(song).has(t)} readOnly/>{t}</label>)}</fieldset><p>Genre flags are read-only while draft save timing is deferred.</p><Footer cancel={onClose} label="Set genres"/></>;
}
function DateDraft({song,onClose,readOnly=false}:{song:Song;onClose:()=>void;readOnly?:boolean}){
 const [date,setDate]=useState(firstDate(song)?.replaceAll('/','-')??'');
 return <><p className="notice">Preview only · Date saving is unavailable.</p><label className="date-label">Date you first heard this song<span className="human-date">{formatDate(date.replaceAll('-','/'))}</span><input readOnly={readOnly} type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><button disabled={readOnly} onClick={()=>{const d=new Date();setDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);}}>Today</button><label className="check standalone"><input disabled={readOnly} type="checkbox"/>Also fill missing first-heard dates on this album</label><p>Existing dates on other tracks, album tags and context will be preserved.</p><Footer cancel={onClose} label="Set date"/></>;
}
function AlbumDrawer({state,sample=true}:{state:Scenario;sample?:boolean}){
 const unavailable=state==='Album unavailable'||state==='Album lookup failed';
 const empty=state==='No album tags'||state==='No tags';
 const sections=[['Album objects',[['LEGO','To make'],['Token','Made'],['MiniD','None']]],['Art & wallpaper',[['Wallpaper','To make'],['Art','Clay · Made'],['Totem','Want · Wheel']]],['Music formats',[['MP3','None'],['CD','Want'],['Vinyl','Owned'],['Cassette','None']]]] as const;
 return <><fieldset disabled><legend>Collections · Read only</legend><p className="drawer-identity">{unavailable?(state==='Album unavailable'?'Album information unavailable · No resolved first-track target.':'Album lookup failed · Tags could not be loaded.'):empty?'No album tags':'Active sample album tags'}</p><div className="choices">{collections.map(c=><label className="check" key={c}><input type="checkbox" checked={!unavailable&&!empty&&['Suzy','Soul Food','Take Flight'].includes(c)} readOnly/>{c}</label>)}</div></fieldset>{sections.map(([title,items])=><section key={title}><h3>{title}</h3><div className={`object-grid ${title==='Music formats'?'formats':''}`}>{items.map(([name,status])=><div className="object-card" key={name}><span className={`object-icon icon-${name.toLowerCase()}`} aria-hidden="true">{name==='Art'?'🎨':name==='Wallpaper'?<Artwork/>:name==='Totem'?'🪨':name==='MP3'?'♫':name==='Cassette'?<span className="tape-reels">● ●</span>:<Artwork/>}</span><strong>{name}</strong><small className={`object-status ${!unavailable&&!empty&&status!=='None'?'active':''} ${!unavailable&&!empty&&(status.includes('Made')||status==='Owned')?'owned':''}`}>{unavailable?'Unavailable':empty?'None':status}</small></div>)}</div></section>)}<p className="footnote">{sample?'Read-only sample':'Read only'} · Album tags use the first track’s Grouping; saving is unavailable. Illustrative artwork.</p></>;
}

function AlbumStatus({state,onClose,sample=true}:{state:Scenario;onClose:()=>void;sample?:boolean}){return <section className="album-status"><h3>Album status</h3><p className="album-status-current">{sample?'Reported sample status':'Album status'}: {state==='Mixed album status'?'Mixed · Full / Incomplete':state==='Album unavailable'?'Unavailable':state==='Album lookup failed'?'Unknown · lookup failed':'Not set'}</p><fieldset disabled aria-label="Album-wide status · Unavailable" className="album-status-segments">{['Full','Incomplete','Trimmed'].map(label=><label key={label}><input type="radio" name="album-status"/>{label}</label>)}</fieldset><p className="album-status-note">Applies to all matching album tracks. Full affects smart-playlist eligibility.</p><Footer cancel={onClose} label="Set album status"/></section>;}
