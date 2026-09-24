import { releasePortraitSurfaces } from './materials';
import * as T from 'three';
import { appearanceFor,type PortraitPose,type Wardrobe } from './appearance';
export function createCharacterModel(id:string,pose:PortraitPose='calm',wardrobe:Wardrobe='default'){
 const a=appearanceFor(id),root=new T.Group();root.name=id;root.userData={characterId:id,appearanceVersion:2,artisticInterpretation:true};
 const material=(color:string,metalness=0)=>new T.MeshPhysicalMaterial({color,roughness:metalness?.38:.7,metalness,clearcoat:metalness?.12:0,clearcoatRoughness:.5});
 const skin=material(a.skin),hair=material(a.hair),cloth=material(a.robe),trim=material(a.trim,.4),dark=material('#171d1c'),white=material('#c0b8a1'),iris=material('#352b20'),lips=material('#916457');
 skin.name='skin';hair.name='hair';cloth.name='cloth';dark.name='cloth';skin.roughness=.58;
 const metal=material('#4b5555',.65),lining=material('#c4bca5');lining.name='cloth';
 const add=(parent:T.Group,name:string,g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0)=>{const mesh=new T.Mesh(g,m);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 const ellipsoid=(parent:T.Group,name:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,m:T.Material)=>{const mesh=add(parent,name,new T.SphereGeometry(1,32,24),m,x,y,z);mesh.scale.set(sx,sy,sz);return mesh;};
 const line=(parent:T.Group,name:string,points:number[][],radius:number,m:T.Material)=>add(parent,name,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v as [number,number,number]))),18,radius,6,false),m);
 const ribbon=(parent:T.Group,name:string,points:number[][],width:number,m:T.Material)=>{
 const curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v as [number,number,number]))),vertices:number[]=[],indices:number[]=[];
 for(let i=0;i<=40;i++){const p=curve.getPoint(i/40),t=curve.getTangent(i/40),side=new T.Vector3(-t.y,t.x,0).normalize().multiplyScalar(width/2);for(const sign of [-1,1])vertices.push(p.x+side.x*sign,p.y+side.y*sign,p.z+.006);if(i<40){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));const uv:number[]=[];for(let i=0;i<=40;i++)uv.push(0,i/40,1,i/40);geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();const clothMaterial=m.clone();clothMaterial.side=T.DoubleSide;return add(parent,name,geometry,clothMaterial);
 };
 const lathe=(parent:T.Group,name:string,points:number[][],m:T.Material)=>add(parent,name,new T.LatheGeometry(points.map(([x,y])=>new T.Vector2(x,y)),64),m);
 const torso=new T.Group();torso.name='costume';root.add(torso);
 const robe=lathe(torso,'cross-collar-robe',[[.83,0],[.79,.15],[.71,.6],[.64,1.05],[.78,1.52],[.66,1.7],[.29,1.89],[.24,2]],cloth);robe.scale.z=.56;
 for(const sign of [-1,1]){const sleeve=ellipsoid(torso,'sleeve',sign*.66,1.17,0,.27,.64,.3,cloth);sleeve.rotation.z=sign*.18;line(torso,'sleeve-seam',[[sign*.7,.55,.21],[sign*.84,1,.2],[sign*.77,1.55,.2]],.017,trim);}
 const belt=lathe(torso,'waist-belt',[[.68,.72],[.69,.73],[.69,.87],[.67,.88]],dark);belt.scale.z=.58;
 add(torso,'belt-clasp',new T.BoxGeometry(.18,.12,.03),trim,0,.8,.41);
 for(let i=-3;i<=3;i++)line(torso,'robe-fold',[[i*.13,.08,.46-Math.abs(i)*.018],[i*.1,.4,.42],[i*.075,.68,.39]],.006,cloth);
 ribbon(torso,'inner-collar',[[-.25,1.97,.13],[-.18,1.75,.35],[.13,1.35,.43],[.31,1.13,.41]],.13,lining);
 ribbon(torso,'cross-collar',[[.25,1.97,.13],[.15,1.76,.35],[-.18,1.38,.43],[-.39,1.06,.37]],.14,cloth);
 const armored=wardrobe==='armor'||wardrobe==='default'&&a.armor;
 if(armored){for(let row=0;row<6;row++)for(let col=-4;col<=4;col++){const x=col*.135,y=.98+row*.11,z=.43-Math.abs(col)*.012;const plate=add(torso,'lamellar-plate',new T.BoxGeometry(.12,.095,.035),metal,x,y,z);plate.rotation.y=col*.04;ellipsoid(torso,'plate-rivet',x,y+.025,z+.021,.012,.012,.009,trim);}for(const sign of [-1,1]){const guard=ellipsoid(torso,'shoulder-guard',sign*.67,1.56,.04,.32,.2,.33,metal);guard.rotation.z=sign*.2;}}
 ellipsoid(root,'neck',0,2.01,0,.22,.35,.19,skin);
 const head=new T.Group();head.name='head';head.position.y=2.43;head.scale.set(a.faceWidth,a.faceLength,1);root.add(head);
 // A continuous sculpted skull mesh: narrow jaw, cheek plane and flattened facial surface.
 const g=new T.SphereGeometry(1,112,80),positions=g.attributes.position;
 const colors=new Float32Array(positions.count*3),baseTone=new T.Color('#ffffff');
 const bump=(x:number,y:number,cx:number,cy:number,sx:number,sy:number)=>Math.exp(-((x-cx)**2/sx**2+(y-cy)**2/sy**2));
 for(let i=0;i<positions.count;i++){
 let x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);const front=Math.max(0,z),jaw=y<-.1?T.MathUtils.lerp(a.jaw,1,(y+1)/.9):1;
 x*=.36*jaw;y*=.52;z*=z>0?.30:.32;
 if(front>0){
 const anatomy=.056*bump(x,y,0,.01,.04,.17)+.105*a.nose*bump(x,y,0,-.095,.06,.047)
 +.03*bump(x,y,0,-.21,.12,.085)+.035*bump(x,y,0,-.36,.12,.07)
 +[-1,1].reduce((v,sign)=>v+.032*a.cheek*bump(x,y,sign*.205,-.07,.085,.1)-.05*bump(x,y,sign*.14*a.eyeSpace,.075,.075,.043)+.026*bump(x,y,sign*.13,.158,.10,.033),0);
 z+=anatomy*Math.min(1,front*4);
 }
 positions.setXYZ(i,x,y,z);
 const warmth=(bump(x,y,-.21,-.075,.11,.09)+bump(x,y,.21,-.075,.11,.09))*.035;
 const variation=Math.sin(i*12.9898)*.009;baseTone.setRGB(.99+variation,.99-warmth+variation,.99-warmth*1.7+variation);colors.set([baseTone.r,baseTone.g,baseTone.b],i*3);
 }
 g.setAttribute('color',new T.BufferAttribute(colors,3));g.computeVertexNormals();const faceSkin=skin.clone();faceSkin.vertexColors=true;add(head,'sculpted-face',g,faceSkin);
 const noseAnchor=new T.Group();noseAnchor.name='nose-tip';noseAnchor.userData.integratedSurface=true;head.add(noseAnchor);
 for(const sign of [-1,1]){
 ellipsoid(head,'ear',sign*.35,-.015,-.015,.067,.14,.054,skin);ellipsoid(head,'ear-concha',sign*.37,-.01,.025,.028,.08,.015,lips);
 const x=sign*.139*a.eyeSpace,eyeY=.075;

 ellipsoid(head,'eyeball',x,eyeY,.267,.065,.022,.021,white);ellipsoid(head,'iris',x,eyeY,.288,.021,.022,.006,iris);ellipsoid(head,'pupil',x,eyeY,.294,.009,.015,.003,dark);ellipsoid(head,'eye-highlight',x-.006,eyeY+.008,.297,.004,.004,.003,white);
 line(head,'upper-lid',[[x-.077,eyeY,.269],[x,eyeY+.026,.289],[x+.077,eyeY,.304]],.008,skin);
 const tilt=(pose==='stern'?.055:pose==='pleased'?-.016:0)+a.brow*.12;
 line(head,'eyebrow',[[x-sign*.084,.18-tilt,.296],[x,.195,.298],[x+sign*.087,.165+tilt*.25,.278]],.019,hair);
 if(a.maturity>.45){line(head,'under-eye-fold',[[x-.07,.008,.3],[x,-.012,.308],[x+.07,.008,.29]],.006,lips);line(head,'nasolabial-fold',[[sign*.075,-.12,.30],[sign*.11,-.20,.29],[sign*.13,-.27,.25]],.005,lips);}
 }
 for(const sign of [-1,1])ellipsoid(head,'nostril',sign*.029,-.125,.366,.012,.005,.006,lips);
 const smile=pose==='pleased'?.025:pose==='stern'?-.014:0;
 line(head,'upper-lip',[[-.096,-.228+smile,.286],[-.033,-.215,.31],[0,-.224,.32],[.033,-.215,.31],[.096,-.228+smile,.286]],.012,lips);
 line(head,'lower-lip',[[-.09,-.232+smile,.286],[0,-.252,.311],[.09,-.232+smile,.286]],.013,lips);
 const scalp=add(head,'hair-scalp',new T.SphereGeometry(1,48,24,0,Math.PI*2,0,Math.PI*.48),hair,0,.045,-.035);scalp.scale.set(.367,.5,.325);
 ellipsoid(head,'hair-knot',0,.55,-.10,.17,.14,.16,hair);
 for(const sign of [-1,1])line(head,'sideburn',[[sign*.325,.21,.07],[sign*.335,.02,.11],[sign*.295,-.19,.13]],.026,hair);
 if(a.beard!=='none'){
 for(const sign of [-1,1])line(head,'moustache',[[sign*.01,-.172,.326],[sign*.075,-.183,.321],[sign*.115,-.221,.298]],.025,hair);
 const length=a.beard==='long'?.43:.15;const beard=lathe(head,'beard',[[0,-.42-length],[.07,-.38-length*.75],[.15,-.35],[.14,-.3]],hair);beard.position.z=.16;beard.scale.z=.62;
 const strandMaterial=material(a.maturity>.8?'#a6a094':'#3f342a');for(let i=-22;i<=22;i++){const v=i/22;line(head,'beard-strand',[[v*.135,-.32,.24-Math.abs(v)*.045],[v*.105,-.4-length*.35,.25-Math.abs(v)*.035],[v*.035,-.4-length*.83,.17]],.0015,strandMaterial);}
 }
 if(a.maturity>.7)for(let i=0;i<3;i++)line(head,'forehead-crease',[[-.13,.26+i*.035,.27],[0,.27+i*.035,.284],[.13,.26+i*.035,.27]],.004,lips);
 const hat=new T.Group();hat.name='headwear';head.add(hat);const style=wardrobe==='armor'?'helmet':wardrobe==='court'?'cap':a.headwear;
 if(style==='helmet'){const dome=add(hat,'helmet-bowl',new T.SphereGeometry(1,40,20,0,Math.PI*2,0,Math.PI/2),metal,0,.27,-.035);dome.scale.set(.4,.39,.35);line(hat,'helmet-ridge',[[0,.3,.325],[0,.58,.18],[0,.66,-.03],[0,.58,-.24]],.026,trim);}
 else {const cap=lathe(hat,'court-cap',[[.32,.31],[.34,.41],[.29,.68],[.21,.73]],dark);cap.scale.z=.82;const rim=lathe(hat,'cap-band',[[.34,.32],[.345,.33],[.345,.38],[.33,.39]],trim);rim.scale.z=.82;if(style==='crown'){add(hat,'ceremonial-top',new T.BoxGeometry(.64,.065,.58),dark,0,.74,-.01);for(let i=-2;i<=2;i++)line(hat,'crown-gold-rib',[[i*.1,.78,-.24],[i*.1,.78,.24]],.012,trim);}else line(hat,'cap-center-rib',[[0,.41,.275],[0,.7,.19]],.02,trim);}
 const plinth=add(root,'portrait-plinth',new T.CylinderGeometry(.78,.86,.12,64),material('#39433c',.3),0,-.08,0);plinth.scale.z=.65;
 root.updateMatrixWorld(true);return root;
}
export function disposeCharacterModel(root:T.Object3D){const materials=new Set<T.Material>();root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});materials.forEach(m=>m.dispose());releasePortraitSurfaces(root);}
