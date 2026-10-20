import {it,expect} from 'vitest';
import {C,earthOrbit,norm,sub,type V} from '../src/model';
// Independent inverse-square force integration: does not use Kepler's solver.
it('RK4牛頓二體積分與解析橢圓軌道一年一致',()=>{
 const mu=(2*Math.PI/C.year)**2*C.au**3,h=C.year/12000;
 let r:V=[-C.au*(1-C.eccentricity),0,0],v:V=[0,-Math.sqrt(mu/C.au*(1+C.eccentricity)/(1-C.eccentricity)),0];
 const plus=(a:V,b:V,k:number):V=>a.map((x,i)=>x+k*b[i]) as V;
 const acc=(x:V):V=>x.map(a=>-mu*a/norm(x)**3) as V;
 let maxError=0;
 for(let j=1;j<=12000;j++){
  const a1=acc(r),r2=plus(r,v,h/2),v2=plus(v,a1,h/2),a2=acc(r2),r3=plus(r,v2,h/2),v3=plus(v,a2,h/2),a3=acc(r3),r4=plus(r,v3,h),v4=plus(v,a3,h),a4=acc(r4);
  r=r.map((x,i)=>x+h/6*(v[i]+2*v2[i]+2*v3[i]+v4[i])) as V;
  v=v.map((x,i)=>x+h/6*(a1[i]+2*a2[i]+2*a3[i]+a4[i])) as V;
  if(j%100===0)maxError=Math.max(maxError,norm(sub(r,earthOrbit(j*h).earth)));
 }
 expect(maxError).toBeLessThan(.01);
 console.log('RK4 max position error km:',maxError);
});
