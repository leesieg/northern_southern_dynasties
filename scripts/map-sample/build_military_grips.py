"""Reuse the repaired infantry skin on every human military rig.
Blender --background --python-exit-code 1 --python scripts/map-sample/build_military_grips.py
Preserves the original horse/cart meshes and their sampled animation transforms.
"""
import bpy, bmesh, math, json, sys
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'art/military/infantry-sword-shield-v2.blend'
ARM=('Clavicle.','UpperArm.','Forearm.','ForearmTwist.','Hand.','Grip')
GRIP=Vector((0,.064,.009))
VERTICAL=Matrix(((0,1,0,0),(0,0,1,0),(1,0,0,0),(0,0,0,1)))
def smooth(a,b,t):
 u=max(0,min(1,(t-a)/(b-a)));return u*u*(3-2*u)

def matrices(rig,rest):
 result={}
 for b in rig.data.bones:
  result[b.name]=(result[b.parent.name]@rest[b.parent.name].inverted()@rest[b.name] if b.parent else rest[b.name])@rig.pose.bones[b.name].matrix_basis
 return result

def set_world(rig,rest,world,name,wanted):
 p=rig.data.bones[name].parent
 rig.pose.bones[name].matrix_basis=rest[name].inverted()@(rest[p.name]@world[p.name].inverted() if p else Matrix.Identity(4))@wanted
 world[name]=wanted

def point(rig,rest,world,name,head,tail):
 q=(rest[name].to_quaternion()@Vector((0,1,0))).rotation_difference((tail-head).normalized())@rest[name].to_quaternion()
 set_world(rig,rest,world,name,Matrix.Translation(head)@q.to_matrix().to_4x4())

def arm_pose(rig,rest,world,prefix,side,wrist,handle_axis,free_wrist=False,forward_elbow=False):
 sign=1 if side=='L' else -1
 upper,fore,hand,twist=[prefix+n+'.'+side for n in ['UpperArm','Forearm','Hand','ForearmTwist']]
 shoulder=world[upper].translation.copy();a=(rest[fore].translation-rest[upper].translation).length;b=(rest[hand].translation-rest[fore].translation).length
 axis=wrist-shoulder;d=max(.025,min(axis.length,a+b-.008));axis.normalize();wrist=shoulder+axis*d
 along=(a*a-b*b+d*d)/(2*d);height=math.sqrt(max(0,a*a-along*along));bend=(wrist+Vector((0,b,0))-shoulder-axis*along) if forward_elbow else Vector((sign*.25,.1,-1));bend-=axis*bend.dot(axis);bend.normalize()
 # Choose the elbow around its IK circle so the forearm is perpendicular to
 # the handle. Merely aiming the palm afterwards folds the operator's wrist.
 x=handle_axis.normalized();projected=x-axis*x.dot(axis)
 if projected.length>.001 and height>.001:
  u=projected.normalized();v=axis.cross(u).normalized();cosine=max(-1,min(1,(wrist-shoulder-axis*along).dot(x)/(height*projected.length)));sine=math.sqrt(1-cosine*cosine)
  choices=[u*cosine+v*sine,u*cosine-v*sine];bend=max(choices,key=lambda q:q.dot(bend))
 elbow=shoulder+axis*along+bend*height
 point(rig,rest,world,upper,shoulder,elbow);point(rig,rest,world,fore,elbow,wrist)
 x=handle_axis.normalized();y=(wrist-elbow).normalized()
 if free_wrist:x-=y*x.dot(y);x.normalize()
 y-=x*y.dot(x)
 if y.length<.1:y=Vector((0,-1,0));y-=x*y.dot(x)
 y.normalize();z=x.cross(y).normalized();rotation=Matrix((x,y,z)).transposed().to_4x4();rotation.translation=elbow
 cuff=rotation@Matrix.Rotation(-math.pi/2 if side=='R' else 0,4,'Y')
 set_world(rig,rest,world,twist,cuff);rotation=rotation.copy();rotation.translation=wrist;set_world(rig,rest,world,hand,rotation)

