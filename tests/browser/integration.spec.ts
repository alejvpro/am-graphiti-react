import {test,expect} from '@playwright/test';
import {now,recent,mac,songA,songB} from '../fixtures/integration';
for(const [width,height] of [[402,714],[402,874],[390,844],[1440,900]]){
 test(`configured read-only playback at ${width}x${height}`,async({page})=>{
  await page.setViewportSize({width,height});let playback=songA;let libraryReads=0;let lastFmReads=0;const blocked:string[]=[];const requests:string[]=[];
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.origin==='http://127.0.0.1:5174')return route.continue();
   requests.push(url.pathname);
   if(url.origin==='https://ws.audioscrobbler.com'&&url.pathname==='/2.0/'){lastFmReads++;return route.fulfill({json:now(playback),headers:{'access-control-allow-origin':'*'}});}
   if(['mac-lan.example.invalid','mac-public.example.invalid'].includes(url.hostname)&&url.pathname==='/song_info'){libraryReads++;const song=url.searchParams.get('name')===songA.name?songA:songB;return route.fulfill({json:mac(song),headers:{'access-control-allow-origin':'*'}});}
   blocked.push(url.origin+url.pathname);return route.abort();
  });
  await page.goto('http://127.0.0.1:5174/react-preview/');expect(lastFmReads).toBe(0);expect(libraryReads).toBe(0);
  await expect(page.getByText('READ ONLY · Connection')).toBeVisible();await page.getByRole('button',{name:'Refresh playback and library'}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText(songA.name);await expect(page.getByRole('button',{name:'Favorite'})).toBeDisabled();
  for(const el of await page.locator('main .main-controls input,main .main-controls button').all())await expect(el).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight)).toBe(width===402&&height===714?32:0);
  await page.screenshot({path:`test-results/read-only-${width}x${height}.png`,fullPage:true});
  await page.getByRole('button',{name:'Refresh playback and library'}).click();await expect.poll(()=>libraryReads).toBe(2);await expect(page.locator('.identity [role=status]')).toHaveText('Read only · Library loaded');
  await page.getByRole('button',{name:'Pin editing target'}).click();playback=songB;await page.getByRole('button',{name:'Refresh playback and library'}).click();await expect(page.locator('.identity [role=status]')).toHaveText(/Pinned · Playback updated/);await expect(page.getByRole('heading',{level:1})).toHaveText(songA.name);expect(libraryReads).toBe(2);
  await page.getByRole('button',{name:/Open Album info/}).click();await expect(page.getByRole('dialog')).toContainText(songA.album);await expect(page.getByRole('dialog')).not.toContainText('Reported sample status');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Unpin editing target'}).click();await expect(page.getByRole('heading',{level:1})).toHaveText(songB.name);
  await page.getByText('READ ONLY · Connection').click();await page.getByLabel('Mac API route').selectOption('external');await page.getByRole('button',{name:'Refresh library metadata'}).click();await expect(page.locator('.identity [role=status]')).toHaveText('Read only · Library loaded');expect(lastFmReads).toBe(3);
  await page.getByRole('button',{name:'Playlists',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Playlist membership unavailable');await expect(page.getByRole('dialog')).not.toContainText('Nightly Raps');
  expect(blocked).toEqual([]);expect(requests.every(p=>p==='/song_info'||p==='/2.0/')).toBe(true);
 });
}
test('recent scrobble is not resolved as current playback',async({page})=>{
 let macReads=0;
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:5174')return r.continue();if(u.origin==='https://ws.audioscrobbler.com')return r.fulfill({json:recent,headers:{'access-control-allow-origin':'*'}});macReads++;return r.abort();});
 await page.goto('http://127.0.0.1:5174/react-preview/');await page.getByRole('button',{name:'Refresh playback and library'}).click();await expect(page.getByRole('heading',{level:2})).toHaveText('Recent scrobble · No confirmed current playback');expect(macReads).toBe(0);await expect(page.getByRole('button',{name:'Favorite'})).toHaveCount(0);
});
test('production build serves JS/CSS and reloads at preview subpath in sample mode',async({page})=>{
 const requested:string[]=[];const blocked:string[]=[];
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:4173'){requested.push(u.pathname);return r.continue();}blocked.push(u.origin);return r.abort();});
 await page.goto('http://127.0.0.1:4173/react-preview/');await expect(page.getByRole('radiogroup',{name:'Rating'})).toBeVisible();expect(requested.some(p=>/^\/react-preview\/assets\/.+\.js$/.test(p))).toBe(true);expect(requested.some(p=>/^\/react-preview\/assets\/.+\.css$/.test(p))).toBe(true);
 await page.reload();await page.getByRole('button',{name:'Metadata',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');expect(new URL(page.url()).pathname).toBe('/react-preview/');expect(blocked).toEqual([]);
});
test('slow lookup can be canceled and a late response cannot update the editor',async({page})=>{
 await page.setViewportSize({width:402,height:714});await page.clock.install();let release!:()=>void;const gate=new Promise<void>(r=>release=r);let reads=0;const unexpected:string[]=[];
 await page.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:5174')return r.continue();
  if(u.origin==='https://ws.audioscrobbler.com')return r.fulfill({json:now(),headers:{'access-control-allow-origin':'*'}});
  if(u.hostname==='mac-lan.example.invalid'&&u.pathname==='/song_info'){reads++;await gate;await r.fulfill({json:mac(),headers:{'access-control-allow-origin':'*'}}).catch(()=>{});return;}
  unexpected.push(u.origin+u.pathname);return r.abort();});
 await page.goto('http://127.0.0.1:5174/react-preview/');await page.getByRole('button',{name:'Refresh playback and library'}).click();await expect(page.getByRole('button',{name:'Cancel lookup'})).toBeVisible();
 await expect(page.getByText('Still looking up this song…',{exact:true})).toHaveCount(0);await page.screenshot({path:'test-results/lookup-loading-402x714.png'});
 await page.clock.fastForward(3100);await expect(page.getByText('Still looking up this song…',{exact:true})).toBeVisible();await page.screenshot({path:'test-results/lookup-slow-402x714.png'});
 await page.getByRole('button',{name:'Cancel lookup'}).click();await expect(page.locator('.identity [role=status]')).toHaveText(/Lookup canceled.*Music.app may still be processing/);await expect(page.getByRole('button',{name:'Cancel lookup'})).toHaveCount(0);
 release();await page.clock.fastForward(70000);await expect(page.getByRole('heading',{level:1})).toHaveText('Song metadata');expect(reads).toBe(1);expect(unexpected).toEqual([]);
});
test('Mac timeout differs from cancel and manual same-song refresh recovers without an automatic retry',async({page})=>{
 await page.setViewportSize({width:402,height:874});await page.clock.install();let release!:()=>void;const gate=new Promise<void>(r=>release=r);let reads=0;let held=true;
 await page.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:5174')return r.continue();if(u.origin==='https://ws.audioscrobbler.com')return r.fulfill({json:now(),headers:{'access-control-allow-origin':'*'}});
  if(u.hostname==='mac-lan.example.invalid'&&u.pathname==='/song_info'){reads++;if(held)await gate;await r.fulfill({json:mac(),headers:{'access-control-allow-origin':'*'}}).catch(()=>{});return;}return r.abort();});
 await page.goto('http://127.0.0.1:5174/react-preview/');await page.getByRole('button',{name:'Refresh playback and library'}).click();await expect(page.getByRole('button',{name:'Cancel lookup'})).toBeVisible();await page.clock.fastForward(61000);
 await expect(page.locator('.identity [role=status]')).toHaveText('Mac request timed out · Refresh to try again');await expect(page.getByText('Still looking up this song…',{exact:true})).toHaveCount(0);expect(reads).toBe(1);
 held=false;release();await page.getByRole('button',{name:'Refresh playback and library'}).click();await expect(page.getByRole('heading',{level:1})).toHaveText(songA.name);expect(reads).toBe(2);
});
test('canceling pinned metadata refresh keeps A while playback is B and late A cannot replace resumed B',async({page})=>{
 await page.setViewportSize({width:402,height:874});await page.clock.install();let detected=songA;let held=false;let release!:()=>void;const gate=new Promise<void>(r=>release=r);const names:string[]=[];
 await page.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:5174')return r.continue();if(u.origin==='https://ws.audioscrobbler.com')return r.fulfill({json:now(detected),headers:{'access-control-allow-origin':'*'}});
  if(u.hostname==='mac-lan.example.invalid'&&u.pathname==='/song_info'){const name=u.searchParams.get('name')!;names.push(name);if(held)await gate;await r.fulfill({json:mac(name===songA.name?songA:songB),headers:{'access-control-allow-origin':'*'}}).catch(()=>{});return;}return r.abort();});
 await page.goto('http://127.0.0.1:5174/react-preview/');await page.getByRole('button',{name:'Refresh playback and library'}).click();await expect(page.getByRole('heading',{level:1})).toHaveText(songA.name);await page.getByRole('button',{name:'Pin editing target'}).click();
 detected=songB;await page.getByRole('button',{name:'Refresh playback and library'}).click();await expect(page.locator('.identity [role=status]')).toHaveText(/Pinned · Playback updated/);expect(names).toEqual([songA.name]);
 held=true;await page.getByText('READ ONLY · Connection').click();await page.getByRole('button',{name:'Refresh library metadata'}).click();await expect(page.getByRole('button',{name:'Cancel lookup'})).toBeVisible();await page.getByText('READ ONLY · Connection').click();await page.clock.fastForward(3100);
 await expect(page.getByText('Still looking up this song…',{exact:true})).toBeVisible();await page.screenshot({path:'test-results/lookup-slow-pinned-402x874.png'});await page.getByRole('button',{name:'Cancel lookup'}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText(songA.name);await expect(page.getByText('4.5 / 5',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Unpin editing target'})).toHaveAttribute('aria-pressed','true');
 held=false;await page.getByRole('button',{name:'Unpin editing target'}).click();await expect(page.getByRole('heading',{level:1})).toHaveText(songB.name);release();await page.clock.fastForward(70000);await expect(page.getByRole('heading',{level:1})).toHaveText(songB.name);
});
test('selected identity change warns without replacing pinned metadata',async({page})=>{
 await page.setViewportSize({width:402,height:714});let reads=0;const unexpected:string[]=[];
 await page.route('**/*',r=>{
  const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:5174')return r.continue();
  if(u.origin==='https://ws.audioscrobbler.com')return r.fulfill({json:now(),headers:{'access-control-allow-origin':'*'}});
  if(u.hostname==='mac-lan.example.invalid'&&u.pathname==='/song_info'){
   expect(u.searchParams.has('refresh')).toBe(false);const body=mac({...songA,rating:++reads===1?90:10},true);if(reads>1)body.selection.selectedIdentity.persistentID='009Z';
   return r.fulfill({json:body,headers:{'access-control-allow-origin':'*'}});
  }
  unexpected.push(u.origin+u.pathname);return r.abort();
 });
 await page.goto('http://127.0.0.1:5174/react-preview/');await page.getByRole('button',{name:'Refresh playback and library'}).click();await expect(page.getByRole('heading',{level:1})).toHaveText(songA.name);
 await page.getByRole('button',{name:'Pin editing target'}).click();await page.getByText('READ ONLY · Connection').click();await page.getByRole('button',{name:'Refresh library metadata'}).click();
 await expect(page.getByText(/Backend selected identity changed/)).toBeVisible();await expect(page.getByRole('button',{name:'Unpin editing target'})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('radio',{name:'4.5 stars',exact:true})).toBeChecked();await page.getByText('READ ONLY · Connection').click();
 await page.screenshot({path:'test-results/selected-identity-change-402x714.png',fullPage:true});expect(unexpected).toEqual([]);
});
