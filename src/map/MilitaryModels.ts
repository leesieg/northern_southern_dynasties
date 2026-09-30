import {Group,Mesh,InstancedMesh,BoxGeometry,SphereGeometry,CapsuleGeometry,CylinderGeometry,TorusGeometry,LatheGeometry,PlaneGeometry,BufferGeometry,Float32BufferAttribute,Shape,ExtrudeGeometry,MeshStandardMaterial,MeshBasicMaterial,TextureLoader,CanvasTexture,SRGBColorSpace,DoubleSide,Matrix4,Vector2,Vector3,Color,type Material,type Texture} from 'three';
import type {Army} from '../core/realm';
import {armyHeraldry} from './ArmyHeraldry';
import {militarySurfaceMaterial} from './militaryRendering';
import {buildMilitaryFace} from './militaryFace';
export type ArmyModelKind='foot'|'horse'|'siege';
interface Actor {root:Group;legs:Group[];arms:Group[];cloak:Group}
export interface MilitaryModel {root:Group;body:Group;detail:Group;camp:Group;banner:Group;actors:Actor[];horseLegs:Group[];lever?:Group;kind:ArmyModelKind;realm:Army['realm'];bannerName:string}
/** Original miniature meshes: shared geometry/textures, articulated bodies, no per-soldier simulation. */
export function militaryModelAssets(repaint:()=>void,warn:(message:string)=>void){
 const geometries=new Map<string,BufferGeometry>(),materials=new Map<string,Material>(),textures:Texture[]=[],loader=new TextureLoader();
 const atlas=loader.load(import.meta.env.BASE_URL+'art/military/material-atlas.png',()=>{textures.forEach(t=>t.needsUpdate=true);repaint();},undefined,()=>warn('军队材质未载入，暂用基础材质。'));atlas.colorSpace=SRGBColorSpace;textures.push(atlas);
 function geo(key:string,create:()=>BufferGeometry){let g=geometries.get(key);if(!g){g=create();geometries.set(key,g);}return g;}
 const ball=()=>geo('ball',()=>new SphereGeometry(.5,14,10)),box=()=>geo('box',()=>new BoxGeometry(1,1,1)),cap=()=>geo('capsule',()=>new CapsuleGeometry(.5,1,4,12)),cylinder=()=>geo('cylinder',()=>new CylinderGeometry(.5,.5,1,16)),ring=()=>geo('ring',()=>new TorusGeometry(.5,.035,6,24));
 function mat(key:string,color:string,panel?:number,metalness=0){let m=materials.get(key);if(m)return m;let map:Texture|undefined;if(panel!==undefined){map=atlas.clone();map.colorSpace=SRGBColorSpace;map.offset.set((panel%3)/3+.001,panel<3?.501:.001);map.repeat.set(1/3-.002,.5-.002);map.needsUpdate=true;textures.push(map);}m=militarySurfaceMaterial(color,map,metalness);materials.set(key,m);return m;}
 const iron=mat('iron','#c3c5ba',1,.24),bronze=mat('bronze','#d8bd82',2,.30),wood=mat('wood','#b39a70',4),leather=mat('leather','#aa8060',3),linen=mat('linen','#fff5da',5),skin=mat('skin','#c3a783'),dark=mat('dark','#28291f'),hair=mat('hair','#302c24'),lacquer=mat('lacquer','#713f30',undefined,.08),tassel=mat('tassel','#8c4737'),hooves=mat('hooves','#39352b'),eyeWhite=mat('eye-white','#c6b9a0'),iris=mat('iris','#3c3225'),lip=mat('lip','#9b7561');
 function mesh(parent:Group,g:BufferGeometry,m:Material,x:number,y:number,z:number,sx=1,sy=1,sz=1){const o=new Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.frustumCulled=false;parent.add(o);return o;}
 function ellipsoid(parent:Group,m:Material,x:number,y:number,z:number,sx:number,sy:number,sz:number){return mesh(parent,ball(),m,x,y,z,sx,sy,sz);}
 function capsule(parent:Group,m:Material,x:number,y:number,z:number,sx:number,sy:number,sz:number){return mesh(parent,cap(),m,x,y,z,sx,sy/2,sz);}
 function beam(parent:Group,m:Material,from:number[],to:number[],width:number){const a=new Vector3(from[0],from[1],from[2]),b=new Vector3(to[0],to[1],to[2]),delta=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5),o=mesh(parent,cylinder(),m,mid.x,mid.y,mid.z,width,delta.length(),width);o.quaternion.setFromUnitVectors(new Vector3(0,1,0),delta.normalize());return o;}
 function cloakGeometry(){return geo('cloak',()=>{const vertices:number[]=[],uv:number[]=[],indices:number[]=[];for(let row=0;row<=10;row++)for(let col=0;col<=8;col++){const t=row/10,u=col/8;vertices.push((u-.5)*(.32+t*.23),1.42-t*.97,-.145-t*.10-Math.sin(u*Math.PI*8)*.025*t);uv.push(u,1-t);}for(let r=0;r<10;r++)for(let c=0;c<8;c++){const i=r*9+c;indices.push(i,i+9,i+1,i+1,i+9,i+10);}const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;});}
 function armor(parent:Group){
  ellipsoid(parent,iron,0,1.18,.015,.43,.55,.25);
  const plate=geo('lame',()=>new BoxGeometry(.046,.071,.016)),count=72,o=new InstancedMesh(plate,iron,count),matrix=new Matrix4(),color=new Color();let i=0;
  for(const side of [1,-1])for(let row=0;row<4;row++)for(let col=0;col<9;col++){const theta=(col-4)*.25;matrix.makeTranslation(Math.sin(theta)*.19,.98+row*.08,side*Math.cos(theta)*.135);matrix.multiply(new Matrix4().makeRotationY(side*theta));o.setMatrixAt(i,matrix);o.setColorAt(i++,color.setRGB(.83+row*.035,.82+row*.033,.76+row*.035));}
  o.frustumCulled=false;parent.add(o);mesh(parent,cylinder(),leather,0,.96,0,.43,.044,.28);mesh(parent,box(),bronze,0,.966,.148,.066,.05,.018);
  const skirt=new InstancedMesh(plate,iron,24);let k=0;
  for(const side of [-1,1])for(let row=0;row<2;row++)for(let col=0;col<6;col++){const theta=(col-2.5)*.32;matrix.makeTranslation(Math.sin(theta)*.22,.78+row*.075,side*Math.cos(theta)*.16);matrix.multiply(new Matrix4().makeRotationY(side*theta));skirt.setMatrixAt(k++,matrix);}skirt.frustumCulled=false;parent.add(skirt);
  for(const x of [-.23,.23])ellipsoid(parent,iron,x,1.4,0,.20,.105,.25);
 }
 function helmet(parent:Group){
  const shell=geo('helmet',()=>new LatheGeometry([new Vector2(0,0),new Vector2(.098,0),new Vector2(.105,.045),new Vector2(.091,.115),new Vector2(.045,.175),new Vector2(0,.20)],20));mesh(parent,shell,iron,0,1.67,0);
  const rim=mesh(parent,ring(),bronze,0,1.682,0,.205,.205,.205);rim.rotation.x=Math.PI/2;
  for(const side of [-1,1]){ellipsoid(parent,iron,side*.085,1.59,-.005,.038,.14,.11);beam(parent,leather,[side*.083,1.63,.068],[side*.044,1.525,.073],.016);}
  ellipsoid(parent,bronze,0,1.845,0,.027,.065,.027);
 }
 function soldier(parent:Group,cloth:Material,x=0,z=0,scale=1,shield=true):Actor{
  const root=new Group(),legs:Group[]=[],arms:Group[]=[],cloak=new Group();root.position.set(x,0,z);root.scale.setScalar(scale);parent.add(root);root.add(cloak);mesh(cloak,cloakGeometry(),cloth,0,0,0);
  mesh(root,geo('tunic',()=>new LatheGeometry([new Vector2(.22,0),new Vector2(.215,.18),new Vector2(.145,.39),new Vector2(.19,.66),new Vector2(.115,.72)],16)),cloth,0,.72,0,1,1,.65);
  armor(root);capsule(root,skin,0,1.48,0,.095,.11,.09);buildMilitaryFace(root,{skin,white:eyeWhite,iris,lip,hair},geo);helmet(root);
  for(const side of [-1,1]){
   const leg=new Group();leg.position.set(side*.105,.80,0);root.add(leg);capsule(leg,cloth,0,-.20,0,.14,.405,.14);const shin=new Group();shin.position.y=-.39;leg.add(shin);capsule(shin,leather,0,-.17,.008,.109,.35,.12);ellipsoid(shin,iron,0,0,.04,.12,.12,.10);ellipsoid(shin,leather,0,-.335,.043,.13,.115,.23);legs.push(leg);
   const arm=new Group();arm.position.set(side*.252,1.37,0);root.add(arm);capsule(arm,cloth,0,-.145,0,.13,.31,.13);ellipsoid(arm,iron,0,-.275,.02,.14,.13,.13);capsule(arm,leather,0,-.415,.022,.11,.28,.105);ellipsoid(arm,skin,0,-.575,.037,.094,.105,.08);arm.rotation.z=side*.12;arms.push(arm);
  }
  if(shield){const left=arms[0];left.rotation.x=-.35;
   const shieldShape=geo('lacquer-shield',()=>{const s=new Shape();s.moveTo(-.14,-.25);s.lineTo(.14,-.25);s.lineTo(.19,-.16);s.lineTo(.17,.20);s.lineTo(0,.29);s.lineTo(-.17,.20);s.lineTo(-.19,-.16);s.closePath();return new ExtrudeGeometry(s,{depth:.034,bevelEnabled:true,bevelThickness:.008,bevelSize:.012,bevelSegments:1,steps:1});});
   mesh(left,shieldShape,wood,-.01,-.41,.12);mesh(left,shieldShape,lacquer,-.01,-.41,.153,.88,.9,.35);
   beam(left,bronze,[-.01,-.62,.174],[-.01,-.20,.174],.016);ellipsoid(left,bronze,-.01,-.40,.19,.095,.095,.042);
   for(const x of [-.13,.11])for(const y of [-.57,-.29])ellipsoid(left,bronze,x,y,.174,.018,.018,.012);
  }
  beam(root,wood,[.34,.035,.025],[.34,2.02,.025],.018);
  const blade=geo('blade',()=>{const s=new Shape();s.moveTo(0,-.10);s.lineTo(.035,.01);s.lineTo(0,.17);s.lineTo(-.035,.01);s.closePath();return new ExtrudeGeometry(s,{depth:.012,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1,steps:1});});mesh(root,blade,iron,.34,2.045,.02);const fringe=mesh(root,geo('spear-tassel',()=>new CylinderGeometry(.018,.06,.15,8)),tassel,.34,1.94,.025);fringe.rotation.z=-.12;return {root,legs,arms,cloak};
 }
 function horse(parent:Group,cloth:Material){
  const root=new Group(),horseLegs:Group[]=[],coat=mat('horse','#72604c'),mane=mat('mane','#3a332a');parent.add(root);
  ellipsoid(root,coat,0,.90,0,.48,.57,1.13);ellipsoid(root,coat,0,.91,-.39,.43,.50,.40);ellipsoid(root,coat,0,.96,.38,.40,.52,.42);
  const neck=capsule(root,coat,0,1.26,.47,.33,.69,.32);neck.rotation.x=.48;ellipsoid(root,coat,0,1.58,.72,.23,.29,.40);ellipsoid(root,coat,0,1.50,.90,.21,.19,.25);
  for(const side of [-1,1]){const ear=ellipsoid(root,coat,side*.085,1.77,.665,.065,.19,.065);ear.rotation.z=-side*.2;ellipsoid(root,dark,side*.113,1.63,.777,.015,.021,.018);ellipsoid(root,dark,side*.083,1.54,1.012,.038,.022,.01);}
  for(const x of [-.18,.18])for(const z of [-.37,.36]){const leg=new Group();leg.position.set(x,.84,z);root.add(leg);capsule(leg,coat,0,-.17,0,.11,.37,.11);capsule(leg,coat,0,-.52,.015,.073,.37,.08);ellipsoid(leg,hooves,0,-.73,.032,.115,.10,.16);horseLegs.push(leg);}
  const tail=capsule(root,mane,0,.56,-.63,.10,.57,.10);tail.rotation.x=-.35;for(let n=0;n<8;n++)ellipsoid(root,mane,0,1.60-n*.065,.45-n*.055,.075,.12,.055);
  mesh(root,box(),cloth,0,1.11,-.055,.57,.045,.60);ellipsoid(root,leather,0,1.20,-.06,.37,.15,.41);mesh(root,box(),bronze,0,1.28,-.23,.32,.045,.045);
  for(const side of [-1,1]){beam(root,leather,[side*.245,1.16,-.03],[side*.245,.69,-.03],.023);const stirrup=mesh(root,ring(),bronze,side*.26,.67,-.03,.105,.14,.105);stirrup.rotation.y=Math.PI/2;beam(root,leather,[side*.118,1.65,.72],[side*.122,1.47,.88],.020);beam(root,leather,[side*.12,1.51,.84],[side*.25,1.43,.02],.013);}
  const nose=mesh(root,ring(),leather,0,1.52,.92,.22,.22,.22);nose.rotation.x=Math.PI/2;
  return {root,horseLegs};
 }
 function trebuchet(parent:Group){
  const root=new Group();root.position.set(0,0,.06);parent.add(root);
  for(const side of [-1,1]){beam(root,wood,[side*.43,.13,-.61],[side*.43,.13,.63],.11);beam(root,wood,[side*.35,.13,-.35],[side*.35,1.16,.10],.095);beam(root,wood,[side*.35,.13,.53],[side*.35,1.16,.10],.095);}
  for(const z of [-.45,.43]){beam(root,wood,[-.56,.25,z],[.56,.25,z],.065);for(const side of [-1,1]){const wheel=mesh(root,ring(),wood,side*.58,.25,z,.40,.40,.40);wheel.rotation.y=Math.PI/2;for(let n=0;n<8;n++){const t=n*Math.PI/4;beam(root,wood,[side*.58,.25,z],[side*.58,.25+Math.sin(t)*.19,z+Math.cos(t)*.19],.024);}const hub=mesh(root,cylinder(),bronze,side*.58,.25,z,.072,.10,.072);hub.rotation.z=Math.PI/2;}}
  beam(root,iron,[-.44,1.15,.10],[.44,1.15,.10],.075);const lever=new Group();lever.position.set(0,1.15,.10);lever.rotation.x=-.32;root.add(lever);beam(lever,wood,[0,-.37,0],[0,1.02,0],.065);beam(lever,linen,[0,1.02,0],[0,.60,.24],.015);ellipsoid(lever,leather,0,.59,.25,.17,.13,.13);
  for(const side of [-1,1])beam(root,linen,[0,.80,.18],[side*.32,.15,.57],.016);return lever;
 }
 function banner(parent:Group,realm:Army['realm'],name:string){
  const group=new Group();group.position.set(-.40,0,-.16);parent.add(group);beam(group,wood,[0,.025,0],[0,2.30,0],.026);beam(group,bronze,[-.02,2.22,0],[.54,2.22,0],.020);ellipsoid(group,bronze,0,2.34,0,.040,.075,.040);
  const key='banner|'+realm+'|'+name;let material=materials.get(key);if(!material){const texture=loader.load(armyHeraldry(realm,name),()=>repaint());texture.colorSpace=SRGBColorSpace;textures.push(texture);material=new MeshStandardMaterial({map:texture,transparent:true,alphaTest:.12,side:DoubleSide,roughness:.95,depthWrite:true});materials.set(key,material);}
  const g=geo('flag-cloth',()=>{const g=new PlaneGeometry(.54,.67,10,12),p=g.getAttribute('position');for(let i=0;i<p.count;i++)p.setZ(i,Math.sin((p.getX(i)+.27)*13)*.028);g.computeVertexNormals();return g;});mesh(group,g,material,.25,1.895,.022);return group;
 }
 function camp(parent:Group){const group=new Group();parent.add(group);group.position.set(-.55,0,-.58);group.scale.setScalar(.46);const shape=geo('tent',()=>{const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute([-.6,0,-.6,.6,0,-.6,0,.7,-.6,-.6,0,.6,.6,0,.6,0,.7,.6],3));g.setAttribute('uv',new Float32BufferAttribute([0,0,1,0,.5,1,0,0,1,0,.5,1],2));g.setIndex([0,3,2,2,3,5,2,5,1,1,5,4,0,2,1,3,4,5]);g.computeVertexNormals();return g;});mesh(group,shape,linen,0,0,0);for(const side of [-1,1])for(const z of [-1,1])beam(group,linen,[side*.5,.1,z*.5],[side*.8,.02,z*.85],.018);return group;}
 function shadow(parent:Group,kind:ArmyModelKind){let m=materials.get('shadow');if(!m){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const c=canvas.getContext('2d')!,g=c.createRadialGradient(64,64,8,64,64,63);g.addColorStop(0,'rgba(16,23,18,.38)');g.addColorStop(.6,'rgba(16,23,18,.20)');g.addColorStop(1,'rgba(16,23,18,0)');c.fillStyle=g;c.fillRect(0,0,128,128);const map=new CanvasTexture(canvas);textures.push(map);m=new MeshBasicMaterial({map,transparent:true,depthWrite:false,side:DoubleSide});materials.set('shadow',m);}const o=mesh(parent,geo('shadow',()=>new PlaneGeometry(1,1)),m,0,.012,0,kind==='foot'?1.20:1.55,kind==='foot'?1.10:1.9,1);o.rotation.x=-Math.PI/2;}
 return {
  create(a:Army,kind:ArmyModelKind,name:string):MilitaryModel{
   const root=new Group(),body=new Group(),detail=new Group(),actors:Actor[]=[],horseLegs:Group[]=[];root.matrixAutoUpdate=false;root.add(body);body.add(detail);shadow(body,kind);
   const cloth=mat('cloth-'+a.realm,a.realm==='liang'?'#729080':a.realm==='east'?'#9b6872':'#b19a68',0),main=soldier(body,cloth,0,kind==='siege'?-.50:0,kind==='horse'?.87:1,kind!=='horse');actors.push(main);mesh(main.root,geo('helmet-plume',()=>new LatheGeometry([new Vector2(.025,0),new Vector2(.038,.05),new Vector2(.02,.13),new Vector2(0,.16)],8)),tassel,0,1.84,-.01);let lever:Group|undefined;
   if(kind==='horse'){const h=horse(body,cloth);horseLegs.push(...h.horseLegs);main.root.position.set(0,.58,-.09);main.legs.forEach((leg,i)=>{leg.rotation.x=-.7;leg.rotation.z=(i?1:-1)*.36;});main.arms.forEach(arm=>arm.rotation.x=-.7);}
   else if(kind==='siege'){lever=trebuchet(body);main.root.position.x=.57;actors.push(soldier(detail,cloth,-.56,-.46,.84,false));}
   else{actors.push(soldier(detail,cloth,-.38,-.34,.86),soldier(detail,cloth,.38,-.38,.84));}
   return {root,body,detail,camp:camp(body),banner:banner(body,a.realm,name),actors,horseLegs,lever,kind,realm:a.realm,bannerName:name};
  },
  pruneBanners(active:Set<string>){for(const [key,m] of materials)if(key.startsWith('banner|')&&!active.has(key)){const t=(m as MeshStandardMaterial).map;if(t){t.dispose();const i=textures.indexOf(t);if(i>=0)textures.splice(i,1);}m.dispose();materials.delete(key);}},
  dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());geometries.clear();materials.clear();textures.length=0;}
 };
}
export function animateMilitaryModel(m:MilitaryModel,state:string,t:number,motion:boolean){
 const march=state==='marching'||state==='retreat',fight=state==='battle',work=state==='siege'||state==='training',active=motion&&(march||fight||work),swing=active?Math.sin(t):0;
 m.actors.forEach((actor,n)=>{const step=active?Math.sin(t+n*.65):0;actor.legs.forEach((leg,i)=>{leg.rotation.x=m.kind==='horse'?-.7:march?step*(i?-.23:.23):0;});actor.arms.forEach((arm,i)=>{arm.rotation.x=m.kind==='horse'?-.7:-(i===0?.35:0)+(fight?-.65+step*.25:work?step*.12:march?step*(i?-.12:.12):0);});actor.cloak.rotation.x=march?.06+Math.abs(step)*.035:0;});
 m.horseLegs.forEach((leg,i)=>leg.rotation.x=march?swing*(i%2?-.23:.23):0);m.banner.rotation.y=active?Math.sin(t*.37)*.055:0;if(m.lever)m.lever.rotation.x=-.32+(state==='siege'&&active?swing*.065:0);m.body.position.y=march?Math.abs(swing)*.01:0;
 return active;
}
