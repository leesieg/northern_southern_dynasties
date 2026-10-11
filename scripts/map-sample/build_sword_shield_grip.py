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
 skinFaces=[f for f in bm.faces if any(v in selected for v in f.verts) and is_skin(f)];donor=skinFaces[len(skinFaces)//2];donors[side]=sum((loop[uvLayer].uv.copy() for loop in donor.loops),Vector((0,0)))/len(donor.loops)
 # UV seams include dark underside triangles: a colour-only cut leaves spikes.
 faces=[f for f in bm.faces if f in skinFaces or (all(v.co.x*sign>.35 and .70<v.co.z<.91 for v in f.verts) and min(v.co.z for v in f.verts)<.858)];removedFaces+=len(faces);bmesh.ops.delete(bm,geom=faces,context='FACES')
 for v in list(bm.verts):
  if not v.link_faces:bm.verts.remove(v)
# Recenter joints inside the source sleeves. The approximate v1 wrist was ~8 cm
# behind the visible wrist, so rolling it orbited the cuff instead of turning it.
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
for side,sign in [('R',-1),('L',1)]:
 shoulder=Vector((sign*.265,.012,1.30));elbow=Vector((sign*.348,-.002,1.065));wrist=Vector((sign*.397,-.080,.886))
 for name,head,tail in [('Clavicle',Vector((sign*.025,0,1.32)),shoulder),('UpperArm',shoulder,elbow),('Forearm',elbow,wrist),('Hand',wrist,wrist+Vector((sign*.015,-.016,-.105)))]:
  bone=rig.data.edit_bones[name+'.'+side];bone.head=head;bone.tail=tail
 twist=rig.data.edit_bones.new('ForearmTwist.'+side);twist.parent=rig.data.edit_bones['Forearm.'+side];twist.head=twist.parent.head.copy();twist.tail=twist.parent.tail.copy();twist.roll=twist.parent.roll;mesh.vertex_groups.new(name=twist.name)
bpy.ops.object.mode_set(mode='OBJECT');rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
# Keep the cuff on the forearm; blend only around the actual elbow, not across
# the whole sleeve. Original torso/shoulder weights are retained above 1.18 m.
for v in bm.verts:
 if not (.70<v.co.z<1.18 and abs(v.co.x)>(.355 if v.co.z<.90 else .30)):continue
 side='L' if v.co.x>0 else 'R';weight=max(0,min(1,(v.co.z-1.035)/.075));weight=weight*weight*(3-2*weight)
 # Keep the metal cuff rigid; distribute roll in the cloth near the elbow.
 roll=max(0,min(1,(1.08-v.co.z)/.07));roll=roll*roll*(3-2*roll)
 v[deform].clear();v[deform][mesh.vertex_groups['UpperArm.'+side].index]=weight;v[deform][mesh.vertex_groups['Forearm.'+side].index]=(1-weight)*(1-roll);v[deform][mesh.vertex_groups['ForearmTwist.'+side].index]=(1-weight)*roll
 # The source cuff flared around the oversized old hand. Taper only its last
 # 5 cm to the rebuilt wrist, leaving the forearm plate and its UVs intact.
 q=rest['Hand.'+side].inverted() @ v.co
 if -.055<q.y<.025:
  amount=max(0,min(1,(q.y+.055)/.055));radius=math.hypot(q.x,q.z)
  if radius>.029:
   factor=1-amount*(1-.029/radius);q.x*=factor;q.z*=factor;v.co=rest['Hand.'+side] @ q
# Reuse the skin colour patch, but not the armour's metal/normal texture at a
# tiny sampled UV patch: that made the entire replacement hand look lacquered.
skinMaterial=mesh.data.materials[0].copy();skinMaterial.name='Infantry grip skin';shader=next(n for n in skinMaterial.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
for name,value in [('Metallic',0),('Roughness',.82),('Normal',None)]:
 for link in list(shader.inputs[name].links):skinMaterial.node_tree.links.remove(link)
 if value is not None:shader.inputs[name].default_value=value
mesh.data.materials.append(skinMaterial);materialIndex=len(mesh.data.materials)-1;vertexLocal={};newFaces=[]
col=bm.loops.layers.color.new('GripSkin')
for face in bm.faces:
 for loop in face.loops:loop[col]=(1,1,1,1)
def add_vertex(local,side):
 v=bm.verts.new(rest['Hand.'+side] @ Vector(local));v[deform][mesh.vertex_groups['Hand.'+side].index]=1;vertexLocal[v]=(Vector(local),side);return v
def add_face(vertices,tone=1):
 face=bm.faces.new(vertices);newFaces.append(face);face.material_index=materialIndex
 for loop in face.loops:
  p,side=vertexLocal[loop.vert];sign=1 if side=='L' else -1;loop[uvLayer].uv=donors[side]+Vector((p.x*sign*.015,(p.y-.035)*.015));shade=.88+.035*math.cos(p.y*75)+.018*math.sin(p.x*160);loop[col]=(tone*shade,tone*shade*.97,tone*shade*.94,1)
def tube(points,radii,side,tone=1):
 points=list(points);radii=list(radii);tip=points[-1].copy();direction=(tip-points[-2]).normalized();radius=radii[-1];points.extend([tip+direction*.003,tip+direction*.005]);radii.extend([radius*.65,radius*.08]);rings=[]
 for i,p in enumerate(points):
  direction=(points[min(i+1,len(points)-1)]-points[max(0,i-1)]).normalized();across=Vector((1,0,0));across-=direction*across.dot(direction);across.normalize();normal=direction.cross(across).normalized();rings.append([add_vertex(p+radii[i]*(across*math.cos(math.tau*j/10)+normal*math.sin(math.tau*j/10)),side) for j in range(10)])
 for a,b in zip(rings,rings[1:]):
  for j in range(10):add_face([a[j],a[(j+1)%10],b[(j+1)%10],b[j]],tone)
 add_face(list(reversed(rings[0])),tone);add_face(rings[-1],tone)
for side,sign in [('R',-1),('L',1)]:
 # Continuous flattened palm/wrist cross-sections, not intersecting spheres.
 rings=[]
 for y,halfWidth,depth,z in [(-.075,.023,.019,0),(-.035,.024,.020,0),(0,.024,.019,-.003),(.022,.030,.018,-.009),(.046,.033,.017,-.010),(.062,.027,.014,-.006)]:
  rings.append([add_vertex((halfWidth*math.cos(math.tau*j/16),y,z+depth*math.sin(math.tau*j/16)),side) for j in range(16)])
 for a,b in zip(rings,rings[1:]):
  for j in range(16):add_face([a[j],b[j],b[(j+1)%16],a[(j+1)%16]])
 add_face(list(reversed(rings[0])));add_face(rings[-1])
 for finger,(x,r) in enumerate([(-.025,.008),(-.008,.0088),(.010,.0083),(.027,.0072)]):
  points=[];radii=[]
  for i in range(16):
   theta=-1.15+4.5*i/15;points.append(Vector((sign*x,.064+.019*math.cos(theta),.009+.019*math.sin(theta))));radii.append(r*(1-.12*i/15)*(1+.04*math.sin(math.pi*i/5)))
  tube(points,radii,side,1+.015*finger)
 # Thumb opposes the fingers diagonally and presses the handle near the index finger.
 points=[Vector((sign*x,y,z)) for x,y,z in [(-.024,.019,-.012),(-.035,.031,.003),(-.033,.048,.018),(-.022,.060,.029),(-.009,.062,.026)]];tube(points,[.012,.011,.010,.009,.007],side,1.03)
# Union palm, fingers and wrist into one closed skin surface per hand. Separate
# overlapping shells read as glued-on tubes, even with correct grip distances.
for side in ['R','L']:
 verts=[v for v,(_,s) in vertexLocal.items() if s==side];lookup={v:i for i,v in enumerate(verts)};faces=[f for f in newFaces if f.is_valid and f.verts[0] in lookup]
 data=bpy.data.meshes.new('Grip union');data.from_pydata([v.co for v in verts],[],[[lookup[v] for v in f.verts] for f in faces]);obj=bpy.data.objects.new('Grip union',data);scene.collection.objects.link(obj);bpy.context.view_layer.objects.active=obj;obj.select_set(True);data.remesh_voxel_size=.0028;bpy.ops.object.voxel_remesh()
 modifier=obj.modifiers.new('Join smoothing','SMOOTH');modifier.factor=.65;modifier.iterations=3;bpy.ops.object.modifier_apply(modifier=modifier.name)
 modifier=obj.modifiers.new('Grip budget','DECIMATE');modifier.ratio=.20;bpy.ops.object.modifier_apply(modifier=modifier.name)
 bmesh.ops.delete(bm,geom=verts,context='VERTS');inverse=rest['Hand.'+side].inverted();replacement=[add_vertex(inverse @ v.co,side) for v in obj.data.vertices]
 for f in obj.data.polygons:add_face([replacement[i] for i in f.vertices])
 bpy.data.objects.remove(obj,do_unlink=True)
# A short cloth undersleeve bridges the wrist beneath the open metal cuff.
# Sample its colour from the existing red sleeve, rather than exposing a hole.
for side,sign in [('R',-1),('L',1)]:
 candidates=[]
 for f in bm.faces:
  center=f.calc_center_median()
  if f.material_index!=0 or not (center.x*sign>.30 and 1.04<center.z<1.16):continue
  uv=sum((loop[uvLayer].uv for loop in f.loops),Vector((0,0)))/len(f.loops);i=(int(uv.y*height)%height*width+int(uv.x*width)%width)*4;r,g,b=pixels[i:i+3]
  candidates.append((r-g-b*.2,uv.copy()))
 fabricUV=max(candidates,key=lambda entry:entry[0])[1];rings=[]
 for y,radius in [(-.08,.029),(-.025,.027),(.012,.025)]:
  rings.append([add_vertex((radius*math.cos(math.tau*j/16),y,radius*.85*math.sin(math.tau*j/16)),side) for j in range(16)])
 for a,b in zip(rings,rings[1:]):
  for j in range(16):
   face=bm.faces.new([a[j],b[j],b[(j+1)%16],a[(j+1)%16]]);newFaces.append(face);face.material_index=0
   for loop in face.loops:loop[uvLayer].uv=fabricUV;loop[col]=(1,1,1,1)
bmesh.ops.recalc_face_normals(bm,faces=[f for f in newFaces if f.is_valid]);bm.to_mesh(mesh.data);bm.free();mesh.data.update()
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
  y=(wrist-elbow).normalized();x=delta.to_3x3() @ (Vector((1,0,0)) if side=='L' else Vector((0,0,1)));x-=y*x.dot(y);x.normalize();z=x.cross(y).normalized();rotation=Matrix((x,y,z)).transposed().to_4x4();rotation.translation=elbow
  # The open-backed right vambrace follows the forearm, not the palm's grip
  # frame. Rotating both identically exposes its hollow underside as a flap.
  cuff=rotation @ Matrix.Rotation(-math.pi/2 if side=='R' else 0,4,'Y');set_world('ForearmTwist.'+side,cuff,world);rotation=rotation.copy();rotation.translation=wrist;set_world(hand,rotation,world)
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
 hand=evaluated[side];origin=hand @ Vector((0,.064,.009))
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
