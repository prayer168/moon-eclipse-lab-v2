import {chromium} from '@playwright/test';
const b=await chromium.launch();const page=await b.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto('http://127.0.0.1:5173');
for(const [w,h] of [[1440,900],[1024,768],[390,844]]){await page.setViewportSize({width:w,height:h});await page.waitForTimeout(300);await page.screenshot({path:`docs/preview-${w}.png`,fullPage:true});}
await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(300);await page.screenshot({path:'docs/preview-final.png',fullPage:true});
for(let i=0;i<12;i++)await page.click('#zoomIn');for(const id of ['side','top','cameraReset'])await page.click('#'+id);console.log({finalConsoleErrors:errors});await b.close();
