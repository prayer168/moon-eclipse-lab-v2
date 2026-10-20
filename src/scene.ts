import {createMoonMaterial,configureMoonMaterial,renderMoonDisc} from './moon-render';
import {moonAssets,ensureMoonPixels} from './moon-assets';
import {moonLandmarks,moonPixel,moonView} from './moon-surface';
import {geography,geographicNormal} from './geography';
import {SolarEffects} from './solar-effects';
import {realRotation,realOrbitPath,dateFromDays} from './ephemeris';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {earthOrbit,positions,observer,sub,unit,dot,cross,mul,add,C,rad,type V,type Params,lunar} from './model';
import {moonOrientation,moonOrbitNormal,geocentricMoonView} from './orientation';
import {displayLayout,type ReferenceFrame} from './display-layout';
const vec=(v:V)=>new T.Vector3(...v);
export class SpaceScene {
 moonReading=false;showMoonLabels=false;moonLabels:HTMLButtonElement[]=[];nearMoon=false;moonPrevious=new T.Vector3();mapLoaded=false;mapReading=false;nearEarth=false;geoLabels:HTMLButtonElement[]=[];earthPrevious=new T.Vector3(); solar!:SolarEffects; realMode=false;pathKey='';apsisPoints:V[]=[[-105*(1-C.eccentricity),0,0],[105*(1+C.eccentricity),0,0]];moonTiltAngle=1.54;presentation=false; ecliptic!:T.Mesh; moonPlane!:T.Mesh; moonAxis=new T.Group(); apsides=new T.Group(); inclination=5.145; stars:T.Points; renderer:T.WebGLRenderer; scene=new T.Scene(); camera=new T.PerspectiveCamera(42,1,.1,3000); controls:OrbitControls;
 earth:T.Mesh; moon:T.Mesh; sun:T.Mesh; orbit:T.Line; node:T.Line; earthOrbit:T.Line; axisGroup=new T.Group(); marker:T.Mesh; frame:ReferenceFrame='sun'; layout=displayLayout({t:0,i:5.145,node:0,distance:384400,lat:23.5,lon:121},'sun'); tags:Record<string,HTMLSpanElement>={}; enabled=true; quality=.8; lastRender=performance.now(); slowFrames=0; renderedFrames=0; light=new T.DirectionalLight(0xffe4ad,3);
 constructor(private host:HTMLElement){
 this.renderer=new T.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)*this.quality);this.renderer.setClearColor('#080f22');host.append(this.renderer.domElement);
 this.renderer.domElement.setAttribute('aria-label','可拖曳旋轉的日地月3D示意。可使用旁邊的俯視、側視與縮放按鈕。');
 this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.enabled=false;host.dataset.error='3D 顯示暫停，請重新整理；其他操作與觀察仍可使用。'});
 this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.enabled=true;delete host.dataset.error;});
 this.camera.up.set(0,0,1);this.camera.position.set(190,-220,190);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,0,0);this.controls.minDistance=30;this.controls.maxDistance=500;
 this.scene.add(new T.AmbientLight(0x8ba9db,.15));this.light.position.set(180,0,0);this.scene.add(this.light);
 this.earth=new T.Mesh(new T.SphereGeometry(8,48,32),new T.ShaderMaterial({
 uniforms:{earthMap:{value:new T.Texture()},mapReading:{value:0},sunRelative:{value:new T.Vector3(C.au,0,0)},moonRelative:{value:new T.Vector3(384400,0,0)}},
 vertexShader:`varying vec3 worldNormal;varying vec3 bodyNormal;void main(){bodyNormal=normal;worldNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
 fragmentShader:`varying vec3 worldNormal;varying vec3 bodyNormal;uniform sampler2D earthMap;uniform float mapReading;uniform vec3 sunRelative;uniform vec3 moonRelative;
 float overlap(float a,float b,float d){if(d>=a+b)return 0.0;if(d<=abs(a-b))return min(1.0,b*b/(a*a));float x=acos(clamp((d*d+a*a-b*b)/(2.0*d*a),-1.0,1.0));float y=acos(clamp((d*d+b*b-a*a)/(2.0*d*b),-1.0,1.0));float z=sqrt(max(0.0,(-d+a+b)*(d+a-b)*(d-a+b)*(d+a+b)));return clamp((a*a*x+b*b*y-0.5*z)/(3.14159265*a*a),0.0,1.0);}
 void main(){vec3 n=normalize(worldNormal);vec3 s=sunRelative-n*6371.0;vec3 m=moonRelative-n*6371.0;float light=max(0.0,dot(n,normalize(s)));float cover=0.0;if(dot(s,m)>0.0){float a=asin(696000.0/length(s)),b=asin(1737.0/length(m)),d=acos(clamp(dot(normalize(s),normalize(m)),-1.0,1.0));cover=overlap(a,b,d);}vec3 bn=normalize(bodyNormal);vec2 uv=vec2(atan(bn.y,bn.x)/6.28318530718+0.5,asin(clamp(bn.z,-1.0,1.0))/3.14159265359+0.5);vec3 base=texture2D(earthMap,uv).rgb;gl_FragColor=vec4(base*mix(0.12+0.88*light*(1.0-cover),1.0,mapReading),1.0);}`
 }));this.scene.add(this.earth);
 new T.TextureLoader().load(new URL('maps/natural-earth.png',document.baseURI).href,texture=>{texture.wrapS=T.RepeatWrapping;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());(this.earth.material as T.ShaderMaterial).uniforms.earthMap.value=texture;this.mapLoaded=true;},undefined,()=>{this.host.dataset.error='地圖載入失敗，請重新整理；觀測數值仍可使用。';});
 geography.forEach((place,j)=>{const label=document.createElement('button');label.className='geo-label '+place.kind;label.textContent=place.name;label.hidden=true;label.setAttribute('aria-label',place.name+'，緯度'+place.lat+'，經度'+place.lon);label.onclick=()=>{this.host.dispatchEvent(new CustomEvent('geographyselect',{detail:place}));};for(const event of ['pointerdown','dblclick'])label.addEventListener(event,e=>e.stopPropagation());host.append(label);this.geoLabels[j]=label;});
 const taiwan=new T.Mesh(new T.SphereGeometry(.09,10,8),new T.MeshBasicMaterial({color:0xffdf83}));taiwan.position.copy(vec(geographicNormal(23.7,121)).multiplyScalar(8.06));this.earth.add(taiwan);

 this.moon=new T.Mesh(new T.SphereGeometry(2.5,96,64),createMoonMaterial());this.scene.add(this.moon);
 moonLandmarks.forEach(place=>{const label=document.createElement('button');label.className='geo-label moon-landmark';label.textContent=place.name;label.hidden=true;label.setAttribute('aria-label',place.name);label.onclick=()=>this.host.dispatchEvent(new CustomEvent('lunarselect',{detail:place}));for(const event of ['pointerdown','dblclick'])label.addEventListener(event,e=>e.stopPropagation());host.append(label);this.moonLabels.push(label);});

 this.sun=new T.Mesh(new T.SphereGeometry(16,48,32),new T.MeshBasicMaterial({color:0xffc867}));this.scene.add(this.sun);this.solar=new SolarEffects(this.sun);
 this.orbit=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:0x557d9e}));this.node=new T.Line(new T.BufferGeometry(),new T.LineDashedMaterial({color:0xffbc68,dashSize:3,gapSize:2}));this.earthOrbit=new T.Line(new T.BufferGeometry().setFromPoints(Array.from({length:181},(_,j)=>vec(mul(earthOrbit(j*C.year/180).earth,105/C.au)))),new T.LineBasicMaterial({color:0x426882}));
 this.scene.add(this.orbit,this.node,this.earthOrbit,this.axisGroup);
 const plane=(radius:number,color:number)=>new T.Mesh(new T.CircleGeometry(radius,96),new T.MeshBasicMaterial({color,transparent:true,opacity:.055,side:T.DoubleSide,depthWrite:false}));
 this.ecliptic=plane(127,0x7eb8dc);this.moonPlane=plane(17,0xe8bc80);this.ecliptic.visible=false;this.moonPlane.visible=false;
 const lunarPole=new T.Mesh(new T.CylinderGeometry(.11,.11,11,10),new T.MeshBasicMaterial({color:0xf3c891}));lunarPole.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),vec(moonOrientation({t:0,node:0}).axis));this.moonAxis.add(lunarPole);this.moonAxis.visible=false;
 for(const x of [-105*(1-C.eccentricity),105*(1+C.eccentricity)]){const dot=new T.Mesh(new T.SphereGeometry(.8,12,12),new T.MeshBasicMaterial({color:0xeab873}));dot.position.set(x,0,0);this.apsides.add(dot);}this.apsides.visible=false;
 this.scene.add(this.ecliptic,this.moonPlane,this.moonAxis,this.apsides);
 const axisMaterial=new T.MeshBasicMaterial({color:0x8de9df});
 const pole=new T.Mesh(new T.CylinderGeometry(.18,.18,2,10),axisMaterial);pole.name='axis';pole.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),vec(this.layout.axis));this.axisGroup.add(pole);
 for(const sign of [-1,1]){const tip=new T.Mesh(new T.SphereGeometry(.4,10,10),axisMaterial);tip.name=sign>0?'north':'south';this.axisGroup.add(tip);}
 const normal=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0,0,0),new T.Vector3(0,0,1)]),new T.LineDashedMaterial({color:0x9ca9bc,dashSize:.08,gapSize:.06}));normal.name='normal';normal.computeLineDistances();this.axisGroup.add(normal);
 const arc=new T.Line(new T.BufferGeometry().setFromPoints(Array.from({length:25},(_,j)=>{const a=j/24*23.44*rad;return new T.Vector3(0,-Math.sin(a)*10,Math.cos(a)*10);})),new T.LineBasicMaterial({color:0xffce7c}));arc.name='tiltArc';this.axisGroup.add(arc);
 for(const [key,text] of Object.entries({perihelion:'近日點 1.471億 km',aphelion:'遠日點 1.521億 km',sun:'太陽',earth:'地球',moon:'月球',north:'北',south:'南',tilt:'地軸 23.44°',moonTilt:'月軸 1.54°',lunarPlane:'月球軌道面 5.145°',ecliptic:'地球公轉軌道位於黃道面'})){const tag=document.createElement('span');tag.className='space-tag '+key;tag.textContent=text;host.append(tag);this.tags[key]=tag;}
 this.marker=new T.Mesh(new T.SphereGeometry(.8,12,12),new T.MeshBasicMaterial({color:0xffee9a}));this.scene.add(this.marker);
 const stars=[];for(let j=0;j<500;j++){const a=j*2.39996,z=1-2*(j+.5)/500,r=Math.sqrt(1-z*z);stars.push(r*Math.cos(a)*700,r*Math.sin(a)*700,z*700);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(stars,3));this.stars=new T.Points(geo,new T.PointsMaterial({color:0xc1d2ef,size:.8}));this.scene.add(this.stars);
 new ResizeObserver(()=>this.resize()).observe(host);this.resize();
 }
 render(){if(this.enabled){
 const now=performance.now();this.slowFrames+=now-this.lastRender>20?1:0;this.lastRender=now;this.renderedFrames++;
 if(this.renderedFrames>=120){if(this.slowFrames>40&&this.quality>.5){this.quality=Math.max(.5,this.quality*.75);this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)*this.quality);this.resize();}this.renderedFrames=0;this.slowFrames=0;}
 if(this.nearMoon){const delta=this.moon.position.clone().sub(this.moonPrevious);this.camera.position.add(delta);this.controls.target.add(delta);this.moonPrevious.copy(this.moon.position);}if(this.nearEarth){const delta=this.earth.position.clone().sub(this.earthPrevious);this.camera.position.add(delta);this.controls.target.add(delta);this.earthPrevious.copy(this.earth.position);}this.controls.update();
 this.updateGeography();this.updateMoonLabels();
 for(const [body,radius] of [[this.earth,10*this.earth.scale.x],[this.moon,4*this.moon.scale.x],[this.sun,18*this.sun.scale.x]] as [T.Mesh,number][]){const offset=this.camera.position.clone().sub(body.position);if(offset.length()<radius){if(offset.lengthSq()<1e-8)offset.set(0,0,1);this.camera.position.copy(body.position).add(offset.normalize().multiplyScalar(radius));this.camera.lookAt(this.controls.target);}}
 this.updateTags();this.renderer.render(this.scene,this.camera);
 }}
 fit(){if(this.nearEarth||this.nearMoon){const distance=(this.nearMoon?2.5*this.moon.scale.x:this.layout.earthRadius)*1.5/(Math.tan(this.camera.fov*rad/2)*Math.min(1,this.camera.aspect));this.camera.position.sub(this.controls.target).normalize().multiplyScalar(distance).add(this.controls.target);return;}const half=Math.atan(Math.tan(this.camera.fov*rad/2)*Math.min(1,this.camera.aspect));const distance=(this.frame==='sun'?137:170)/Math.sin(half);this.controls.maxDistance=Math.max(500,distance*1.6);this.camera.position.sub(this.controls.target).normalize().multiplyScalar(distance).add(this.controls.target);}
 resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);const changed=Math.abs(this.camera.aspect-w/h)>.01;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();if(changed)this.fit();}
 view(kind:string){this.nearMoon=false;this.nearEarth=false;this.camera.up.set(0,0,1);if(kind==='axis'){this.camera.position.set(45,-70,45);this.controls.target.set(0,0,0);this.controls.update();return;}this.camera.position.set(...(kind==='top'?[45,0,300]:kind==='side'?[45,-300,8]:[190,-220,190]) as [number,number,number]);this.controls.target.set(0,0,0);this.fit();this.controls.update();}
 zoom(f:number){this.camera.position.sub(this.controls.target).multiplyScalar(f).add(this.controls.target);this.controls.update();}
 setFrame(frame:ReferenceFrame){this.nearMoon=false;this.nearEarth=false;this.controls.minDistance=30;this.frame=frame;this.view('reset');}
 focusEarth(){
 this.nearMoon=false;this.nearEarth=true;this.earthPrevious.copy(this.earth.position);const direction=vec(geographicNormal(23.7,121)).applyQuaternion(this.earth.quaternion),radius=this.layout.earthRadius;this.controls.minDistance=radius*1.3;this.controls.target.copy(this.earth.position);this.camera.up.copy(vec(this.layout.axis));this.camera.position.copy(this.earth.position).addScaledVector(direction,radius*1.5/(Math.tan(this.camera.fov*rad/2)*Math.min(1,this.camera.aspect)));this.controls.update();
 }
 focusMoon(){
 this.nearEarth=false;this.nearMoon=true;this.moonPrevious.copy(this.moon.position);const direction=this.earth.position.clone().sub(this.moon.position).normalize(),radius=2.5*this.moon.scale.x;this.controls.minDistance=radius*1.3;this.controls.target.copy(this.moon.position);this.camera.up.copy(new T.Vector3(0,0,1));this.camera.position.copy(this.moon.position).addScaledVector(direction,radius*1.5/(Math.tan(this.camera.fov*rad/2)*Math.min(1,this.camera.aspect)));this.controls.update();
 }
 updateMoonLabels(){
 document.body.classList.toggle('moon-near',this.nearMoon);this.host.classList.toggle('moon-close',this.nearMoon);(this.moon.material as T.ShaderMaterial).uniforms.moonReading.value=this.moonReading?1:0;
 const center=this.moon.position,radius=2.5*this.moon.scale.x,distance=this.camera.position.distanceTo(center),screenRadius=radius/distance/Math.tan(this.camera.fov*rad/2)*this.host.clientHeight/2,occupied:{x:number;y:number;w:number}[]=[],hud=this.host.querySelector('#phaseHud')?.getBoundingClientRect(),host=this.host.getBoundingClientRect();
 this.moonLabels.forEach((label,j)=>{const place=moonLandmarks[j],normal=vec(geographicNormal(place.lat,place.lon)).applyQuaternion(this.moon.quaternion),q=center.clone().addScaledVector(normal,radius*1.01).project(this.camera),x=(q.x+1)*host.width/2,y=(1-q.y)*host.height/2,w=Math.max(56,place.name.length*14+10),front=normal.dot(this.camera.position.clone().sub(center).normalize())>radius/distance,overlap=occupied.some(r=>Math.abs(x-r.x)<(w+r.w)/2+4&&Math.abs(y-r.y)<46),show=this.showMoonLabels&&moonAssets.ready&&screenRadius>55&&front&&q.z<1&&x>w/2&&x<host.width-w/2&&y>22&&y<host.height-22-(this.presentation?0:54)&&!overlap&&!(this.presentation&&hud&&x+w/2>hud.left-host.left&&y-22<hud.bottom-host.top);label.hidden=!show;if(show){occupied.push({x,y,w});label.style.left=x+'px';label.style.top=y+'px';}});
 }
 updateGeography(){
 const earth=this.earth.position,radius=this.layout.earthRadius,distance=this.camera.position.distanceTo(earth),screenRadius=radius/distance/Math.tan(this.camera.fov*rad/2)*this.host.clientHeight/2;
 this.host.classList.toggle('earth-close',this.nearEarth);document.body.classList.toggle('earth-near',this.nearEarth);this.marker.scale.setScalar(this.nearEarth?.2:1);const hud=this.host.querySelector('#phaseHud')?.getBoundingClientRect(),hostRect=this.host.getBoundingClientRect();
 const occupied:{x:number;y:number;w:number;h:number}[]=[];
 this.geoLabels.forEach((label,j)=>{const place=geography[j],normal=vec(geographicNormal(place.lat,place.lon)).applyQuaternion(this.earth.quaternion),point=earth.clone().addScaledVector(normal,radius*1.025),q=point.clone().project(this.camera),front=normal.dot(this.camera.position.clone().sub(earth).normalize())>radius/distance;
 const x=(q.x+1)*this.host.clientWidth/2,y=(1-q.y)*this.host.clientHeight/2,w=Math.max(48,place.name.length*15+12),h=44;const overlaps=occupied.some(r=>Math.abs(x-r.x)<(w+r.w)/2+3&&Math.abs(y-r.y)<(h+r.h)/2+2);
 const show=this.mapLoaded&&screenRadius>(place.kind==='place'?40:42)&&front&&q.z<1&&x>w/2&&x<this.host.clientWidth-w/2&&y>h/2&&y<this.host.clientHeight-h/2-(this.presentation?0:54)&&!overlaps&&!(this.presentation&&hud&&x+w/2>hud.left-hostRect.left&&y-h/2<hud.bottom-hostRect.top);
 label.hidden=!show;if(show){occupied.push({x,y,w,h});label.style.left=x+'px';label.style.top=y+'px';}
 });
 (this.earth.material as T.ShaderMaterial).uniforms.mapReading.value=this.mapReading?1:0;
 }
 setPresentation(on:boolean){
 this.presentation=on;this.axisGroup.visible=true;this.moonAxis.visible=on;this.ecliptic.visible=false;this.moonPlane.visible=on;this.apsides.visible=on;this.marker.visible=!on;this.stars.visible=!on;
 if(on){this.orbit.visible=true;this.node.visible=true;this.earthOrbit.visible=true;}
 this.updateTags();
 }
 updateTags(){

 const l=this.layout,n=add(l.earth,mul(l.axis,l.axisLength+1)),south=add(l.earth,mul(l.axis,-l.axisLength-1));
 const points:Record<string,V>={moonTilt:add(l.moon,[0,0,9]),lunarPlane:add(l.earth,[0,l.moonOrbitRadius+3,1]),ecliptic:[0,110,0],perihelion:add(this.apsisPoints[0],[0,0,-18]),aphelion:add(this.apsisPoints[1],[0,0,-18]),sun:add(l.sun,[0,0,this.frame==='sun'?15:20]),earth:add(l.earth,[0,0,-l.earthRadius-4]),moon:add(l.moon,[0,0,5]),north:n,south,tilt:add(l.earth,[7,0,l.axisLength+5])};
 const compact=this.presentation&&this.host.clientWidth<600;
 for(const [key,v] of Object.entries(points)){
  const q=vec(v).project(this.camera),tag=this.tags[key];
  const text=key==='lunarPlane'?`月球軌道面 ${this.inclination.toFixed(3)}°`:key==='perihelion'?(compact?'近日點':this.realMode?'近日點（星曆）':'近日點 1.471億 km'):key==='aphelion'?(compact?'遠日點':this.realMode?'遠日點（星曆）':'遠日點 1.521億 km'):key==='tilt'?`${compact?'地球軸':'地軸'} ${(Math.acos(l.axis[2])/rad).toFixed(2)}°`:key==='moonTilt'?`${compact?'月球軸':'月軸'} ${this.moonTiltAngle.toFixed(2)}°`:null;
  if(text&&tag.textContent!==text)tag.textContent=text;
  const show=(!['moonTilt','lunarPlane','ecliptic'].includes(key)||this.presentation)&&q.z<1&&q.z>-1&&Math.abs(q.x)<1.05&&Math.abs(q.y)<1.05&&(!['perihelion','aphelion'].includes(key)||this.frame==='sun')&&(this.frame==='earth'||!['north','south'].includes(key))&&(!compact||!['earth','moon'].includes(key));
  tag.style.display=show?'':'none';
  let x=(q.x+1)/2*this.host.clientWidth,y=(-q.y+1)/2*this.host.clientHeight;
  if(compact){const offsets:Record<string,number>={tilt:-45,moonTilt:-24,lunarPlane:27,perihelion:52,aphelion:52};y+=offsets[key]||0;const half=Math.min(100,(tag.textContent?.length||0)*3+8);x=Math.max(half,Math.min(this.host.clientWidth-half,x));}
  tag.style.left=x+'px';tag.style.top=y+'px';
 }

 }
 update(p:Params,layers:boolean){
 const pos=positions(p),sd=unit(sub(pos.sun,pos.earth));
 this.realMode=p.model==='ephemeris';const pathKey=this.realMode?'real'+dateFromDays(p.t).getUTCFullYear():'teaching';
 if(this.pathKey!==pathKey){
  this.pathKey=pathKey;
  const path=this.realMode?realOrbitPath(p.t):null;
  const points=path?path.points.map(x=>vec(mul(x,105/C.au))):Array.from({length:181},(_,j)=>vec(mul(earthOrbit(j*C.year/180).earth,105/C.au)));
  this.earthOrbit.geometry.dispose();this.earthOrbit.geometry=new T.BufferGeometry().setFromPoints(points);
  this.apsisPoints=path?path.apsides.map(x=>mul(x,105/C.au)):[[-105*(1-C.eccentricity),0,0],[105*(1+C.eccentricity),0,0]];
  this.apsides.children.forEach((x,j)=>x.position.copy(vec(this.apsisPoints[j])));
 }
 const l=displayLayout(p,this.frame);this.layout=l;this.inclination=p.i;
 const moonRotation=moonOrientation(p),normal=moonOrbitNormal(p);this.moonTiltAngle=Math.acos(moonRotation.axis[2])/rad;
 this.moonAxis.position.copy(vec(l.moon));this.moonAxis.children[0].quaternion.setFromUnitVectors(new T.Vector3(0,1,0),vec(moonRotation.axis));
 this.moonPlane.position.copy(vec(l.earth));this.moonPlane.scale.setScalar(l.moonOrbitRadius/17);this.moonPlane.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),vec(normal));
 this.earth.position.copy(vec(l.earth));this.sun.position.copy(vec(l.sun));this.light.position.copy(vec(l.sun));
 this.earth.scale.setScalar(l.bodyScale);this.moon.scale.setScalar(l.bodyScale);this.sun.scale.setScalar(this.frame==='sun'?.75:1);
 this.earthOrbit.visible=this.frame==='sun'&&(layers||this.presentation);
 this.axisGroup.position.copy(vec(l.earth));
 this.axisGroup.getObjectByName('axis')!.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),vec(l.axis));
 this.axisGroup.getObjectByName('axis')!.scale.set(1,l.axisLength,1);
 this.axisGroup.getObjectByName('north')!.position.copy(vec(mul(l.axis,l.axisLength)));
 this.axisGroup.getObjectByName('south')!.position.copy(vec(mul(l.axis,-l.axisLength)));
 this.axisGroup.getObjectByName('normal')!.scale.setScalar(l.axisLength);
 const tiltArc=this.axisGroup.getObjectByName('tiltArc') as T.Line,tiltAngle=Math.acos(l.axis[2]),horizontal=unit([l.axis[0],l.axis[1],0]);
 tiltArc.geometry.dispose();tiltArc.geometry=new T.BufferGeometry().setFromPoints(Array.from({length:25},(_,j)=>{const a=j/24*tiltAngle;return new T.Vector3(horizontal[0]*Math.sin(a)*10,horizontal[1]*Math.sin(a)*10,Math.cos(a)*10);}));
 const earthMaterial=this.earth.material as T.ShaderMaterial;earthMaterial.uniforms.sunRelative.value.copy(vec(sub(pos.sun,pos.earth)));earthMaterial.uniforms.moonRelative.value.copy(vec(pos.relative));
 this.moon.position.copy(vec(l.moon));this.moon.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(vec(moonRotation.x),vec(moonRotation.y),vec(moonRotation.axis)));
 const material=this.moon.material as T.ShaderMaterial;configureMoonMaterial(material,p,this.moonReading);material.uniforms.sunDistance.value=Math.hypot(...pos.earth);material.uniforms.sunDirection.value.copy(vec(unit(sub(pos.sun,pos.moon))));material.uniforms.relative.value.copy(vec(pos.relative));material.uniforms.shadowAxis.value.copy(vec(mul(sd,-1)));
 const pts=[];for(let j=0;j<=180;j++){const a=j*Math.PI/90,n=p.node*rad,i=p.i*rad;pts.push(new T.Vector3(l.moonOrbitRadius*(Math.cos(a)*Math.cos(n)-Math.sin(a)*Math.cos(i)*Math.sin(n)),l.moonOrbitRadius*(Math.cos(a)*Math.sin(n)+Math.sin(a)*Math.cos(i)*Math.cos(n)),l.moonOrbitRadius*Math.sin(a)*Math.sin(i)));}
 this.orbit.visible=(layers||this.presentation);this.orbit.position.copy(vec(l.earth));this.orbit.geometry.dispose();this.orbit.geometry=new T.BufferGeometry().setFromPoints(pts);
 this.node.position.copy(vec(l.earth));const nodeRadius=l.moonOrbitRadius*1.2;this.node.geometry.dispose();this.node.geometry=new T.BufferGeometry().setFromPoints([new T.Vector3(-nodeRadius*Math.cos(p.node*rad),-nodeRadius*Math.sin(p.node*rad),0),new T.Vector3(nodeRadius*Math.cos(p.node*rad),nodeRadius*Math.sin(p.node*rad),0)]);this.node.computeLineDistances();this.node.visible=(layers||this.presentation);
 const o=observer(p);this.marker.position.copy(vec(add(l.earth,mul(o.up,l.earthRadius+.8))));if(this.realMode){const r=realRotation('Earth',p.t);this.earth.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(vec(r.x),vec(r.y),vec(r.axis)));}else this.earth.rotation.set(23.44*rad,0,(p.t% .9972696)*Math.PI*2/.9972696);
 // No trailing rays or shadow-cone wireframes: eclipses remain on the body shaders.
 }
}

export function drawObservation(canvas:HTMLCanvasElement,p:Params,solar:boolean,sky:boolean,compact=false,geocentric=!sky&&!solar,reading=false){
 const ctx=canvas.getContext('2d')!;const w=canvas.clientWidth||320,h=canvas.clientHeight||280;canvas.width=w*devicePixelRatio;canvas.height=h*devicePixelRatio;ctx.scale(devicePixelRatio,devicePixelRatio);
 ctx.clearRect(0,0,w,h);if(!compact){ctx.fillStyle='#0b1429';ctx.fillRect(0,0,w,h);}
 const pos=positions(p),o=observer(p),target=solar?pos.sun:pos.moon,view=geocentric?geocentricMoonView(p).view:unit(sub(o.point,target));
 let up=sky?o.up:[0,0,1] as V;let right=unit(cross(up,view));up=unit(cross(view,right));
 const light=unit(sub(pos.sun,pos.moon)),contentH=compact?h:Math.max(32,h-(h>=130?48:0)),r=compact?Math.min(w,h)*.42:Math.min(w*.35,contentH*.4),cx=w/2,cy=contentH*.5;
 if(solar){
 const sv=unit(sub(pos.sun,o.point)),mv=unit(sub(pos.moon,o.point));const rs=Math.asin(C.sun/Math.hypot(...sub(pos.sun,o.point))),rm=Math.asin(C.moon/Math.hypot(...sub(pos.moon,o.point)));
 ctx.fillStyle='#ffd17b';ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
 const forward=mul(view,-1),den=Math.max(.0001,dot(mv,forward));
 const x=dot(mv,right)/den/Math.tan(rs)*r,y=-dot(mv,up)/den/Math.tan(rs)*r;
 if(dot(sv,mv)>0){ctx.fillStyle='#10182b';ctx.beginPath();ctx.arc(cx+x,cy+y,r*Math.tan(rm)/Math.tan(rs),0,Math.PI*2);ctx.fill();}
 }else{
 if(!moonAssets.ready){ctx.fillStyle='#a9bdd6';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(moonAssets.error?'月面載入失敗':'月面資料載入中',cx,cy);return;}
 const disc=renderMoonDisc(p,Math.ceil(2*r*Math.min(devicePixelRatio,2)),sky,geocentric,reading);
 if(disc){ctx.drawImage(disc,cx-r,cy-r,2*r,2*r);}else{
 ensureMoonPixels();const q=moonView(p,sky,geocentric),scale=Math.min(devicePixelRatio,2),image=ctx.createImageData(Math.ceil(2*r*scale),Math.ceil(2*r*scale)),size=image.width;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const nx=2*(x+.5)/size-1,ny=1-2*(y+.5)/size,z2=1-nx*nx-ny*ny;if(z2<0)continue;
 const nz=Math.sqrt(z2),n:V=[q.right[0]*nx+q.up[0]*ny+q.view[0]*nz,q.right[1]*nx+q.up[1]*ny+q.view[1]*nz,q.right[2]*nx+q.up[2]*ny+q.view[2]*nz],rgb=moonPixel(n,p,moonAssets.colorPixels!,moonAssets.normalPixels!,reading,q),k=(y*size+x)*4;
 for(let c=0;c<3;c++)image.data[k+c]=Math.round(rgb[c]*255);image.data[k+3]=255;
 }
 // putImageData uses device pixels: draw through a temporary logical-resolution canvas.
 const tmp=document.createElement('canvas');tmp.width=size;tmp.height=size;tmp.getContext('2d')!.putImageData(image,0,0);ctx.drawImage(tmp,cx-r,cy-r,2*r,2*r);
 }
 }
 if(compact||h<130)return;
 ctx.fillStyle='#a9bdd6';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(sky?'天頂方向 ↑ · 畫面為目標放大視野':'黃道北方 ↑ · 月面放大示意',cx,h-38);ctx.fillText('視大小放大，非裸眼視野',cx,h-18);
 if(sky){ctx.strokeStyle='#82946c';ctx.beginPath();ctx.moveTo(15,h-62);ctx.lineTo(w-15,h-62);ctx.stroke();}
}
