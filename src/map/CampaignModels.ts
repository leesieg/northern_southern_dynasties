import {BoxGeometry,BufferGeometry,Color,CylinderGeometry,Float32BufferAttribute,IcosahedronGeometry,Mesh,MeshLambertMaterial,Group,DoubleSide} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {cityRoofGeometry} from '../city/architecture';
import {MAX_CITY_GEOMETRIES,campaignCityKey,type CampaignCityAppearance} from './campaignScenery';

const colors={earth:'#a49b77',stone:'#8c8e7a',wall:'#c4baa0',plaster:'#e1d5b6',wood:'#615544',roof:'#4b605b',road:'#cebd97',tile:'#758075'};
/** Original strategic miniatures, using the same curved roof as the city construction view.
 * Every city is merged to one colored mesh; no per-house draw calls or copied game assets. */
export function campaignCityGeometry(a:CampaignCityAppearance){
 const pieces:BufferGeometry[]=[];
 function add(g:BufferGeometry,color:string,x:number,y:number,z:number){
  g.translate(x,y,z);g.deleteAttribute('uv');const c=new Color(color),values:number[]=[],normals=g.getAttribute('normal');
  for(let i=0;i<g.getAttribute('position').count;i++){const shade=.83+.17*Math.max(0,normals.getY(i));values.push(c.r*shade,c.g*shade,c.b*shade);}
  g.setAttribute('color',new Float32BufferAttribute(values,3));pieces.push(g);
 }
 function box(x:number,y:number,z:number,w:number,h:number,d:number,color:string){add(new BoxGeometry(w,h,d),color,x,y,z);}
 function roof(x:number,y:number,z:number,w:number,d:number,h:number){
  add(cityRoofGeometry(w,d,h,6,3),a.south?colors.roof:'#646b60',x,y,z);
  box(x,y+h+.04,z,w*.58,.08,.10,colors.tile);
  box(x,y-.04,z,w*.84,.10,d*.84,colors.wood);
 }
 function house(x:number,z:number,w=1.5,d=1.1,h=1){
  box(x,.1,z,w+.18,.2,d+.18,colors.stone);box(x,.2+h/2,z,w,h,d,colors.plaster);
  box(x,.65,z+d/2+.01,.30,.70,.035,colors.wood);
  for(const sign of [-1,1])box(x+sign*w*.32,.82,z+d/2+.03,.22,.3,.04,colors.wood);
  roof(x,h+.24,z,w+.4,d+.4,.46);
 }
 box(0,-.08,0,16.7,.22,15.9,colors.earth);
 box(0,.045,0,1.1,.05,15.3,colors.road);box(0,.05,0,15.5,.06,.75,colors.road);
 const wallHeight=.7+a.fort*.35,wallColor=a.fort?colors.wall:'#a79879';
 for(const x of [-7.65,7.65])box(x,wallHeight/2,0,.38,wallHeight,15.2,wallColor);
 box(0,wallHeight/2,-7.5,15.5,wallHeight,.38,wallColor);
 for(const x of [-4.7,4.7])box(x,wallHeight/2,7.5,6.1,wallHeight,.38,wallColor);
 for(const x of [-7.65,7.65])for(const z of [-7.5,7.5]){
  box(x,wallHeight*.65,z,.85,wallHeight*1.3,.85,colors.stone);roof(x,wallHeight*1.3,z,1.35,1.35,.38);
 }
 for(const x of [-1.5,1.5])box(x,.8,7.5,.55,1.6,.65,colors.wall);
 box(0,1.7,7.5,3.7,.3,1.05,colors.wall);roof(0,1.91,7.5,4.1,1.5,.55);
 if(a.fort>=2)for(let i=-6;i<=6;i+=1.4){
  box(i,wallHeight+.10,-7.5,.55,.22,.43,wallColor);
  if(Math.abs(i)>2)box(i,wallHeight+.10,7.5,.55,.22,.43,wallColor);
 }
 for(const x of [-4.8,-2.6,2.6,4.8])for(const z of [-4.8,-2.5,2.2])house(x,z,1.55,1.15,a.south?.95:1.1);
 // Administrative hall, with an inner courtyard only at the actual current capital.
 house(0,-4.1,a.capital?3.8:2.6,a.capital?2.6:1.7,a.capital?1.7:1.25);
 if(a.capital){roof(0,2.58,-4.1,3.35,2.25,.6);for(const x of [-2.65,2.65])house(x,-5.9,1.5,1.2);box(0,.055,-1.6,4.9,.055,2.2,colors.road);}
 // Completed civic buildings mirror Holdings; a construction frame never displays an unearned upgrade.
 const plots:[number,number][]=[[-4.4,4.8],[4.4,4.8],[0,3.2]];
 for(let i=0;i<3;i++){
  const [x,z]=plots[i],level=a.levels[i];
  if(level){house(x,z,1.6+level*.24,1.05+level*.15,.8+level*.18);
   if(i===0)for(const dx of [-1,1]){box(x+dx,.45,z+1,.7,.08,.5,'#b59b6c');box(x+dx,.75,z+1,.85,.08,.7,'#a57c58');}
   if(i===1)for(const dx of [-.7,.7])box(x+dx,.3,z+1,.4,.5,.4,'#ad9671');
  }
  if(a.project===i){
   const height=.65+a.progress*.22;for(const dx of [-1.05,1.05])for(const dz of [-.85,.85])box(x+dx,height/2,z+dz,.07,height,.07,colors.wood);
   for(const dz of [-.85,.85])box(x,height,z+dz,2.2,.075,.07,'#b3976c');
  }
 }
 if(a.besieged)for(const x of [-8.5,8.5])for(const z of [-3,3]){
  box(x,.05,z,1.5,.1,1.4,colors.wood);add(new CylinderGeometry(0,.8,1.1,4), '#a58d62',x,.6,z);
 }
 const merged=mergeGeometries(pieces)!;for(const g of pieces)g.dispose();merged.computeBoundingSphere();return merged;
}

