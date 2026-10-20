import {describe,it,expect} from 'vitest';
import {C,defaults,dot,cross,norm,unit,positions,mul,rad,phase,nextPhase} from '../src/model';
import {moonOrientation,moonOrbitNormal,geocentricMoonView} from '../src/orientation';
describe('月球自轉與觀測基準',()=>{
 it('月軸固定傾角1.54度，與軌道傾角分開',()=>{for(const node of [0,42,180,359]){const p={...defaults,node},a=moonOrientation(p),b=moonOrientation({...p,t:300});expect(Math.acos(dot(a.axis,[0,0,1]))/rad).toBeCloseTo(1.54,8);expect(a.axis).toEqual(b.axis);expect(Math.acos(dot(a.axis,moonOrbitNormal(p)))/rad).toBeCloseTo(6.685,8);}});
 it('自轉27.3217天閉合、半月轉向，保持同一側大致朝地',()=>{for(const node of [0,90,240])for(let t=-30;t<400;t+=3.3){const p={...defaults,node,t},a=moonOrientation(p),b=moonOrientation({...p,t:t+C.month}),half=moonOrientation({...p,t:t+C.month/2});a.x.forEach((v,j)=>expect(b.x[j]).toBeCloseTo(v,10));expect(dot(a.x,half.x)).toBeCloseTo(-1,10);expect(dot(a.x,unit(mul(positions(p).relative,-1)))).toBeGreaterThan(Math.cos(6.686*rad));expect(dot(a.axis,a.x)).toBeCloseTo(0,10);expect(dot(cross(a.x,a.y),a.axis)).toBeCloseTo(1,10);}});
 it('傾角0到10度、所有交點的軌道點都在平面內',()=>{for(const i of [0,5.145,10])for(const node of [0,75,300])for(let t=0;t<C.month;t+=1.7){const p={...defaults,i,node,t};expect(dot(unit(positions(p).relative),moonOrbitNormal(p))).toBeCloseTo(0,10);}});
 it('月相HUD採地心投影，正交基底與相位角一致',()=>{for(let t=-100;t<400;t+=2.7){const p={...defaults,t},q=geocentricMoonView(p);expect(norm(q.view)).toBeCloseTo(1,10);expect(dot(q.up,q.view)).toBeCloseTo(0,10);expect(dot(q.right,q.up)).toBeCloseTo(0,10);expect((1+dot(q.light,q.view))/2).toBeCloseTo(phase(p).k,10);expect(dot(q.up,[0,0,1])).toBeGreaterThan(0);}});
 it('上弦亮側朝天空投影太陽、下弦相反',()=>{let p={...defaults,t:0,i:0};p.t=nextPhase(p);const a=geocentricMoonView(p);p.t=nextPhase({...p,t:nextPhase(p)});const b=geocentricMoonView(p);expect(dot(a.light,a.right)*dot(b.light,b.right)).toBeLessThan(0);});
});
