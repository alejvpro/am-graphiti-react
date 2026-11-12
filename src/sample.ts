import { type Song, type Transport, type Request, keyOf } from './api';
export const samples: Song[] = [
 {name:'WHEN SPARKS FLY',artist:'Vince Staples',album:'RAMONA PARK BROKE MY HEART',albumArtist:'Vince Staples',genre:'Hip-Hop/Rap, R&B/Soul',grouping:'2022/04/08 Storage/international run',comment:'unpro e3 m. [lang] [r] [f] scratch [en] lyrical custom:keep-me 🎵',rating:90,loved:true,interpreted:{tags:['unpro','e3','m.','[lang]','[r]','[f]','scratch','[en]','lyrical']}},
 {name:'SUNROOM',artist:'The Daydreams',album:'AFTERNOON LIGHT',albumArtist:'The Daydreams',genre:'Alternative, Soul',grouping:'2024/06/21',comment:'',rating:0,loved:false,interpreted:{tags:[]}}
];
export type Scenario = 'Loaded song'|'No tags'|'No match'|'Loading'|'Ambiguous match'|'Failed lookup'|'Album unavailable'|'Album lookup failed'|'No album tags'|'Mixed album status';
export type SaveMode = 'verified'|'failed'|'uncertain'|'delayed';
// Sample-only token patching. Never used to construct a real Comments replacement.
function patch(text:string, remove:string[], add?:string) {
 const remaining=text.replace(/\S+/gu,t=>remove.includes(t)?'':t);
 if(!add||remaining.split(/\s+/u).includes(add)) return remaining;
 return remaining+(remaining&&!/\s$/u.test(remaining)?' ':'')+add;
}
export class SampleService {
 songs = new Map(samples.map(s=>[keyOf(s),structuredClone(s)]));
 mode:SaveMode='verified'; scenario:Scenario='Loaded song'; calls:Request[]=[];
 transport:Transport = async request => {
  this.calls.push(structuredClone(request));
  const mode=this.mode, scenario=this.scenario;
  await new Promise(r=>setTimeout(r,mode==='delayed'&&request.route!=='/song_info'?1600:180));
  const song=this.songs.get(keyOf({name:request.query.name,artist:request.query.artist,album:request.query.album}));
  if(!song||scenario==='No match') return {status:400,message:'no matches found',match:null,results:[],matches:[]};
  if(scenario==='Failed lookup'&&request.route==='/song_info') throw Error('Sample lookup failed');
  const selection={ambiguous:scenario==='Ambiguous match',matchCount:scenario==='Ambiguous match'?2:1,selectedIdentity:{libraryId:'SAMPLE',persistentID:song.name},policy:'persistentID-ascending',fromCache:scenario==='Ambiguous match',warning:scenario==='Ambiguous match'?'Multiple matching records; deterministic selection is not confirmed as the intended recording.':undefined};
  if(request.route==='/song_info') return {status:200,message:'match found',match:structuredClone(song),results:[structuredClone(song)],matches:[structuredClone(song)],selection};
  if(mode==='failed') return {status:400,outcome:'failed',code:'read_failed',message:'Simulated pre-dispatch failure; no write made'};
  if(mode==='uncertain') return {status:400,outcome:'uncertain',code:'completion_unknown',message:'Simulated timeout: completion unknown. No automatic retry.'};
  const q=request.query;
  if(request.route==='/rate') song.rating=Number(q.rating);
  if(request.route==='/loved') song.loved=q.loved==='true';
  if(request.route==='/energy') song.comment=patch(song.comment,['e1','e2','e3','e4','e5','e6'],q.energy==='0'?undefined:`e${q.energy}`);
  if(request.route==='/mood') song.comment=patch(song.comment,['m-','m.','m+'],[undefined,'m-','m.','m+'][Number(q.mood)]);
  if(request.route==='/tag') song.comment=patch(song.comment,q.type==='remove'?[q.tag]:[],q.type==='add'?q.tag:undefined);
  song.interpreted={tags:song.comment.split(/\s+/u).filter(Boolean)};
  return {status:200,outcome:'verified',message:'Sample readback verified',match:structuredClone(song),field:request.route.slice(1),target:{name:song.name,artist:song.artist,album:song.album},selection};
 };
}
