"""Offline equipped asset inspection, using the runtime's same bone-local grip mounts."""
import bpy
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'.cache/weapons';OUT.mkdir(parents=True,exist_ok=True)
for kind,file,names in [('shield','infantry-rigged-v1',['Sword','Shield']),('spear','infantry-rigged-v1',['Spear']),('archer','infantry-rigged-v1',['Bow','Quiver']),('lightHorse','light-cavalry-v1',['Sword']),('heavyHorse','heavy-cavalry-v1',['Spear'])]:
 bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.render.fps=30
 bpy.ops.import_scene.gltf(filepath=str(ROOT/f'public/art/military/{file}.glb'))
 rig=next(o for o in scene.objects if o.type=='ARMATURE')
 for track in rig.animation_data.nla_tracks:track.mute=True
 track=next(t for t in rig.animation_data.nla_tracks if 'Idle' in t.name);strip=track.strips[0];rig.animation_data.action=strip.action;rig.animation_data.action_slot=strip.action_slot
 bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/art/military/weapons-v1.glb'))
 for name in ['Sword','Shield','Spear','Bow','Quiver']:
  o=bpy.data.objects[name]
  if name not in names:bpy.data.objects.remove(o,do_unlink=True);continue
  joint='Chest' if name=='Quiver' else 'Hand.L' if name in ['Bow','Shield'] else 'Hand.R';bone=rig.data.bones[joint]
  grip=Vector((.12,.19,1.2)) if name=='Quiver' else bone.matrix_local@Vector((0,.065,0))
  if name=='Shield':grip+=Vector((0,-.045,0))
  rotation=Matrix.Rotation(.4,4,'X') if name=='Sword' else Matrix.Identity(4)
  o.data.transform(Matrix.Translation(grip)@rotation@o.matrix_world);o.parent=rig;o.matrix_world=Matrix.Identity(4)
  group=o.vertex_groups.new(name=joint);group.add(list(range(len(o.data.vertices))),1,'REPLACE');mod=o.modifiers.new('Rigid grip','ARMATURE');mod.object=rig
 scene.frame_set(0);scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.render.resolution_x=480;scene.render.resolution_y=640;scene.render.resolution_percentage=100
 scene.world=bpy.data.worlds.new('Preview');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.45,.5,.55,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
 def aim(o,p=(0,0,1.3)):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
 for pos,power in [((3,-4,6),850),((-3,1,4),550)]:
  bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.size=4;aim(o)
 bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));mat=bpy.data.materials.new('Floor');mat.diffuse_color=(.22,.25,.23,1);bpy.context.object.data.materials.append(mat)
 bpy.ops.object.camera_add(location=(-3,-6,2.8));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=3.8 if 'Horse' in kind else 3.1;scene.camera=cam;aim(cam)
 for view in ['front','back']:
  if view=='back':cam.location=(3,6,2.8);aim(cam)
  scene.render.filepath=str(OUT/f'{kind}-{view}.png');bpy.ops.render.render(write_still=True)
