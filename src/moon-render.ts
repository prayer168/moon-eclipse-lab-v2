import * as T from 'three';
import {moonAssets,loadMoonAssets} from './moon-assets';
import {moonView} from './moon-surface';
import {C,positions,unit,sub,mul,type Params} from './model';
import {moonOrientation} from './orientation';
const v=(x:number[])=>new T.Vector3(...x);
export function createMoonMaterial(analyticDisc=false){const material=new T.ShaderMaterial({
 uniforms:{discRight:{value:new T.Vector3()},discUp:{value:new T.Vector3()},discView:{value:new T.Vector3()},moonMap:{value:new T.Texture()},moonNormal:{value:new T.Texture()},moonReady:{value:0},moonReading:{value:0},bodyRotation:{value:new T.Matrix3()},sunDirection:{value:new T.Vector3(1,0,0)},relative:{value:new T.Vector3()},shadowAxis:{value:new T.Vector3(-1,0,0)},sunDistance:{value:C.au}},
 vertexShader:analyticDisc?`varying vec2 discXY;void main(){discXY=position.xy;gl_Position=vec4(position.xy,0.,1.);}`:`varying vec3 worldNormal;varying vec3 bodyNormal;void main(){bodyNormal=normal;worldNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
 fragmentShader:(analyticDisc?`varying vec2 discXY;uniform vec3 discRight;uniform vec3 discUp;uniform vec3 discView;`:`varying vec3 worldNormal;varying vec3 bodyNormal;`)+`uniform mat3 bodyRotation;uniform sampler2D moonMap;uniform sampler2D moonNormal;uniform float moonReady;uniform float moonReading;uniform vec3 sunDirection;uniform vec3 relative;uniform vec3 shadowAxis;uniform float sunDistance;
 void main(){`+(analyticDisc?`float r2=dot(discXY,discXY);if(r2>1.)discard;vec3 surface=discRight*discXY.x+discUp*discXY.y+discView*sqrt(max(0.,1.-r2));vec3 bn=vec3(dot(bodyRotation[0],surface),dot(bodyRotation[1],surface),dot(bodyRotation[2],surface));`:`vec3 surface=normalize(worldNormal);vec3 bn=normalize(bodyNormal);`)+`vec2 uv=vec2(atan(bn.y,bn.x)/6.28318530718+0.5,asin(clamp(bn.z,-1.,1.))/3.14159265359+0.5);vec3 bump=normalize(texture2D(moonNormal,uv).rgb*2.-1.);vec3 n=moonReady>.5?normalize(bodyRotation*bump):surface;vec3 rel=relative+surface*1737.;float x=dot(rel,shadowAxis);float d=length(rel-shadowAxis*x);float ru=6371.-x*(696000.-6371.)/sunDistance;float rp=6371.+x*(696000.+6371.)/sunDistance;float light=.025+.975*max(0.,dot(n,sunDirection));vec3 f=vec3(light);if(x>0.&&d<rp){f*=.65;if(d<ru)f=vec3(light*.24+.08,light*.11,light*.08);}vec3 base=moonReady>.5?texture2D(moonMap,uv).rgb:vec3(.6);gl_FragColor=vec4(base*mix(f,vec3(1.),moonReading),1.);}`
 });
 const install=()=>{if(!moonAssets.ready)return;for(const [name,image] of [['moonMap',moonAssets.color],['moonNormal',moonAssets.normal]] as const){const t=new T.Texture(image);t.colorSpace=T.NoColorSpace;t.flipY=true;t.wrapS=T.RepeatWrapping;t.wrapT=T.ClampToEdgeWrapping;t.minFilter=T.LinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=false;t.needsUpdate=true;material.uniforms[name].value?.dispose();material.uniforms[name].value=t;}material.uniforms.moonReady.value=1;};window.addEventListener('moonassetsready',install);if(moonAssets.ready)install();else void loadMoonAssets();

return material;
}
export function configureMoonMaterial(material:T.ShaderMaterial,p:Params,reading:boolean){const pos=positions(p),q=moonOrientation(p),m=new T.Matrix4().makeBasis(v(q.x),v(q.y),v(q.axis));material.uniforms.bodyRotation.value.setFromMatrix4(m);material.uniforms.moonReading.value=reading?1:0;material.uniforms.sunDistance.value=Math.hypot(...sub(pos.sun,pos.earth));material.uniforms.sunDirection.value.copy(v(unit(sub(pos.sun,pos.moon))));material.uniforms.relative.value.copy(v(pos.relative));material.uniforms.shadowAxis.value.copy(v(unit(sub(pos.earth,pos.sun))));return m;}
let renderer:T.WebGLRenderer|undefined,failed=false;const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.01,20);let mesh:T.Mesh|undefined;
// Analytic orthographic sphere: matches CPU pixel centres without mesh interpolation or MSAA UV averaging.
export function renderMoonDisc(p:Params,size:number,sky:boolean,geocentric:boolean,reading:boolean):HTMLCanvasElement|null{
 if(failed||!moonAssets.ready)return null;
 try{if(!renderer){renderer=new T.WebGLRenderer({alpha:true,antialias:false,preserveDrawingBuffer:true});renderer.setClearColor(0,0);renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;});mesh=new T.Mesh(new T.PlaneGeometry(2,2),createMoonMaterial(true));scene.add(mesh);}
 if(renderer.domElement.width!==size)renderer.setSize(size,size,false);const q=moonView(p,sky,geocentric),material=mesh!.material as T.ShaderMaterial;configureMoonMaterial(material,p,reading);material.uniforms.discRight.value.copy(v(q.right));material.uniforms.discUp.value.copy(v(q.up));material.uniforms.discView.value.copy(v(q.view));renderer.render(scene,camera);return renderer.domElement;
 }catch{failed=true;return null;}
}