export function campaignModelAssets(){
 const material=new MeshLambertMaterial({vertexColors:true,side:DoubleSide});
 const geometries=new Map<string,BufferGeometry>();
 const poleGeometry=new CylinderGeometry(.035,.035,3.5,5).translate(0,1.75,0);
 const bannerGeometry=new BoxGeometry(1.1,.7,.03).translate(.55,3.15,0);
 const poleMaterial=new MeshLambertMaterial({color:'#6c6048'}),bannerMaterials=new Map<string,MeshLambertMaterial>();
 function city(a:CampaignCityAppearance){
  const key=campaignCityKey(a);let geometry=geometries.get(key);
  if(!geometry){geometry=campaignCityGeometry(a);geometries.set(key,geometry);}
  const root=new Group(),body=new Mesh(geometry,material);root.add(body);
  root.add(new Mesh(poleGeometry,poleMaterial));
  let bannerMaterial=bannerMaterials.get(a.color);if(!bannerMaterial){bannerMaterial=new MeshLambertMaterial({color:a.color});bannerMaterials.set(a.color,bannerMaterial);}
  const banner=new Mesh(bannerGeometry,bannerMaterial);root.add(banner);return root;
 }
 function prune(active:Set<string>){
  for(const [key,g] of geometries){if(geometries.size<=MAX_CITY_GEOMETRIES)break;if(!active.has(key)){g.dispose();geometries.delete(key);}}
 }
 function dispose(){for(const g of geometries.values())g.dispose();geometries.clear();material.dispose();poleGeometry.dispose();bannerGeometry.dispose();poleMaterial.dispose();for(const m of bannerMaterials.values())m.dispose();bannerMaterials.clear();}
 return {city,prune,dispose};
}

export function campaignTreeGeometry(){
 const crown=new IcosahedronGeometry(1,1).scale(.8,1.05,.75).translate(0,1.25,0);
 const trunk=new CylinderGeometry(.06,.1,1.1,5).translate(0,.55,0);
 return {crown,trunk};
}
