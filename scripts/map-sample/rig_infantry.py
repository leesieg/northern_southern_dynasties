"""Rig the user-supplied Tripo infantry without changing its source.
Blender 5.2: --background --factory-startup --python this.py -- SOURCE_GLB
Creates a portable skinned GLB, editable packed .blend and offline QA renders.
GLB convention: metres, Y up, +Z forward, sole at zero; no travelling root motion.
"""
import bpy, math, sys, json, hashlib
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion

ROOT=Path(__file__).resolve().parents[2]
SOURCE=Path(sys.argv[sys.argv.index('--')+1])
OUT=ROOT/'public/art/military/infantry-rigged-v1.glb'
BLEND=ROOT/'art/military/infantry-rigged-v1.blend'
QA=ROOT/'.cache/infantry-rig';QA.mkdir(parents=True,exist_ok=True)
OUT.parent.mkdir(parents=True,exist_ok=True);BLEND.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
# Flatten the imported hierarchy, transform front +X to Blender -Y, ground the feet.
transform=Matrix.Translation((0,0,.91)) @ Matrix.Scale(1.82,4) @ Matrix.Rotation(-math.pi/2,4,'Z') @ mesh.matrix_world
mesh.data.transform(transform);mesh.parent=None;mesh.matrix_world=Matrix.Identity(4)
mesh.name='Infantry';mesh.data.name='Infantry original low mesh'
for ob in list(bpy.context.scene.objects):
 if ob!=mesh:bpy.data.objects.remove(ob,do_unlink=True)

bones={}
def bone(name,head,tail,parent=None):bones[name]=(Vector(head),Vector(tail),parent)
bone('Root',(0,0,0),(0,0,.15))
bone('Hips',(0,0,.91),(0,0,1.03),'Root')
bone('Spine',(0,0,1.03),(0,0,1.18),'Hips')
bone('Chest',(0,0,1.18),(0,0,1.36),'Spine')
bone('Neck',(0,0,1.36),(0,0,1.45),'Chest')
bone('Head',(0,0,1.45),(0,0,1.69),'Neck')
bone('Plume',(0,.025,1.69),(0,.05,1.82),'Head')
for side,sign in [('L',1),('R',-1)]:
 def p(x,y,z):return (sign*x,y,z)
 bone('Clavicle.'+side,p(.025,0,1.32),p(.215,0,1.31),'Chest')
 bone('UpperArm.'+side,p(.215,0,1.31),p(.295,-.008,1.095),'Clavicle.'+side)
 bone('Forearm.'+side,p(.295,-.008,1.095),p(.365,-.018,.87),'UpperArm.'+side)
 bone('Hand.'+side,p(.365,-.018,.87),p(.389,-.035,.745),'Forearm.'+side)
 bone('Thigh.'+side,p(.11,0,.91),p(.112,-.025,.455),'Hips')
 bone('Shin.'+side,p(.112,-.025,.455),p(.112,0,.09),'Thigh.'+side)
 bone('Foot.'+side,p(.112,0,.09),p(.112,-.115,.035),'Shin.'+side)
 bone('Toe.'+side,p(.112,-.115,.035),p(.112,-.20,.035),'Foot.'+side)
 for panel,y,x in [('Front',-.13,.10),('Back',.12,.10),('Side',0,.235)]:
  bone('Skirt'+panel+'.'+side,p(x,y,.94),p(x*1.08,y*1.2,.53),'Hips')

arm=bpy.data.armatures.new('Infantry Skeleton');rig=bpy.data.objects.new('InfantryRig',arm);bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);mesh.select_set(False)
bpy.ops.object.mode_set(mode='EDIT')
for name,(head,tail,parent) in bones.items():
 b=arm.edit_bones.new(name);b.head=head;b.tail=tail
 if parent:b.parent=arm.edit_bones[parent]
 b.use_deform=name!='Root'
bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True
for pb in rig.pose.bones:pb.rotation_mode='QUATERNION'
rest={b.name:b.matrix_local.copy() for b in arm.bones}

