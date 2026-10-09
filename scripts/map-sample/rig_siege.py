"""Turn the user's cart to Blender -Y / GLB +Z and build a portable articulated siege crew.
Blender --background --python-exit-code 1 --python scripts/map-sample/rig_siege.py -- SOURCE_GLB
Source remains untouched. Mechanism and motions are game art, not a historical reconstruction.
"""
import bpy,bmesh,math,sys,json,hashlib
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion
ROOT=Path(__file__).resolve().parents[2];SOURCE=Path(sys.argv[sys.argv.index('--')+1]);QA=ROOT/'.cache/siege-rig';QA.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
bpy.ops.import_scene.gltf(filepath=str(SOURCE));cart=next(o for o in bpy.context.scene.objects if o.type=='MESH')
# The long throwing arm belongs behind the axle: it swings over the axle toward the crew's -Y facing.
cart.data.transform(Matrix.Rotation(-math.pi/2,4,'Z')@cart.matrix_world);cart.parent=None;cart.matrix_world=Matrix.Identity(4)
for o in list(bpy.context.scene.objects):
 if o!=cart:bpy.data.objects.remove(o,do_unlink=True)
vs=[v.co for v in cart.data.vertices];lo=Vector([min(p[i] for p in vs) for i in range(3)]);hi=Vector([max(p[i] for p in vs) for i in range(3)]);scale=2.2/(hi.z-lo.z)
cart.data.transform(Matrix.Scale(scale,4)@Matrix.Translation((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z)));cart.name='Chassis'
bpy.context.view_layer.objects.active=cart;dec=cart.modifiers.new('Map mesh budget','DECIMATE');dec.ratio=min(1,20000/len(cart.data.polygons));bpy.ops.object.modifier_apply(modifier=dec.name)
for im in bpy.data.images:
 if im.type=='IMAGE' and im.size[0]>1024:im.scale(1024,1024);im.pack()
for mat in cart.data.materials:
 if mat.use_nodes:
  p=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
  if p and 'Specular Tint' in p.inputs:p.inputs['Specular Tint'].default_value=(1,1,1,1)
# Remove fused wheels/upper mechanism, instead of rotating incomplete triangles from the scan.
# New outer beams close the wheel cuts; a capped axle cradle closes the upper cut.
bm=bmesh.new();bm.from_mesh(cart.data)
cut=bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=(0,0,.72),plane_no=(0,0,1),clear_inner=True)
bmesh.ops.holes_fill(bm,edges=[e for e in cut['geom_cut'] if isinstance(e,bmesh.types.BMEdge) and e.is_boundary],sides=0)
def replaced(p):
 return p.z>1.43 or (p.y>.70 and p.z>.70) or (p.y>.20 and p.z>1.12+.6*p.y)
bmesh.ops.delete(bm,geom=[f for f in bm.faces if replaced(f.calc_center_median())],context='FACES');bm.to_mesh(cart.data);bm.free()
parts={'Chassis':[cart]};bones={}
def bone(n,p,q,parent='SiegeRoot'):bones[n]=(Vector(p),Vector(q),parent)
bone('SiegeRoot',(0,0,0),(0,0,.15),None);bone('Chassis',(0,0,.2),(.15,0,.2))
def material(n,color,rough=.75,metal=0):
 m=bpy.data.materials.new(n);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
wood=material('Weathered replacement timber',(.27,.17,.095));iron=material('Forged iron bands',(.065,.07,.075),.72,.72);rope=material('Hemp rope',(.28,.20,.10));leather=material('Sling leather',(.075,.042,.021));stone=material('Stone',(.35,.33,.28))
# A small embedded wood-grain texture also works in GLB (procedural nodes alone would not).
im=bpy.data.images.new('Rebuilt timber grain',width=256,height=256);pixels=[]
for y in range(256):
 for x in range(256):
  grain=.90+.09*math.sin(x*1.73+.6*math.sin(y*.022))+.055*math.sin(x*.41+math.sin(y*.015))+.035*math.sin(x*13.4+y*3.8);pixels.extend((.31*grain,.205*grain,.12*grain,1))
im.pixels=pixels;im.pack();node=wood.node_tree.nodes.new('ShaderNodeTexImage');node.image=im;wood.node_tree.links.new(node.outputs['Color'],wood.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
def keep(o,n,mat):
 o.data.materials.clear();o.data.materials.append(mat);bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);parts.setdefault(n,[]).append(o);return o