contact_history={}
fixed_arms={}
def wrist_only(rig,rest,world,side,delta,angle):
 names=[n+'.'+side for n in ['UpperArm','Forearm','ForearmTwist','Hand']]
 if side not in fixed_arms:fixed_arms[side]={n:delta.inverted()@world[n] for n in names}
 for n in names:
  pose=delta@fixed_arms[side][n]
  if n.startswith('Hand.'):pose=pose@Matrix.Rotation(angle,4,'Z')
  set_world(rig,rest,world,n,pose)

def crew_wrists(rig,rest,prefix):
 """A continuous skinned wrist bridges cuff and palm, even while loading."""
 body=bpy.data.objects[prefix.rstrip('_')];material=next(m for m in body.data.materials if 'grip skin' in m.name)
 face=next(p for p in body.data.polygons if body.data.materials[p.material_index]==material);uv=body.data.uv_layers.active.data[face.loop_start].uv.copy()
 for side in ['L','R']:
  hand=prefix+'Hand.'+side;cuff=prefix+'ForearmTwist.'+side;vertices=[];faces=[]
  rings=[(-.12,.026),(-.08,.027),(-.04,.024),(.015,.022)]
  for y,radius in rings:
   for j in range(16):vertices.append(rest[hand]@Vector((radius*math.cos(math.tau*j/16),y,radius*.85*math.sin(math.tau*j/16))))
  for i in range(3):
   for j in range(16):faces.append((i*16+j,i*16+(j+1)%16,(i+1)*16+(j+1)%16,(i+1)*16+j))
  mesh=bpy.data.meshes.new(prefix+'Wrist'+side);mesh.from_pydata(vertices,[],faces);mesh.materials.append(material);layer=mesh.uv_layers.new();colour=mesh.color_attributes.new(name='GripSkin',type='FLOAT_COLOR',domain='POINT')
  for loop in layer.data:loop.uv=uv
  for value in colour.data:value.color=(1,1,1,1)
  for p in mesh.polygons:p.use_smooth=True
  obj=bpy.data.objects.new(prefix+'Wrist'+side,mesh);bpy.context.scene.collection.objects.link(obj);obj.parent=rig
  groups={n:obj.vertex_groups.new(name=n) for n in [hand,cuff]}
  for i,(y,_) in enumerate(rings):
   weight=smooth(-.12,-.04,y)
   for j in range(16):
    if weight:groups[hand].add([i*16+j],weight,'REPLACE')
    if weight<1:groups[cuff].add([i*16+j],1-weight,'REPLACE')
  obj.modifiers.new('Wrist connection','ARMATURE').object=rig

