import {describe,it,expect} from 'vitest';
import {C,rad,defaults,positions,phase,synodic,nextPhase,caseParams,snapshot,solarAt,lunar,altitude,observer,globalSolar,nextEvent,type V} from '../src/model';
describe('相位與軌道',()=>{
 it('共面四大相位亮面符合公式',()=>{[0,.25,.5,.75].forEach((f,i)=>{const s=phase({...defaults,i:0,t:synodic*f});expect(s.k).toBeCloseTo([0,.5,1,.5][i],2);expect(s.name).toBe(['新月','上弦月','滿月','下弦月'][i]);});});
 it('區分恆星月與朔望月',()=>{expect(synodic).toBeCloseTo(29.5306,2);expect(phase({...defaults,i:0,t:C.month}).k).toBeGreaterThan(.04);expect(phase({...defaults,i:0,t:synodic}).k).toBeLessThan(1e-8);});
 it('傾角的法向與地月距離正確',()=>{const p=positions({...defaults,t:C.month/4,i:10,node:0});expect(p.relative[2]/defaults.distance).toBeCloseTo(Math.sin(10*rad),8);expect(Math.hypot(...p.relative)).toBeCloseTo(defaults.distance,6);});
 it('下一相位逐次前進',()=>{let p={...defaults,t:0,i:0};for(const name of ['上弦月','滿月','下弦月','新月','上弦月']){const t=nextPhase(p);expect(t).toBeGreaterThan(p.t);p.t=t;expect(phase(p).name).toBe(name);}});
});
describe('日食分類邊界',()=>{
 it('區分無食偏食全食環食',()=>{const sun:V=[149600000,0,0],o:V=[0,0,0];expect(solarAt(sun,[356500,0,0],o).type).toBe('日全食');expect(solarAt(sun,[405500,0,0],o).type).toBe('日環食');expect(solarAt(sun,[384400,2500,0],o).type).toBe('日偏食');expect(solarAt(sun,[384400,20000,0],o).type).toBe('無日食');expect(solarAt(sun,[-384400,0,0],o).type).toBe('無日食');});
 it('相切邊界有限且不誤判有食',()=>{const D=384400,rs=Math.asin(C.sun/C.au),rm=Math.asin(C.moon/D),d=rs+rm;const s=solarAt([C.au,0,0],[D*Math.cos(d),D*Math.sin(d),0],[0,0,0]);expect(s.contact).toBe(true);expect(s.type).toBe('無日食');expect(Number.isFinite(s.delta)).toBe(true);});
 it('全食環食案例確由模型產生',()=>{expect(snapshot(caseParams('total')).solar.type).toBe('日全食');expect(snapshot(caseParams('annular')).solar.type).toBe('日環食');expect(snapshot(caseParams('partial')).solar.type).toBe('日偏食');});
 it('傾角使新月不一定日食',()=>{expect(globalSolar({...defaults,t:synodic,i:0}).type).not.toBe('無日食');expect(globalSolar(caseParams('none')).type).toBe('無日食');});
});
describe('月食與地平線',()=>{
 it('月食案例分級',()=>{for(const [key,type] of [['lunar','月全食'],['lunarPartial','月偏食'],['penumbral','半影月食'],['none','無月食']])expect(lunar(caseParams(key)).type,key).toBe(type);});
 it('地平線上下與天頂',()=>{const o=observer(defaults);const top=o.point.map((x,i)=>x+o.up[i]*1000) as V;const bottom=o.point.map((x,i)=>x-o.up[i]*1000) as V;expect(altitude(top,o)).toBeCloseTo(90,6);expect(altitude(bottom,o)).toBeCloseTo(-90,6);expect(altitude(o.point.map((x,i)=>x+o.east[i]*1000) as V,o)).toBeCloseTo(0,6);});
 it('食象搜尋不超出400天',()=>{const t=nextEvent({...defaults,t:1});expect(t).not.toBeNull();expect(t!).toBeLessThanOrEqual(401);});
});

describe('模型精度與退化案例',()=>{
 it('保留有限日地距離造成的弦月微差',()=>{const expected=(1+defaults.distance/Math.hypot(C.au,defaults.distance))/2;expect(phase({...defaults,i:0,t:synodic/4}).k).toBeCloseTo(expected,10);});
 it('預設無食案例仍是新月',()=>{const q=caseParams('none');expect(phase(q).name).toBe('新月');expect(globalSolar(q).type).toBe('無日食');});
 it('南北極觀測基底無NaN',()=>{for(const lat of [-90,90]){const o=observer({...defaults,lat});expect([...o.up,...o.north,...o.east].every(Number.isFinite)).toBe(true);}});
 it('400天搜尋能定位有食象狀態並避開目前事件',()=>{for(const i of [0,5.145,10]){const q={...defaults,i,t:1},t=nextEvent(q);expect(t).not.toBeNull();const s=snapshot({...q,t:t!});expect(s.global.type!=='無日食'||s.lunar.type!=='無月食').toBe(true);expect(nextEvent({...q,t:t!})!).toBeGreaterThan(t!+1);}});
});