# Anatomical region weights, with bounded influences. Arm sleeves are separated
# from the torso by distance to their rest chains; skirt panels are not leg skin.
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def segment_distance(p,name):
 a,b,_=bones[name];d=b-a;t=max(0,min(1,(p-a).dot(d)/d.length_squared));return (p-a-t*d).length

def distribute(names,p,power=4):
 w={n:1/max(.018,segment_distance(p,n))**power for n in names};s=sum(w.values());return {n:v/s for n,v in w.items()}
def mix(a,b,t):
 out={k:v*(1-t) for k,v in a.items()}
 for k,v in b.items():out[k]=out.get(k,0)+v*t
 return out
for name in bones:
 if name!='Root':mesh.vertex_groups.new(name=name)
for v in mesh.data.vertices:
 p=v.co;x,y,z=p;side='L' if x>=0 else 'R';ax=abs(x)
 torso=distribute(['Hips','Spine','Chest'],p)
 if z>1.40:
  w=mix({'Neck':1},{'Head':1},smooth(1.40,1.47,z))
  if z>1.70:w=mix(w,{'Plume':1},smooth(1.70,1.77,z))
 elif z>1.32:w=mix(torso,{'Neck':1},smooth(1.32,1.43,z)*(1-smooth(.09,.18,ax)))
 elif z>.94:w=torso
 elif z<.19:
  foot=mix({'Foot.'+side:1},{'Toe.'+side:1},1-smooth(-.14,-.09,y))
  w=mix(foot,{'Shin.'+side:1},smooth(.13,.23,z))
 else:
  leg=distribute(['Thigh.'+side,'Shin.'+side],p,6)
  if z>.44:
   # The long armored skirt remains a coherent surface and gets its own follow-through.
   panels=distribute(['SkirtFront.'+side,'SkirtBack.'+side,'SkirtSide.'+side],p,3)
   w=mix(panels,{'Hips':1},smooth(.82,.96,z))
   w=mix(leg,w,smooth(.43,.47,z))
  else:w=leg
 # Arms/hands outside the body envelope. Smooth shoulder attachment avoids tearing.
 if .70<z<1.40 and ax>.16:
  names=['Clavicle.'+side,'UpperArm.'+side,'Forearm.'+side,'Hand.'+side]
  nearest=min(segment_distance(p,n) for n in names)
  arm_amount=smooth(.16,.24,ax)*(1-smooth(.09,.16,nearest))
  if ax>.29:arm_amount=1
  w=mix(w,distribute(names,p,5),arm_amount)
 w=sorted(((n,a) for n,a in w.items() if a>.0005),key=lambda t:t[1],reverse=True)[:4];total=sum(a for _,a in w)
 for n,a in w:mesh.vertex_groups[n].add([v.index],a/total,'REPLACE')
modifier=mesh.modifiers.new('Infantry skin','ARMATURE');modifier.object=rig;mesh.parent=rig

# Pose authoring, solved in armature space, then exported as ordinary joint keys.
def local(name,translation=(0,0,0),rotation=(0,0,0)):
 pb=rig.pose.bones[name];pb.location=rest[name].to_quaternion().inverted() @ Vector(translation)
 from mathutils import Euler
 # Author anatomical rotations in the character frame, not each bone's roll axes.
 # In particular, arm swing must flex the shoulder rather than twist the humerus.
 basis=rest[name].to_quaternion()
 pb.rotation_quaternion=basis.inverted() @ Euler(rotation,'XYZ').to_quaternion() @ basis;pb.scale=(1,1,1)
def world_pose():
 result={}
 for name,(_,_,parent) in bones.items():
  basis=rig.pose.bones[name].matrix_basis
  result[name]=(result[parent] @ rest[parent].inverted() @ rest[name] @ basis) if parent else rest[name] @ basis
 return result
def point_bone(name,head,tail,world):
 direction=(tail-head).normalized();original=(bones[name][1]-bones[name][0]).normalized()
 q=original.rotation_difference(direction) @ rest[name].to_quaternion()
 wanted=Matrix.Translation(head) @ q.to_matrix().to_4x4();parent=bones[name][2]
 basis=rest[name].inverted() @ (rest[parent] @ world[parent].inverted() if parent else Matrix.Identity(4)) @ wanted
 rig.pose.bones[name].matrix_basis=basis;world[name]=wanted

