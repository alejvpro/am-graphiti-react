import {samples} from '../../src/sample';
// Synthetic records matching legacy Last.fm and committed Mac envelopes, never live captures.
export const songA=structuredClone(samples[0]),songB=structuredClone(samples[1]);
export const now=(song=songA)=>({recenttracks:{track:[{name:song.name,artist:{'#text':song.artist},album:{'#text':song.album},'@attr':{nowplaying:'true'}}]}});
export const recent={recenttracks:{track:[{name:songA.name,artist:{'#text':songA.artist},album:{'#text':songA.album},date:{uts:'1700000000'}}]}};
export const mac=(song=songA,ambiguous=false)=>({status:200,message:'match found',results:[song],matches:[song],match:song,selection:{ambiguous,matchCount:ambiguous?2:1,selectedIdentity:{libraryId:'FIXTURE-LIBRARY',persistentID:song.name===songA.name?'000A':'000B'},fromCache:ambiguous,policy:'persistentID-ascending',warning:ambiguous?'Multiple matching records; deterministic selection is not confirmed as intended.':undefined}});
export const noMatch={status:400,message:'no matches found',match:null,results:[],matches:[]};
export const origins={internal:'http://mac-lan.example.invalid:7305',external:'http://mac-public.example.invalid:7305',local:'http://localhost:7305'};
export const config={username:'fixture-user',apiKey:'fixture-public-key',route:'internal' as const,origins};