def bar(n,a,b,width,mat,depth=None):
 a,b=Vector(a),Vector(b);bpy.ops.mesh.primitive_cube_add(size=1,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();o.scale=(width,depth or width,(b-a).length);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 bevel=o.modifiers.new('Worn edges','BEVEL');bevel.width=min(width*.10,.012);bevel.segments=2;bpy.ops.object.modifier_apply(modifier=bevel.name);return keep(o,n,mat)
def cylinder(n,a,b,r,mat,vertices=16):
 a,b=Vector(a),Vector(b);bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=(b-a).length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return keep(o,n,mat)
def ball(n,p,r,mat):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=r,location=p);return keep(bpy.context.object,n,mat)
def ring(n,c,r,w,mat,inner,steps=64):
 # Closed bevelled ring, axis X. No scan fragments can detach as it rotates.
 profile=[(-w,inner+.01),(-w+.008,inner), (w-.008,inner),(w,inner+.01),(w,r-.01),(w-.008,r),(-w+.008,r),(-w,r-.01)];verts=[];faces=[]
 for i in range(steps):
  t=math.tau*i/steps
  for x,rad in profile:verts.append((c.x+x,c.y+rad*math.cos(t),c.z+rad*math.sin(t)))
 for i in range(steps):
  for j in range(8):faces.append((i*8+j,((i+1)%steps)*8+j,((i+1)%steps)*8+(j+1)%8,i*8+(j+1)%8))
 data=bpy.data.meshes.new(n+' ring');data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new(n+' ring',data);bpy.context.collection.objects.link(o);keep(o,n,mat)
centers={};radii={}
for side,sign in [('L',1),('R',-1)]:
 # Equal rolling radii keep all four wheels synchronized without sliding or a seam reset.
 for end,y,r in [('Front',-.78,.30),('Rear',.58,.30)]:
  n='Wheel'+side+end;c=Vector((sign*.49,y,r));centers[n]=c;radii[n]=r;bone(n,c,c+Vector((.15,0,0)))
  ring(n,c,r-.012,.056,wood,r*.72);ring(n,c,r,.063,iron,r-.020)
  cylinder(n,c-Vector((.10,0,0)),c+Vector((.10,0,0)),.077,wood);cylinder(n,c-Vector((.105,0,0)),c+Vector((.105,0,0)),.045,iron)
  for i in range(10):
   t=math.tau*i/10;d=Vector((0,math.cos(t),math.sin(t)));bar(n,c+d*.06,c+d*(r-.031),.038,wood,.048)
  for i in range(12):
   t=math.tau*i/12;p=c+Vector((sign*.067,(r-.04)*math.cos(t),(r-.04)*math.sin(t)));ball(n,p,.012,iron)
for y in [-.78,.58]:
 cylinder('Chassis',(-.60,y,.30),(.60,y,.30),.045,iron);bar('Chassis',(-.36,y,.36),(.36,y,.36),.11,wood)
for sign in [-1,1]:
 bar('Chassis',(sign*.32,-1.02,.36),(sign*.32,.91,.36),.12,wood)
 for y in [-.78,.58]:bar('Chassis',(sign*.32,y-.045,.30),(sign*.32,y+.045,.45),.13,iron)
 for y in [-.78,.64]:bar('Chassis',(sign*.27,y,.41),(sign*.27,y*.55,.85),.13,wood)
 bar('Chassis',(sign*.23,.02,.40),(sign*.23,.02,.80),.12,wood)
 cylinder('Chassis',(sign*.20,-.75,.64),(sign*.20,-.10,1.24),.012,rope,8)
cylinder('Chassis',(-.32,-.75,.64),(.32,-.75,.64),.072,wood,24)
for i in range(21):
 x=-.20+i*.02
 # Close-wound rope sleeve on the fixed transport winch.
 ring('Chassis',Vector((x,-.75,.64)),.083,.009,rope,.068,12)
pivot=Vector((0,.02,1.42));tip=pivot+Vector((0,.86,.79));short=pivot+Vector((0,-.25,-.23));bone('ThrowArm',pivot,pivot+Vector((.15,0,0)))
cylinder('Chassis',(-.38,.02,1.42),(.38,.02,1.42),.075,iron)
bar('ThrowArm',short,tip,.11,wood,.13)
for u in [0,.32,.68,.94]:
 p=short.lerp(tip,u);d=(tip-short).normalized()*.022;bar('ThrowArm',p-d,p+d,.137,iron,.157)
