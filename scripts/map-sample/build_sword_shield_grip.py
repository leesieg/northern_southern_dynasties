"""Author a separate sword/shield infantry sample from the preserved v1 source.
Blender --background art/military/infantry-rigged-v1.blend --python this.py
No root motion; fixed local grip sockets and ordinary baked joint animation.
"""
import bpy,bmesh,math,json
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion,Euler
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'public/art/military/infantry-sword-shield-v2.glb';BLEND=ROOT/'art/military/infantry-sword-shield-v2.blend';QA=ROOT/'.cache/grip-v2';QA.mkdir(parents=True,exist_ok=True)
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH');scene=bpy.context.scene;scene.render.fps=30
rest={b.name:b.matrix_local.copy() for b in rig.data.bones};originals={name:bpy.data.actions[name] for name in ['Idle','Walk']};bases={}
for name,last in [('Idle',73),('Walk',37)]:
 rig.animation_data.action=originals[name];bases[name]=[]
 for f in range(1,last+1):
  scene.frame_set(f);bases[name].append({p.name:p.matrix_basis.copy() for p in rig.pose.bones})
# Repair the known skirt/hand proximity weights in the asset, not each runtime clone.
armGroups={g.index for g in mesh.vertex_groups if g.name.startswith(('Hand','Forearm','UpperArm','Clavicle'))}
for v in mesh.data.vertices:
 if v.co.z>=1 or abs(v.co.x)>.355:continue
 removed=[g.group for g in v.groups if g.group in armGroups]
 if not removed:continue
 for i in removed:mesh.vertex_groups[i].remove([v.index])
 remaining=[(g.group,g.weight) for g in v.groups];total=sum(w for _,w in remaining)
 if total:
  for i,w in remaining:mesh.vertex_groups[i].add([v.index],w/total,'REPLACE')
 else:mesh.vertex_groups[('SkirtSide.'+('L' if v.co.x>0 else 'R')) if v.co.z<.85 else 'Hips'].add([v.index],1,'REPLACE')
