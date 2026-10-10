"""Render deformed meshes exported by export_carry_preview.test.mjs; no UI automation.
CARRY_PREVIEW=1 npx vitest run scripts/map-sample/export_carry_preview.test.mjs
Blender --background --python-exit-code 1 --python scripts/map-sample/render_weapons_preview.py
"""
import bpy,json,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'.cache/weapons/carry';OUT.mkdir(parents=True,exist_ok=True)
files=sorted(OUT.glob('*.json'))
if '--idle' in sys.argv:files=[p for p in files if p.stem.endswith('-0')]
for path in files:
 data=json.loads(path.read_text());bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene
 bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/art/military'/data['file']))
 bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/art/military/weapons-v1.glb'))
 materials={o.name:list(o.data.materials) for o in scene.objects if o.type=='MESH'}
 for o in list(scene.objects):bpy.data.objects.remove(o,do_unlink=True)
 for item in data['objects']:
  pos=item['positions'];indices=item['indices'];uv=item['uv'];name=item['name'].replace('Equipment ','')
  m=bpy.data.meshes.new(name);m.from_pydata([pos[i:i+3] for i in range(0,len(pos),3)],[],[indices[i:i+3] for i in range(0,len(indices),3)]);m.update();o=bpy.data.objects.new(name,m);scene.collection.objects.link(o)
  source=materials.get(name) or next((v for k,v in materials.items() if k.replace('.','').replace(' ','_')==name or name.startswith(k+'_')),None)
  if not source:raise RuntimeError('Missing original material for '+name+'; available '+str(materials.keys()))
  for mat in source:m.materials.append(mat)
  if uv:
   layer=m.uv_layers.new()
   for loop in m.loops:layer.data[loop.index].uv=(uv[loop.vertex_index*2],1-uv[loop.vertex_index*2+1])
  for p in m.polygons:p.use_smooth=True
 scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.render.resolution_x=600;scene.render.resolution_y=720;scene.render.resolution_percentage=100
 scene.world=bpy.data.worlds.new('Preview');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.45,.5,.55,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
 def aim(o,p=(0,0,1.3)):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
 for pos,power in [((3,-4,6),850),((-3,1,4),550)]:
  bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.size=4;aim(o)
 bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));mat=bpy.data.materials.new('Floor');mat.diffuse_color=(.22,.25,.23,1);bpy.context.object.data.materials.append(mat)
 bpy.ops.object.camera_add(location=(-3,-6,2.8));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=3.8 if 'Horse' in path.stem else 3.1;scene.camera=cam;aim(cam)
 for view in ['front','back'] if path.stem.endswith('-0') else ['front']:
  if view=='back':cam.location=(3,6,2.8);aim(cam)
  scene.render.filepath=str(OUT/f'{path.stem}-{view}.png');bpy.ops.render.render(write_still=True)
