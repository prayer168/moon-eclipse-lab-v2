import * as T from 'three';
/** Decorative plasma illustration, never an input to astronomical geometry. */
export class SolarEffects {
 time=0; reduced=matchMedia('(prefers-reduced-motion: reduce)');
 material=new T.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:`varying vec3 n;void main(){n=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`varying vec3 n;uniform float time;void main(){vec3 p=normalize(n);float grain=sin(p.x*80.0+sin(p.y*46.0+time*.35))*sin(p.z*65.0-time*.2);float large=sin(p.x*12.0+p.z*9.0+time*.12);float limb=.7+.3*abs(p.z);gl_FragColor=vec4(mix(vec3(1.,.39,.06),vec3(1.,.81,.36),(.7+.09*grain+.07*large)*limb),1.);}`});
 group=new T.Group();particles:T.Points;loops:T.Line[]=[];
 constructor(sun:T.Mesh){
  sun.material=this.material;sun.add(this.group);
  const glow=new T.Mesh(new T.SphereGeometry(19,40,24),new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{},vertexShader:`varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec3 n;varying vec3 v;void main(){float a=pow(max(0.,1.-abs(dot(n,v))),3.)*.2;gl_FragColor=vec4(1.,.48,.09,a);}`}));this.group.add(glow);
  this.particles=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(new Float32Array(72*3),3)).setAttribute('color',new T.Float32BufferAttribute(new Float32Array(72*3),3)),new T.PointsMaterial({size:.38,vertexColors:true,transparent:true,opacity:.65,depthWrite:false,blending:T.AdditiveBlending}));this.group.add(this.particles);
  for(let j=0;j<4;j++){const line=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xffa34a,transparent:true,opacity:0,depthWrite:false}));const a=j*2.4,u=new T.Vector3(Math.cos(a),Math.sin(a),.35).normalize(),v=new T.Vector3(-Math.sin(a),Math.cos(a),0);line.geometry.setFromPoints(Array.from({length:33},(_,k)=>{const q=k/32*Math.PI;return u.clone().multiplyScalar(15.5+5*Math.sin(q)).addScaledVector(v,3*Math.cos(q));}));this.loops.push(line);this.group.add(line);}
  this.advance(0,false);
 }
 advance(dt:number,active:boolean){
  if(active&&!this.reduced.matches)this.time+=dt;
  this.material.uniforms.time.value=this.time;
  this.particles.visible=!this.reduced.matches;
  const pos=this.particles.geometry.getAttribute('position'),colors=this.particles.geometry.getAttribute('color');
  for(let j=0;j<72;j++){const f=(j*.61803398875+this.time*.11)%1,z=1-2*(j+.5)/72,a=j*2.39996+.12*f,r=16.3+f*10,s=Math.sqrt(1-z*z);pos.setXYZ(j,r*s*Math.cos(a),r*s*Math.sin(a),r*z);const fade=(1-f)*.8;colors.setXYZ(j,fade,fade*.55,fade*.15);}pos.needsUpdate=true;colors.needsUpdate=true;
  this.loops.forEach((line,j)=>{line.visible=!this.reduced.matches;(line.material as T.LineBasicMaterial).opacity=.3*Math.pow(Math.max(0,Math.sin(this.time*.3+j*1.7)),4);});
 }
}
