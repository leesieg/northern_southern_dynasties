"""Prepare the supplied siege cart with two existing infantry crew.
Blender --background --python-exit-code 1 --python scripts/map-sample/rig_siege.py -- SOURCE_GLB
The source is untouched. Idle/Walk animate the crew only: wheel / firing rigs remain future work.
"""
import bpy,math,sys,json,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[2];SOURCE=Path(sys.argv[sys.argv.index('--')+1]);QA=ROOT/'.cache/siege-rig';QA.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
bpy.ops.import_scene.gltf(filepath=str(SOURCE));cart=next(o for o in bpy.context.scene.objects if o.type=='MESH')
cart.data.transform(Matrix.Rotation(math.pi/2,4,'Z')@cart.matrix_world);cart.parent=None;cart.matrix_world=Matrix.Identity(4)
for o in list(bpy.context.scene.objects):
 if o!=cart:bpy.data.objects.remove(o,do_unlink=True)
vs=[v.co for v in cart.data.vertices];lo=Vector([min(p[i] for p in vs) for i in range(3)]);hi=Vector([max(p[i] for p in vs) for i in range(3)]);scale=2.2/(hi.z-lo.z)
cart.data.transform(Matrix.Scale(scale,4)@Matrix.Translation((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z)));cart.name='Siege chassis'
bpy.context.view_layer.objects.active=cart;dec=cart.modifiers.new('Map mesh budget','DECIMATE');dec.ratio=min(1,20000/len(cart.data.polygons));bpy.ops.object.modifier_apply(modifier=dec.name)
for im in bpy.data.images:
 if im.type=='IMAGE' and im.size[0]>1024:im.scale(1024,1024);im.pack()
for mat in cart.data.materials:
 if mat.use_nodes:
  p=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
  if p and 'Specular Tint' in p.inputs:p.inputs['Specular Tint'].default_value=(1,1,1,1)
# The generated wheels intersect the frame. Preserve the source silhouette until proper
# hard-surface separation is complete; region slicing produces visibly broken wheel faces.
cart.name='Chassis';parts={'Chassis':cart}
with bpy.data.libraries.load(str(ROOT/'art/military/infantry-rigged-v1.blend'),link=False) as (src,dst):dst.objects=['InfantryRig','Infantry']
for o in dst.objects:bpy.context.collection.objects.link(o)
source_rig=bpy.data.objects['InfantryRig'];source_mesh=bpy.data.objects['Infantry'];source_actions={name:bpy.data.actions[name] for name in ['Idle','Walk']}
for track in source_rig.animation_data.nla_tracks:track.mute=True
source_rig.animation_data.action=None
for pb in source_rig.pose.bones:pb.matrix_basis=Matrix.Identity(4)
# Keep the draft portable to the existing mixer contract without claiming finished cart motion.
arm=bpy.data.armatures.new('Siege crew skeleton');rig=bpy.data.objects.new('SiegeRig',arm);bpy.context.collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
b=arm.edit_bones.new('SiegeRoot');b.head=(0,0,0);b.tail=(0,0,.15)
for n,c in [('Chassis',Vector((0,0,.2)))]:
 b=arm.edit_bones.new(n);b.head=c;b.tail=c+Vector((.15,0,0));b.parent=arm.edit_bones['SiegeRoot']
shifts={'CrewL':Vector((.98,.25,0)),'CrewR':Vector((-.98,.25,0))}
for prefix,shift in shifts.items():
 for src in source_rig.data.bones:
  b=arm.edit_bones.new(prefix+'_'+src.name);b.head=src.head_local+shift;b.tail=src.tail_local+shift;b.matrix=Matrix.Translation(shift)@src.matrix_local;b.length=src.length;b.parent=arm.edit_bones[prefix+'_'+src.parent.name] if src.parent else arm.edit_bones['SiegeRoot']
bpy.ops.object.mode_set(mode='OBJECT')
for pb in rig.pose.bones:pb.rotation_mode='QUATERNION'
for name,ob in parts.items():
 ob.vertex_groups.new(name=name).add(list(range(len(ob.data.vertices))),1,'REPLACE');mod=ob.modifiers.new('Rigid component','ARMATURE');mod.object=rig;ob.parent=rig
for prefix,shift in shifts.items():
 ob=source_mesh.copy();ob.data=source_mesh.data.copy();bpy.context.collection.objects.link(ob);ob.name=prefix;ob.parent=rig;ob.matrix_world=Matrix.Identity(4);ob.data.transform(Matrix.Translation(shift))
 for group in ob.vertex_groups:group.name=prefix+'_'+group.name
 for mod in ob.modifiers:
  if mod.type=='ARMATURE':mod.object=rig
scene=bpy.context.scene;scene.render.fps=30;rig.animation_data_create();actions={}
for name,last in [('Idle',73),('Walk',37)]:
 action=bpy.data.actions.new('Siege_'+name);rig.animation_data.action=action;source_rig.animation_data.action=source_actions[name];actions[name]=action
 for f in range(1,last+1):
  scene.frame_set(f)
  for pb in rig.pose.bones:pb.matrix_basis=Matrix.Identity(4)
  for prefix in shifts:
   for src in source_rig.pose.bones:rig.pose.bones[prefix+'_'+src.name].matrix_basis=src.matrix_basis.copy()
  for pb in rig.pose.bones:
   for prop in ['location','rotation_quaternion','scale']:pb.keyframe_insert(prop,frame=f,group=pb.name)
 action.use_fake_user=True;track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action);track.mute=True
# Source rig was only used to sample established infantry motion; never include it in the asset.
bpy.data.objects.remove(source_mesh,do_unlink=True);bpy.data.objects.remove(source_rig,do_unlink=True)
for a in list(bpy.data.actions):
 if a not in actions.values():bpy.data.actions.remove(a)
for name,a in actions.items():a.name=name
rig.animation_data.action=actions['Idle'];scene.frame_set(1);scene.frame_end=73
for im in bpy.data.images:
 if im.source=='FILE':im.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/military/siege-crew-v1.blend'))
bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=rig
output=ROOT/'public/art/military/siege-crew-v1.glb'
bpy.ops.export_scene.gltf(filepath=str(output),use_selection=True,export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_def_bones=False,export_anim_single_armature=True,export_anim_slide_to_zero=True)
report={'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'stage':'crew animation draft; wheels and throwing mechanism unrigged','parts':{n:len(o.data.polygons) for n,o in parts.items()},'bones':len(arm.bones),'bytes':output.stat().st_size};(QA/'report.json').write_text(json.dumps(report,indent=2));print('SIEGE_REPORT',json.dumps(report),flush=True)
# Offline asset inspection; firing is deliberately not invented for the unsplit arm/ropes.
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.render.resolution_x=900;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Preview');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.45,.5,.55,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6;scene.view_settings.view_transform='AgX'
def aim(o):o.rotation_euler=(Vector((0,0,1.05))-o.location).to_track_quat('-Z','Y').to_euler()
for pos,power in [((3,-4,6),850),((-3,1,4),550)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.size=4;aim(o)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));mat=bpy.data.materials.new('Floor');mat.diffuse_color=(.22,.25,.23,1);bpy.context.object.data.materials.append(mat)
bpy.ops.object.camera_add(location=(4,-6,3.3));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=4.4;scene.camera=cam;aim(cam)
for name,frame in [('Idle',1),('Walk',10)]:
 rig.animation_data.action=actions[name];scene.frame_set(frame);scene.render.filepath=str(QA/(name.lower()+'.png'));bpy.ops.render.render(write_still=True)
