"""Add close-view joinery, roof tiles and masonry to the current approved city.
Preserves its horizontal footprint, gates and the three mutable building lots.
"""
import bpy, math, os
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
root=Path(os.environ['FYNBC_PROJECT_ROOT'])
scene=bpy.data.scenes.new('Campaign_City_Detail_V2');bpy.context.window.scene=scene
bpy.ops.import_scene.gltf(filepath=str(root/'public/art/campaign/city.glb'))
original=[o for o in scene.objects if o.type=='MESH'];parts={};mats={}
for o in original:
 if not o.data.color_attributes:raise ValueError('Original city is missing baked color: '+o.name)
 attr=o.data.color_attributes.active_color or o.data.color_attributes[0]
 attr.name='Campaign AO';o.data.color_attributes.active_color=attr;o.data.color_attributes.render_color_index=list(o.data.color_attributes).index(attr)
for name,rgb in [('Warm limestone detail',(.44,.405,.33)),('Dark timber detail',(.115,.066,.035)),('Slate tile detail',(.055,.075,.089)),('Lime plaster detail',(.64,.60,.49)),('Ridge pottery detail',(.16,.18,.18))]:
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*rgb,1);m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*rgb,1);m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.8;mats[name]=m;parts[name]=[[],[]]
def add(v,f,mat):
 vv,ff=parts[mat];n=len(vv);vv.extend(v);ff.extend(tuple(n+i for i in face) for face in f)
def box(x,y,z,w,d,h,mat):
 v=[(x+sx*w/2,y+sy*d/2,z+sz*h) for sz in (0,1) for sy in (-1,1) for sx in (-1,1)]
 add(v,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)],mat)
stone='Warm limestone detail';timber='Dark timber detail';tile='Slate tile detail'
# Shallow masonry joints and coping: no square plinth added below trees or city.
for side in [-1,1]:
 for row in range(5):
  for k in range(25):
   yy=-5.1+k*.415+(row%2)*.19
   if yy>5.1:continue
   box(side*6.505,yy,.035+row*.145,.025,.395,.125,stone)
 for row in range(5):
  for k in range(30):
   xx=-6.15+k*.417+(row%2)*.19
   if xx>6.15 or side<0 and abs(xx)<1.42:continue
   box(xx,side*5.505,.035+row*.145,.397,.025,.125,stone)
# Column bases, doubled lintels, bracket clusters and recessed lattice panels.
for x,y,w,d,h in [(0,2.5,2.6,1.2,.95),(0,.65,2,1,.67),(-2.1,2,1,2,.43),(2.1,2,1,2,.43),(0,-5.3,1.45,.86,2.12)]:
 z0=1.65 if h>2 else .14;top=h if h>2 else h+.14
 for side in [-1,1]:
  for k in range(5):
   xx=x-w*.43+k*w*.215;yy=y+side*d*.52
   box(xx,yy,z0,.075,.075,top-z0,timber);box(xx,yy,z0,.105,.10,.065,stone)
   box(xx,yy,top-.04,.16,.09,.04,timber);box(xx,yy,top,.11,.13,.045,timber)
  for k in [-1,1]:
   cx=x+k*w*.25
   box(cx,y+side*d*.512,z0+.12,w*.23,.024,(top-z0)*.56,timber)
   for j in range(5):box(cx-w*.10+j*w*.05,y+side*d*.53,z0+.14,.015,.024,(top-z0)*.5,'Lime plaster detail')
# Actual curved tile caps on the principal roofs, larger features survive downsampling.
for x,y,z,w,d,rise in [(0,2.5,1.13,2.6,1.2,.6),(0,.65,.85,2,1,.6),(0,2.5,2.20,2.1,1.15,.58),(0,-5.3,2.12,1.95,1.28,.43),(0,-5.3,1.17,2.8,1.42,.39)]:
 for side in [-1,1]:
  for col in range(int(w/.09)):
   xx=x-w*.36+(col+.5)*w*.72/int(w/.09)
   for row in range(7):
    t=(row+.5)/7;yy=y+side*d*.58*t;zz=z+rise*(1-t)**1.6+.13*t**8+.021
    vertices=[]
    for end in [-1,1]:
     tt=t+end*.055
     for k in range(5):
      a=k*math.pi/4
      vertices.append((xx+math.cos(a)*.032,y+side*d*.58*tt,z+rise*max(0,1-tt)**1.6+.13*tt**8+.022+math.sin(a)*.020))
    add(vertices,[(k,k+1,k+6,k+5) for k in range(4)],tile)
 # Ridge end finials, a restrained stepped silhouette.
 for sign in [-1,1]:
  box(x+sign*w*.36,y,z+rise+.03,.075,.065,.15,'Ridge pottery detail')
  box(x+sign*(w*.36+.02),y,z+rise+.15,.06,.05,.05,'Ridge pottery detail')
# Main approach stone steps and two gate doors retain the open central passage.
for step in range(5):box(0,-5.78-step*.1,0,2.2+step*.08,.105,.15-step*.025,stone)
for x in [-.87,.87]:
 box(x,-5.75,.08,.40,.08,.73,timber)
 for j in range(4):box(x,-5.802,.19+j*.14,.34,.025,.025,stone)
additions=[]
for name,(v,f) in parts.items():
 if not v:continue
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(v,[],f);mesh.materials.append(mats[name]);mesh.update();o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);additions.append(o)
# Contact occlusion for new pieces, including existing buildings as occluders.
code=(root/'scripts/map-sample/refine_campaign_art.py').read_text()
bake_code=code[code.index('def bake('):code.index('\ndef export(')]
bake_code=bake_code.replace('for ob in objects:', 'for ob in original+objects:',1)
exec(bake_code);bake(additions)
bpy.ops.object.select_all(action='DESELECT')
for o in original+additions:o.select_set(True)
bpy.context.view_layer.objects.active=original[0]
out=root/'public/art/campaign/city-v2.glb'
bpy.ops.export_scene.gltf(filepath=str(out),use_selection=True,use_active_scene=True,export_format='GLB',export_vertex_color='NAME',export_vertex_color_name='Campaign AO',export_all_vertex_colors=False)
bpy.data.libraries.write(str(root/'.cache/map-room-refinement/city-v2.blend'),{scene},fake_user=True,compress=True)
print('CITY_RESULT',{'path':str(out),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in original+additions)})