def foot_path(phase):
 # Constant-speed support prevents skating when the game translates the root.
 # Hermite swing matches support velocity at both ends; lift eases in and out.
 stance=.62;stride=.38;speed=stride/stance
 if phase<stance:
  pitch=-.16*(1-smooth(0,.10,phase))+.30*smooth(.46,stance,phase)
  return -.19+speed*phase,0,pitch
 u=(phase-stance)/(1-stance)
 h00=2*u**3-3*u*u+1;h10=u**3-2*u*u+u;h01=-2*u**3+3*u*u;h11=u**3-u*u
 y=h00*.19+h10*speed*(1-stance)+h01*(-.19)+h11*speed*(1-stance)
 return y,.048*math.sin(math.pi*u)**2,.30*(1-smooth(0,.45,u))-.16*smooth(.38,1,u)

# Contact heights use the actual boot sole, including its authored unevenness.
sole={side:[v.co-Vector((sign*.112,0,.09)) for v in mesh.data.vertices if v.co.z<.06 and v.co.x*sign>0] for side,sign in [('L',1),('R',-1)]}
def pose(kind,t):
 for n in bones:local(n)
 wave=math.sin(math.tau*t)
 if kind=='Idle':
  # Offset breathing phases: chest, shoulders and head should not pulse in unison.
  breath=math.sin(math.tau*t-.4)
  local('Hips',(.002*wave,0,-.009+.0018*breath));local('Spine',rotation=(.003*breath,.002*wave,0));local('Chest',rotation=(.004*breath,0,.003*wave));local('Head',rotation=(-.002*breath,.004*math.sin(math.tau*t+.7),-.002*wave));local('Plume',rotation=(.008*math.sin(math.tau*t-.8),0,0))
  for side,sign in [('L',1),('R',-1)]:
   local('UpperArm.'+side,rotation=(.025+.004*breath,sign*.26,0));local('Forearm.'+side,rotation=(-.12+.004*math.sin(math.tau*t-.6),0,0));local('Hand.'+side,rotation=(.035,0,0))
 else:
  # Low in double support, high when the torso passes over the planted foot.
  # Lateral transfer follows the support leg; shoulders counter the pelvis turn.
  turn=math.cos(math.tau*t)
  local('Hips',(.014*wave,0,-.023-.013*math.cos(2*math.tau*t)),(.012,.018*wave,.032*turn))
  local('Spine',rotation=(.012,-.014*wave,-.045*turn));local('Chest',rotation=(0,-.008*wave,-.022*turn));local('Head',rotation=(-.016,.004*wave,.027*turn));local('Plume',rotation=(.020*math.sin(2*math.tau*t-.7),0,0))
  for side,sign in [('L',1),('R',-1)]:
   arm=sign*math.cos(math.tau*t-.10)
   local('UpperArm.'+side,rotation=(.025+.24*arm,sign*.26,sign*.008*wave));local('Forearm.'+side,rotation=(-.14+.055*arm,0,0));local('Hand.'+side,rotation=(.035+.015*sign*math.cos(math.tau*t-.45),0,0))
   phase=(t+(0 if side=='L' else .5))%1
   for panel in ['Front','Back','Side']:
    local('Skirt'+panel+'.'+side,rotation=(-.095*math.cos(math.tau*phase-.22),0,sign*.012*math.sin(math.tau*phase-.22)))
 world=world_pose()
 for side,sign in [('L',1),('R',-1)]:
  phase=(t+(0 if side=='L' else .5))%1
  y,lift,tilt=foot_path(phase) if kind=='Walk' else (0,0,0)
  hip=(world['Hips'] @ rest['Hips'].inverted()) @ bones['Thigh.'+side][0]
  delta_rot=Quaternion((1,0,0),tilt)
  sole_height=-min((delta_rot@p).z for p in sole[side])
  ankle=Vector((sign*.112,y,sole_height+lift));a=(bones['Thigh.'+side][1]-bones['Thigh.'+side][0]).length;b=(bones['Shin.'+side][1]-bones['Shin.'+side][0]).length
  delta=ankle-hip;d=min(delta.length,a+b-.0001);axis=delta.normalized()
  along=(a*a-b*b+d*d)/(2*d);bend=math.sqrt(max(0,a*a-along*along));forward=Vector((0,-1,0));forward=(forward-axis*forward.dot(axis)).normalized();knee=hip+axis*along+forward*bend
  point_bone('Thigh.'+side,hip,knee,world);point_bone('Shin.'+side,knee,ankle,world)
  # Heel contact rolls into full support, then toe-off, instead of a flat raised boot.
  foot_tail=ankle+delta_rot@(bones['Foot.'+side][1]-bones['Foot.'+side][0])
  point_bone('Foot.'+side,ankle,foot_tail,world)
  local('Toe.'+side)