def contact_pose(rig,rest,world,side,goal,handle,pole,palm_hint=None,outward=None,bow_carry=False):
 """Keep the elbow on its anatomical side; fit palm roll, not elbow roll.

 The search is offline only. The exported clips contain ordinary keyframes.
 """
 upper,fore,hand,twist=[n+'.'+side for n in ['UpperArm','Forearm','Hand','ForearmTwist']]
 shoulder=world[upper].translation;a=(rest[fore].translation-rest[upper].translation).length;b=(rest[hand].translation-rest[fore].translation).length
 x=handle.normalized();base=Vector((0,0,1)) if abs(x.z)<.9 else Vector((0,-1,0));base=(base-x*base.dot(x)).normalized();across=x.cross(base)
 def candidate(angle):
  y=base*math.cos(angle)+across*math.sin(angle);z=x.cross(y);wrist=goal-y*GRIP.y-z*GRIP.z;axis=wrist-shoulder;distance=axis.length;axis.normalize()
  d=max(abs(a-b)+.001,min(distance,a+b-.008));along=(a*a-b*b+d*d)/(2*d);height=math.sqrt(max(0,a*a-along*along));preferred=(pole-axis*pole.dot(axis)).normalized()
  # A small outward bow-hand cant leaves the string's release plane beside
  # the forearm. A perfectly collinear wrist puts the string through that arm.
  fore_target=Matrix.Rotation(-.43,3,x)@y if palm_hint is not None else y
  desired=wrist-fore_target*b-shoulder;desired=(desired-axis*desired.dot(axis)).normalized()
  # Allow a limited elbow-plane adjustment, never an inward/backward flip.
  angle=math.atan2(axis.dot(preferred.cross(desired)),preferred.dot(desired));angle=max(-math.pi/3,min(math.pi/3,angle));bend=Matrix.Rotation(angle,3,axis)@preferred;elbow=shoulder+axis*along+bend*height
  forward=(wrist-elbow).normalized();score=(1-forward.dot(fore_target))*12+abs(distance-d)*100+.15*(1-bend.dot(preferred))
  if palm_hint is not None:score+=(1-y.dot(palm_hint.normalized()))*.8
  if outward is not None:score+=max(0,.025-(elbow-shoulder).dot(outward.normalized()))*100
  if bow_carry:
   score+=max(0,math.cos(math.radians(29.5))-forward.dot(y))*5000
   score+=max(0,.065-(shoulder-goal).dot(z))*200
   # Keep the carried string outside both arm segments, not merely the wrist.
   for i in range(17):
    string=goal-y*.232+x*(.44*(i/8-1))
    for start,end in [(shoulder,elbow),(elbow,wrist)]:
     segment=end-start;u=max(0,min(1,(string-start).dot(segment)/segment.length_squared))
     clearance=(string-start-segment*u).length
     score+=max(0,.07-clearance)*50
  if side in contact_history:
   change=1-y.dot(contact_history[side]);score+=change*.4+max(0,change-(1-math.cos(.16)))*200
  return score,(elbow,wrist,x,y,z)
 angle=min((math.tau*i/120 for i in range(120)),key=lambda v:candidate(v)[0])
 angle=min((angle+(i-10)*math.tau/1200 for i in range(21)),key=lambda v:candidate(v)[0]);_,(elbow,wrist,x,y,z)=candidate(angle)
 if (wrist-shoulder).length>a+b-.004:raise ValueError(f'Unreachable combat grip {side}: {(wrist-shoulder).length:.4f} > {a+b:.4f}')
 point(rig,rest,world,upper,shoulder,elbow);point(rig,rest,world,fore,elbow,wrist)
 rotation=Matrix((x,y,z)).transposed().to_4x4();rotation.translation=elbow
 # Cloth takes forearm roll; the metal cuff and hand remain a rigid pair.
 set_world(rig,rest,world,twist,rotation@Matrix.Rotation(-math.pi/2 if side=='R' else 0,4,'Y'))
 rotation.translation=wrist;set_world(rig,rest,world,hand,rotation)
 contact_history[side]=y.copy()

