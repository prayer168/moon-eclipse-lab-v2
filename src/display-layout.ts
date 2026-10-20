import {realRotation} from './ephemeris';
import {C,positions,unit,sub,mul,add,rad,type V,type Params} from './model';
export type ReferenceFrame='sun'|'earth';
export function displayLayout(p:Params,frame:ReferenceFrame){
 const pos=positions(p),solar=frame==='sun';
 const earth:V=solar?mul(pos.earth,105/C.au):[0,0,0];
 const sun:V=solar?[0,0,0]:mul(unit(sub(pos.sun,pos.earth)),155);
 const moonOrbitRadius=solar?17:43;
 const moon=add(earth,mul(unit(pos.relative),moonOrbitRadius));
 const axis:V=p.model==='ephemeris'?realRotation('Earth',p.t).axis:[0,-Math.sin(23.44*rad),Math.cos(23.44*rad)];
 return {earth,sun,moon,axis,moonOrbitRadius,earthRadius:solar?6:8,axisLength:solar?14:18,bodyScale:solar?.75:1};
}
