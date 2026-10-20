import {realPositions,realObserver,realNextPhase,realNextEvent} from './ephemeris';
export type V = [number,number,number];
export const C={sun:696000,earth:6371,moon:1737,au:149600000,month:27.3217,year:365.256,eccentricity:0.0167};
export const rad=Math.PI/180, tau=2*Math.PI;
export const add=(a:V,b:V):V=>a.map((x,i)=>x+b[i]) as V;
export const sub=(a:V,b:V):V=>a.map((x,i)=>x-b[i]) as V;
export const mul=(a:V,s:number):V=>a.map(x=>x*s) as V;
export const dot=(a:V,b:V)=>a.reduce((s,x,i)=>s+x*b[i],0);
export const norm=(a:V)=>Math.hypot(...a);
export const unit=(a:V):V=>norm(a)>1e-12?mul(a,1/norm(a)):[1,0,0];
export const cross=(a:V,b:V):V=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const clamp=(x:number)=>Math.max(-1,Math.min(1,x));
export const angle=(a:V,b:V)=>Math.acos(clamp(dot(unit(a),unit(b))));
export const mod=(x:number,n=tau)=>(x%n+n)%n;
export interface Params {model?:'ephemeris';t:number;i:number;node:number;distance:number;lat:number;lon:number;}
export const defaults:Params={t:5,i:5.145,node:0,distance:384400,lat:23.5,lon:121};
// Teaching perihelion epoch; not a calendar date.
export function earthOrbit(t:number){
 const M=mod(tau*t/C.year),e=C.eccentricity;let E=M;
 for(let j=0;j<12;j++){const d=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));E-=d;if(Math.abs(d)<1e-14)break;}
 const b=C.au*Math.sqrt(1-e*e),rate=tau/C.year/(1-e*Math.cos(E));
 const earth:V=[-C.au*(Math.cos(E)-e),-b*Math.sin(E),0];
 const velocity:V=[C.au*Math.sin(E)*rate,-b*Math.cos(E)*rate,0];
 return {earth,velocity,M,E,distance:norm(earth),speed:norm(velocity)/86400,trueAnomaly:mod(Math.atan2(-earth[1],-earth[0]))};
}
export function positions(p:Params){
 if(p.model==='ephemeris')return realPositions(p.t);
 const m=tau*p.t/C.month, n=p.node*rad, i=p.i*rad;
 const {earth}=earthOrbit(p.t);
 const q:V=[p.distance*Math.cos(m),p.distance*Math.sin(m)*Math.cos(i),p.distance*Math.sin(m)*Math.sin(i)];
 const relative:V=[q[0]*Math.cos(n)-q[1]*Math.sin(n),q[0]*Math.sin(n)+q[1]*Math.cos(n),q[2]];
 return {sun:[0,0,0] as V,earth,moon:add(earth,relative),relative};
}
export function observer(p:Params){
 if(p.model==='ephemeris')return realObserver(p);
 const {earth}=positions(p), l=p.lat*rad, h=p.lon*rad+tau*p.t/0.9972696, tilt=23.44*rad;
 const z:V=[Math.cos(l)*Math.cos(h),Math.cos(l)*Math.sin(h),Math.sin(l)];
 const up:V=[z[0],z[1]*Math.cos(tilt)-z[2]*Math.sin(tilt),z[1]*Math.sin(tilt)+z[2]*Math.cos(tilt)];
 const axis:V=[0,-Math.sin(tilt),Math.cos(tilt)];
 const east=unit(cross(axis,up)), north=unit(cross(up,east));
 return {point:add(earth,mul(up,C.earth)),up,east,north};
}
export const altitude=(target:V,o:ReturnType<typeof observer>)=>Math.asin(clamp(dot(unit(sub(target,o.point)),o.up)))/rad;
export function phase(p:Params){
 const {sun,earth,moon,relative}=positions(p);
 const k=(1+clamp(dot(unit(sub(sun,moon)),unit(sub(earth,moon)))))/2;
 const elong=mod(Math.atan2(relative[1],relative[0])-Math.atan2(-earth[1],-earth[0]));
 const degrees=elong/rad,major=['新月','上弦月','滿月','下弦月'];
 const nearest=Math.round(degrees/90),delta=Math.abs(degrees-nearest*90);
 const name=delta<=1?major[nearest%4]:degrees<90?'眉月':degrees<180?'盈凸月':degrees<270?'虧凸月':'殘月';
 return {k,elong,name};
}
export function solarAt(sun:V,moon:V,o:V){
 const a=sub(sun,o),b=sub(moon,o),rs=Math.asin(Math.min(1,C.sun/norm(a))),rm=Math.asin(Math.min(1,C.moon/norm(b))),delta=angle(a,b), eps=1e-10;
 let type='無日食';
 if(norm(b)<norm(a)&&dot(a,b)>0&&delta<rs+rm-eps) type=delta<=Math.abs(rm-rs)+eps?(rm>=rs?'日全食':'日環食'):'日偏食';
 return {type,rs,rm,delta,contact:Math.abs(delta-rs-rm)<eps};
}
export function lunar(p:Params){
 const {sun,earth,moon}=positions(p),axis=unit(sub(earth,sun)),r=sub(moon,earth),x=dot(r,axis),d=norm(sub(r,mul(axis,x))),D=norm(sub(earth,sun));
 const ru=C.earth-x*(C.sun-C.earth)/D,rp=C.earth+x*(C.sun+C.earth)/D;
 let type='無月食';
 if(x>0&&d<rp+C.moon-1e-6) type=d<ru+C.moon-1e-6?(d+C.moon<=ru+1e-6?'月全食':'月偏食'):'半影月食';
 return {type,x,d,ru,rp};
}
export function globalSolar(p:Params){
 const {sun,earth,moon}=positions(p),axis=unit(sub(moon,sun)),r=sub(earth,moon),x=dot(r,axis),perp=sub(r,mul(axis,x)),d=norm(perp),D=norm(sub(moon,sun));
 const ru=C.moon-x*(C.sun-C.moon)/D,rp=C.moon+x*(C.sun+C.moon)/D;
 if(x<=0||d>=rp+C.earth+10)return {type:'無日食',axis,x,d,ru,rp,margin:x<=0?-1:(rp+C.earth-d)/p.distance};
 // Axial symmetry reduces the sunward surface search to one meridian.
 const toward=d>1e-9?mul(perp,-1/d):unit(cross(axis,[0,0,1]));
 const at=(theta:number)=>{
  const point=add(earth,mul(add(mul(axis,-Math.cos(theta)),mul(toward,Math.sin(theta))),C.earth));
  const q=solarAt(sun,moon,point);return {...q,score:q.rs+q.rm-q.delta};
 };
 let lo=0,hi=Math.PI/2;
 for(let k=0;k<32;k++){const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3;if(at(a).score<at(b).score)lo=a;else hi=b;}
 const candidates=[at(0),at(Math.PI/2),at((lo+hi)/2)].sort((a,b)=>b.score-a.score);
 return {type:candidates[0].type,axis,x,d,ru,rp,margin:candidates[0].score-1e-10};
}
export const azimuth=(target:V,o:ReturnType<typeof observer>)=>{const d=unit(sub(target,o.point));return mod(Math.atan2(dot(d,o.east),dot(d,o.north)))/rad;};
export function snapshot(p:Params){
 const pos=positions(p),o=observer(p),s=solarAt(pos.sun,pos.moon,o.point);
 return {phase:phase(p),lunar:lunar(p),global:globalSolar(p),solar:s,sunAlt:altitude(pos.sun,o),moonAlt:altitude(pos.moon,o),moonAz:azimuth(pos.moon,o),sunAz:azimuth(pos.sun,o),localK:(1+clamp(dot(unit(sub(pos.sun,pos.moon)),unit(sub(o.point,pos.moon)))))/2};
}
export const synodic=1/(1/C.month-1/C.year);
export function nextPhase(p:Params){
 if(p.model==='ephemeris')return realNextPhase(p.t);
 const current=phase(p).elong,target=(Math.floor(current/(Math.PI/2)+1e-7)+1)*Math.PI/2;
 let lo=p.t+1e-6,hi=p.t+synodic/3;
 for(let j=0;j<45;j++){const mid=(lo+hi)/2;const advance=mod(phase({...p,t:mid}).elong-current);if(advance<target-current)lo=mid;else hi=mid;}
 return (lo+hi)/2;
}
export function nextEvent(p:Params,limit=400):number|null{
 if(p.model==='ephemeris')return realNextEvent(p.t,limit);
 // Find extrema around each conjunction/opposition, then bisect contact.
 // This catches grazing events that fixed time sampling can step over.
 const omega=tau*(1/C.month-1/C.year),node=p.node*rad;
 const first=Math.floor((omega*p.t+node)/Math.PI)-1;
 for(let k=first;k<first+Math.ceil(limit/synodic*2)+6;k++){
  const center=(k*Math.PI-node)/omega;
  if(center+1<p.t||center-1>p.t+limit)continue;
  const solar=mod(k,2)===0;
  const margin=(t:number)=>{const q={...p,t};if(solar)return globalSolar(q).margin;const l=lunar(q);return l.x>0?l.rp+C.moon-l.d-1e-6:-1e9;};
  let lo=center-1,hi=center+1;
  for(let j=0;j<44;j++){const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3;if(margin(a)<margin(b))lo=a;else hi=b;}
  const peak=(lo+hi)/2;if(margin(peak)<=0)continue;
  lo=center-1;hi=peak;
  for(let j=0;j<44;j++){const mid=(lo+hi)/2;if(margin(mid)>0)hi=mid;else lo=mid;}
  const onset=hi+1e-7;
  if(onset>p.t+1e-6&&onset<=p.t+limit)return onset;
 }
 return null;
}
export function caseParams(kind:string):Params{
 const p={...defaults,t:0,i:0,lat:0,lon:0};
 if(kind==='total')p.distance=356500;
 if(kind==='annular')p.distance=405500;
 if(kind==='partial'){p.distance=356500;p.t=.025;}
 const full=nextPhase({...p,t:nextPhase(p)});
 if(kind==='lunar')p.t=full;
 if(kind==='lunarPartial'){p.t=full+.07;}
 if(kind==='penumbral'){p.t=full+.10;}
 if(kind==='none'){p.i=5.145;p.t=C.month/4;p.node=mod(earthOrbit(p.t).trueAnomaly-Math.PI/2)/rad;}
 // Choose a real surface point on the sunward limb of Earth for solar demonstrations.
 if(['total','annular','partial','lunar','lunarPartial','penumbral'].includes(kind)){
  const pos=positions(p),target=['lunar','lunarPartial','penumbral'].includes(kind)?pos.moon:pos.sun,up=unit(sub(target,pos.earth)),tilt=23.44*rad;
  const y=up[1]*Math.cos(tilt)+up[2]*Math.sin(tilt),z=-up[1]*Math.sin(tilt)+up[2]*Math.cos(tilt);
  p.lat=Math.asin(z)/rad;p.lon=mod(Math.atan2(y,up[0])-tau*p.t/.9972696+Math.PI)/rad-180;
 }
 return p;
}
