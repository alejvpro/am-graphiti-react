import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
for(const [width,height] of [[402,874],[402,714],[390,844],[430,932],[768,1024],[1440,900]]){
 test(`sample workflow and responsive layout ${width}x${height}`,async({page})=>{
  await page.setViewportSize({width,height});const external:string[]=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5173'))external.push(r.url());});
  await page.goto('./');await expect(page.getByRole('radiogroup',{name:'Rating'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const budget=await page.evaluate(()=>{
   const blocks=Array.from(document.querySelectorAll('main>.lab,main>.identity,main>.summaries,main>.album-preview,.main-controls>:scope,main>.secondary'));
   const controls=Array.from(document.querySelector('.main-controls')!.children);
   const ordered=[...Array.from(document.querySelector('main')!.children).filter(e=>e.matches('.lab,.identity,.summaries,.album-preview')),...controls,document.querySelector('.secondary')!];
   const names=['global','identity','metadata','album','rating','energy','mood','Appeal','People','Language / content review','Severity','Specific words','Themes','Musical details','To do','navigation'];
   const regions=Object.fromEntries(ordered.map((e,i)=>[names[i],Math.round(((ordered[i+1]?.getBoundingClientRect().top??e.getBoundingClientRect().bottom)-e.getBoundingClientRect().top)*100)/100]));
   return {width:innerWidth,viewport:innerHeight,visualViewport:visualViewport?.height,content:Math.round(document.querySelector('main')!.getBoundingClientRect().height*100)/100,document:document.documentElement.scrollHeight,overflow:Math.max(0,document.documentElement.scrollHeight-innerHeight),regions,mainControls:document.querySelectorAll('main .main-controls input,main .main-controls button').length};
  });writeFileSync(`test-results/budget-${width}x${height}.json`,JSON.stringify(budget,null,2));console.log(budget);
  const targets=await page.locator('.rating-positions button,.rating-line>.heart').evaluateAll(els=>els.map(e=>({label:e.textContent,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,top:e.getBoundingClientRect().top})));
  writeFileSync(`test-results/rating-targets-${width}x${height}.json`,JSON.stringify(targets,null,2));expect(targets.map(t=>t.label)).toEqual(['0','½','1','1½','2','2½','3','3½','4','4½','5','♥']);for(const target of targets){expect(target.width).toBeGreaterThanOrEqual(44);expect(target.height).toBeGreaterThanOrEqual(44);}
  expect(budget.overflow).toBe(width===402&&height===714?32:0);
  for(const control of await page.locator('main .main-controls input,main .main-controls button,main .secondary button').all()){if(budget.overflow)await control.scrollIntoViewIfNeeded();await expect(control).toBeInViewport();}
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:`test-results/main-${width}x${height}.png`,fullPage:true});
  const previousScroll=await page.evaluate(()=>scrollY);
  await page.getByRole('button',{name:'More song tags'}).click();await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('checkbox',{name:'Acoustic',exact:true}).check();await expect(page.getByRole('dialog').getByRole('status')).toHaveText(/Sample save verified/);
  await page.screenshot({path:`test-results/more-${width}x${height}.png`,fullPage:false});
  await page.getByRole('button',{name:'Close editor'}).click();const restored=await page.evaluate(()=>scrollY);expect(restored).toBe(previousScroll);
  await page.getByRole('button',{name:/RAMONA PARK/}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.screenshot({path:`test-results/album-${width}x${height}.png`,fullPage:false});
  await page.locator('.sheet-content').evaluate(e=>{e.scrollTop=e.scrollHeight;});await expect(page.getByText('Cassette',{exact:true})).toBeVisible();
  expect(await page.getByRole('dialog').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  await page.screenshot({path:`test-results/album-bottom-${width}x${height}.png`,fullPage:false});await page.keyboard.press('Escape');
  expect(external).toEqual([]);
 });
}
test('save truthfulness, target isolation, preview drafts and keyboard modal behavior',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('./');await expect(page.getByRole('radiogroup',{name:'Rating'})).toBeVisible();
 await page.getByText('SAMPLE · Scenarios').click();
 await page.getByLabel('Next sample saves').selectOption('failed');
 await page.getByRole('checkbox',{name:'Suzible',exact:true}).check();await expect(page.getByRole('status')).toHaveText(/Save failed/);await expect(page.getByRole('checkbox',{name:'Suzible',exact:true})).not.toBeChecked();
 await page.getByLabel('Next sample saves').selectOption('uncertain');await page.getByRole('button',{name:'Favorite'}).click();await expect(page.getByRole('status')).toHaveText(/Outcome uncertain/);await expect(page.getByRole('button',{name:'Favorite'})).toBeDisabled();
 await page.getByRole('button',{name:'Inspect target again (sample read)'}).click();await expect(page.getByRole('button',{name:'Favorite'})).toBeEnabled();
 await page.getByLabel('Next sample saves').selectOption('delayed');await page.getByRole('radio',{name:'1 stars',exact:true}).click();await page.getByRole('button',{name:'Refresh sample playback'}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('SUNROOM');await page.waitForTimeout(1800);await expect(page.getByRole('heading',{level:1})).toHaveText('SUNROOM');await expect(page.getByText('0 / 5',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:/Alternative · Soul/}).click();await page.getByRole('combobox',{name:'Genre slot 1'}).fill('Local draft');await expect(page.getByRole('button',{name:/Set genres/})).toBeDisabled();
 await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog'))).toBe(true);
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();await page.getByRole('button',{name:/Alternative · Soul/}).click();await expect(page.getByRole('combobox',{name:'Genre slot 1'})).toHaveValue('Alternative');
});
test('secondary metadata previews and unavailable album states are distinct',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('./');await expect(page.getByRole('radiogroup',{name:'Rating'})).toBeVisible();
 for(const [label,filename] of [['Metadata','metadata'],['Hip-Hop/Rap · R&B/Soul','genres'],['First heard · Apr 8, 2022','date'],['Playlists','playlists']]){
  await page.getByRole('button',{name:label,exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.getByRole('dialog').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  await page.screenshot({path:`test-results/secondary-${filename}-390.png`});await page.keyboard.press('Escape');
 }
 await page.getByText('SAMPLE · Scenarios').click();
 for(const [scenario,text] of [['No album tags','No album tags · Preview available'],['Album unavailable','Album information unavailable'],['Album lookup failed','Album lookup failed']]){
  await page.getByLabel('Scenario',{exact:true}).selectOption(scenario);await expect(page.getByRole('button',{name:/RAMONA PARK/})).toContainText(text);
 }
});
test('discrete ratings accept pointer, touch and keyboard without moving controls',async({browser})=>{
 const context=await browser.newContext({viewport:{width:402,height:714},hasTouch:true,isMobile:true,deviceScaleFactor:3});const page=await context.newPage();
 await page.goto('./');await page.getByRole('radiogroup',{name:'Rating'}).waitFor();for(let i=0;i<=10;i++){const choice=page.getByRole('radio',{name:i===0?'0 stars · Unset':`${i/2} stars`,exact:true});await choice.tap();await expect(choice).toHaveAttribute('aria-checked','true');await expect(page.getByText(`${i/2} / 5`,{exact:true})).toBeVisible();}await expect(page.getByRole('button',{name:'Clear rating'})).toHaveCount(0);const half=page.getByRole('radio',{name:'2.5 stars',exact:true});await half.waitFor();
 await half.tap();await page.locator('.rating-positions').screenshot({path:'test-results/half-stars-touch.png'});await expect(half).toHaveAttribute('aria-checked','true');await expect(page.getByText('2.5 / 5',{exact:true})).toBeVisible();
 await half.focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('radio',{name:'3 stars',exact:true})).toBeFocused();await expect(page.getByText('3 / 5',{exact:true})).toBeVisible();
 await page.keyboard.press('Home');await expect(page.getByText('0 / 5',{exact:true})).toBeVisible();await page.keyboard.press('End');await expect(page.getByText('5 / 5',{exact:true})).toBeVisible();
 const checkbox=page.getByRole('checkbox',{name:'Suzible',exact:true});const before=await checkbox.locator('..').boundingBox();await checkbox.check();const after=await checkbox.locator('..').boundingBox();expect(after).toEqual(before);
 const people=await page.locator('[data-group=People] .check').evaluateAll(els=>els.map(e=>e.getBoundingClientRect().top));expect(new Set(people).size).toBe(1);
 await page.getByRole('radio',{name:'0 stars · Unset',exact:true}).tap();await expect(page.getByText('0 / 5',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Favorite'})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('slider')).toHaveCount(0);await context.close();
});
test('standalone safe-area allowance and scroll restoration when diagnostics expand',async({page})=>{
 await page.setViewportSize({width:402,height:874});await page.goto('./');await page.getByRole('radiogroup',{name:'Rating'}).waitFor();
 // Explicit conservative simulation: Chrome does not emulate iOS safe-area environment values.
 await page.addStyleTag({content:'main{padding-top:62px;padding-bottom:34px}'});
 const safe=await page.evaluate(()=>({width:innerWidth,viewport:innerHeight,content:document.querySelector('main')!.getBoundingClientRect().height,document:document.documentElement.scrollHeight,overflow:Math.max(0,document.documentElement.scrollHeight-innerHeight),safeTop:62,safeBottom:34}));
 writeFileSync('test-results/budget-safe-area.json',JSON.stringify(safe,null,2));expect(safe.overflow).toBe(43);await page.screenshot({path:'test-results/main-402x874-safe-area.png',fullPage:true});
 await page.getByText('SAMPLE · Scenarios').click();await page.getByRole('button',{name:'More song tags'}).scrollIntoViewIfNeeded();const y=await page.evaluate(()=>scrollY);expect(y).toBeGreaterThan(0);await page.getByRole('button',{name:'More song tags'}).click();await page.keyboard.press('Escape');expect(await page.evaluate(()=>scrollY)).toBe(y);
});
test('reduced browser height also reserves a home-indicator safe area',async({page})=>{
 await page.setViewportSize({width:402,height:714});await page.goto('./');await page.getByRole('radiogroup',{name:'Rating'}).waitFor();
 await page.addStyleTag({content:'main{padding-bottom:34px}'});
 const budget=await page.evaluate(()=>({width:innerWidth,viewport:innerHeight,content:document.querySelector('main')!.getBoundingClientRect().height,document:document.documentElement.scrollHeight,overflow:Math.max(0,document.documentElement.scrollHeight-innerHeight),safeBottom:34}));
 writeFileSync('test-results/budget-reduced-safe-area.json',JSON.stringify(budget,null,2));expect(budget.overflow).toBe(63);await page.screenshot({path:'test-results/main-402x714-safe-area.png',fullPage:true});
 for(const control of await page.locator('main .main-controls input,main .main-controls button,main .secondary button').all()){await control.scrollIntoViewIfNeeded();await expect(control).toBeInViewport();}
});
test('Album info order, fixed modal target, no writes, and Metadata simplification',async({page})=>{
 await page.setViewportSize({width:402,height:874});const external:string[]=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5173'))external.push(r.url());});
 await page.goto('./');await page.getByRole('radiogroup',{name:'Rating'}).waitFor();
 await expect(page.getByRole('navigation').getByRole('button')).toHaveText(['More song tags ›','Metadata ›','Playlists ›']);
 const preview=page.getByRole('button',{name:/Open Album info/});await preview.click();const sheet=page.getByRole('dialog',{name:'Album info'});
 expect(await sheet.locator('h3,legend').allTextContents()).toEqual(['Album status','Collections · Read only','Album objects','Art & wallpaper','Music formats']);
 await expect(sheet.getByRole('radio',{name:/^Full/})).not.toBeChecked();await expect(sheet.getByRole('button',{name:/Set album status/})).toBeDisabled();
 await expect(sheet.getByRole('checkbox',{name:'Suzy'})).toBeDisabled();
 const choices=sheet.locator('.album-status-segments label');await expect(choices).toHaveText(['Full','Incomplete','Trimmed']);
 expect(new Set(await choices.evaluateAll(els=>els.map(e=>e.getBoundingClientRect().top))).size).toBe(1);
 await expect(sheet.getByText('Applies to all matching album tracks. Full affects smart-playlist eligibility.',{exact:true})).toBeVisible();
 await expect(sheet.getByRole('checkbox',{name:'Suzy'})).toBeInViewport();await page.screenshot({path:'test-results/album-info-402x874.png'});
 await page.locator('.sheet-content').evaluate(e=>{e.scrollTop=e.scrollHeight;});await expect(sheet.getByText('Cassette',{exact:true})).toBeInViewport();
 await page.screenshot({path:'test-results/album-info-bottom-402x874.png'});await page.locator('.sheet-content').evaluate(e=>{e.scrollTop=0;});
 await page.setViewportSize({width:390,height:844});expect(new Set(await choices.evaluateAll(els=>els.map(e=>e.getBoundingClientRect().top))).size).toBe(1);await expect(sheet.getByRole('checkbox',{name:'Suzy'})).toBeInViewport();
 await page.screenshot({path:'test-results/album-info-top-390x844.png'});await page.keyboard.press('Escape');await expect(preview).toBeFocused();expect(await page.evaluate(()=>scrollY)).toBe(0);
 await page.setViewportSize({width:1440,height:900});await preview.click();await page.screenshot({path:'test-results/album-info-1440x900.png'});await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Metadata',exact:true}).click();
 await expect(page.getByRole('dialog').locator('.summaries')).toHaveCount(0);await expect(page.getByRole('dialog').getByRole('radio',{name:'Legacy unpro · preserved'})).toBeChecked();
 await page.screenshot({path:'test-results/metadata-r12-390x844.png'});expect(external).toEqual([]);
});
