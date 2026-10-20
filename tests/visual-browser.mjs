import {chromium} from '@playwright/test';import fs from 'node:fs';
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});await p.goto('http://127.0.0.1:5173');await p.click('.aside-tabs [data-pane="settings"]');await p.click('[data-side="settings"] [data-group="1"]');await p.selectOption('#preset','lunar');
const syn=1/(1/27.3217-1/365.256),checks=[];
const samples=[];
for(const t of [syn/4,syn*3/4]){await p.locator('#time').evaluate((e,t)=>{e.value=t;e.dispatchEvent(new Event('input',{bubbles:true}));},t);samples.push(await p.locator('#observation').evaluate(c=>{const ctx=c.getContext('2d'),w=c.width,h=c.height;return [ctx.getImageData(w/2-30,h*.43,1,1).data[0],ctx.getImageData(w/2+30,h*.43,1,1).data[0]];}));}
checks.push({name:'弦月亮側隨幾何翻轉',samples,pass:samples[0][1]>samples[0][0]&&samples[1][0]>samples[1][1]});
await p.click('.aside-tabs [data-pane="observe"]');await p.check('#sky');checks.push({name:'地球模式切換會暫停',pass:await p.evaluate(()=>!window.labDiagnostics().playing)});
// Exercise real WebGL context loss and restoration.
await p.locator('#space canvas').evaluate(c=>{window.testLoss=c.getContext('webgl2').getExtension('WEBGL_lose_context');window.testLoss.loseContext();});await p.waitForTimeout(250);checks.push({name:'context失效可讀提示',pass:await p.locator('#space').getAttribute('data-error')!==null});await p.evaluate(()=>window.testLoss.restoreContext());await p.waitForTimeout(500);checks.push({name:'context還原',pass:await p.locator('#space').getAttribute('data-error')===null});
const box=await p.locator('#space canvas').boundingBox();const before=await p.screenshot();await p.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await p.mouse.down();await p.mouse.move(box.x+box.width*.7,box.y+box.height*.55,{steps:8});await p.mouse.up();await p.waitForTimeout(100);const after=await p.screenshot();checks.push({name:'拖曳自由旋轉有更新畫面',pass:!before.equals(after)});
fs.writeFileSync('docs/visual-checks.json',JSON.stringify(checks,null,2));console.log(checks);await b.close();