for sign in [-1,1]:ball('Chassis',(sign*.39,.02,1.42),.071,iron)
# Two ropes and pouch are independent rigid bones with endpoints posed every sampled frame.
pouch=Vector((0,1.23,1.07));bone('Pouch',pouch,pouch+Vector((.15,0,0)))
profile=[(.01,-.10),(.09,-.08),(.15,-.03),(.18,.045),(.162,.043),(.14,-.025),(.075,-.065),(.01,-.08)];verts=[];faces=[]
for i in range(24):
 a=math.tau*i/24
 for r,z in profile:verts.append(pouch+Vector((r*math.cos(a),r*.7*math.sin(a),z)))
for i in range(24):
 for j in range(8):faces.append((i*8+j,((i+1)%24)*8+j,((i+1)%24)*8+(j+1)%8,i*8+(j+1)%8))
data=bpy.data.meshes.new('Open leather sling');data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new('Open leather sling',data);bpy.context.collection.objects.link(o);keep(o,'Pouch',leather)
bone('Projectile',pouch,pouch+Vector((.15,0,0)));ball('Projectile',pouch+Vector((0,0,.045)),.085,stone)
for side,sign in [('L',1),('R',-1)]:
 start=tip+Vector((sign*.07,0,0));end=pouch+Vector((sign*.12,0,.03));n='Sling'+side;bone(n,start,end);cylinder(n,start,end,.010,rope,8)
# Small work tray carries a loading stone. The animated stone is held by the loader before placement.
tray=Vector((-.56,1.02,1.02));bar('Chassis',(-.36,.80,.36),tray,.055,wood);bar('Chassis',tray+Vector((-.18,0,0)),tray+Vector((.18,0,0)),.18,wood,.045)
shifts={'CrewL':Vector((.86,.10,0)),'CrewR':Vector((-.76,1.00,0))}
grips={}
for prefix,shift in shifts.items():
 y=shift.y-.26;grips[prefix]=[(shift.x-.12,y,1.01),(shift.x+.12,y,1.01)]
 for x in [shift.x-.12,shift.x+.12]:bar('Chassis',(math.copysign(.32,x),y,.43),(x,y,.98),.038,wood)
 bar('Chassis',(shift.x-.19,y,1.01),(shift.x+.19,y,1.01),.045,wood)
# Hauling rope from short arm to a grip: it lengthens / turns to preserve attachment.
haul=pivot+Vector((0,-.24,-.22));hand=Vector(grips['CrewL'][0]);bone('HaulRope',haul,hand);cylinder('HaulRope',haul,hand,.012,rope,8)
with bpy.data.libraries.load(str(ROOT/'art/military/infantry-rigged-v1.blend'),link=False) as (src,dst):dst.objects=['InfantryRig','Infantry']
for o in dst.objects:bpy.context.collection.objects.link(o)
source_rig=bpy.data.objects['InfantryRig'];source_mesh=bpy.data.objects['Infantry'];source_actions={name:bpy.data.actions[name] for name in ['Idle','Walk']}
for track in source_rig.animation_data.nla_tracks:track.mute=True
source_rig.animation_data.action=None
for pb in source_rig.pose.bones:pb.matrix_basis=Matrix.Identity(4)
for prefix,shift in shifts.items():
 for src in source_rig.data.bones:bone(prefix+'_'+src.name,src.head_local+shift,src.tail_local+shift,prefix+'_'+src.parent.name if src.parent else 'SiegeRoot')
arm=bpy.data.armatures.new('Siege crew skeleton');rig=bpy.data.objects.new('SiegeRig',arm);bpy.context.collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
for n,(p,q,parent) in bones.items():
 b=arm.edit_bones.new(n);b.head=p;b.tail=q
 if parent:b.parent=arm.edit_bones[parent]
 # Crew rest roll must match the source mesh and sampled local rotations.
 if n.startswith(('CrewL_','CrewR_')):
  prefix,src=n.split('_',1);b.matrix=Matrix.Translation(shifts[prefix])@source_rig.data.bones[src].matrix_local;b.length=source_rig.data.bones[src].length
bpy.ops.object.mode_set(mode='OBJECT');rest={b.name:b.matrix_local.copy() for b in arm.bones}
for pb in rig.pose.bones:pb.rotation_mode='QUATERNION'
for n,objects in parts.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();ob=objects[0];ob.name=n+'Mesh'
 ob.vertex_groups.new(name=n).add(list(range(len(ob.data.vertices))),1,'REPLACE');mod=ob.modifiers.new('Rigid articulated part','ARMATURE');mod.object=rig;ob.parent=rig
