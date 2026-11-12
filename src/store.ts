import { LegacyClient, type Song, type Identity, type Change, type Selection, keyOf } from './api';
export type Entry = {song:Song; pending:{id:number;change:Change}[]; status:string; uncertain:boolean; stale:boolean; selection?:Selection; revision:number;live?:boolean};
export function project(entry:Entry):Song {
 const song=structuredClone(entry.song);
 if(entry.live)return song;
 for(const {change:c} of entry.pending) {
  if(c.field==='rating') song.rating=c.value as number;
  else if(c.field==='loved') song.loved=c.value as boolean;
  else {
   let tokens=song.comment.split(/\s+/u).filter(Boolean);
   if(c.field==='tag') {tokens=tokens.filter(t=>t!==c.token); if(c.value) tokens.push(c.token);}
   if(c.field==='energy') {tokens=tokens.filter(t=>!/^e[1-6]$/.test(t));if(c.value) tokens.push(`e${c.value}`);}
   if(c.field==='mood') {tokens=tokens.filter(t=>!['m-','m.','m+'].includes(t));if(c.value) tokens.push(['','m-','m.','m+'][Number(c.value)]);}
   song.comment=tokens.join(' '); // View projection only; never sent to API.
  }
 }
 return song;
}
export class SongStore {
 entries:Record<string,Entry>={}; private listeners=new Set<()=>void>(); private version=0; private sequence=0;
 private tail=Promise.resolve();
 constructor(public client:LegacyClient,public readonly readOnly=false,public readonly liveWrites=false,private canEdit:()=>boolean=()=>true) {}
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
 snapshot=()=>this.version;
 private emit(){this.version++;this.listeners.forEach(f=>f());}
 load(song:Song,selection?:Selection){const key=keyOf(song);if(this.entries[key]?.pending.length)return;if(selection?.identityChanged&&this.entries[key]){this.entries[key].selection={...selection};this.entries[key].status='Read-only · Selection changed; previous metadata retained';this.emit();return;}this.entries[key]={song,live:this.liveWrites,pending:[],status:this.readOnly?'Read-only · Library loaded':this.liveWrites?'Ready · Live editing':'Sample loaded · no live connection',uncertain:false,stale:this.entries[key]?.stale??false,selection,revision:this.entries[key]?.revision??0};this.emit();}
 refreshMembership(key:string){const e=this.entries[key];if(e){e.stale=false;this.emit();}}
 edit(target:Identity,change:Change) {
  const key=keyOf(target), entry=this.entries[key];if(!this.canEdit()||this.readOnly||!entry||entry.uncertain||entry.selection?.identityChanged||this.liveWrites&&entry.pending.length)return Promise.resolve();
  const captured={name:target.name,artist:target.artist,album:target.album};
  const transport=this.client.captureTransport();
  const id=++this.sequence;entry.revision++;entry.pending.push({id,change});entry.status=this.liveWrites?'Saving…':'Saving sample…';entry.stale=true;this.emit();
  const task=this.tail.then(async()=>{
   const current=this.entries[key];
   if(current.uncertain){current.pending=current.pending.filter(p=>p.id!==id);this.emit();return;}
   const result=await this.client.write(captured,change,transport);
   current.pending=current.pending.filter(p=>p.id!==id);
   if(result.outcome==='verified'&&result.song){
    const before=current.selection?.selectedIdentity,after=result.selection?.selectedIdentity;
    if(this.liveWrites&&before&&(!after||before.libraryId!==after.libraryId||before.persistentID!==after.persistentID)){result.outcome='uncertain';result.message='Backend selected a different record; inspect target again';current.selection={...(result.selection??current.selection!),identityChanged:true};}
    else {current.song=result.song;if(result.selection)current.selection=result.selection;}
   }
   current.uncertain=result.outcome==='uncertain';
   current.status=current.pending.length&&!current.uncertain?(this.liveWrites?'Saving…':'Saving sample…'):result.outcome==='verified'?(this.liveWrites?'✓ Save verified':'✓ Sample save verified'):`${result.outcome==='failed'?'Save failed':'Outcome uncertain'} · ${result.message}`;
   this.emit();
  });this.tail=task.catch(()=>{});return task;
 }
}
