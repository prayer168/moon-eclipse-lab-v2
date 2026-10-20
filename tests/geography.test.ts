import {describe,it,expect} from 'vitest';
import {geography,geographicNormal,geographicUV} from '../src/geography';
import {observer,defaults,dot,rad} from '../src/model';
import {realRotation} from '../src/ephemeris';
import {Euler,Vector3} from 'three';
describe('Geographic map registration',()=>{
 it('contains seven continents, five oceans and Taiwan',()=>{expect(geography.filter(p=>p.kind==='continent')).toHaveLength(7);expect(geography.filter(p=>p.kind==='ocean')).toHaveLength(5);expect(geography[0].name).toBe('臺灣');});
 it('maps Greenwich/east/north and dateline without mirroring',()=>{expect(geographicNormal(0,0)).toEqual([1,0,0]);expect(geographicNormal(0,90)[1]).toBeCloseTo(1);expect(geographicNormal(90,0)[2]).toBe(1);expect(geographicUV(90,180)).toEqual([1,1]);expect(geographicUV(-90,-180)).toEqual([0,0]);expect(geographicUV(0,0)).toEqual([.5,.5]);});
 it('teaching map coordinates agree with observer after tilt/spin',()=>{for(const t of [0,.3,27.3217,365]){const p={...defaults,t,lat:23.7,lon:121},v=new Vector3(...geographicNormal(p.lat,p.lon));v.applyEuler(new Euler(23.44*rad,0,(t%.9972696)*Math.PI*2/.9972696));expect(dot(v.toArray(),observer(p).up)).toBeGreaterThan(.999999999);}});
 it('real-date body basis agrees with observer at multiple places/times',()=>{for(const t of [0,9000,15000])for(const [lat,lon] of [[0,0],[23.7,121],[-35,-70],[80,20]]){const r=realRotation('Earth',t),v=geographicNormal(lat,lon);const world=r.x.map((_,j)=>r.x[j]*v[0]+r.y[j]*v[1]+r.axis[j]*v[2]);expect(dot(world as [number,number,number],observer({...defaults,model:'ephemeris',t,lat,lon}).up)).toBeGreaterThan(.9999999);}});
});