for prefix,shift in shifts.items():
 ob=source_mesh.copy();ob.data=source_mesh.data.copy();bpy.context.collection.objects.link(ob);ob.name=prefix;ob.parent=rig;ob.matrix_world=Matrix.Identity(4);ob.data.transform(Matrix.Translation(shift))
 for group in ob.vertex_groups:group.name=prefix+'_'+group.name
 for mod in ob.modifiers:
  if mod.type=='ARMATURE':mod.object=rig
scene=bpy.context.scene;scene.render.fps=30;rig.animation_data_create();actions={}
def smooth(a,b,t):
 u=max(0,min(1,(t-a)/(b-a)));return u*u*(3-2*u)
def sling_swing(t):
 # From the +X side, +Y screen-right turns the hanging pouch counterclockwise.
 # Keep that direction throughout the loaded throw, then ease back only after release.
 # Carry the sling clear of the beam; return it after the arm passes back through vertical.
 return 1.2*smooth(3.9,4.48,t)*(1-smooth(6.4,7.7,t))
def pose_world(n,matrix):
 p=arm.bones[n].parent
 parent=rig.pose.bones[p.name].matrix if p else Matrix.Identity(4)
 rig.pose.bones[n].matrix_basis=rest[n].inverted()@(rest[p.name]@parent.inverted() if p else Matrix.Identity(4))@matrix
 bpy.context.view_layer.update()
def rotate(n,angle):rig.pose.bones[n].rotation_quaternion=Quaternion((0,1,0),angle)
def stretch(n,a,b):
 a,b=Vector(a),Vector(b);direction=b-a;original=bones[n][1]-bones[n][0];q=original.rotation_difference(direction.normalized())@rest[n].to_quaternion();m=Matrix.Translation(a)@q.to_matrix().to_4x4()@Matrix.Diagonal((1,direction.length/original.length,1,1));pose_world(n,m)
def hands(prefix,targets):
 for side,target in zip(['L','R'],targets):
  upper=prefix+'_UpperArm.'+side;lower=prefix+'_Forearm.'+side;hand=prefix+'_Hand.'+side
  bpy.context.view_layer.update();shoulder=rig.pose.bones[upper].head.copy();target=Vector(target);a=arm.bones[upper].length;b=arm.bones[lower].length;delta=target-shoulder;d=min(delta.length,a+b-.002);axis=delta.normalized();along=(a*a-b*b+d*d)/(2*d);bend=math.sqrt(max(0,a*a-along*along));out=Vector((1 if side=='L' else -1,0,-.5));out=(out-axis*out.dot(axis)).normalized();elbow=shoulder+axis*along+out*bend;wrist=shoulder+axis*d
  for n,head,tail in [(upper,shoulder,elbow),(lower,elbow,wrist)]:
   q=(bones[n][1]-bones[n][0]).rotation_difference((tail-head).normalized())@rest[n].to_quaternion();pose_world(n,Matrix.Translation(head)@q.to_matrix().to_4x4())
  # Point the palm along a wooden handle; its tip lands on the grip.
  q=(bones[hand][1]-bones[hand][0]).rotation_difference(Vector((0,-1,0)))@rest[hand].to_quaternion();pose_world(hand,Matrix.Translation(wrist)@q.to_matrix().to_4x4())
