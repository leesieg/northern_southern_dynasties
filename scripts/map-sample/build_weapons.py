"""Prepare the five user GLBs as a shared, grip-centred weapon kit.
Blender --background --python-exit-code 1 --python scripts/map-sample/build_weapons.py -- SOURCE_DIRECTORY
Source files remain untouched. Blender +Z up, -Y forward; GLB +Y up, +Z forward.
"""
import bpy,sys,math,json,hashlib
from pathlib import Path
from mathutils import Matrix,Vector
ROOT=Path(__file__).resolve().parents[2]
SOURCE=Path(sys.argv[sys.argv.index('--')+1]);OUT=ROOT/'public/art/military/weapons-v1.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
settings=[('刀','Sword',(.18,0,.105),.82,Matrix.Rotation(math.pi/2,4,'Y'),3000),('盾','Shield',(0,.068,.55),.72,Matrix.Identity(4),3000),('矛','Spear',(0,0,.34),1.78,Matrix.Identity(4),3000),('弓','Bow',(0,0,.015),.94,Matrix.Rotation(math.pi/2,4,'Z')@Matrix.Rotation(-math.pi/2,4,'Y'),5000),('箭袋','Quiver',(-.05,.08,.5),.68,Matrix.Identity(4),5000)]
report=[]
for label,name,grip,scale,rotation,budget in settings:
 before=set(bpy.data.objects);path=SOURCE/f'风云南北朝-{label}.glb';bpy.ops.import_scene.gltf(filepath=str(path))
 imported=set(bpy.data.objects)-before;meshes=[o for o in imported if o.type=='MESH']
 for o in meshes:
  o.data.transform(Matrix.Scale(scale,4)@rotation@Matrix.Translation(-Vector(grip))@o.matrix_world);o.parent=None;o.matrix_world=Matrix.Identity(4)
 bpy.ops.object.select_all(action='DESELECT')
 for o in meshes:o.select_set(True)
 bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();o=bpy.context.object;o.name=name;o.data.name=name+' mesh'
 triangles=sum(len(p.vertices)-2 for p in o.data.polygons)
 dec=o.modifiers.new('Campaign detail budget','DECIMATE');dec.ratio=min(1,budget/triangles);bpy.ops.object.modifier_apply(modifier=dec.name)
 for p in o.data.polygons:p.use_smooth=True
 for mat in o.data.materials:
  if mat.use_nodes:
   for node in mat.node_tree.nodes:
    if node.type=='TEX_IMAGE' and node.image:
     im=node.image
     if max(im.size)>512:im.scale(512,512)
     im.pack()
 for other in imported:
  if other.name in bpy.data.objects and other!=o:bpy.data.objects.remove(other,do_unlink=True)
 report.append(dict(name=name,source=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),triangles=sum(len(p.vertices)-2 for p in o.data.polygons)))
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/military/weapons-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',export_animations=False,export_image_format='AUTO')
print('WEAPONS_REPORT '+json.dumps(report,ensure_ascii=False));print('WEAPONS_BYTES',OUT.stat().st_size)
