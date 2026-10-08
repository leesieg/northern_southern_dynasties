"""Original period-inspired atlas study. Run through Blender MCP background mode.
No claim of archaeological reconstruction. The open tabletop holds the live geographic scene.
"""
import bpy, math, os
from mathutils import Vector
scene=bpy.data.scenes.new('Nanbeichao_Atlas_Study')
bpy.context.window.scene=scene
materials={}
def material(name,rgb,metal=0):
 m=bpy.data.materials.new('Study '+name);m.diffuse_color=(*rgb,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=.8;p.inputs['Metallic'].default_value=metal
 materials[name]=m;return m
material('timber',(.13,.059,.029));material('edge',(.24,.12,.055));material('paper',(.61,.55,.40));material('wall',(.39,.35,.26));material('ink',(.018,.025,.024));material('bronze',(.36,.26,.10),.45);material('celadon',(.13,.29,.25));material('floor',(.20,.18,.145));material('red',(.30,.07,.045))
def box(name,x,y,z,w,h,d,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.name='Study '+name;o.scale=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(materials[mat]);return o
def cylinder(name,x,y,z,r,h,mat,axis='up'):
 bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=h,location=(x,-z,y));o=bpy.context.object;o.name='Study '+name
 if axis=='x':o.rotation_euler.y=math.pi/2
 o.data.materials.append(materials[mat]);return o
# Paper plane is y=0, covering 10.018754 by 7.514066 units.
box('low writing table',0,-.18,0,12.7,.3,9.7,'timber')
for x in [-6.1,6.1]:
 box('table leg',x,-1.2,4.4,.3,1.8,.3,'edge');box('table leg',x,-1.2,-4.4,.3,1.8,.3,'edge')
for z in [-4.72,4.72]:box('apron',0,-.58,z,12.2,.5,.18,'edge')
for x in [-6.24,6.24]:box('apron',x,-.58,0,.18,.5,9.4,'edge')
for x in [-5.1,5.1]:box('map frame',x,.04,0,.13,.13,7.78,'edge')
for z in [-3.82,3.82]:box('map frame',0,.04,z,10.3,.13,.13,'edge')
for x in [-6.1,6.1]:
 for z in [-4.45,4.45]:box('corner fitting',x,-.016,z,.38,.028,.4,'bronze')
# Scrolls rather than later thread-bound books.
for i in range(4):
 z=-2.5+i*.64
 cylinder('rolled silk',5.7,.17,z,.17,.96,'paper','x');cylinder('scroll spindle',5.7,.17,z,.052,1.25,'timber','x')
box('inkstone',-5.73,.05,1.3,.62,.13,.92,'ink');box('ink well',-5.73,.12,1.1,.38,.025,.35,'timber')
for i in range(2):
 o=cylinder('writing brush',-5.9+i*.25,.10,-.1,.026,1.1,'edge','x');o.rotation_euler.z=.28
cylinder('brush washer',-5.75,.13,-1.2,.31,.22,'celadon');cylinder('washer water',-5.75,.25,-1.2,.24,.008,'ink')
box('seal base',5.7,.1,1.4,.35,.20,.35,'bronze');cylinder('seal grip',5.7,.27,1.4,.09,.18,'bronze')
box('red ink tray',5.7,.07,2.15,.5,.12,.5,'timber');cylinder('seal paste',5.7,.14,2.15,.18,.018,'red')
# Screen, low seat, plaster wall, timber structural bays.
for i in range(5):
 x=(i-2)*1.2
 box('screen panel',x,1.05,-5.5,1.10,3.0,.10,'paper')
 for dx in [-.57,.57]:box('screen stile',x+dx,1.05,-5.5,.085,3.18,.16,'timber')
 for y in [-.50,2.6]:box('screen rail',x,y,-5.5,1.2,.10,.16,'edge')
 # Sparse branch strokes on the screen, not text or invented insignia.
 for j in range(5):
  o=box('screen branch',x-.22+j*.085,.05+j*.27,-5.43,.022,.35,.013,'ink');o.rotation_euler.y=.28
  o=box('screen twig',x-.10+j*.085,.15+j*.27,-5.42,.23,.018,.014,'ink');o.rotation_euler.y=-.35
box('low seat',0,-1.45,-4.95,1.7,.25,.7,'timber')
box('back wall',0,.5,-7.0,18,6,.2,'wall')
for x in [-8.8,-4.4,0,4.4,8.8]:box('pillar',x,.5,-6.75,.25,6,.25,'timber')
for y in [-1.6,2.8]:box('beam',0,y,-6.73,18,.2,.28,'timber')
box('side wall',-8.8,.5,0,.2,6,14,'wall')
for z in [-5,-2,1,4]:
 box('window frame',8.7,1,z,.14,3,2.5,'edge')
 for k in range(6):box('window lattice',8.60,1,z-1+k*.4,.12,3,.04,'timber')
 for y in [0,1,2]:box('window crossbar',8.58,y,z,.12,.055,2.5,'timber')
for x in range(-9,9):
 for z in range(-7,8):box('floor slab',x+.5,-2.15,z+.5,.985,.12,.985,'floor')
for x in [-7.3,7.3]:
 box('scroll cabinet',x,-.9,-4.6,1.3,2.3,1.4,'timber')
 for y in [-1.5,-.8,-.1]:
  box('shelf',x,y,-4.45,1.35,.08,1.5,'edge')
  for j in range(3):cylinder('stored scroll',x-.38+j*.38,y+.16,-4.45,.12,1.1,'paper','x')
# Batch by material: bounded draw calls, preserve all existing scenes.
for mat in materials.values():
 objects=[o for o in scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==mat]
 if not objects:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name=mat.name
bpy.ops.object.select_all(action='SELECT')
out=os.path.join(os.environ['FYNBC_PROJECT_ROOT'],'public/art/campaign/atlas-study.glb')
bpy.ops.export_scene.gltf(filepath=out,use_selection=True,use_active_scene=True,export_format='GLB',export_yup=True)
result={'path':out,'meshes':len(scene.objects),'triangles':sum(len(o.data.polygons)*2 for o in scene.objects if o.type=='MESH')}