for name,last in [('Idle',73),('Walk',109),('Attack',241)]:
 action=bpy.data.actions.new('Siege_'+name);rig.animation_data.action=action;actions[name]=action;source_rig.animation_data.action=source_actions['Walk' if name=='Walk' else 'Idle']
 for f in range(1,last+1):
  t=(f-1)/30;u=(f-1)/(last-1);sample=1+((f-1)%36 if name=='Walk' else u*72);scene.frame_set(int(sample),subframe=sample-int(sample))
  for pb in rig.pose.bones:pb.matrix_basis=Matrix.Identity(4)
  for prefix in shifts:
   for src in source_rig.pose.bones:rig.pose.bones[prefix+'_'+src.name].matrix_basis=src.matrix_basis.copy()
  # Three 1.2s strides / one revolution; endpoints differ only by quaternion sign.
  if name=='Walk':
   for n in radii:rotate(n,math.tau*u)
  angle=-math.radians(35);pouch_at=pouch.copy()
  if name=='Attack':
   # Load 0.5–2.2s, tension 2.2–4.0s, release 4.0–4.6s, settle and rewind 4.6–8s.
   fire=smooth(3.9,4.55,t);rewind=smooth(5.2,7.7,t);angle+=math.radians(124)*fire*(1-rewind)
  rotate('ThrowArm',angle);bpy.context.view_layer.update();arm_matrix=rig.pose.bones['ThrowArm'].matrix@rest['ThrowArm'].inverted();tip_at=arm_matrix@tip
  # Both suspension ropes stay tied to the pouch; only the projectile detaches at release.
  sling_angle=sling_swing(t) if name=='Attack' else .025*math.sin(math.tau*u)
  pouch_at=tip_at+Vector((0,.56*math.sin(sling_angle),-.56*math.cos(sling_angle)))
  pose_world('Pouch',Matrix.Translation(pouch_at-pouch)@rest['Pouch'])
  targets={p:[Vector(v) for v in grips[p]] for p in shifts}
  if name=='Attack':
   pull=.11*math.sin(math.pi*smooth(2.2,4.3,t))
   targets['CrewL']=[v+Vector((0,pull,-pull*.8)) for v in targets['CrewL']]
   load=smooth(.45,1.1,t)*(1-smooth(2.05,2.7,t));goal=pouch_at+Vector((-.13,0,.055));targets['CrewR'][0]=targets['CrewR'][0].lerp(goal,load)
   for n,axis,amount in [('CrewR_Chest',(0,0,1),.55*load),('CrewR_Head',(0,0,1),.25*load),('CrewL_Chest',(1,0,0),-pull*.5)]:
    basis=rest[n].to_quaternion();rig.pose.bones[n].rotation_quaternion=basis.inverted()@Quaternion(axis,amount)@basis@rig.pose.bones[n].rotation_quaternion
  # IK targets are wrist positions; the hand extends a short distance onto each handle.
  for prefix in shifts:hands(prefix,[v+Vector((0,.06,0)) for v in targets[prefix]])
  for side,sign in [('L',1),('R',-1)]:
   start=tip_at+Vector((sign*.07,0,0));end=pouch_at+Vector((sign*.12,0,.03))
   stretch('Sling'+side,start,end)
  stretch('HaulRope',arm_matrix@haul,targets['CrewL'][0])
  rock=pouch_at+Vector((0,0,.045));visible=1
  if name=='Attack':
   if t<1.05:visible=0
   elif t<2.05:
    # Actual loading stone follows the loader's wrist, then settles in the sling.
    wrist=rig.pose.bones['CrewR_Hand.L'].head.copy();rock=wrist.lerp(pouch_at+Vector((0,0,.045)),smooth(1.8,2.05,t))
   elif t>=4.48 and t<5.18:
    v=t-4.48;release_angle=-math.radians(35)+math.radians(124)*smooth(3.9,4.55,4.48);release_swing=sling_swing(4.48)
    launch=pivot+Quaternion((1,0,0),release_angle)@(tip-pivot)+Vector((0,.56*math.sin(release_swing),-.56*math.cos(release_swing)+.045));rock=launch+Vector((0,-3.4*v,2.0*v-2.8*v*v));visible=1-smooth(4.95,5.18,t)
   elif t>=5.18:visible=0
  pose_world('Projectile',Matrix.Translation(rock-(pouch+Vector((0,0,.045))))@rest['Projectile']);rig.pose.bones['Projectile'].scale=(max(.0001,visible),)*3
  for pb in rig.pose.bones:
   for prop in ['location','rotation_quaternion','scale']:pb.keyframe_insert(prop,frame=f,group=pb.name)
 action.use_fake_user=True;track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action);track.mute=True
# Wheel rotation intentionally continues through the seam: no artificial reset/backspin.
# Export glTF linear quaternion segments; three 1.2s strides loop without root translation.
bpy.data.objects.remove(source_mesh,do_unlink=True);bpy.data.objects.remove(source_rig,do_unlink=True)
for a in list(bpy.data.actions):
 if a not in actions.values():bpy.data.actions.remove(a)
for name,a in actions.items():a.name=name
rig.animation_data.action=actions['Idle'];scene.frame_set(1);scene.frame_end=241
for im in bpy.data.images:
 if im.source=='FILE':im.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/military/siege-crew-v1.blend'))
bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=rig;output=ROOT/'public/art/military/siege-crew-v1.glb'
bpy.ops.export_scene.gltf(filepath=str(output),use_selection=True,export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_def_bones=False,export_anim_single_armature=True,export_anim_slide_to_zero=True)
report={'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'forward':'Blender -Y / GLB +Z; long arm rests aft','wheel_radii':radii,'bones':len(arm.bones),'bytes':output.stat().st_size};(QA/'report.json').write_text(json.dumps(report,indent=2));print('SIEGE_REPORT',json.dumps(report),flush=True)
