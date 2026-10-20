import {describe,it,expect} from 'vitest';
import * as A from 'astronomy-engine';
import {defaults,positions,phase,observer,altitude,azimuth,sub,norm,dot,nextPhase,nextEvent,type Params} from '../src/model';
import {realPositions,realRotation,realOrbitPath,daysFromMs,dateFromDays} from '../src/ephemeris';
const params=(iso:string):Params=>({...defaults,model:'ephemeris',t:daysFromMs(Date.parse(iso))});
describe('真實日期星曆共用幾何',()=>{
 it('3D與月相的共用向量符合星曆照明比例',()=>{for(const iso of ['1901-01-01T12:00Z','2024-04-08T18:21Z','2024-09-18T02:34Z','2026-10-20T12:00Z','2100-12-31T12:00Z']){const p=params(iso),v=positions(p),q=realPositions(p.t);expect(v.earth).toEqual(q.earth);expect(norm(sub(v.moon,v.earth))).toBeCloseTo(norm(v.relative),5);expect(phase(p).k).toBeCloseTo(A.Illumination(A.Body.Moon,dateFromDays(p.t)).phase_fraction,3);expect(q.inclination).toBeGreaterThan(4);expect(q.inclination).toBeLessThan(7);}});
 it('已知2024日食新月與九月滿月不是固定十五日造假',()=>{expect(phase(params('2024-04-08T18:21Z')).k).toBeLessThan(.0001);expect(phase(params('2024-09-18T02:34Z')).k).toBeGreaterThan(.999);});
 it('地面高度與獨立Equator/Horizon路徑相符（不折射）',()=>{for(const hour of [0,6,12,18]){const p=params(`2026-10-20T${String(hour).padStart(2,'0')}:00Z`),date=dateFromDays(p.t),eq=A.Equator(A.Body.Moon,date,new A.Observer(p.lat,p.lon,0),true,false),h=A.Horizon(date,new A.Observer(p.lat,p.lon,0),eq.ra,eq.dec);expect(altitude(positions(p).moon,observer(p))).toBeCloseTo(h.altitude,1);expect(azimuth(positions(p).moon,observer(p))).toBeCloseTo(h.azimuth,1);}});
 it('星曆姿態與教學軸分離，下一相位／食象使用實際日期',()=>{const p=params('2024-04-01T12:00Z'),e=realRotation('Earth',p.t),m=realRotation('Moon',p.t);for(const q of [e,m]){expect(norm(q.axis)).toBeCloseTo(1,10);expect(dot(q.x,q.axis)).toBeCloseTo(0,10);}const t=nextPhase(p);expect(t).toBeGreaterThan(p.t);expect(t-p.t).toBeLessThan(10);const ev=nextEvent(p)!;expect(dateFromDays(ev).toISOString().slice(0,10)).toBe('2024-04-08');const path=realOrbitPath(p.t);expect(path.points).toHaveLength(73);expect(norm(path.apsides[0])).toBeLessThan(norm(path.apsides[1]));});
});
