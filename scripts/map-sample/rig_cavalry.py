"""Prepare user-supplied horses + the existing infantry rider; source GLBs stay untouched.
Blender --background --python scripts/map-sample/rig_cavalry.py -- HORSE_DIRECTORY
Outputs separate mounted cavalry GLBs, editable .blend sources and offline asset previews.
"""
import bpy, math, sys, json, hashlib
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion, Euler
ROOT=Path(__file__).resolve().parents[2]
SOURCE=Path(sys.argv[sys.argv.index('--')+1])
QA=ROOT/'.cache/cavalry-rig';QA.mkdir(parents=True,exist_ok=True)

def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
def smooth(a,b,v):
 t=max(0,min(1,(v-a)/(b-a)));return t*t*(3-2*t)
def build(kind,filename):
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.context.preferences.filepaths.save_version=0
 source=SOURCE/filename
 bpy.ops.import_scene.gltf(filepath=str(source))
 horse=next(o for o in bpy.context.scene.objects if o.type=='MESH')
 horse.data.transform(Matrix.Rotation(math.pi/2,4,'Z')@horse.matrix_world);horse.parent=None;horse.matrix_world=Matrix.Identity(4)
 for o in list(bpy.context.scene.objects):
  if o!=horse:bpy.data.objects.remove(o,do_unlink=True)
 vs=[v.co for v in horse.data.vertices];lo=Vector([min(p[i] for p in vs) for i in range(3)]);hi=Vector([max(p[i] for p in vs) for i in range(3)])
 scale=2.05/(hi.z-lo.z)
 horse.data.transform(Matrix.Scale(scale,4)@Matrix.Translation((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z)))
 # The remeshed exports have a small yaw. Align the actual front/hind hoof rows before rigging.
 low=[v.co.copy() for v in horse.data.vertices if v.co.z<.20]
 fore=[v for v in low if v.y<-.1];hind=[v for v in low if v.y>.2]
 fc=sum(fore,Vector())/len(fore);hc=sum(hind,Vector())/len(hind)
 yaw=math.atan((fc.x-hc.x)/(fc.y-hc.y));rot=Matrix.Rotation(yaw,4,'Z');center=rot@((fc+hc)/2)
 horse.data.transform(Matrix.Translation((-center.x,-center.y,0))@rot)
 horse.name='Horse';bpy.context.view_layer.objects.active=horse
 dec=horse.modifiers.new('Map mesh budget','DECIMATE');dec.ratio=min(1,20000/len(horse.data.polygons));bpy.ops.object.modifier_apply(modifier=dec.name)
 # Portable 1K horse maps. The existing infantry textures are preserved independently.
 for im in list(bpy.data.images):
  if im.type=='IMAGE' and im.size[0]>1024:im.scale(1024,1024);im.pack()
 for mat in horse.data.materials:
  if mat.use_nodes:
   p=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
   if p and 'Specular Tint' in p.inputs:p.inputs['Specular Tint'].default_value=(1,1,1,1)
 # Load the established rider rig and its UV-preserving low mesh, not a new generated person.
 with bpy.data.libraries.load(str(ROOT/'art/military/infantry-rigged-v1.blend'),link=False) as (src,dst):dst.objects=['InfantryRig','Infantry']
 for o in dst.objects:bpy.context.collection.objects.link(o)
 rig=bpy.data.objects['InfantryRig'];rider=bpy.data.objects['Infantry'];rider.name='Rider'
 rig.animation_data_clear()
 for action in list(bpy.data.actions):bpy.data.actions.remove(action)
 for pb in rig.pose.bones:pb.matrix_basis=Matrix.Identity(4)
 rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
 old={b.name:(b.head_local.copy(),b.tail_local.copy(),b.parent.name if b.parent else None) for b in rig.data.bones}
 world={}
 def direct(name,head,tail):
  h,t,parent=old[name];q=(t-h).rotation_difference(Vector(tail)-Vector(head))@rest[name].to_quaternion()
  wanted=Matrix.Translation(head)@q.to_matrix().to_4x4()
  basis=rest[name].inverted()@(rest[parent]@world[parent].inverted() if parent else Matrix.Identity(4))@wanted
  rig.pose.bones[name].matrix_basis=basis;world[name]=wanted
 shift=Vector((0,.06,.62))
 for b in rig.data.bones:
  h,t,parent=old[b.name];wanted=Matrix.Translation(shift)@rest[b.name] if b.name!='Root' else rest[b.name]
  rig.pose.bones[b.name].matrix_basis=rest[b.name].inverted()@(rest[parent]@world[parent].inverted() if parent else Matrix.Identity(4))@wanted
  world[b.name]=wanted
 for side,sign in [('L',1),('R',-1)]:
  hip=old['Thigh.'+side][0]+shift;knee=Vector((sign*.40,-.22,1.22));ankle=Vector((sign*.38,-.15,.90))
  direct('Thigh.'+side,hip,knee);direct('Shin.'+side,knee,ankle);direct('Foot.'+side,ankle,ankle+Vector((0,-.12,-.035)))
  direct('Toe.'+side,ankle+Vector((0,-.12,-.035)),ankle+Vector((0,-.20,-.035)))
  shoulder=old['UpperArm.'+side][0]+shift;elbow=Vector((sign*.25,-.16,1.75));hand=Vector((sign*.12,-.40,1.74))
  direct('UpperArm.'+side,shoulder,elbow);direct('Forearm.'+side,elbow,hand);direct('Hand.'+side,hand,hand+Vector((0,-.10,0)))
  for panel in ['Front','Back','Side']:
   h=old['Skirt'+panel+'.'+side][0]+shift
   direct('Skirt'+panel+'.'+side,h,(sign*.43,h.y-.09,1.19))
 bpy.context.view_layer.update()
 # Bake only the mounted rest pose; keep all original skin weights for subtle rider motion.
 bpy.ops.object.select_all(action='DESELECT');rider.select_set(True);bpy.context.view_layer.objects.active=rider
 for mod in list(rider.modifiers):
  if mod.type=='ARMATURE':bpy.ops.object.modifier_apply(modifier=mod.name)
 rider.select_set(False);rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='POSE');bpy.ops.pose.armature_apply(selected=False);bpy.ops.object.mode_set(mode='OBJECT')
 mod=rider.modifiers.new('Mounted rider skin','ARMATURE');mod.object=rig
 # Horse anatomy is in metres, forward -Y. Each limb has its own shoulder/hip, knee and hoof.
 bones={}
 def bone(n,h,t,p=None):bones[n]=(Vector(h),Vector(t),p)
 bone('HorseRoot',(0,0,0),(0,0,.12))
 bone('HorseBody',(0,.10,1.17),(0,-.30,1.38),'HorseRoot')
 bone('Saddle',(0,.06,1.40),(0,.06,1.55),'HorseBody')
 bone('HorseNeck',(0,-.40,1.38),(0,-.64,1.78),'HorseBody')
 bone('HorseHead',(0,-.64,1.78),(0,-.92,1.63),'HorseNeck')
 bone('HorseTail',(0,.78,1.23),(0,.90,.70),'HorseBody')
 bone('HorseTailTip',(0,.90,.70),(0,.98,.30),'HorseTail')
 # Source-specific hoof positions are measured from each reduced mesh, avoiding invented stance widths.
 feet={}
 for part,ytest in [('Fore',lambda y:y<-.12),('Hind',lambda y:.18<y<.83)]:
  for side,sign in [('L',1),('R',-1)]:
   pts=[v.co for v in horse.data.vertices if .03<v.co.z<.17 and v.co.x*sign>.025 and ytest(v.co.y)]
   if not pts:raise RuntimeError('Cannot locate '+part+side+' hoof in source')
   x=sum(v.x for v in pts)/len(pts);y=sum(v.y for v in pts)/len(pts)
   hoof=Vector((x,y,.105));top=Vector((sign*.22,-.40 if part=='Fore' else .51,1.18));knee=Vector((x,y+(.015 if part=='Fore' else .10),.58))
   name=part+side;feet[name]=hoof
   bone(name+'Upper',top,knee,'HorseBody');bone(name+'Lower',knee,hoof,name+'Upper');bone(name+'Hoof',hoof,hoof+Vector((0,-.10,-.04)),name+'Lower')
 bpy.ops.object.mode_set(mode='EDIT')
 for n,(h,t,p) in bones.items():
  b=rig.data.edit_bones.new(n);b.head=h;b.tail=t
  if p:b.parent=rig.data.edit_bones[p]
 rig.data.edit_bones['Root'].parent=rig.data.edit_bones['Saddle']
 bpy.ops.object.mode_set(mode='OBJECT')
 rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
 for pb in rig.pose.bones:pb.rotation_mode='QUATERNION'
 def distance(p,n):
  a,b,_=bones[n];d=b-a;t=max(0,min(1,(p-a).dot(d)/d.length_squared));return (p-a-t*d).length
 for n in bones:horse.vertex_groups.new(name=n)
 for v in horse.data.vertices:
  p=v.co;x,y,z=p;limb=min(feet,key=lambda name:min(distance(p,name+'Upper'),distance(p,name+'Lower'),distance(p,name+'Hoof')))
  if y>.78 and z<1.30:names=['HorseTail','HorseTailTip']
  elif y<-.53 and z>1.34:names=['HorseNeck','HorseHead']
  elif y<-.30 and z>1.15:names=['HorseBody','HorseNeck']
  else:names=['HorseBody']
  weights={n:1/max(.045,distance(p,n))**5 for n in names};total=sum(weights.values());weights={n:w/total for n,w in weights.items()}
  if z<1.16 and y<.78:
   limb_names=[limb+'Upper',limb+'Lower']+([limb+'Hoof'] if z<.32 else [])
   nearest=min(distance(p,n) for n in limb_names)
   amount=(1-smooth(.78,1.14,z))*(1-smooth(.12,.28,nearest))*(1-smooth(.22,.40,z)*(1-smooth(.015,.12,abs(x))))
   leg={n:1/max(.04,distance(p,n))**5 for n in limb_names};total=sum(leg.values())
   weights={n:w*(1-amount) for n,w in weights.items()}
   for n,w in leg.items():weights[n]=weights.get(n,0)+amount*w/total
  if z<.24 and distance(p,limb+'Hoof')<.25:
   ankle=smooth(.13,.26,z);weights={limb+'Hoof':1-ankle,limb+'Lower':ankle}
  # The hanging tail crosses the left/right plane; never let that plane split it between hind legs.
  tail=smooth(.56,.66,y)*(1-smooth(.10,.18,abs(x)))*(1-smooth(1.16,1.34,z))
  if tail>0:
   tip=1-smooth(.42,.82,z);weights={n:w*(1-tail) for n,w in weights.items()}
   weights['HorseTail']=weights.get('HorseTail',0)+tail*(1-tip);weights['HorseTailTip']=weights.get('HorseTailTip',0)+tail*tip
  weights=sorted(weights.items(),key=lambda a:-a[1])[:4];total=sum(w for _,w in weights)
  for n,w in weights:horse.vertex_groups[n].add([v.index],w/total,'REPLACE')
 mod=horse.modifiers.new('Horse skin','ARMATURE');mod.object=rig;horse.parent=rig
 # Reins connect the seated hands to the bridle; weighted with the neck, rather than rigidly floating.
 reins=bpy.data.materials.new('Dark leather reins');reins.diffuse_color=(.12,.07,.035,1);reins.use_nodes=True;reins.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.12,.07,.035,1);reins.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.85
 for side,sign in [('L',1),('R',-1)]:
  curve=bpy.data.curves.new('Rein '+side,'CURVE');curve.dimensions='3D';curve.bevel_depth=.009;curve.bevel_resolution=2
  s=curve.splines.new('BEZIER');s.bezier_points.add(3)
  for bp,p in zip(s.bezier_points,[(sign*.12,-.44,1.74),(sign*.17,-.60,1.60),(sign*.15,-.83,1.49),(sign*.12,-.98,1.56)]):bp.co=p;bp.handle_left_type=bp.handle_right_type='AUTO'
  o=bpy.data.objects.new('Rein '+side,curve);bpy.context.collection.objects.link(o);curve.materials.append(reins);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o=bpy.context.object
  for n in ['HorseBody','HorseHead']:o.vertex_groups.new(name=n)
  for v in o.data.vertices:
   t=smooth(.50,.90,-v.co.y);o.vertex_groups['HorseHead'].add([v.index],t,'REPLACE');o.vertex_groups['HorseBody'].add([v.index],1-t,'REPLACE')
  mod=o.modifiers.new('Rein follow','ARMATURE');mod.object=rig;o.parent=rig
 def local(n,translation=(0,0,0),rotation=(0,0,0)):
  pb=rig.pose.bones[n];q=rest[n].to_quaternion();pb.location=q.inverted()@Vector(translation);pb.rotation_quaternion=q.inverted()@Euler(rotation,'XYZ').to_quaternion()@q;pb.scale=(1,1,1)
 def world_matrices():
  result={}
  for b in rig.data.bones:result[b.name]=result[b.parent.name]@rest[b.parent.name].inverted()@rest[b.name]@rig.pose.bones[b.name].matrix_basis if b.parent else rest[b.name]@rig.pose.bones[b.name].matrix_basis
  return result
 def point(n,h,t,world):
  a,b,parent=bones[n];q=(b-a).rotation_difference(t-h)@rest[n].to_quaternion();wanted=Matrix.Translation(h)@q.to_matrix().to_4x4()
  rig.pose.bones[n].matrix_basis=rest[n].inverted()@(rest[parent]@world[parent].inverted() if parent else Matrix.Identity(4))@wanted;world[n]=wanted
 def pose(kind,t):
  for n in rest:local(n)
  wave=math.sin(math.tau*t);walking=kind=='Walk'
  local('HorseBody',(0,0,.006*math.sin(4*math.pi*t) if walking else .002*wave),(.006*wave if walking else 0,.008*wave if walking else 0,0))
  local('HorseNeck',rotation=(.018*wave if walking else .007*wave,0,0));local('HorseHead',rotation=(-.009*wave,0,.004*wave))
  local('HorseTail',rotation=(.035*math.sin(math.tau*t-.6),.025*wave,0));local('HorseTailTip',rotation=(.05*math.sin(math.tau*t-1.1),0,0))
  local('Spine',rotation=(-.008*wave,0,0));local('Chest',rotation=(.005*wave,0,.004*wave));local('Head',rotation=(.004*wave,0,-.003*wave));local('Plume',rotation=(.018*math.sin(math.tau*t-.4),0,0))
  world=world_matrices()
  for name,base in feet.items():
   # Four-beat walking gait: one foot swings at a time; long stance and low lifted hooves.
   phase=(t+{'HindL':0,'ForeL':.25,'HindR':.5,'ForeR':.75}[name])%1
   move=0;lift=0
   if walking:
    if phase<.75:move=-.17+.34*phase/.75
    else:
     u=(phase-.75)/.25;move=(2*u**3-3*u*u+1)*.17+(u**3-2*u*u+u)*(.34/3)+(-2*u**3+3*u*u)*(-.17)+(u**3-u*u)*(.34/3);lift=.12*math.sin(math.pi*u)**2
   target=base+Vector((0,move,lift));upper=name+'Upper';lower=name+'Lower'
   h=(world['HorseBody']@rest['HorseBody'].inverted())@bones[upper][0]
   a=(bones[upper][1]-bones[upper][0]).length;b=(bones[lower][1]-bones[lower][0]).length;delta=target-h;d=min(delta.length,a+b-.00001);axis=delta.normalized();along=(a*a-b*b+d*d)/(2*d);bend=math.sqrt(max(0,a*a-along*along));direction=Vector((0,-1 if name.startswith('Fore') else 1,0));direction=(direction-axis*direction.dot(axis)).normalized();knee=h+axis*along+direction*bend
   point(upper,h,knee,world);point(lower,knee,target,world);point(name+'Hoof',target,target+(bones[name+'Hoof'][1]-bones[name+'Hoof'][0]),world)
 scene=bpy.context.scene;scene.render.fps=30;rig.animation_data_create();actions={}
 for name,last in [('Idle',91),('Walk',49)]:
  action=bpy.data.actions.new(name);rig.animation_data.action=action;actions[name]=action
  for f in range(1,last+1):
   scene.frame_set(f);pose(name,(f-1)/(last-1))
   for pb in rig.pose.bones:
    for prop in ['location','rotation_quaternion','scale']:pb.keyframe_insert(prop,frame=f,group=pb.name)
  action.use_fake_user=True;track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action);track.mute=True
 rig.animation_data.action=actions['Idle'];scene.frame_set(1)
 # Remove the imported infantry's unreferenced actions so the GLB has only mounted clips.
 for action in list(bpy.data.actions):
  if action not in actions.values():bpy.data.actions.remove(action)
 for im in bpy.data.images:
  if im.source=='FILE':im.pack()
 scene.frame_end=91;rig.name='CavalryRig'
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/f'art/military/{kind}-cavalry-v1.blend'))
 bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=rig
 output=ROOT/f'public/art/military/{kind}-cavalry-v1.glb'
 bpy.ops.export_scene.gltf(filepath=str(output),use_selection=True,export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_def_bones=False,export_anim_single_armature=True,export_anim_slide_to_zero=True)
 report={'kind':kind,'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'horse_triangles':sum(len(p.vertices)-2 for p in horse.data.polygons),'rider_triangles':sum(len(p.vertices)-2 for p in rider.data.polygons),'bones':len(rig.data.bones),'feet':{n:list(p) for n,p in feet.items()},'bytes':output.stat().st_size}
 (QA/f'{kind}-report.json').write_text(json.dumps(report,indent=2));print('CAVALRY_REPORT',json.dumps(report),flush=True)
 if '--skip-previews' in sys.argv:return
 # Offline asset inspection only, not browser/UI acceptance.
 scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True
 scene.world=bpy.data.worlds.new('Preview world');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.45,.5,.55,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.55
 scene.render.resolution_x=800;scene.render.resolution_y=760;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
 for pos,power in [((3,-4,6),650),((-3,1,4),450)]:
  bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.size=4;aim(o,(0,0,1.4))
 bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));mat=bpy.data.materials.new('Preview floor');mat.diffuse_color=(.22,.25,.23,1);bpy.context.object.data.materials.append(mat)
 bpy.ops.object.camera_add(location=(4,-6,3));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=3.5;scene.camera=cam;aim(cam,(0,0,1.35))
 for label,action,frame,pos in [('idle','Idle',1,(4,-6,3)),('side','Idle',1,(5,0,2)),('walk','Walk',43,(4,-6,3))]:
  rig.animation_data.action=actions[action];scene.frame_set(frame);cam.location=pos;aim(cam,(0,0,1.35));scene.render.filepath=str(QA/f'{kind}-{label}.png');bpy.ops.render.render(write_still=True)
for kind,name in [('light','风云南北朝-轻骑兵战马.glb'),('heavy','风云南北朝-重骑兵战马.glb')]:build(kind,name)