# Replace the coarse source hands locally; the body/armour, UVs and animations stay intact.
bm=bmesh.new();bm.from_mesh(mesh.data);deform=bm.verts.layers.deform.active
baseNode=next(n for n in mesh.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE' and n.label=='BASE COLOR');image=baseNode.image;pixels=list(image.pixels);width,height=image.size;uvLayer=bm.loops.layers.uv.active
def is_skin(face):
 uv=sum((loop[uvLayer].uv for loop in face.loops),Vector((0,0)))/len(face.loops);i=(int(uv.y*height)%height*width+int(uv.x*width)%width)*4;r,g,b=pixels[i:i+3];return r>.48 and g>.33 and r-g>.07 and g-b>.04
removedFaces=0;donors={}
for side,sign in [('R',-1),('L',1)]:
 idx=mesh.vertex_groups['Hand.'+side].index;toHand=rest['Hand.'+side].inverted() @ rig.matrix_world.inverted() @ mesh.matrix_world
 selected=set()
 for v in bm.verts:
  q=toHand @ v.co
  if v[deform].get(idx,0)>.05 and -.022<q.y<.17 and -.15<q.z<.035 and .005<q.x*sign<.13:selected.add(v)
 faces=[f for f in bm.faces if sum(v in selected for v in f.verts)>=2 and is_skin(f)];removedFaces+=len(faces);donor=faces[len(faces)//2];donors[side]=sum((loop[uvLayer].uv.copy() for loop in donor.loops),Vector((0,0)))/len(donor.loops);bmesh.ops.delete(bm,geom=faces,context='FACES')
 for v in list(bm.verts):
  if not v.link_faces:bm.verts.remove(v)
# Use the original hand's PBR texture patch, keeping the original material/draw batch.
materialIndex=0;vertexLocal={};newFaces=[]
col=bm.loops.layers.color.new('GripSkin')
for face in bm.faces:
 for loop in face.loops:loop[col]=(1,1,1,1)
def add_vertex(local,side):
 v=bm.verts.new(rest['Hand.'+side] @ Vector(local));v[deform][mesh.vertex_groups['Hand.'+side].index]=1;vertexLocal[v]=(Vector(local),side);return v
def add_face(vertices,tone=1):
 face=bm.faces.new(vertices);newFaces.append(face);face.material_index=materialIndex
 for loop in face.loops:
  p,side=vertexLocal[loop.vert];sign=1 if side=='L' else -1;loop[uvLayer].uv=donors[side]+Vector(((p.x*sign-.047)*.11,(p.y-.035)*.11));loop[col]=(tone,tone,tone,1)
def ellipsoid(center,radius,side):
 rings=[]
 for i in range(1,9):
  phi=math.pi*i/9;rings.append([add_vertex((center[0]+radius[0]*math.sin(phi)*math.cos(math.tau*j/16),center[1]+radius[1]*math.sin(phi)*math.sin(math.tau*j/16),center[2]+radius[2]*math.cos(phi)),side) for j in range(16)])
 top=add_vertex((center[0],center[1],center[2]+radius[2]),side);bottom=add_vertex((center[0],center[1],center[2]-radius[2]),side)
 for j in range(16):add_face([top,rings[0][j],rings[0][(j+1)%16]]);add_face([bottom,rings[-1][(j+1)%16],rings[-1][j]])
 for a,b in zip(rings,rings[1:]):
  for j in range(16):add_face([a[j],b[j],b[(j+1)%16],a[(j+1)%16]])
def tube(points,radii,side,tone=1):
 points=list(points);radii=list(radii);tip=points[-1].copy();direction=(tip-points[-2]).normalized();radius=radii[-1];points.extend([tip+direction*.003,tip+direction*.005]);radii.extend([radius*.65,radius*.08]);rings=[]
 for i,p in enumerate(points):
  direction=(points[min(i+1,len(points)-1)]-points[max(0,i-1)]).normalized();across=Vector((1,0,0));normal=direction.cross(across).normalized();rings.append([add_vertex(p+radii[i]*(across*math.cos(math.tau*j/10)+normal*math.sin(math.tau*j/10)),side) for j in range(10)])
 for a,b in zip(rings,rings[1:]):
  for j in range(10):add_face([a[j],a[(j+1)%10],b[(j+1)%10],b[j]],tone)
 add_face(list(reversed(rings[0])),tone);add_face(rings[-1],tone)
for side,sign in [('R',-1),('L',1)]:
 ellipsoid((sign*.047,.008,-.067),(.035,.037,.019),side);ellipsoid((sign*.047,-.017,-.064),(.026,.023,.018),side)
 for finger,(x,r) in enumerate([( .019,.0075),(.037,.0082),(.055,.0078),(.072,.0067)]):
  points=[];radii=[]
  for i in range(16):
   theta=-.85+3.5*i/15;points.append(Vector((sign*x,.048+.023*math.cos(theta),-.037+.023*math.sin(theta))));radii.append(r*(1-.20*i/15)*(1+.04*math.sin(math.pi*i/5)))
  tube(points,radii,side,1+.015*finger)
 # Thumb opposes the fingers diagonally and presses the handle near the index finger.
 points=[Vector((sign*x,y,z)) for x,y,z in [(.012,-.006,-.052),(.005,.006,-.033),(.008,.020,-.020),(.019,.030,-.018),(.032,.034,-.021)]];tube(points,[.0095,.010,.0095,.0082,.0062],side,1.03)
bmesh.ops.recalc_face_normals(bm,faces=newFaces);bm.to_mesh(mesh.data);bm.free();mesh.data.update()
mesh['authoredCarry']='sword-shield-v2';rig['authoredCarry']='sword-shield-v2'
for p in mesh.data.polygons:p.use_smooth=True
parents={b.name:b.parent.name if b.parent else None for b in rig.data.bones}
def world_pose():
 result={}
 for b in rig.data.bones:
  parent=parents[b.name];result[b.name]=(result[parent] @ rest[parent].inverted() @ rest[b.name] @ rig.pose.bones[b.name].matrix_basis) if parent else rest[b.name] @ rig.pose.bones[b.name].matrix_basis
 return result

def set_world(name,wanted,world):
 parent=parents[name];basis=rest[name].inverted() @ (rest[parent] @ world[parent].inverted() if parent else Matrix.Identity(4)) @ wanted;rig.pose.bones[name].matrix_basis=basis;world[name]=wanted

def point(name,head,tail,world):
 axis=rest[name].to_quaternion() @ Vector((0,1,0));q=axis.rotation_difference((tail-head).normalized()) @ rest[name].to_quaternion();set_world(name,Matrix.Translation(head) @ q.to_matrix().to_4x4(),world)

def smooth(t):return max(0,min(1,t))**2*(3-2*max(0,min(1,t)))
def lerp(a,b,t):return Vector(a).lerp(Vector(b),smooth(t))

def author(name,f,last):
 base=bases['Walk' if name=='Walk' else 'Idle'][(f-1)%len(bases['Walk' if name=='Walk' else 'Idle'])]
 for n,m in base.items():rig.pose.bones[n].matrix_basis=m
 t=(f-1)/(last-1);wave=math.sin(math.tau*t)
 if name=='Attack':
  # One deliberate overhead cut: preparation, release, return, then guard.
  seconds=t*2.4
  if seconds<.5:right=lerp((-.385,-.20,1.04),(-.34,-.14,1.38),seconds/.5)
  elif seconds<.8:right=lerp((-.34,-.14,1.38),(-.28,-.42,1.15),(seconds-.5)/.3)
  elif seconds<1.45:right=lerp((-.28,-.42,1.15),(-.385,-.20,1.04),(seconds-.8)/.65)
  else:right=Vector((-.385,-.20,1.04))
  stroke=math.sin(math.pi*min(1,seconds/1.45));pb=rig.pose.bones['Chest'];pb.rotation_quaternion=pb.rotation_quaternion @ Quaternion((0,0,1),-.10*stroke)
  left=Vector((.39,-.28,1.15))
 else:
  right=Vector((-.385,-.20,1.04));left=Vector((.39,-.24,1.08))
  if name=='Walk':right.y+=.017*wave;right.z+=.008*math.sin(math.tau*t+.5);left.y-=.006*wave
  else:right.z+=.002*wave;left.z+=.002*wave
 for side,sign in [('R',-1),('L',1)]:
  pb=rig.pose.bones['Clavicle.'+side];pb.rotation_quaternion=pb.rotation_quaternion @ Quaternion((0,0,1),sign*.012*wave)
 world=world_pose();delta=world['Chest'] @ rest['Chest'].inverted()
 for side,sign,target in [('R',-1,right),('L',1,left)]:
  upper,fore,hand=['UpperArm.'+side,'Forearm.'+side,'Hand.'+side];shoulder=world[upper].translation.copy();wrist=delta @ target
  a=(rest[fore].translation-rest[upper].translation).length;b=(rest[hand].translation-rest[fore].translation).length;axis=wrist-shoulder;d=min(axis.length,a+b-.012);axis.normalize();wrist=shoulder+axis*d;along=(a*a-b*b+d*d)/(2*d);height=math.sqrt(max(0,a*a-along*along))
  bend=delta.to_3x3() @ Vector((sign*.25,.15,-1));bend-=axis*bend.dot(axis);bend.normalize();elbow=shoulder+axis*along+bend*height
  point(upper,shoulder,elbow,world);point(fore,elbow,wrist,world)
  y=(wrist-elbow).normalized();x=delta.to_3x3() @ (Vector((1,0,0)) if side=='L' else Vector((0,0,1)));x-=y*x.dot(y);x.normalize();z=x.cross(y).normalized();rotation=Matrix((x,y,z)).transposed().to_4x4();rotation.translation=elbow;set_world(fore,rotation,world);rotation=rotation.copy();rotation.translation=wrist;set_world(hand,rotation,world)
 return world
# Add fixed grip joints; calibrate their final frames after the authored clips are evaluated.
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
for side,name in [('R','GripSword'),('L','GripShield')]:
 b=rig.data.edit_bones.new(name);b.parent=rig.data.edit_bones['Hand.'+side];b.matrix=rest['Hand.'+side];b.length=.035;b.use_deform=False
bpy.ops.object.mode_set(mode='OBJECT');rest={b.name:b.matrix_local.copy() for b in rig.data.bones};parents={b.name:b.parent.name if b.parent else None for b in rig.data.bones}
for p in rig.pose.bones:p.rotation_mode='QUATERNION'
for track in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(track)
rig.animation_data.action=None
for old in originals.values():bpy.data.actions.remove(old)
actions={}
for name,last in [('Idle',73),('Walk',37),('Attack',73)]:
 action=bpy.data.actions.new(name);actions[name]=action;rig.animation_data.action=action
 for f in range(1,last+1):
  scene.frame_set(f);author(name,f,last)
  for pb in rig.pose.bones:
   if pb.name.startswith('Grip'):pb.matrix_basis=Matrix.Identity(4)
   pb.keyframe_insert('location',frame=f,group=pb.name);pb.keyframe_insert('rotation_quaternion',frame=f,group=pb.name);pb.keyframe_insert('scale',frame=f,group=pb.name)
 action.use_fake_user=True
rig.animation_data.action=actions['Idle'];scene.frame_set(1);scene.frame_end=73
# Calibrate against the evaluated baked pose, after animation authoring has finished.
bpy.context.view_layer.update();evaluated={s:rig.pose.bones['Hand.'+s].matrix.copy() for s in ['R','L']}
rig.data.pose_position='REST';bpy.ops.object.mode_set(mode='EDIT')
for side,name in [('R','GripSword'),('L','GripShield')]:
 hand=evaluated[side];origin=hand @ Vector((.05 if side=='L' else -.05,.048,-.037))
 local=Matrix(((0,1,0,0),(0,0,1,0),(1,0,0,0),(0,0,0,1))) if side=='R' else Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
 wanted=hand @ local;wanted.translation=origin
 bone=rig.data.edit_bones[name];bone.matrix=rest['Hand.'+side] @ hand.inverted() @ wanted;bone.length=.035
bpy.ops.object.mode_set(mode='OBJECT');rig.data.pose_position='POSE';scene.frame_set(1);bpy.context.view_layer.update()
for image in bpy.data.images:
 if image.source=='FILE':image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT),use_selection=True,export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_def_bones=False,export_anim_single_armature=True,export_anim_slide_to_zero=True,export_extras=True)
print('GRIP_V2',json.dumps({'removedHandFaces':removedFaces,'vertices':len(mesh.data.vertices),'triangles':sum(len(p.vertices)-2 for p in mesh.data.polygons),'bones':len(rig.data.bones),'bytes':OUT.stat().st_size,'clips':list(actions)}))
