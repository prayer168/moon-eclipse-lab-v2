import {C,rad,tau,mod,unit,cross,add,mul,positions,sub,type Params,type V} from './model';
/** Short-term Cassini-style approximation. Spin pole is opposite the orbital pole across ecliptic north. */
export function moonOrientation(p:Pick<Params,'t'|'node'>){
 const node=p.node*rad,tilt=1.54*rad,spin=mod(tau*p.t/C.month+Math.PI);
 const axis:V=[-Math.sin(node)*Math.sin(tilt),Math.cos(node)*Math.sin(tilt),Math.cos(tilt)];
 const reference:V=[Math.cos(node),Math.sin(node),0],quadrature=cross(axis,reference);
 const x=add(mul(reference,Math.cos(spin)),mul(quadrature,Math.sin(spin))),y=cross(axis,x);
 return {axis,x,y,spin};
}
export function moonOrbitNormal(p:Params):V{
 const node=p.node*rad,i=p.i*rad;
 return [Math.sin(node)*Math.sin(i),-Math.cos(node)*Math.sin(i),Math.cos(i)];
}
/** Geocentric view. Project ecliptic north into the image; right-handed sky basis. */
export function geocentricMoonView(p:Params){
 const pos=positions(p),view=unit(sub(pos.earth,pos.moon)),right=unit(cross([0,0,1],view)),up=unit(cross(view,right));
 return {view,right,up,light:unit(sub(pos.sun,pos.moon))};
}
