import {Rating} from './Rating';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {LegacyClient,keyOf,tokensOf,type Song} from './api';
import {SampleService,samples,type Scenario,type SaveMode} from './sample';
import {SongStore,project} from './store';
import {mainGroups,moreGroups,todo,collections,type Tag} from './tags';
const scenarios:Scenario[]=['Loaded song','No tags','No match','Loading','Ambiguous match','Failed lookup','Album unavailable','Album lookup failed','No album tags','Mixed album status'];
type View='More song tags'|'Metadata'|'Album status'|'Playlists'|'Genres'|'First heard'|'Album tags';
export function App({service}: {service?:SampleService}) {
 const [runtime]=useState(()=>{const sample=service??new SampleService();const client=new LegacyClient(sample.transport);return {service:sample,client,store:new SongStore(client)};});
 const {store,client}=runtime;
 useSyncExternalStore(store.subscribe,store.snapshot);
 const [playback,setPlayback]=useState(0),[target,setTarget]=useState(keyOf(samples[0])),[pinned,setPinned]=useState(false);
 const [scenario,setScenario]=useState<Scenario>('Loaded song'),[load,setLoad]=useState('Loading metadata…');
 const [editor,setEditor]=useState<{view:View;key:string;scenario:Scenario}|null>(null);
 const generation=useRef(0),scroll=useRef(0),opener=useRef<HTMLElement|null>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 async function resolve(index:number,choice:Scenario){
  const expectedRevision=store.entries[keyOf(samples[index])]?.revision??0;
  const gen=++generation.current;setLoad('Loading metadata…');runtime.service.scenario=choice;
  if(choice==='Loading') return;
  try {const result=await client.read(samples[index],true);if(gen!==generation.current)return;if((store.entries[keyOf(result.song)]?.revision??0)===expectedRevision)store.load(result.song,result.selection);setTarget(keyOf(result.song));setLoad('');}
  catch(e){if(gen===generation.current)setLoad(e instanceof Error?e.message:'Metadata unavailable');}
 }
 useEffect(()=>{void resolve(0,'Loaded song');},[]);
 useEffect(()=>{
  if(!editor)return;
  dialog.current?.showModal();
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{document.body.style.overflow=previous;window.scrollTo(0,scroll.current);opener.current?.focus({preventScroll:true});};
 },[!!editor]);
 function open(view:View){scroll.current=window.scrollY;opener.current=document.activeElement as HTMLElement;setEditor({view,key:target,scenario});}
 function close(){dialog.current?.close();setEditor(null);}
 function refresh(){const next=1-playback;setPlayback(next);if(!pinned)void resolve(next,scenario);}
 function chooseScenario(value:Scenario){setScenario(value);runtime.service.scenario=value;if(!pinned)void resolve(value==='No tags'?1:playback,value);}
 const entry=store.entries[target],song=entry?project(entry):null;
 const albumSummary=(state:Scenario)=>state==='Album unavailable'?'Album information unavailable':state==='Album lookup failed'?'Album lookup failed':state==='No album tags'||state==='No tags'?'No album tags · Preview available':'LEGO · To make · Vinyl · Owned · 3 collections';
 function tags(group:string,items:Tag[],key=target){const e=store.entries[key];if(!e)return null;const s=project(e),selected=tokensOf(s);return <fieldset data-group={group} className={`tag-group ${group==='Specific words'?'words':''}`}><legend>{group}</legend><div className="choices">{items.map(([label,token])=><label className="check" key={token}><input type="checkbox" checked={selected.has(token)} disabled={e.uncertain} onChange={event=>void store.edit(s,{field:'tag',token,value:event.target.checked})}/><span>{label}</span></label>)}</div></fieldset>;}
 function summaries(s:Song){return <div className="summaries"><button onClick={()=>open('Genres')}><span>{s.genre.split(', ').join(' · ')||'Genres unavailable'}</span><span aria-hidden="true">✎</span></button><button onClick={()=>open('First heard')}><span>First heard · {displayDate(s)}</span><span aria-hidden="true">✎</span></button></div>;}
 const fixed=editor?store.entries[editor.key]:null, fixedSong=fixed?project(fixed):null;
 return <><main>
 <details className="lab"><summary>SAMPLE · Scenarios</summary><div className="lab-controls"><label>Scenario<select aria-label="Scenario" value={scenario} onChange={e=>chooseScenario(e.target.value as Scenario)}>{scenarios.map(s=><option key={s}>{s}</option>)}</select></label><label>Next sample saves<select aria-label="Next sample saves" onChange={e=>runtime.service.mode=e.target.value as SaveMode}><option value="verified">Verified</option><option value="failed">Failed</option><option value="uncertain">Uncertain / timeout</option><option value="delayed">Delayed (1.6 seconds)</option></select></label></div><p>Music.app is untouched. Refresh alternates sample playback A / B. Last.fm and Mac playback are disconnected.</p><p className="target-note">Sample playback: {samples[playback].name}{pinned?' · Editing target pinned':''}</p><p>Song controls simulate supported API primitives; unavailable Set actions cannot save.</p></details>
 <header className={`identity ${entry?.uncertain||entry?.status.startsWith('Save failed')?'has-error':''}`}><div><h1>{load?'Song metadata':song?.name??'Song metadata'}</h1><p>{load?'No resolved song':song?.artist??'No resolved song'}</p></div><div className="actions"><button onClick={refresh} aria-label="Refresh sample playback" title="Refresh sample playback"><ActionIcon kind="refresh"/></button><button aria-pressed={pinned} onClick={()=>{setPinned(!pinned);if(pinned)void resolve(playback,scenario);}} aria-label={pinned?'Unpin editing target':'Pin editing target'}><ActionIcon kind={pinned?'locked':'unlocked'}/></button></div>
 <p role="status" className={`save-status ${entry?.uncertain?'warning':''}`}>{entry?.status==='Sample loaded · no live connection'?'Ready':entry?.status==='✓ Sample save verified'?'✓ Sample saved':entry?.status??'Loading sample…'}</p></header>
 {entry?.uncertain&&<button onClick={()=>void resolve(samples.findIndex(s=>keyOf(s)===target),scenario)}>Inspect target again (sample read)</button>}
 {load?<section className="empty" role="status"><h2>{load==='Loading metadata…'?load:load==='no matches found'?'No matching song':'Metadata lookup failed'}</h2><p>{load==='Loading metadata…'?'Waiting for sample metadata.':load}</p><p>No controls are enabled for an unresolved target.</p></section>:song&&entry&&<>
 {entry.selection?.ambiguous&&<p className="warning">⚠ {entry.selection.warning}</p>}
 {summaries(song)}
 <button className="album-preview" onClick={()=>open('Album tags')}><Artwork/><span><strong>{song.album}</strong><small>{albumSummary(scenario)}</small></span><span aria-hidden="true">›</span></button>
 <div className="main-controls"><section className="rating-section"><h2>Rating <small>{song.rating/20} / 5</small></h2><div className="rating-line"><Rating value={song.rating} disabled={entry.uncertain} onChange={value=>void store.edit(song,{field:'rating',value})}/><button disabled={entry.uncertain} onClick={()=>void store.edit(song,{field:'rating',value:0})} aria-label="Clear rating">×</button><button className="heart" aria-label="Favorite" aria-pressed={song.loved} disabled={entry.uncertain} onClick={()=>void store.edit(song,{field:'loved',value:!song.loved})}>{song.loved?'♥':'♡'}</button></div></section>
 <fieldset><legend>Energy</legend><div className="segments energy">{['Unset','1','2','3','4','5','6'].map((label,i)=><button key={label} aria-pressed={energy(song)===i} disabled={entry.uncertain} onClick={()=>void store.edit(song,{field:'energy',value:i})}>{label}</button>)}</div></fieldset>
 <fieldset><legend>Mood</legend><div className="segments">{['Unset','Negative','Neutral','Positive'].map((label,i)=><button key={label} aria-pressed={mood(song)===i} disabled={entry.uncertain} onClick={()=>void store.edit(song,{field:'mood',value:i})}>{label}</button>)}</div></fieldset>
 {mainGroups.map(([group,items])=><div className={['Specific words','Themes'].includes(group)?'wide-group':undefined} key={group}>{tags(group,items)}</div>)}</div>
 <nav className="secondary" aria-label="Secondary editors">{(['More song tags','Metadata','Album status','Playlists'] as View[]).map(v=><button key={v} onClick={()=>open(v)}>{v} <span aria-hidden="true">›</span></button>)}</nav>
</>}
 </main>
 {editor&&fixedSong&&fixed&&<dialog ref={dialog} onCancel={e=>{e.preventDefault();close();}} aria-labelledby="editor-title"><div className="sheet-header">{editor.view==='Album tags'&&<Artwork/>}<div><h2 id="editor-title">{editor.view}</h2><p>{editor.view.startsWith('Album')?fixedSong.album:fixedSong.name}<br/>{fixedSong.artist}</p></div><button aria-label="Close editor" onClick={close}>×</button></div><div className="sheet-content"><p className="fixed-note">Sample · Fixed {editor.view.startsWith('Album')?'album':'song'} target</p>
 {['More song tags','Metadata','Playlists'].includes(editor.view)&&<p role="status" className="save-status">{fixed.status}</p>}
 {editor.view==='More song tags'&&moreGroups.map(([group,items])=><div key={group}>{tags(group,items,editor.key)}</div>)}
 {editor.view==='Metadata'&&<>{/* Keep the same editor target when navigating to its deferred children. */}<div className="summaries"><button onClick={()=>setEditor({...editor,view:'Genres'})}>Genres · {fixedSong.genre} ✎</button><button onClick={()=>setEditor({...editor,view:'First heard'})}>First heard · {displayDate(fixedSong)} ✎</button></div><fieldset disabled><legend>Tagging progress · Read only</legend>{[['None',''],['In progress','inprogress'],['Processed','processed'],['Not processing','notprocessing'],['Legacy unpro · preserved','unpro']].map(([label,value])=><label className="radio-row" key={label}><input type="radio" name="process" checked={processOf(fixedSong)===value} readOnly/>{label}</label>)}</fieldset><p className="notice">Progress is read-only. Lyric review is separate; Processed does not clear nltags.</p>{tags('Lyric review',[['nltags · Needs lyric tagging','[nltags]']],editor.key)}{tags('To do',todo,editor.key)}<details><summary>Preserved raw metadata</summary><p>Comments: {fixedSong.comment||'(empty)'}</p><p>Grouping: {fixedSong.grouping||'(empty)'}</p></details></>}
 {editor.view==='Genres'&&<GenreDraft key={editor.key} song={fixedSong} onClose={close}/>}
 {editor.view==='First heard'&&<DateDraft key={editor.key} song={fixedSong} onClose={close}/>}
 {editor.view==='Album status'&&<><p className="scope">All matching album tracks</p><p>Reported sample status: {editor.scenario==='Mixed album status'?'Mixed · Full / Incomplete':'Not set'}</p><fieldset disabled><legend>Album-wide status · Unavailable</legend>{[['Full','Enables full-album filtering in smart playlists.'],['Incomplete','You haven’t heard the entire album yet.'],['Trimmed','You heard it all, then removed some tracks.']].map(([label,description])=><label className="radio-row status-choice" key={label}><input type="radio" name="album-status"/><span><strong>{label}</strong><small>{description}</small></span></label>)}</fieldset><p className="notice">Full affects smart playlist eligibility and can exclude unrated tracks. It must be assigned manually. Album tags remain available without Full.</p><p>Preview only · Applying album status is unavailable.</p><Footer cancel={close} label="Set album status"/></>}
 {editor.view==='Playlists'&&<>{tags('Playlist tags',[['Flight / Take Flight','flight']],editor.key)}<h3>Playlist membership</h3><p className="notice">Sample membership · Read only.</p><button className="playlist-refresh" onClick={()=>store.refreshMembership(editor.key)}>↻ Refresh sample playlists</button>{fixed.stale&&<p className="warning">Tags changed · Membership may be stale. Sample refresh does not recompute smart playlists.</p>}<h3>In playlists</h3><ul className="playlist-list">{['Nightly Raps','Lyrical Miracle','Scratch'].map(p=><li key={p}>♫ {p}</li>)}</ul><h3>Not in playlists</h3><ul className="playlist-list">{['House Party','Sun Roof','Umi Says','Beach House'].map(p=><li key={p}>♫ {p}</li>)}</ul></>}
 {editor.view==='Album tags'&&<AlbumDrawer state={editor.scenario}/>}
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
function Artwork(){return <span className="artwork" role="img" aria-label="Sample album artwork"><span/></span>;}
function Footer({cancel,label}:{cancel:()=>void;label:string}){return <div className="editor-footer"><button onClick={cancel}>Cancel</button><button disabled title="No implemented API setter">{label} · Unavailable</button></div>;}
function GenreDraft({song,onClose}:{song:Song;onClose:()=>void}){
 const [draft,setDraft]=useState(()=>Array.from({length:4},(_,i)=>song.genre.split(', ')[i]??''));
 return <><p className="notice">Preview only · Genre saving is unavailable.</p><p>Ordered by prominence. First genre is primary.</p><datalist id="existing-genres">{song.genre.split(', ').filter(Boolean).map(g=><option key={g} value={g}/>)}</datalist>{draft.map((g,i)=><div className="genre-row" key={i}><span className="slot-number">{i+1}</span><input list="existing-genres" aria-label={`Genre slot ${i+1}`} placeholder="Add genre" value={g} onChange={e=>setDraft(draft.map((v,n)=>n===i?e.target.value:v))}/><button aria-label={`Move genre ${i+1} up`} disabled={i===0} onClick={()=>{const next=[...draft];[next[i-1],next[i]]=[next[i],next[i-1]];setDraft(next);}}>↑</button><button aria-label={`Remove genre ${i+1}`} onClick={()=>setDraft(draft.map((v,n)=>n===i?'':v))}>×</button></div>)}<fieldset disabled><legend>Genre tags · Preview only</legend>{['prop','strack'].map(t=><label className="check" key={t}><input type="checkbox" checked={tokensOf(song).has(t)} readOnly/>{t}</label>)}</fieldset><p>Genre flags are read-only while draft save timing is deferred.</p><Footer cancel={onClose} label="Set genres"/></>;
}
function DateDraft({song,onClose}:{song:Song;onClose:()=>void}){
 const [date,setDate]=useState(firstDate(song)?.replaceAll('/','-')??'');
 return <><p className="notice">Preview only · Date saving is unavailable.</p><label className="date-label">Date you first heard this song<span className="human-date">{formatDate(date.replaceAll('-','/'))}</span><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><button onClick={()=>{const d=new Date();setDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);}}>Today</button><label className="check standalone"><input type="checkbox"/>Also fill missing first-heard dates on this album</label><p>Existing dates on other tracks, album tags and context will be preserved.</p><Footer cancel={onClose} label="Set date"/></>;
}
function AlbumDrawer({state}:{state:Scenario}){
 if(state==='Album unavailable'||state==='Album lookup failed')return <p className="notice">{state==='Album unavailable'?'Album information unavailable · No resolved first-track target.':'Album lookup failed · Tags could not be loaded.'}</p>;
 const empty=state==='No album tags'||state==='No tags';
 const sections=[['Album objects',[['LEGO','To make'],['Token','Made'],['MiniD','None']]],['Art & wallpaper',[['Wallpaper','To make'],['Art','Clay · Made'],['Totem','Want · Wheel']]],['Music formats',[['MP3','None'],['CD','Want'],['Vinyl','Owned'],['Cassette','None']]]] as const;
 return <><p className="drawer-identity">{empty?'No album tags':'Active sample album tags'}</p><p className="notice">Sample album tags · Read only. Album saving is unavailable.</p>{sections.map(([title,items])=><section key={title}><h3>{title}</h3><div className={`object-grid ${title==='Music formats'?'formats':''}`}>{items.map(([name,status])=><div className="object-card" key={name}><span className={`object-icon icon-${name.toLowerCase()}`} aria-hidden="true">{name==='Art'?'🎨':name==='Wallpaper'?<Artwork/>:name==='Totem'?'🪨':name==='MP3'?'♫':name==='Cassette'?<span className="tape-reels">● ●</span>:<Artwork/>}</span><strong>{name}</strong><small className={`object-status ${!empty&&status!=='None'?'active':''} ${status.includes('Made')||status==='Owned'?'owned':''}`}>{empty?'None':status}</small></div>)}</div></section>)}<fieldset disabled><legend>Collections · Read only</legend><div className="choices">{collections.map(c=><label className="check" key={c}><input type="checkbox" checked={!empty&&['Suzy','Soul Food','Take Flight'].includes(c)} readOnly/>{c}</label>)}</div></fieldset><p className="footnote">Applies to this album · Illustrative artwork.</p></>;
}
