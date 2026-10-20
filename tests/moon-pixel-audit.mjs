import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch();const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
const report=await page.evaluate(async()=>{
 const A=await import('/tests/moon-pixel-harness.ts');await A.loadMoonAssets();
 const {renderMoonDisc,createMoonMaterial,configureMoonMaterial,moonPixel,moonView,defaults,nextPhase,phase,T}=A;
 const baseline=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});baseline.setSize(257,257,false);baseline.setClearColor(0,0);
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.01,20),mesh=new T.Mesh(new T.SphereGeometry(1,96,64),createMoonMaterial());scene.add(mesh);
 const rows=[],points=[];
 // Pixel centres: dense interior, transition zones and limb (0.96 < projected radius < 0.995).
 for(let y=4;y<253;y+=8)for(let x=4;x<253;x+=8){const r=Math.hypot(2*(x+.5)/257-1,1-2*(y+.5)/257);if(r<.995)points.push([x,y,r>.96?'limb':'interior']);}
 for(const level of ['base','4k']){
  if(level==='4k')await A.requestMoonDetail();if(A.moonAssets.level!==level)throw Error('LOD not fixed '+level);
  A.ensureMoonPixels();const color=A.moonAssets.colorPixels,normal=A.moonAssets.normalPixels;
  let t=0;const times=[0];for(let i=0;i<4;i++){t=nextPhase({...defaults,i:0,t});times.push(t);}
  for(const t of times)for(const sky of [false,true])for(const reading of [false,true]){
   const p={...defaults,i:0,t},q=moonView(p,sky,!sky),size=257;
   mesh.quaternion.setFromRotationMatrix(configureMoonMaterial(mesh.material,p,reading));camera.position.set(...q.view).multiplyScalar(4);camera.up.set(...q.up);camera.lookAt(0,0,0);baseline.render(scene,camera);
   const canvases=[renderMoonDisc(p,size,sky,!sky,reading),baseline.domElement];const pixels=canvases.map(d=>{const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');ctx.drawImage(d,0,0);return ctx.getImageData(0,0,size,size).data;});
   let max=0,oldMax=0,limbMax=0,count=0,sum=0,worst=null;const zones={lit:{samples:0,max:0},dark:{samples:0,max:0},terminator:{samples:0,max:0},limb:{samples:0,max:0}};
   for(const [x,y,zone] of points){const nx=2*(x+.5)/size-1,ny=1-2*(y+.5)/size,nz=Math.sqrt(1-nx*nx-ny*ny),n=q.right.map((v,j)=>v*nx+q.up[j]*ny+q.view[j]*nz),expected=moonPixel(n,p,color,normal,reading,q).map(v=>Math.round(v*255)),j=(y*size+x)*4;
    const diffs=pixels.map(a=>Math.max(...expected.map((v,c)=>Math.abs(v-a[j+c]))));
    const sunDot=n.reduce((s,v,i)=>s+v*q.light[i],0),region=zone==='limb'?'limb':Math.abs(sunDot)<.08?'terminator':sunDot>0?'lit':'dark';zones[region].samples++;zones[region].max=Math.max(zones[region].max,diffs[0]);
    if(diffs[0]>max){max=diffs[0];worst={x,y,zone,expected,actual:[...pixels[0].slice(j,j+3)]};}oldMax=Math.max(oldMax,diffs[1]);if(zone==='limb')limbMax=Math.max(limbMax,diffs[0]);count++;sum+=diffs[0];
   }
   rows.push({level,colorSize:[color.width,color.height],normalSize:[normal.width,normal.height],t,phase:phase(p).name,view:sky?'local sky':'geocentric',reading,samples:count,maxDifference:max,limbMaxDifference:limbMax,meanMaxDifference:sum/count,oldMeshMaxDifference:oldMax,zones,worst});
  }
 }
 baseline.dispose();return {rows,threshold:6,method:'Frozen explicit Params; await fixed LOD; shared decoded image rasters; 257px analytic orthographic sphere vs legacy 96x64 MSAA mesh; exact pixel centres',date:'2026-10-20'};
});
report.errors=errors;report.pass=report.rows.every(x=>x.maxDifference<=report.threshold)&&!errors.length;
fs.writeFileSync('docs/moon-pixel-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,conditions:report.rows.length,pixels:report.rows.reduce((s,r)=>s+r.samples,0),max:Math.max(...report.rows.map(x=>x.maxDifference)),oldMax:Math.max(...report.rows.map(x=>x.oldMeshMaxDifference)),errors}));await browser.close();expect(report.pass).toBe(true);