def build_archer_bow(rig,rest):
 """Reuse the supplied bow, replacing its two rigid string strips by a rigged cord."""
 with bpy.data.libraries.load(str(ROOT/'art/military/weapons-v1.blend'),link=False) as (src,dst):dst.objects=['Bow']
 bow=dst.objects[0];bpy.context.scene.collection.objects.link(bow);bow.name='AuthoredBow'
 bm=bmesh.new();bm.from_mesh(bow.data);seen=set();remove=[]
 for v in bm.verts:
  if v in seen:continue
  todo=[v];seen.add(v);part=[]
  while todo:
   p=todo.pop();part.append(p)
   for e in p.link_edges:
    q=e.other_vert(p)
    if q not in seen:seen.add(q);todo.append(q)
  span=max(p.co.y for p in part)-min(p.co.y for p in part)
  full_string=max(p.co.z for p in part)-min(p.co.z for p in part)>.8 and span<.02
  # The scanned string also contains disconnected flakes in its flat plane.
  # Preserve the curved limbs and tip bindings outside the central string span.
  string_flake=span<.012 and min(p.co.y for p in part)>-.24 and max(p.co.y for p in part)<-.225 and max(abs(p.co.z) for p in part)<.46
  if full_string or string_flake:remove.extend(part)
 if not remove:raise ValueError('Original bowstring components not found')
 bmesh.ops.delete(bm,geom=remove,context='VERTS')
 # Some flat string triangles share vertices with the end bindings.
 flakes=[f for f in bm.faces if all(-.24<v.co.y<-.225 for v in f.verts) and any(abs(v.co.z)<.42 for v in f.verts)]
 bmesh.ops.delete(bm,geom=flakes,context='FACES')
 bm.to_mesh(bow.data);bm.free()
 # Weapon source: Z up, -Y towards the string. Palm X is up, Y points at target.
 basis=Matrix(((0,0,1,0),(0,1,0,0),(-1,0,0,0),(0,0,0,1)))
 transform=rest['Hand.L']@Matrix.Translation(GRIP)@basis;heights=[v.co.z for v in bow.data.vertices];bow.data.transform(transform);bow.parent=rig;bow.matrix_world=Matrix.Identity(4)
 groups={n:bow.vertex_groups.new(name=n) for n in ['Hand.L','BowUpper','BowLower']}
 for i,z in enumerate(heights):
  weight=smooth(.06,.42,abs(z));groups['Hand.L'].add([i],1-weight,'REPLACE');groups['BowUpper' if z>0 else 'BowLower'].add([i],weight,'REPLACE')
 bow.modifiers.new('Bow flex','ARMATURE').object=rig
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
 for name,z in [('BowNock',0),('BowUpper',.44),('BowLower',-.44),('BowArrow',0)]:
  bone=rig.data.edit_bones.new(name);matrix=rest['Hand.L'].copy();matrix.translation=transform@Vector((0,-.232,z));bone.head=matrix.translation;bone.tail=bone.head+matrix.to_3x3()@Vector((0,.035,0));bone.matrix=matrix;bone.parent=rig.data.edit_bones['Hand.L']
 bpy.ops.object.mode_set(mode='OBJECT')
 vertices=[];faces=[];weights=[]
 for sign in [-1,1]:
  start=len(vertices)
  for i in range(9):
   t=i/8;point=Vector((0,-.232,sign*.44*(1-t)))
   for j in range(6):
    vertices.append(transform@(point+Vector((.0018*math.cos(math.tau*j/6),.0018*math.sin(math.tau*j/6),0))));weights.append(t)
  for i in range(8):
   for j in range(6):faces.append((start+i*6+j,start+i*6+(j+1)%6,start+(i+1)*6+(j+1)%6,start+(i+1)*6+j))
 mesh=bpy.data.meshes.new('Bowstring');mesh.from_pydata(vertices,[],faces);cord=bpy.data.objects.new('AuthoredBowstring',mesh);bpy.context.scene.collection.objects.link(cord);cord.parent=rig
 material=bpy.data.materials.new('Bowstring fibre');material.diffuse_color=(.38,.30,.19,1);mesh.materials.append(material)
 upper=cord.vertex_groups.new(name='BowUpper');lower=cord.vertex_groups.new(name='BowLower');nock=cord.vertex_groups.new(name='BowNock')
 for i,t in enumerate(weights):
  if t<1:(lower if i<54 else upper).add([i],1-t,'REPLACE')
  if t>0:nock.add([i],t,'REPLACE')
 cord.modifiers.new('String draw','ARMATURE').object=rig
 # A visible nocked arrow follows the same release. It is presentation only;
 # world combat continues to own all casualties and projectile outcomes.
 vertices=[];faces=[]
 for y,radius in [(0,.003),(.66,.003),(.67,.009),(.71,0)]:
  for j in range(6):vertices.append((radius*math.cos(math.tau*j/6),y,radius*math.sin(math.tau*j/6)))
 for i in range(3):
  for j in range(6):faces.append((i*6+j,i*6+(j+1)%6,(i+1)*6+(j+1)%6,(i+1)*6+j))
 for x,z in [(1,0),(-.5,.866),(-.5,-.866)]:
  i=len(vertices);vertices.extend([(0,.025,0),(x*.018,.035,z*.018),(x*.018,.09,z*.018),(0,.12,0)]);faces.append((i,i+1,i+2,i+3))
 matrix=rig.data.bones['BowArrow'].matrix_local;data=bpy.data.meshes.new('Nocked arrow');data.from_pydata([matrix@Vector(v) for v in vertices],[],faces);arrow=bpy.data.objects.new('AuthoredArrow',data);bpy.context.scene.collection.objects.link(arrow);arrow.parent=rig
 material=bpy.data.materials.new('Arrow wood');material.diffuse_color=(.24,.16,.07,1);data.materials.append(material);group=arrow.vertex_groups.new(name='BowArrow');group.add(list(range(len(vertices))),1,'REPLACE');arrow.modifiers.new('Arrow release','ARMATURE').object=rig
 # Open the distal curl of the existing unified grip mesh for the string.
 # Blend the change into the palm; retain the wrist and thumb attachment.
 mesh=bpy.data.objects['Infantry'];hand=rest['Hand.R'];inverse=hand.inverted();idx=mesh.vertex_groups['Hand.R'].index
 for v in mesh.data.vertices:
  if not any(g.group==idx and g.weight>.99 for g in v.groups):continue
  p=inverse@v.co
  if p.y<.04 or abs(p.x)>.037:continue
  # Preserve the tube cross-section while shortening its curl about the grip.
  theta=math.atan2(p.z-.009,p.y-.064)
  if theta< -1.15:theta+=math.tau
  if theta>3.35:continue
  centre=Vector((p.x,.064+.019*math.cos(theta),.009+.019*math.sin(theta)));radial=p-centre
  changed=-1.15+(theta+1.15)*.58
  p=Vector((p.x,.064+.019*math.cos(changed),.009+.019*math.sin(changed)))+Matrix.Rotation(changed-theta,3,'X')@radial
  v.co=hand@((inverse@v.co).lerp(p,smooth(.049,.064,(inverse@v.co).y)))

