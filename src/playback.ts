import {type Identity} from './api';
import {LASTFM_READ_TIMEOUT_MS} from './read-policy';
import {fetchJson} from './http';
export type PlaybackResult=
 |{kind:'now-playing';identity:Identity}
 |{kind:'recent';identity:Identity;scrobbledAt?:string}
 |{kind:'none'|'invalid'|'unavailable';message:string};
export type PlaybackSource=()=>Promise<PlaybackResult>;
type Track={name?:unknown;artist?:{'#text'?:unknown};album?:{'#text'?:unknown};'@attr'?:{nowplaying?:unknown};date?:{uts?:unknown}};
export function normalizePlayback(raw:unknown):PlaybackResult{
 if(!raw||typeof raw!=='object')return {kind:'invalid',message:'Invalid Last.fm response'};
 const body=raw as {error?:unknown;recenttracks?:{track?:unknown}};
 if(body.error!==undefined)return {kind:'unavailable',message:'Last.fm reported an error'};
 const tracks=body.recenttracks?.track;
 if(!Array.isArray(tracks)&&(!tracks||typeof tracks!=='object'))return {kind:'invalid',message:'Last.fm track list unavailable'};
 const list=(Array.isArray(tracks)?tracks:[tracks]) as Track[];
 if(!list.length)return {kind:'none',message:'No confirmed current playback'};
 const track=list.find(t=>t&&typeof t==='object'&&t['@attr']?.nowplaying==='true')??list[0];
 if(!track||typeof track!=='object'||typeof track.name!=='string'||!track.name.trim()||typeof track.artist?.['#text']!=='string'||typeof track.album?.['#text']!=='string')return {kind:'invalid',message:'Incomplete Last.fm identity (title, artist or album missing)'};
 const identity={name:track.name,artist:track.artist['#text'],album:track.album['#text']};
 return track['@attr']?.nowplaying==='true'?{kind:'now-playing',identity}:{kind:'recent',identity,scrobbledAt:typeof track.date?.uts==='string'?track.date.uts:undefined};
}
export function createLastFmSource(config:{username:string;apiKey:string},fetcher:typeof fetch=fetch,timeout=LASTFM_READ_TIMEOUT_MS):PlaybackSource{
 return async()=>{
  if(!config.username.trim()||!config.apiKey.trim())return {kind:'invalid',message:'Last.fm username and public API key are required'};
  const url=new URL('https://ws.audioscrobbler.com/2.0/');
  url.search=new URLSearchParams({method:'user.getRecentTracks',user:config.username,api_key:config.apiKey,format:'json',limit:'1'}).toString();
  try{return normalizePlayback(await fetchJson(url,fetcher,'Last.fm',timeout));}catch(e){return {kind:'unavailable',message:e instanceof Error?e.message:'Last.fm unavailable'};}
 };
}
