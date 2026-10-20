import {chromium} from '@playwright/test';
const b=await chromium.launch();const p=await b.newPage();await p.goto('http://127.0.0.1:5173');for(const [w,h] of [[1440,900],[1024,768],[390,844]]){await p.setViewportSize({width:w,height:h});await p.waitForTimeout(250);await p.screenshot({path:`docs/no-scroll-lab-${w}.png`,fullPage:true});}await b.close();
