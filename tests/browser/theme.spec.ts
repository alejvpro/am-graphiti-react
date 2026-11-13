import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
for(const [width,height,scheme] of [[402,874,'light'],[402,874,'dark'],[402,714,'dark'],[390,844,'dark'],[1440,900,'dark']] as const){
 test(`system theme ${scheme} ${width}x${height}`,async({page})=>{
  const external:string[]=[];await page.route('**/*',r=>{if(new URL(r.request().url()).origin==='http://127.0.0.1:5173')return r.continue();external.push(r.request().url());return r.abort();});
  await page.setViewportSize({width,height});await page.emulateMedia({colorScheme:scheme});await page.goto('./');await expect(page.getByRole('radiogroup',{name:'Rating'})).toBeVisible();
  const metrics=await page.evaluate(()=>({root:getComputedStyle(document.documentElement).backgroundColor,body:getComputedStyle(document.body).backgroundColor,main:getComputedStyle(document.querySelector('main')!).backgroundColor,scheme:getComputedStyle(document.documentElement).colorScheme,overflow:document.documentElement.scrollWidth-innerWidth,height:document.documentElement.scrollHeight-innerHeight,targets:[...document.querySelectorAll('.rating-line button')].map(e=>({top:e.getBoundingClientRect().top,height:e.getBoundingClientRect().height}))}));
  expect(metrics.overflow).toBe(0);expect(metrics.height).toBe(0);expect(new Set(metrics.targets.map(t=>t.top)).size).toBe(1);for(const t of metrics.targets)expect(t.height).toBe(44);
  if(scheme==='dark'){
   expect(metrics).toMatchObject({root:'rgb(0, 0, 0)',body:'rgb(0, 0, 0)',main:'rgb(0, 0, 0)',scheme:'dark'});
   for(const control of await page.locator('.main-controls button,.main-controls .check,.secondary button').all())await expect(control).toHaveCSS('background-color','rgb(0, 0, 0)');
   await expect(page.getByRole('radio',{name:'4.5 stars'})).toHaveAttribute('aria-checked','true');await expect(page.getByRole('radio',{name:'4.5 stars'})).toHaveCSS('box-shadow',/inset/);
   await page.getByRole('radio',{name:'2.5 stars'}).focus();await expect(page.getByRole('radio',{name:'2.5 stars'})).toHaveCSS('outline-style','solid');await page.getByRole('radio',{name:'2.5 stars'}).blur();
  }
  await page.screenshot({path:`test-results/theme-${scheme}-${width}x${height}.png`,fullPage:true});
  if(scheme==='dark'&&width===402&&height===874){
   for(const name of [/Open Album info/,'More song tags','Metadata','Hip-Hop/Rap · R&B/Soul','First heard · Apr 8, 2022','Playlists']){
    await page.getByRole('button',{name,exact:typeof name==='string'}).click();const dialog=page.getByRole('dialog');await expect(dialog).toHaveCSS('background-color','rgb(0, 0, 0)');await expect(dialog.locator('.sheet-content')).toHaveCSS('background-color','rgb(0, 0, 0)');
    if(name instanceof RegExp){await expect(dialog.getByRole('button',{name:'Set album status · Unavailable'})).toBeDisabled();await page.screenshot({path:'test-results/theme-dark-album-info.png',fullPage:true});await dialog.locator('.sheet-content').evaluate(e=>e.scrollTop=e.scrollHeight);await page.screenshot({path:'test-results/theme-dark-album-bottom.png'});}
    await page.keyboard.press('Escape');
   }
   await page.getByText('SAMPLE · Scenarios').click();await expect(page.getByLabel('Scenario',{exact:true})).toHaveCSS('background-color','rgb(0, 0, 0)');await page.getByLabel('Next sample saves').selectOption('uncertain');await page.getByText('SAMPLE · Scenarios').click();await page.getByRole('radio',{name:'1 stars',exact:true}).click();await expect(page.locator('.identity [role=status]')).toHaveText(/Outcome uncertain/);await expect(page.getByRole('button',{name:'Favorite'})).toBeDisabled();await page.screenshot({path:'test-results/theme-dark-uncertain.png',fullPage:true});
  }
  expect(external).toEqual([]);
 });
}
test('appearance changes without reload and initial HTML is dark before app assets load',async({page})=>{
 await page.setViewportSize({width:402,height:874});await page.emulateMedia({colorScheme:'dark'});await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!=='http://127.0.0.1:4173')return r.abort();if(/\.(js|css)$/.test(u.pathname))return r.abort();return r.continue();});
 await page.goto('http://127.0.0.1:4173/react-preview/');await expect(page.locator('html')).toHaveCSS('background-color','rgb(0, 0, 0)');await expect(page.locator('body')).toHaveCSS('background-color','rgb(0, 0, 0)');
 await page.unroute('**/*');await page.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:5173'?r.continue():r.abort());await page.goto('./');await expect(page.getByRole('radiogroup',{name:'Rating'})).toBeVisible();await page.evaluate(()=>{(window as Window&{themeTest?:boolean}).themeTest=true;});
 const darkGeometry=await page.locator('.main-controls button,.main-controls .check').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height};}));
 await page.emulateMedia({colorScheme:'light'});await expect(page.locator('html')).toHaveCSS('background-color','rgb(255, 255, 255)');await expect(page.getByRole('radio',{name:'4.5 stars'})).toHaveCSS('background-color','rgb(8, 118, 255)');
 expect(await page.locator('.main-controls button,.main-controls .check').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height};}))).toEqual(darkGeometry);
 await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('html')).toHaveCSS('background-color','rgb(0, 0, 0)');expect(await page.evaluate(()=>(window as Window&{themeTest?:boolean}).themeTest)).toBe(true);
 await expect(page.locator('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]')).toHaveAttribute('content','#000000');
 const panels=['light','dark'].map(s=>`<section><p>${s}</p><img width="402" height="874" src="data:image/png;base64,${readFileSync(`test-results/theme-${s}-402x874.png`).toString('base64')}"></section>`).join('');
 await page.setViewportSize({width:840,height:920});await page.setContent(`<style>body{margin:0;padding:8px;display:flex;gap:16px;background:#000;color:#c8c8c8;font:14px sans-serif}p{margin:0 0 8px}img{display:block}</style>${panels}`);await page.locator('img').evaluateAll(els=>Promise.all(els.map(e=>(e as HTMLImageElement).decode())));await page.screenshot({path:'test-results/theme-comparison-402x874.png',fullPage:true});
});
