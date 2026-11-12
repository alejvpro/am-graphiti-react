import {test,expect} from '@playwright/test';
import {now,mac,noMatch,songA,songB} from '../fixtures/integration';
import {SampleService} from '../../src/sample';
import type {Request} from '../../src/api';
test('write-enabled mobile editor, automatic routing, truthful outcomes and reconciliation',async({page})=>{
 await page.setViewportSize({width:402,height:714});let detected=songA;let readFailure=false;let result:'verified'|'failed'|'uncertain'='verified';let ip='203.0.113.9';let probes=0;const requests:{origin:string;path:string;query:Record<string,string>}[]=[];const unexpected:string[]=[];const sample=new SampleService();
 await page.route('**/*',async r=>{
  const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:5175')return r.continue();
  if(u.hostname==='whosplaying.alejandroveloz.com'){probes++;return r.fulfill({body:ip,headers:{'access-control-allow-origin':'*'}});}
  if(u.hostname==='ws.audioscrobbler.com')return r.fulfill({json:now(detected),headers:{'access-control-allow-origin':'*'}});
  if(['mac-public.example.invalid','mac-lan.example.invalid'].includes(u.hostname)){
   if(u.pathname==='/song_info'&&readFailure)return r.fulfill({json:noMatch,headers:{'access-control-allow-origin':'*'}});
   const query=Object.fromEntries(u.searchParams);requests.push({origin:u.origin,path:u.pathname,query});
   if(!['/song_info','/rate','/loved','/energy','/mood','/tag'].includes(u.pathname)){unexpected.push(u.pathname);return r.abort();}
   if(u.pathname!=='/song_info'&&result!=='verified')return r.fulfill({json:{status:400,outcome:result,message:'Controlled '+result},headers:{'access-control-allow-origin':'*'}});
   const body=await sample.transport({route:u.pathname,query} as Request) as Record<string,unknown>;
   body.selection=mac(query.name===songA.name?songA:songB).selection;
   return r.fulfill({json:body,headers:{'access-control-allow-origin':'*'}});
  }
  unexpected.push(u.origin+u.pathname);return r.abort();
 });
 await page.goto('http://127.0.0.1:5175/react-preview/');expect(requests).toHaveLength(0);await page.getByRole('button',{name:'Refresh playback and library'}).click();await expect(page.getByRole('heading',{level:1})).toHaveText(songA.name);expect(requests[0].origin).toBe('http://mac-public.example.invalid:7305');
 await page.getByRole('radio',{name:'2.5 stars',exact:true}).click();await expect(page.locator('.identity [role=status]')).toHaveText('✓ Save verified');await expect(page.getByText('2.5 / 5',{exact:true})).toBeVisible();
 await page.getByRole('radio',{name:'0 stars · Unset',exact:true}).click();await expect(page.getByText('0 / 5',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Favorite'}).click();await expect(page.getByRole('button',{name:'Favorite'})).toHaveAttribute('aria-pressed','false');
 await page.getByRole('group',{name:'Energy',exact:true}).getByRole('button',{name:'Unset',exact:true}).click();await expect(page.getByRole('group',{name:'Energy',exact:true}).getByRole('button',{name:'Unset',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('group',{name:'Mood',exact:true}).getByRole('button',{name:'Positive',exact:true}).click();await expect(page.getByRole('group',{name:'Mood',exact:true}).getByRole('button',{name:'Positive',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('checkbox',{name:'Suzible',exact:true}).click();await expect(page.getByRole('checkbox',{name:'Suzible',exact:true})).toBeChecked();
 await page.getByRole('button',{name:'More song tags',exact:false}).click();await page.getByRole('checkbox',{name:'Acoustic',exact:true}).click();await expect(page.getByRole('dialog').getByRole('status')).toHaveText('✓ Save verified');await page.keyboard.press('Escape');
 expect(await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight)).toBe(32);await page.screenshot({path:'test-results/write-enabled-402x714.png',fullPage:true});
 result='failed';await page.getByRole('checkbox',{name:'Lari',exact:true}).click();await expect(page.locator('.identity [role=status]')).toHaveText(/Save failed/);await expect(page.getByRole('checkbox',{name:'Lari',exact:true})).not.toBeChecked();
 result='uncertain';await page.getByRole('checkbox',{name:'Lari',exact:true}).click();await expect(page.locator('.identity [role=status]')).toHaveText(/Outcome uncertain/);await expect(page.getByRole('button',{name:'Favorite'})).toBeDisabled();await page.screenshot({path:'test-results/write-uncertain-402x714.png',fullPage:true});
 result='verified';await page.getByRole('button',{name:'Refresh library metadata to reconcile'}).click();await expect(page.getByRole('button',{name:'Favorite'})).toBeEnabled();
 await page.getByRole('button',{name:'Pin editing target'}).click();detected=songB;await page.getByRole('button',{name:'Refresh playback and library'}).click();await expect(page.locator('.identity [role=status]')).toHaveText(/Pinned/);await expect(page.getByRole('heading',{level:1})).toHaveText(songA.name);
 await page.getByText('LIVE EDITING · Connection').click();await expect(page.getByLabel('Mac API route')).toHaveValue('automatic');await expect(page.getByText(/Active route: external/)).toBeVisible();expect(probes).toBe(1);
 await page.getByLabel('Mac API route').selectOption('internal');await page.getByRole('button',{name:'Refresh library metadata',exact:true}).click();await expect(page.locator('.identity [role=status]')).toHaveText(/Pinned metadata loaded/);expect(requests.at(-1)?.origin).toBe('http://mac-lan.example.invalid:7305');
 ip='104.172.227.53';await page.getByLabel('Mac API route').selectOption('automatic');await page.getByRole('button',{name:'Refresh library metadata',exact:true}).click();await expect(page.getByText(/Active route: internal/)).toBeVisible();expect(probes).toBe(2);
 await page.getByText('LIVE EDITING · Connection').click();await page.getByRole('button',{name:/Open Album info/}).click();await expect(page.getByRole('dialog').getByRole('button',{name:/Set album status/})).toBeDisabled();await expect(page.getByRole('dialog')).toContainText('Unavailable');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Favorite'}).click();await expect(page.locator('.identity [role=status]')).toHaveText('✓ Save verified');readFailure=true;await page.getByText('LIVE EDITING · Connection').click();await page.getByRole('button',{name:'Refresh library metadata',exact:true}).click();await expect(page.locator('.identity [role=status]')).toHaveText('No matching library song');await expect(page.getByRole('heading',{level:1})).toHaveText(songA.name);
 expect(unexpected).toEqual([]);expect(requests.filter(r=>r.path==='/tag').every(r=>!['full','processed','cFlight'].includes(r.query.tag))).toBe(true);
});
