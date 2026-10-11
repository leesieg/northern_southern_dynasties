"""Build four campaign travelers from supplied static GLBs (sources stay untouched).
Run Blender --background --factory-startup --python scripts/map-sample/rig_travelers.py -- SOURCE_DIRECTORY
Y-up/+Z-forward GLB, feet at zero, Idle/Walk without root translation.
"""
import bpy, math, sys, json, hashlib
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion, Euler
ROOT=Path(__file__).resolve().parents[2]
SOURCE=Path(sys.argv[sys.argv.index('--')+1])
OUT=ROOT/'public/art/campaign/travelers';OUT.mkdir(parents=True,exist_ok=True)
EDIT=ROOT/'art/travelers';EDIT.mkdir(parents=True,exist_ok=True)
QA=ROOT/'.cache/travelers';QA.mkdir(parents=True,exist_ok=True)
profiles=[('han-female','汉文化旅行女',True,.14,.94),('han-male','汉文化旅行男',False,.29,.90),('xianbei-female','鲜卑文化旅行女',False,.68,.87),('xianbei-male','鲜卑文化旅行男',False,.62,.87)]
reports=[]
for key,source_name,clasped,hem,hip in profiles:
 source=SOURCE/('风云南北朝-'+source_name+'.glb')
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(source))
 mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
 mesh.data.transform(mesh.matrix_world);mesh.parent=None;mesh.matrix_world=Matrix.Identity(4)
 lo=Vector(tuple(min(v.co[i] for v in mesh.data.vertices) for i in range(3)));hi=Vector(tuple(max(v.co[i] for v in mesh.data.vertices) for i in range(3)))
 mesh.data.transform(Matrix.Scale(1.72/(hi.z-lo.z),4)@Matrix.Translation(Vector((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z))))
 for o in list(bpy.context.scene.objects):
  if o!=mesh:bpy.data.objects.remove(o,do_unlink=True)
 mesh.name=key;original_faces=sum(len(p.vertices)-2 for p in mesh.data.polygons)
 bpy.context.view_layer.objects.active=mesh;mesh.select_set(True)
 dec=mesh.modifiers.new('Map detail budget','DECIMATE');dec.ratio=15000/original_faces;dec.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=dec.name)
 for image in bpy.data.images:
  if image.type=='IMAGE' and image.size[0]>1024:image.scale(1024,1024);image.pack()
 bones={}
 def bone(name,head,tail,parent=None):bones[name]=(Vector(head),Vector(tail),parent)
 bone('Root',(0,0,0),(0,0,.1));bone('Hips',(0,0,hip),(0,0,hip+.1),'Root');bone('Spine',(0,0,hip+.1),(0,0,1.16),'Hips');bone('Chest',(0,0,1.16),(0,0,1.34),'Spine');bone('Neck',(0,0,1.34),(0,0,1.43),'Chest');bone('Head',(0,0,1.43),(0,0,1.70),'Neck')
 for side,sign in [('L',1),('R',-1)]:
  def p(x,y,z):return(sign*x,y,z)
  elbow=p(.20,-.04,1.10) if clasped else p(.235,0,1.08)
  wrist=p(.07,-.16,.98) if clasped else p(.26,-.035,.88)
  bone('Clavicle.'+side,p(.025,0,1.31),p(.17,0,1.31),'Chest');bone('UpperArm.'+side,p(.17,0,1.31),elbow,'Clavicle.'+side);bone('Forearm.'+side,elbow,wrist,'UpperArm.'+side);bone('Hand.'+side,wrist,p(.025,-.18,.93) if clasped else p(.27,-.045,.79),'Forearm.'+side)
  bone('Thigh.'+side,p(.09,0,hip),p(.09,-.018,.43),'Hips');bone('Shin.'+side,p(.09,-.018,.43),p(.09,0,.085),'Thigh.'+side);bone('Foot.'+side,p(.09,0,.085),p(.09,-.13,.035),'Shin.'+side)
  for panel,y,x in [('Front',-.09,.07),('Back',.09,.07),('Side',0,.15)]:bone('Cloth'+panel+'.'+side,p(x,y,hip),p(x,y,hem),'Hips')
 arm=bpy.data.armatures.new(key+' skeleton');rig=bpy.data.objects.new(key+' rig',arm);bpy.context.collection.objects.link(rig)
 mesh.select_set(False);rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
 for name,(head,tail,parent) in bones.items():
  b=arm.edit_bones.new(name);b.head=head;b.tail=tail
  if parent:b.parent=arm.edit_bones[parent]
  b.use_deform=name!='Root'
 bpy.ops.object.mode_set(mode='OBJECT')
 for pb in rig.pose.bones:pb.rotation_mode='QUATERNION'
 rest={b.name:b.matrix_local.copy() for b in arm.bones}
 def smooth(a,b,x):
  t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
 def distance(p,n):
  a,b,_=bones[n];d=b-a;t=max(0,min(1,(p-a).dot(d)/d.length_squared));return(p-a-t*d).length
 def distribute(names,p,power=4):
  weights={n:1/max(.016,distance(p,n))**power for n in names};s=sum(weights.values());return {n:v/s for n,v in weights.items()}
 def mix(a,b,t):
  result={k:v*(1-t) for k,v in a.items()}
  for k,v in b.items():result[k]=result.get(k,0)+v*t
  return result
 for n in bones:
  if n!='Root':mesh.vertex_groups.new(name=n)
 for v in mesh.data.vertices:
  p=v.co;x,y,z=p;side='L' if x>=0 else 'R';ax=abs(x)
  torso=distribute(['Hips','Spine','Chest'],p)
  if z>=1.43:w={'Head':1}
  elif z>1.32:w=mix(torso,{'Neck':1},smooth(1.32,1.43,z));w=mix(w,{'Head':1},smooth(1.38,1.43,z))
  elif z>=hip:w=torso
  elif z<.13:w=mix({'Foot.'+side:1},{'Shin.'+side:1},smooth(.07,.15,z))
  else:
   leg=distribute(['Thigh.'+side,'Shin.'+side],p,6)
   # Blend skirt panels across the centre seam; never pull a long skirt into two legs.
   panels=distribute([n for n in bones if n.startswith('Cloth')],p,3)
   cloth=mix(panels,{'Hips':1},smooth(hip-.16,hip,z))
   w=mix(leg,cloth,smooth(hem-.035,hem+.025,z))
  if .75<z<1.37:
   names=['Clavicle.'+side,'UpperArm.'+side,'Forearm.'+side,'Hand.'+side];nearest=min(distance(p,n) for n in names)
   amount=smooth(.12,.21,ax)*(1-smooth(.085,.17,nearest))
   if clasped and y<-.10 and .89<z<1.12:amount=max(amount,(1-smooth(.06,.12,nearest))*smooth(-.10,-.17,y))
   w=mix(w,distribute(names,p,5),amount)
  weights=sorted(((n,a) for n,a in w.items() if a>.0001),key=lambda t:t[1],reverse=True)[:4];total=sum(a for _,a in weights)
  for n,a in weights:mesh.vertex_groups[n].add([v.index],a/total,'REPLACE')
 mod=mesh.modifiers.new('Traveler skin','ARMATURE');mod.object=rig;mesh.parent=rig
 def local(name,translation=(0,0,0),rotation=(0,0,0)):
  pb=rig.pose.bones[name];basis=rest[name].to_quaternion();pb.location=basis.inverted()@Vector(translation);pb.rotation_quaternion=basis.inverted()@Euler(rotation,'XYZ').to_quaternion()@basis;pb.scale=(1,1,1)
 def world_pose():
  result={}
  for name,(_,_,parent) in bones.items():result[name]=(result[parent]@rest[parent].inverted()@rest[name]@rig.pose.bones[name].matrix_basis)if parent else rest[name]@rig.pose.bones[name].matrix_basis
  return result
 def point_bone(name,head,tail,world):
  original=(bones[name][1]-bones[name][0]).normalized();q=original.rotation_difference((tail-head).normalized())@rest[name].to_quaternion();wanted=Matrix.Translation(head)@q.to_matrix().to_4x4();parent=bones[name][2]
  rig.pose.bones[name].matrix_basis=rest[name].inverted()@(rest[parent]@world[parent].inverted()if parent else Matrix.Identity(4))@wanted;world[name]=wanted
 sole={side:[v.co-Vector((sign*.09,0,.085))for v in mesh.data.vertices if v.co.z<.055 and v.co.x*sign>0]for side,sign in [('L',1),('R',-1)]}
 stride=.22 if clasped else .32
 def foot_path(phase):
  stance=.62;speed=stride/stance;half=stride/2
  if phase<stance:return -half+speed*phase,0,-.08*(1-smooth(0,.10,phase))+.16*smooth(.48,stance,phase)
  u=(phase-stance)/(1-stance);y=(2*u**3-3*u*u+1)*half+(u**3-2*u*u+u)*speed*(1-stance)+(-2*u**3+3*u*u)*(-half)+(u**3-u*u)*speed*(1-stance)
  return y,.034*math.sin(math.pi*u)**2,.16*(1-smooth(0,.45,u))-.08*smooth(.4,1,u)
 def pose(kind,t):
  for n in bones:local(n)
  wave=math.sin(math.tau*t);turn=math.cos(math.tau*t);walking=kind=='Walk'
  local('Hips',(.006*wave if walking else 0,0,-.016-.006*math.cos(2*math.tau*t)if walking else -.004),(.008 if walking else 0,.008*wave if walking else 0,.018*turn if walking else 0))
  local('Spine',rotation=(.006*wave,0,-.021*turn if walking else 0));local('Chest',rotation=(.004*wave,0,-.009*turn if walking else 0));local('Head',rotation=(-.004*wave,0,.01*turn if walking else 0))
  for side,sign in [('L',1),('R',-1)]:
   if not clasped:
    local('UpperArm.'+side,rotation=(.17*sign*turn if walking else .004*wave,0,0));local('Forearm.'+side,rotation=(-.06+.03*sign*turn if walking else -.025,0,0))
   # Clasped hands keep their authored joined pose; the robe uses a quiet short step.
   for panel in ['Front','Back','Side']:local('Cloth'+panel+'.'+side,rotation=(-.028*sign*math.cos(math.tau*t-.2)if walking else .002*wave,0,0))
  world=world_pose()
  for side,sign in [('L',1),('R',-1)]:
   y,lift,tilt=foot_path((t+(0 if side=='L' else .5))%1)if walking else(0,0,0)
   hip_at=(world['Hips']@rest['Hips'].inverted())@bones['Thigh.'+side][0];rot=Quaternion((1,0,0),tilt);sole_height=-min((rot@p).z for p in sole[side]);ankle=Vector((sign*.09,y,sole_height+lift))
   a=(bones['Thigh.'+side][1]-bones['Thigh.'+side][0]).length;b=(bones['Shin.'+side][1]-bones['Shin.'+side][0]).length;delta=ankle-hip_at;d=min(delta.length,a+b-.0001);axis=delta.normalized();along=(a*a-b*b+d*d)/(2*d);bend=math.sqrt(max(0,a*a-along*along));forward=Vector((0,-1,0));forward=(forward-axis*forward.dot(axis)).normalized();knee=hip_at+axis*along+forward*bend
   point_bone('Thigh.'+side,hip_at,knee,world);point_bone('Shin.'+side,knee,ankle,world);point_bone('Foot.'+side,ankle,ankle+rot@(bones['Foot.'+side][1]-bones['Foot.'+side][0]),world)
 scene=bpy.context.scene;scene.render.fps=30;rig.animation_data_create();actions={}
 for kind,last in [('Idle',73),('Walk',37)]:
  action=bpy.data.actions.new(kind);rig.animation_data.action=action;actions[kind]=action
  for frame in range(1,last+1):
   scene.frame_set(frame);pose(kind,(frame-1)/(last-1))
   for pb in rig.pose.bones:
    pb.keyframe_insert('location',frame=frame,group=pb.name);pb.keyframe_insert('rotation_quaternion',frame=frame,group=pb.name);pb.keyframe_insert('scale',frame=frame,group=pb.name)
  action.use_fake_user=True;track=rig.animation_data.nla_tracks.new();track.name=kind;strip=track.strips.new(kind,1,action);strip.name=kind;track.mute=True
 rig.animation_data.action=actions['Idle'];scene.frame_set(1);scene.frame_end=73
 for image in bpy.data.images:
  if image.source=='FILE':image.pack()
 bpy.context.preferences.filepaths.save_version=0
 bpy.ops.wm.save_as_mainfile(filepath=str(EDIT/(key+'.blend')))
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=rig
 for lod,target in [('near',None),('far',4000)]:
  original_images=[]
  if target:
   for material in mesh.data.materials:
    for node in material.node_tree.nodes:
     if node.type=='TEX_IMAGE' and node.image:
      old=node.image;small=old.copy();small.scale(512,512);small.pack();original_images.append((node,old,small));node.image=small
   bpy.context.view_layer.objects.active=mesh;dec=mesh.modifiers.new('Distant detail budget','DECIMATE');dec.ratio=target/sum(len(p.vertices)-2 for p in mesh.data.polygons);dec.use_collapse_triangulate=True
  bpy.ops.export_scene.gltf(filepath=str(OUT/(key+'-'+lod+'.glb')),use_selection=True,export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_def_bones=False,export_anim_single_armature=True,export_anim_slide_to_zero=True,export_apply=bool(target))
  if target:
   mesh.modifiers.remove(dec)
   for node,old,small in original_images:node.image=old;bpy.data.images.remove(small)
 report={'model':key,'source':source.name,'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'original_triangles':original_faces,'triangles':sum(len(p.vertices)-2 for p in mesh.data.polygons),'bones':len(bones),'texture_pixels':{'near':1024,'far':512},'clips':{}}
 for kind,last in [('Idle',73),('Walk',37)]:
  rig.animation_data.action=actions[kind];lo=100;hi=-100
  for frame in range(1,last+1):
   scene.frame_set(frame);ev=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());points=[ev.matrix_world@v.co for v in ev.data.vertices];lo=min(lo,min(v.z for v in points));hi=max(hi,max(v.z for v in points))
  report['clips'][kind]={'seconds':(last-1)/30,'min_z':lo,'max_z':hi}
 reports.append(report);(QA/'rig-report.json').write_text(json.dumps(reports,indent=2,ensure_ascii=False))
 scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.render.resolution_x=320;scene.render.resolution_y=440;scene.render.resolution_percentage=100;scene.world=bpy.data.worlds.new('Inspection');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.4,.4,.4,1)
 def aim(o):o.rotation_euler=(Vector((0,0,.86))-o.location).to_track_quat('-Z','Y').to_euler()
 for pos in [(2,-3,4),(-2,2,3)]:
  d=bpy.data.lights.new('Key','AREA');d.energy=300;d.size=3;o=bpy.data.objects.new('Key',d);scene.collection.objects.link(o);o.location=pos;aim(o)
 d=bpy.data.cameras.new('Camera');camera=bpy.data.objects.new('Camera',d);scene.collection.objects.link(camera);scene.camera=camera;d.type='ORTHO';d.ortho_scale=2.05
 for frame in [1,10,19,28]:
  rig.animation_data.action=actions['Walk'];scene.frame_set(frame);camera.location=(2,-4,1.4);aim(camera);scene.render.filepath=str(QA/(key+'-walk-'+str(frame)+'.png'));bpy.ops.render.render(write_still=True)
 print('TRAVELER_REPORT',json.dumps(report),flush=True)
(OUT/'sources.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2)+'\n')
