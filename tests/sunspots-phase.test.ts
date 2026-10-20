import {describe,it,expect} from 'vitest';
import {sunspotGroups,SOLAR_ROTATION_DAYS} from '../src/sunspots';
import {diagramPixel} from '../src/phase-diagram';
import {defaults,nextPhase} from '../src/model';
describe('Sunspot illustration and independent phase schematic',()=>{
 it('uses finite unit surface directions, bounded life cycles and deterministic time',()=>{for(const t of [-200000,0,4,9788,50000]){const a=sunspotGroups(t);expect(a).toHaveLength(6);expect(a).toEqual(sunspotGroups(t));for(const s of a){expect(Math.hypot(...s.direction)).toBeCloseTo(1,12);expect(s.strength).toBeGreaterThanOrEqual(0);expect(s.strength).toBeLessThanOrEqual(1);expect(s.radius).toBeGreaterThan(0);}}});
 it('rotates every 25 simulated days while growth follows a distinct smooth cycle',()=>{const a=sunspotGroups(4),b=sunspotGroups(4+SOLAR_ROTATION_DAYS);a.forEach((s,j)=>s.direction.forEach((x,k)=>expect(x).toBeCloseTo(b[j].direction[k],10)));expect(a[0].strength).not.toBeCloseTo(b[0].strength);const c=sunspotGroups(60-1e-6),d=sunspotGroups(60+1e-6);expect(Math.abs(c[0].strength-d[0].strength)).toBeLessThan(1e-8);});
 it('schematic stays transparent outside disc and needs no texture data',()=>{expect(diagramPixel(1,1,defaults)).toBeNull();expect(diagramPixel(0,0,defaults)!.every(Number.isFinite)).toBe(true);});
 it('upper and lower quarter illuminate opposite projected sides',()=>{let p={...defaults,i:0,t:0};p.t=nextPhase(p);const a=diagramPixel(.6,0,p)![0]-diagramPixel(-.6,0,p)![0];p.t=nextPhase({...p,t:nextPhase(p)});const b=diagramPixel(.6,0,p)![0]-diagramPixel(-.6,0,p)![0];expect(a*b).toBeLessThan(0);});
});