def build(kind,base,out):
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art/military'/ (base+'.blend')))
 bpy.context.preferences.filepaths.save_version=0
 scene=bpy.context.scene;rig=next(o for o in scene.objects if o.type=='ARMATURE');original_rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
 old_actions={n:bpy.data.actions[n] for n in ['Idle','Walk']+(['Attack'] if 'Attack' in bpy.data.actions else [])};samples={}
 for name,action in old_actions.items():
  rig.animation_data.action=action;frames=[]
  for frame in range(1,int(action.frame_range[1])+1):
   scene.frame_set(frame);bpy.context.view_layer.update();frames.append(({p.name:p.matrix_basis.copy() for p in rig.pose.bones},{p.name:p.matrix.copy() for p in rig.pose.bones}))
  samples[name]=frames
 prefixes=['CrewL_','CrewR_'] if kind=='siege' else ['']
 if kind in ['spear','archer']:
  source_rig=rig;source_mesh=bpy.data.objects['Infantry'];source_rest=original_rest
 else:
  with bpy.data.libraries.load(str(SOURCE),link=False) as (src,dst):dst.objects=['InfantryRig','Infantry']
  source_rig=next(o for o in dst.objects if o.type=='ARMATURE');source_mesh=next(o for o in dst.objects if o.type=='MESH')
  for o in dst.objects:scene.collection.objects.link(o)
  source_rest={b.name:b.matrix_local.copy() for b in source_rig.data.bones}
  targets={}
  for prefix in prefixes:
   offset=original_rest[prefix+'Chest']@source_rest['Chest'].inverted()
   targets[prefix]={n:(offset@m if n.startswith(ARM) else original_rest[prefix+n]) for n,m in source_rest.items()}
   mesh=source_mesh.copy();mesh.data=source_mesh.data.copy();scene.collection.objects.link(mesh)
   old_name=prefix.rstrip('_') if prefix else 'Rider';old=bpy.data.objects[old_name];bpy.data.objects.remove(old,do_unlink=True);mesh.name=old_name
   for v in mesh.data.vertices:
    p=v.co.copy();v.co=sum(((targets[prefix][source_mesh.vertex_groups[g.group].name]@source_rest[source_mesh.vertex_groups[g.group].name].inverted()@p)*g.weight for g in v.groups),Vector())
   for g in mesh.vertex_groups:g.name=prefix+g.name
   mesh.parent=rig;mesh.matrix_world=Matrix.Identity(4)
   for modifier in mesh.modifiers:
    if modifier.type=='ARMATURE':modifier.object=rig
   mesh['authoredCarry']='military-v2'
  bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
  for prefix in prefixes:
   for n,m in targets[prefix].items():
    if not n.startswith(ARM):continue
    bone=rig.data.edit_bones.get(prefix+n) or rig.data.edit_bones.new(prefix+n)
    bone.head=m.translation;bone.tail=m.translation+m.to_3x3()@Vector((0,source_rig.data.bones[n].length,0));bone.matrix=m
    p=source_rig.data.bones[n].parent
    if p:bone.parent=rig.data.edit_bones[prefix+p.name]
    bone.use_deform=not n.startswith('Grip')
  bpy.ops.object.mode_set(mode='OBJECT');bpy.data.objects.remove(source_mesh,do_unlink=True);bpy.data.objects.remove(source_rig,do_unlink=True)
 # Explicit sockets on each required hand; crew sockets aid actual contact QA.
 rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
 sockets={}
 for prefix in prefixes:
  for side,name in [('R','GripSpear' if kind in ['spear','heavyHorse'] else 'GripSword'),('L','GripBow' if kind=='archer' else 'GripReins')]:
   if kind=='siege':name='GripTool'+side
   name=prefix+name;parent=prefix+'Hand.'+side;wanted=rest[parent]@VERTICAL;wanted.translation=rest[parent]@GRIP
   b=rig.data.edit_bones.get(name) or rig.data.edit_bones.new(name);b.head=wanted.translation;b.tail=b.head+wanted.to_3x3()@Vector((0,.035,0));b.matrix=wanted;b.parent=rig.data.edit_bones[parent];b.use_deform=False;sockets[name]=parent
 if kind=='archer':
  b=rig.data.edit_bones.new('GripQuiver');b.head=(.12,.27,1.20);b.tail=b.head+Vector((0,0,.035));b.matrix=Matrix.Translation(b.head)@Matrix.Rotation(math.pi/2,4,'X');b.parent=rig.data.edit_bones['Chest'];b.use_deform=False
 bpy.ops.object.mode_set(mode='OBJECT');rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
 if kind=='archer':
  build_archer_bow(rig,rest);rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
 if kind=='siege':
  for prefix in prefixes:crew_wrists(rig,rest,prefix)
 for p in rig.pose.bones:p.rotation_mode='QUATERNION'
 rig.animation_data.action=None
 for track in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(track)
 for action in list(bpy.data.actions):bpy.data.actions.remove(action)
 actions={};rig['authoredCarry']='military-v2'
 for name,last in [('Idle',len(samples['Idle'])),('Walk',len(samples['Walk'])),('Attack',len(samples.get('Attack',samples['Idle'])))]:
  contact_history.clear()
  fixed_arms.clear()
  if kind=='archer' and name=='Attack':last=145
  action=bpy.data.actions.new(name);actions[name]=action;rig.animation_data.action=action
  for f in range(1,last+1):
   scene.frame_set(f);t=(f-1)/(last-1);frames=samples.get(name,samples['Idle']);source=frames[round(t*(len(frames)-1))];strike=max(0,math.sin(math.tau*t));wave=math.sin(math.tau*t)
   for p in rig.pose.bones:p.matrix_basis=source[0].get(p.name,Matrix.Identity(4))
   # Source upper-arm transforms use different rest joints; author them anew.
   for prefix in prefixes:
    for p in rig.pose.bones:
     if p.name.startswith(tuple(prefix+n for n in ARM)):p.matrix_basis=Matrix.Identity(4)
   world=matrices(rig,rest)
   if kind in ['archer','spear'] and name=='Attack':
    # Side-on stance leaves the weapon outside the torso while facing the front.
    facing=world['Head'].copy();hips=world['Hips'];turn=Matrix.Translation(hips.translation)@Matrix.Rotation(-1.15 if kind=='archer' else -.90,4,'Z')@Matrix.Translation(-hips.translation)
    set_world(rig,rest,world,'Hips',turn@hips);world=matrices(rig,rest);facing.translation=world['Head'].translation;set_world(rig,rest,world,'Head',facing);world=matrices(rig,rest)
   for prefix in prefixes:
    chest=prefix+'Chest';delta=world[chest]@rest[chest].inverted();mounted=kind in ['lightHorse','heavyHorse'];offset=Vector((0,.06,.62)) if mounted else Vector()
    for side,sign in ([('L',1),('R',-1)] if kind=='archer' else [('R',-1),('L',1)]):
     handle=Vector((0,0,1));wrist=Vector((sign*.385,-.23,1.07))+offset
     if kind=='siege':
      # Follow the previous real mechanism contact path, with the new palm
      # centre replacing the old approximate 6 cm forward hand extension.
      # The old mechanism rig assigned negative-X grips to its positive-X
      # hand. Preserve the contact paths, but uncross the operator's arms.
      goal=source[1][prefix+'Hand.'+('R' if side=='L' else 'L')].translation+Vector((0,-.06,0));wrist=goal+Vector((0,.064,-.009));handle=Vector((1,0,0))
      if prefix=='CrewR_' and name=='Attack':
       seconds=(f-1)/scene.render.fps;load=smooth(.45,1.1,seconds)*(1-smooth(2.05,2.7,seconds))
       idle=samples['Idle'][0][1];left=idle[prefix+'Hand.R'].translation+Vector((0,-.06,0));right=idle[prefix+'Hand.L'].translation+Vector((0,-.06,0))
       # The hand nearest the sling loads it. The other hand remains on
       # the push bar; never reach across the operator's chest to the sling.
       goal=source[1][prefix+'Hand.L'].translation+Vector((0,-.06,0))+(left-right)*(1-load) if side=='L' else right
       wrist=goal+Vector((0,.064,-.009))
     elif mounted and side=='L':wrist=Vector((.12,-.39,1.74));handle=Vector((1,0,0))
     elif kind=='archer':
      if side=='L':wrist=Vector((.20,-.40,1.18)) if name!='Attack' else Vector((-.03,-.30,1.32))
      else:wrist=Vector((-.24,-.20,1.07)) if name!='Attack' else Vector((-.08,-.24+.12*strike,1.37))
     elif kind=='spear' and side=='L':
      wrist=Vector((.36,-.10,.89));handle=Vector((1,0,0))
     if name=='Attack' and side=='R' and kind in ['spear','heavyHorse']:
      wrist.y-=.12*strike;wrist.z+=.09;handle=Vector((0,-.85,.53))
     elif name=='Attack' and side=='R' and kind=='lightHorse':
      wrist.z+=.20*strike;wrist.y-=.10*strike;handle=Vector((0,-.35*strike,1))
     if name=='Walk' and kind not in ['siege'] and not (mounted and side=='L'):wrist.z+=.005*wave
     if kind!='siege':wrist=delta@wrist;handle=delta.to_3x3()@handle
     if kind=='archer' and name=='Attack' and side=='R':
      # The rigid supplied bow has its string 24.5 cm behind the grip.
      # Keep the nocking hand on that real string, without an air draw.
      goal=world['Hand.L']@Vector((0,.064-.245,.009));wrist=goal-delta.to_3x3()@Vector((0,-.064,.009))
     free_wrist=kind=='siege' and prefix=='CrewR_' and name=='Attack' and side=='L' and load>0
     forward_elbow=kind=='archer' and name=='Attack' and side=='L'
     arm_pose(rig,rest,world,prefix,side,wrist,handle,free_wrist,forward_elbow)
     if kind=='siege' or kind=='archer' and name=='Attack' and side=='R':
      # Solve for the real palm centre rather than approximating a wrist
      # offset in world coordinates when the forearm slopes downward.
      for _ in range(5):
       correction=goal-world[prefix+'Hand.'+side]@GRIP;wrist+=correction
       arm_pose(rig,rest,world,prefix,side,wrist,handle,free_wrist,forward_elbow)
   if name=='Attack' and kind in ['spear','lightHorse','heavyHorse','archer']:
    delta=world['Chest']@rest['Chest'].inverted();orientation=delta.to_3x3()
    thrust=smooth(.18,.36,t)*(1-smooth(.43,.76,t))
    if kind=='spear':
     rear=Vector((-.25,-.18-.03*thrust,1.35));axis=Vector((.85,-.52,.10)).normalized()
     for side,goal in [('R',rear),('L',rear+axis*.287)]:
      contact_pose(rig,rest,world,side,delta@goal,orientation@axis,orientation@Vector((.35 if side=='L' else -.35,-.65,-1)))
    elif kind=='heavyHorse':
     contact_pose(rig,rest,world,'R',delta@Vector((-.38,-.055-.075*thrust,1.93)),orientation@Vector((0,-1,.08)),orientation@Vector((-.35,-.65,-1)))
     wrist_only(rig,rest,world,'R',delta,.05*math.sin(math.tau*t))
    elif kind=='lightHorse':
     wrist_only(rig,rest,world,'R',delta,.12*math.sin(math.tau*t))
    else:
     raise_bow=smooth(.05,.32,t)*(1-smooth(.72,.95,t));draw=.7+.3*raise_bow;release=smooth(.58,.61,t)*(1-smooth(.90,.97,t))
     direction=Vector((.94,-.342,0)).normalized();grip=Vector((.61,-.33,1.38))
     contact_pose(rig,rest,world,'L',delta@grip,orientation@Vector((0,0,1)),orientation@Vector((-1,.2,-.35)),orientation@direction,orientation@Vector((1,0,0)))
     wrist_only(rig,rest,world,'L',delta,.015*math.sin(math.tau*t))
     # Use the actual left palm frame, including its small natural wrist roll.
     left=world['Hand.L'];direction=left.to_3x3()@Vector((0,1,0));grip=left@GRIP
     goal=grip-direction*(.232+.38*draw)
     contact_pose(rig,rest,world,'R',goal,orientation@Vector((0,0,1)),orientation@Vector((-.7,.3,.05)))
     tension=draw*(1-release);nock=left.copy();nock.translation=grip-direction*(.232+.38*tension);set_world(rig,rest,world,'BowNock',nock)
     # Bend the limbs as the string is drawn; each half of the cord stays 44 cm.
     height=math.sqrt(.44**2-(.268*tension)**2)
     for joint,sign in [('BowUpper',1),('BowLower',-1)]:
      tip=left.copy();tip.translation=grip-direction*(.232+.112*tension)+(left.to_3x3()@Vector((1,0,0)))*height*sign;set_world(rig,rest,world,joint,tip)
     arrow=left.copy();arrow.translation=nock.translation+direction*((t-.58)*14 if .58<t<.66 else 0)
     if .66<t<.95:arrow=arrow@Matrix.Scale(.001,4)
     set_world(rig,rest,world,'BowArrow',arrow)
   elif kind=='archer':
    delta=world['Chest']@rest['Chest'].inverted();orientation=delta.to_3x3()
    contact_pose(rig,rest,world,'L',delta@Vector((.56,-.20,1.12)),orientation@Vector((0,0,1)),orientation@Vector((1,.1,-.35)),orientation@Vector((.94,-.342,0)),orientation@Vector((1,0,0)),bow_carry=True)
    left=world['Hand.L']
    for joint,z in [('BowNock',0),('BowUpper',.44),('BowLower',-.44)]:
     pose=left.copy();pose.translation=left@Vector((z,.064-.232,.009));set_world(rig,rest,world,joint,pose)
    arrow=left@Matrix.Scale(.001,4);arrow.translation=left@GRIP;set_world(rig,rest,world,'BowArrow',arrow)
   for p in rig.pose.bones:
    if 'Grip' in p.name:p.matrix_basis=Matrix.Identity(4)
    for prop in ['location','rotation_quaternion','scale']:p.keyframe_insert(prop,frame=f,group=p.name)
  action.use_fake_user=True
 # Both reins are gathered in the left hand, leaving the right hand for arms.
 if kind in ['lightHorse','heavyHorse']:
  for o in scene.objects:
   if not o.name.startswith('Rein '):continue
   group=o.vertex_groups.get('Hand.L') or o.vertex_groups.new(name='Hand.L')
   for v in o.data.vertices:
    blend=max(0,min(1,(-v.co.y-.44)/.46));base=v.co.copy();goal=rest['Hand.L']@GRIP
    v.co=base.lerp(goal,1-blend)
    old=[(g.group,g.weight) for g in v.groups]
    for idx,weight in old:o.vertex_groups[idx].add([v.index],weight*blend,'REPLACE')
    group.add([v.index],1-blend,'REPLACE')
 rig.animation_data.action=actions['Idle'];scene.frame_set(1);scene.frame_end=last
 for im in bpy.data.images:
  if im.source=='FILE':im.pack()
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/military'/(out+'.blend')))
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/art/military'/(out+'.glb')),use_selection=True,export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_def_bones=False,export_anim_single_armature=True,export_anim_slide_to_zero=True,export_extras=True)
 print('MILITARY_GRIP',json.dumps({'kind':kind,'file':out,'bones':len(rig.data.bones),'bytes':(ROOT/'public/art/military'/(out+'.glb')).stat().st_size}))

selected=set(sys.argv[sys.argv.index('--')+1:]) if '--' in sys.argv else set()
for kind,base,out in [('spear','infantry-sword-shield-v2','spear-infantry-v2'),('archer','infantry-sword-shield-v2','archer-infantry-v2'),('lightHorse','light-cavalry-v1','light-cavalry-v2'),('heavyHorse','heavy-cavalry-v1','heavy-cavalry-v2'),('siege','siege-crew-v1','siege-crew-v2')]:
 if not selected or kind in selected:build(kind,base,out)
