import {chromium} from '@playwright/test';import fs from 'node:fs';
const browser=await chromium.launch();const p=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});const errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto('http://127.0.0.1:5173');const syn=1/(1/27.3217-1/365.256),checks=[];let currentTask=0;
const diag=()=>p.evaluate(()=>window.labDiagnostics());
async function lab(){await p.click('nav button[data-mode="phase"]');}
async function pane(name){const w=await p.evaluate(()=>innerWidth);if(w<=760)await p.click(`#mobilePanels [data-pane="${name}"]`);else if(name!=='scene')await p.click(`.aside-tabs [data-pane="${name}"]`);}
async function group(side,n){await pane(side);await p.click(`[data-side="${side}"] [data-group="${n}"]`);}
async function task(i){currentTask=i;await p.click('nav button[data-mode="inquiry"]');await p.click(`[data-task="${i}"]`);await p.fill('#prediction','我預測相對位置會影響觀察結果。');}
async function step(n){await p.click('nav button[data-mode="inquiry"]');await p.click(`[data-step="${n}"]`);}
async function preset(kind){await lab();await group('settings',1);await p.selectOption('#preset',kind);}
async function record(){await step(1);await p.click('[data-evidence="0"]');await p.click('#record');}
async function setTime(t){await lab();let min=Number(await p.locator('#time').getAttribute('min'));while(t<min){await p.click('#prevWindow');min-=35;}while(t>min+35){await p.click('#nextWindow');min+=35;}await p.locator('#time').evaluate((el,t)=>{el.value=String(t);el.dispatchEvent(new Event('input',{bubbles:true}));},t);}
async function check(i,choice){await step(2);await p.selectOption('#choice',String(choice));await p.fill('#explanation','主張與證據相符，原因是照明與相對位置。');await step(3);await p.click('[data-review="0"]');for(const el of await p.locator('[data-rubric]').all())await el.check();await p.click('#submit');const feedback=(await diag()).answers[i].feedback;checks.push({name:`任務${i+1}`,pass:feedback.includes('客觀與操作檢核完成')});}
await task(0);await preset('lunar');await setTime(syn/4);await record();await setTime(syn*3/4);await record();await check(0,0);
await task(1);for(const t of [0,syn/4,syn/2]){await setTime(t);await record();}await check(1,1);
await task(2);for(const inc of [0,5.145]){if(inc===0)await preset('lunar');else{await lab();await group('settings',0);await p.click('#inclinationReset');}for(const t of [0,syn,syn*2]){await setTime(t);await record();}}await check(2,1);
await task(3);await preset('lunar');await record();await check(3,2);
await task(4);await preset('total');await record();await lab();await group('location',0);await p.fill('#lon','180');await record();await check(4,1);
await task(5);await step(1);await p.click('[data-evidence="0"]');await p.click('#compareYear');await p.waitForFunction(()=>window.labDiagnostics().answers[5].comparison);await check(5,0);
await task(6);await lab();await p.selectOption('#speed','0.1');await record();await lab();await p.selectOption('#speed','10');await record();await check(6,2);
await task(7);await preset('total');await record();await preset('annular');await record();await check(7,0);
// Segmented input preserves all text, including editing previous pages.
await task(0);await p.fill('#prediction','第一段保留內容');await p.locator('[data-stage="0"] .editor-pager button').last().click();await p.fill('#prediction','第二段內容');const text=(await diag()).answers[0].prediction;await p.reload();await p.click('nav button[data-mode="inquiry"]');checks.push({name:'分段文字與重新載入保存',pass:(await diag()).answers[0].prediction===text&&text.includes('第二段內容')});
for(const format of ['json','csv']){const event=p.waitForEvent('download');await p.click('#'+format);const file=await event;await file.saveAs(`docs/no-scroll-export.${format}`);checks.push({name:`${format}匯出`,pass:fs.statSync(`docs/no-scroll-export.${format}`).size>100});}
await p.click('#clear');await p.click('#cancelClear');checks.push({name:'取消清除保留紀錄',pass:(await diag()).answers[0].prediction===text});
await p.click('#help');checks.push({name:'說明可翻頁',pass:await p.locator('#helpContent .pager button').last().isEnabled()});await p.locator('#helpContent .pager button').last().click();await p.click('#closeHelp');
await p.setViewportSize({width:390,height:844});await p.click('nav button[data-mode="phase"]');for(const name of ['observe','settings','location','scene'])await pane(name);checks.push({name:'手機四個分區可切換',pass:(await diag()).ui.pane==='scene'});
await p.click('nav button[data-mode="inquiry"]');await p.selectOption('#taskPicker','3');await p.click('[data-step="3"]');await p.click('[data-review="2"]');await p.click('#teacherReference');checks.push({name:'手機教師解釋可讀',pass:await p.locator('#messageDialog').isVisible()});await p.click('#closeMessage');
// Rejection of storage must not block the interface.
const blocked=await browser.newContext();await blocked.addInitScript(()=>{Object.defineProperty(Storage.prototype,'setItem',{value(){throw new DOMException('Blocked','SecurityError');}});});const bp=await blocked.newPage();await bp.goto('http://127.0.0.1:5173');await bp.click('nav button[data-mode="inquiry"]');await bp.fill('#prediction','測試儲存拒絕');checks.push({name:'儲存拒絕可作答',pass:(await bp.textContent('#status')).includes('無法保存')});await blocked.close();
// WebGL fallback remains usable.
const fallback=await browser.newContext();await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(String(type).startsWith('webgl'))return null;return original.call(this,type,...args);};});const fp=await fallback.newPage();await fp.goto('http://127.0.0.1:5173');checks.push({name:'無WebGL替代',pass:(await fp.textContent('#space')).includes('無法使用')});await fallback.close();
const report={date:'2026-10-20',checks,errors};fs.writeFileSync('docs/no-scroll-flow.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();if(checks.some(x=>!x.pass)||errors.length)process.exitCode=1;
