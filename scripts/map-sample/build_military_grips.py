"""Reuse the repaired infantry skin on every human military rig.
Blender --background --python-exit-code 1 --python scripts/map-sample/build_military_grips.py
Preserves the original horse/cart meshes and their sampled animation transforms.
"""
import bpy, math, json, sys
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
 for p in rig.pose.bones:p.rotation_mode='QUATERNION'
 rig.animation_data.action=None
 for track in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(track)
 for action in list(bpy.data.actions):bpy.data.actions.remove(action)
 actions={};rig['authoredCarry']='military-v2'
 for name,last in [('Idle',len(samples['Idle'])),('Walk',len(samples['Walk'])),('Attack',len(samples.get('Attack',samples['Idle'])))]:
  action=bpy.data.actions.new(name);actions[name]=action;rig.animation_data.action=action
  for f in range(1,last+1):
   scene.frame_set(f);source=samples.get(name,samples['Idle'])[(f-1)%len(samples.get(name,samples['Idle']))];t=(f-1)/(last-1);strike=max(0,math.sin(math.tau*t));wave=math.sin(math.tau*t)
   for p in rig.pose.bones:p.matrix_basis=source[0].get(p.name,Matrix.Identity(4))
   # Source upper-arm transforms use different rest joints; author them anew.
   for prefix in prefixes:
    for p in rig.pose.bones:
     if p.name.startswith(tuple(prefix+n for n in ARM)):p.matrix_basis=Matrix.Identity(4)
   world=matrices(rig,rest)
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
