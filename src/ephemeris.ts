import * as A from 'astronomy-engine';
import type {V,Params} from './model';
export const DAY_MS=86400000,J2000_MS=Date.parse('2000-01-01T12:00:00Z'),AU_KM=149597870.7;
export const dateFromDays=(t:number)=>new Date(Math.round(J2000_MS+t*DAY_MS));
export const daysFromMs=(ms:number)=>(ms-J2000_MS)/DAY_MS;
const rot=A.Rotation_EQJ_ECL(),radians=Math.PI/180;
const v=(q:{x:number;y:number;z:number}):V=>[q.x,q.y,q.z];
const scale=(q:V,k:number):V=>q.map(x=>x*k) as V;
const plus=(a:V,b:V):V=>a.map((x,j)=>x+b[j]) as V;
const minus=(a:V,b:V):V=>a.map((x,j)=>x-b[j]) as V;
const length=(q:V)=>Math.hypot(...q);
const unit=(q:V):V=>scale(q,1/(length(q)||1));
const cross=(a:V,b:V):V=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const ecl=(q:A.Vector)=>v(A.RotateVector(rot,q));
let cachedT=NaN;
let cached:ReturnType<typeof calculate>|undefined;
function calculate(t:number){
 const date=dateFromDays(t),earth=scale(ecl(A.HelioVector(A.Body.Earth,date)),AU_KM),state=A.RotateState(rot,A.GeoMoonState(date));
 const relative=scale(v(state),AU_KM),velocity=scale([state.vx,state.vy,state.vz],AU_KM),normal=unit(cross(relative,velocity));
 const inclination=Math.acos(Math.max(-1,Math.min(1,normal[2])))/radians,node=(Math.atan2(normal[0],-normal[1])/radians+360)%360;
 return {sun:[0,0,0] as V,earth,relative,moon:plus(earth,relative),normal,inclination,node,distance:length(relative)};
}
export function realPositions(t:number){if(t!==cachedT||!cached){cached=calculate(t);cachedT=t;}return cached;}
export function realObserver(p:Params){
 const date=dateFromDays(p.t),o=new A.Observer(p.lat,p.lon,0),base=scale(ecl(A.ObserverVector(date,o,false)),AU_KM),high=scale(ecl(A.ObserverVector(date,new A.Observer(p.lat,p.lon,1000),false)),AU_KM);
 const up=unit(minus(high,base)),east=unit(ecl(A.ObserverVector(date,new A.Observer(0,p.lon+90,0),false))),north=unit(cross(up,east));
 return {point:plus(realPositions(p.t).earth,base),up,east,north};
}
export function realRotation(body:'Earth'|'Moon',t:number){
 const date=dateFromDays(t);
 if(body==='Earth'){
  const x=unit(ecl(A.ObserverVector(date,new A.Observer(0,0,0),false))),y=unit(ecl(A.ObserverVector(date,new A.Observer(0,90,0),false)));
  return {x,y,axis:unit(cross(x,y)),spin:A.SiderealTime(date)*15*radians};
 }
 const a=A.RotationAxis(A.Body.Moon,date),axis=unit(ecl(a.north)),refEQ=unit(cross([0,0,1],v(a.north))),ref=ecl(new A.Vector(...refEQ,A.MakeTime(date))),quadrature=cross(axis,ref),spin=a.spin*radians;
 const x=plus(scale(ref,Math.cos(spin)),scale(quadrature,Math.sin(spin))),y=cross(axis,x);
 return {axis,x,y,spin};
}
export function realNextPhase(t:number){return daysFromMs(A.SearchMoonQuarter(new Date(dateFromDays(t).getTime()+1000)).time.date.getTime());}
export function realNextEvent(t:number,limit=400){
 const date=dateFromDays(t+.01),a=A.SearchGlobalSolarEclipse(date).peak,b=A.SearchLunarEclipse(date).peak,next=Math.min(daysFromMs(a.date.getTime()),daysFromMs(b.date.getTime()));
 return next<=t+limit?next:null;
}
const paths=new Map<number,{points:V[];apsides:V[];times:number[]}>();
export function realOrbitPath(t:number){
 const year=dateFromDays(t).getUTCFullYear();let result=paths.get(year);if(result)return result;
 const start=new Date(Date.UTC(year,0,1)),a=A.SearchPlanetApsis(A.Body.Earth,start),b=A.NextPlanetApsis(A.Body.Earth,a),aps=[a,b].sort((x,y)=>x.kind-y.kind);
 result={points:Array.from({length:73},(_,j)=>scale(ecl(A.HelioVector(A.Body.Earth,new Date(Date.UTC(year,0,1)+j/72*(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))))),AU_KM)),apsides:aps.map(x=>scale(ecl(A.HelioVector(A.Body.Earth,x.time)),AU_KM)),times:aps.map(x=>daysFromMs(x.time.date.getTime()))};
 if(paths.size>3)paths.clear();paths.set(year,result);return result;
}
