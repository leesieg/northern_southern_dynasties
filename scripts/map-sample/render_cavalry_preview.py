"""Reimport the delivered GLBs and render one cycle offline (no game UI automation)."""
import bpy
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'.cache/cavalry-rig';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
rigs=[]
for kind,x in [('light',-1.5),('heavy',1.5)]:
 before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/f'public/art/military/{kind}-cavalry-v1.glb'));objects=set(bpy.context.scene.objects)-before
 rig=next(o for o in objects if o.type=='ARMATURE');rigs.append(rig)
 for t in rig.animation_data.nla_tracks:t.mute=True
 holder=bpy.data.objects.new(kind+' preview',None);bpy.context.collection.objects.link(holder)
 for o in objects:
  if not o.parent:o.parent=holder
 holder.location.x=x;holder.rotation_euler.z=-.45
scene=bpy.context.scene;scene.render.fps=30;scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.use_denoising=True
scene.render.resolution_x=1000;scene.render.resolution_y=640;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Preview');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.45,.5,.55,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
scene.view_settings.view_transform='AgX'
def aim(o,p=(0,0,1.4)):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for pos,power in [((2,-4,6),950),((-3,1,4),600)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.size=5;aim(o)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));mat=bpy.data.materials.new('Floor');mat.diffuse_color=(.22,.25,.23,1);bpy.context.object.data.materials.append(mat)
bpy.ops.object.camera_add(location=(0,-8,3.5));camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=6.2;scene.camera=camera;aim(camera)
for kind,count,step in [('Idle',30,3),('Walk',24,2)]:
 for rig in rigs:
  track=next(t for t in rig.animation_data.nla_tracks if kind in t.name);strip=track.strips[0];rig.animation_data.action=strip.action;rig.animation_data.action_slot=strip.action_slot
 for i in range(count):
  scene.frame_set(i*step);scene.render.filepath=str(OUT/f'preview-{kind.lower()}-{i:02d}.png');bpy.ops.render.render(write_still=True)
 print('PREVIEW_DONE',kind,flush=True)
