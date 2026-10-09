"""Inspect the exported siege GLB offline; never automates the game UI.
Blender --background --python-exit-code 1 --python scripts/map-sample/render_siege_preview.py -- --animate
To resume a partial render, append --clip Attack --start 79 after the separator.
"""
import bpy,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'.cache/siege-rig';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.render.fps=30;bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/art/military/siege-crew-v1.glb'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
for t in rig.animation_data.nla_tracks:t.mute=True
scene=bpy.context.scene;scene.render.fps=30;scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.use_denoising=True;scene.render.resolution_x=900;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Preview');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.45,.5,.55,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6;scene.view_settings.view_transform='AgX'
def aim(o,p=(0,0,1.15)):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for pos,power in [((3,-4,6),850),((-3,1,4),550)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.size=4;aim(o)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));mat=bpy.data.materials.new('Floor');mat.diffuse_color=(.22,.25,.23,1);bpy.context.object.data.materials.append(mat)
bpy.ops.object.camera_add(location=(4,-6,3.3));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=4.4;scene.camera=cam;aim(cam)
def action(name):
 track=next(t for t in rig.animation_data.nla_tracks if name in t.name);strip=track.strips[0];rig.animation_data.action=strip.action;rig.animation_data.action_slot=strip.action_slot
if '--animate' in sys.argv:
 scene.render.resolution_x=640;scene.render.resolution_y=512;scene.cycles.samples=6;cam.location=(5,-5,3.2);cam.data.ortho_scale=4.8;aim(cam)
 for name,count,step in [('Walk',36,3),('Attack',80,3)]:
  if '--clip' in sys.argv and name!=sys.argv[sys.argv.index('--clip')+1]:continue
  action(name)
  start=int(sys.argv[sys.argv.index('--start')+1]) if '--start' in sys.argv else 0
  for i in range(start,count):scene.frame_set(i*step);scene.render.filepath=str(OUT/f'{name.lower()}-{i:03d}.png');bpy.ops.render.render(write_still=True)
else:
 for name,frame in [('Idle',0),('Walk',24),('Attack',48),('Attack',120),('Attack',138),('Attack',168)]:
  action(name);scene.frame_set(frame);scene.render.filepath=str(OUT/f'{name.lower()}-{frame}.png');bpy.ops.render.render(write_still=True)
 cam.location=(5,0,1.4);cam.data.ortho_scale=4.5;aim(cam,(0,0,1.4));action('Idle');scene.frame_set(0);scene.render.filepath=str(OUT/'side-idle.png');bpy.ops.render.render(write_still=True)