scene=bpy.context.scene;scene.render.fps=30
rig.animation_data_create();actions={}
for kind,last in [('Idle',73),('Walk',37)]:
 action=bpy.data.actions.new(kind);rig.animation_data.action=action;actions[kind]=action
 for frame in range(1,last+1):
  scene.frame_set(frame);pose(kind,(frame-1)/(last-1))
  for pb in rig.pose.bones:
   pb.keyframe_insert('location',frame=frame,group=pb.name);pb.keyframe_insert('rotation_quaternion',frame=frame,group=pb.name);pb.keyframe_insert('scale',frame=frame,group=pb.name)
 action.use_fake_user=True
 track=rig.animation_data.nla_tracks.new();track.name=kind;strip=track.strips.new(kind,1,action);strip.name=kind;track.mute=True
rig.animation_data.action=actions['Idle'];scene.frame_set(1)
# Editable source contains the textured mesh, named joints and independent clips.
for image in bpy.data.images:
 if image.source=='FILE':image.pack()
scene.frame_end=73
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT),use_selection=True,export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_def_bones=False,export_anim_single_armature=True,export_anim_slide_to_zero=True)

# Numerical deformation QA on the authored mesh, before independent GLB tests.
report={'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'bones':len(bones),'triangles':sum(len(p.vertices)-2 for p in mesh.data.polygons),'clips':{}}
for kind,last in [('Idle',73),('Walk',37)]:
 rig.animation_data.action=actions[kind];lo=100;hi=-100;max_weights=max(len(v.groups) for v in mesh.data.vertices)
 for f in range(1,last+1):
  scene.frame_set(f);dg=bpy.context.evaluated_depsgraph_get();ev=mesh.evaluated_get(dg);points=[ev.matrix_world@v.co for v in ev.data.vertices];lo=min(lo,min(v.z for v in points));hi=max(hi,max(v.z for v in points))
 report['clips'][kind]={'seconds':(last-1)/30,'min_z':lo,'max_z':hi,'max_influences':max_weights}
(QA/'rig-report.json').write_text(json.dumps(report,indent=2));print('RIG_REPORT',json.dumps(report))

# Offline asset inspection only; not a game UI acceptance test.
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=512;scene.render.resolution_y=640;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Inspection World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.16,.18,.20,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
scene.view_settings.view_transform='AgX'
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
for pos,power,size in [((3,-4,5),420,3),((-3,1,3),240,3),((2,3,3),180,2)]:
 d=bpy.data.lights.new('Inspection light','AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(d.name,d);scene.collection.objects.link(o);o.location=pos;aim(o,(0,0,.9))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.01));floor=bpy.context.object;mat=bpy.data.materials.new('Inspection floor');mat.diffuse_color=(.13,.145,.16,1);floor.data.materials.append(mat)
d=bpy.data.cameras.new('Inspection camera');camera=bpy.data.objects.new(d.name,d);scene.collection.objects.link(camera);scene.camera=camera;d.type='ORTHO';d.ortho_scale=2.14
for name,kind,frame,position in [('idle','Idle',19,(3,-5,2)),('walk-contact','Walk',1,(3,-5,2)),('walk-pass','Walk',10,(3,-5,2)),('walk-lift','Walk',28,(3,-5,2)),('walk-side','Walk',28,(5,-.2,1.4))]:
 rig.animation_data.action=actions[kind];scene.frame_set(frame);camera.location=position;aim(camera,(0,0,.90));scene.render.filepath=str(QA/(name+'.png'));bpy.ops.render.render(write_still=True)
