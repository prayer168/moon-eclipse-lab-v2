import {dot,unit,add,mul,sub,positions,observer,cross,C,type V,type Params} from './model';
import {moonOrientation} from './orientation';
export type MoonPose=ReturnType<typeof moonOrientation>;
export interface Raster {width:number;height:number;data:Uint8ClampedArray}
export const moonLandmarks=[{name:'雨海',lat:32.8,lon:-15.6},{name:'靜海',lat:8.35,lon:30.83},{name:'第谷坑',lat:-43.31,lon:-11.36},{name:'哥白尼坑',lat:9.6,lon:-20.1},{name:'齊奧爾科夫斯基坑（背面）',lat:-20.4,lon:129.1}];
export function bodyNormal(world:V,pose:MoonPose):V{return [dot(world,pose.x),dot(world,pose.y),dot(world,pose.axis)];}
export function worldNormal(body:V,pose:MoonPose):V{return add(add(mul(pose.x,body[0]),mul(pose.y,body[1])),mul(pose.axis,body[2]));}
export function lunarUV(n:V):[number,number]{return [Math.atan2(n[1],n[0])/(2*Math.PI)+.5,Math.asin(Math.max(-1,Math.min(1,n[2])))/Math.PI+.5];}
/** Matches GPU linear texture filtering: longitude wraps, latitude clamps, north at top. */
export function sampleRaster(r:Raster,u:number,v:number):V{
 const x=((u%1+1)%1)*r.width-.5,y=Math.max(0,Math.min(r.height-1,(1-v)*r.height-.5)),ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
 const out:V=[0,0,0];for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const j=(Math.min(r.height-1,iy+dy)*r.width+((ix+dx)%r.width+r.width)%r.width)*4,w=(dx?fx:1-fx)*(dy?fy:1-fy);for(let c=0;c<3;c++)out[c]+=r.data[j+c]/255*w;}return out;
}
export function moonLighting(n:V,rel:V,sun:V,sunDistance:number,reading=false,shadowAxis:V=unit(mul(sun,-1))):V {
 if(reading)return [1,1,1];const axis=shadowAxis,x=dot(rel,axis),d=Math.hypot(...sub(rel,mul(axis,x))),ru=C.earth-x*(C.sun-C.earth)/sunDistance,rp=C.earth+x*(C.sun+C.earth)/sunDistance;
 const light=.025+.975*Math.max(0,dot(n,sun));if(x>0&&d<rp){if(d<ru)return [light*.24+.08,light*.11,light*.08];return [light*.65,light*.65,light*.65];}return [light,light,light];
}
export function skyBasis(view:V,preferred:V){let right=cross(preferred,view);if(Math.hypot(...right)<1e-8)right=cross(Math.abs(view[0])<.8?[1,0,0]:[0,1,0],view);right=unit(right);return {right,up:unit(cross(view,right))};}
export function moonView(p:Params,sky=false,geocentric=!sky){const pos=positions(p),o=observer(p),view=unit(sub(geocentric?pos.earth:o.point,pos.moon)),basis=skyBasis(view,sky?o.up:[0,0,1]);return {pos,view,...basis,light:unit(sub(pos.sun,pos.moon)),pose:moonOrientation(p)};}
export function moonPixel(n:V,p:Params,color:Raster,normal:Raster,reading=false,prepared?:ReturnType<typeof moonView>):V {
 const q=prepared||moonView(p),uv=lunarUV(bodyNormal(n,q.pose)),base=sampleRaster(color,...uv),encoded=sampleRaster(normal,...uv),bump=unit(encoded.map(x=>x*2-1) as V),wn=worldNormal(bump,q.pose),pos=q.pos,rel=add(pos.relative,mul(n,C.moon)),f=moonLighting(wn,rel,q.light,Math.hypot(...sub(pos.sun,pos.earth)),reading,unit(sub(pos.earth,pos.sun)));return base.map((x,j)=>Math.min(1,x*f[j])) as V;
}
