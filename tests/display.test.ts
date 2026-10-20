import {describe,it,expect} from 'vitest';
import {displayLayout} from '../src/display-layout';
import {defaults,C,dot,norm,rad,phase} from '../src/model';
describe('公轉視角及地球自轉軸',()=>{
 it('太陽固定在原點，地球四分之一年移動90度',()=>{
  const a=displayLayout({...defaults,t:0},'sun'),b=displayLayout({...defaults,t:C.year/4},'sun');
  expect(a.sun).toEqual([0,0,0]);expect(b.sun).toEqual([0,0,0]);expect(norm(a.earth)).toBeCloseTo(105,10);expect(norm(b.earth)).toBeCloseTo(105,10);expect(dot(a.earth,b.earth)).toBeCloseTo(0,8);
 });
 it('地球一年後回到相同公轉位置',()=>{const a=displayLayout({...defaults,t:0},'sun'),b=displayLayout({...defaults,t:C.year},'sun');a.earth.forEach((x,i)=>expect(b.earth[i]).toBeCloseTo(x,8));});
 it('軸與黃道面法線夾角23.44度，一年內方向平行',()=>{const a=displayLayout(defaults,'sun'),b=displayLayout({...defaults,t:200},'sun');expect(Math.acos(dot(a.axis,[0,0,1]))/rad).toBeCloseTo(23.44,8);expect(a.axis).toEqual(b.axis);});
 it('近看模式維持地球置中，切換不改變月相',()=>{const p={...defaults,t:7},before=phase(p);expect(displayLayout(p,'earth').earth).toEqual([0,0,0]);displayLayout(p,'sun');expect(phase(p)).toEqual(before);});
});
