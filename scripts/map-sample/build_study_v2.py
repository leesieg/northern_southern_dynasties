"""Period-inspired map study from docs/art-direction/atlas-study-target-v2.png.
Run with Blender in background; creates an isolated scene, exports only that scene.
No borrowed game assets. Live geographic paper remains unobstructed at y=0.
"""
import bpy, os, math, random
from pathlib import Path
from mathutils import Vector
root=Path(os.environ['FYNBC_PROJECT_ROOT'])
# Reuse the established modeling helpers, not the old room composition.
builder=(root/'scripts/map-sample/build_table_room.py').read_text()
exec(builder.split('# Paper plane')[0])
scene.name='Nanbeichao_Atlas_Study_V2'
rng=random.Random(912)
materials['timber'].diffuse_color=(.15,.069,.035,1)
materials['timber'].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.15,.069,.035,1)
material('woven reed',(.26,.21,.12));material('flame',(.95,.38,.035))
material('cushion',(.10,.135,.09))
def torus(name,x,y,z,r,minor,mat):
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=minor,major_segments=24,minor_segments=6,location=(x,-z,y))
 o=bpy.context.object;o.name='Study '+name;o.data.materials.append(materials[mat]);return o
# Planked low map table, thick mortise-and-tenon legs and visible stretcher rails.
for i in range(17):box('table board',-6.2+(i+.5)*12.4/17,-.18,0,12.4/17-.008,.29,9.4,'timber')
for x in [-6.25,6.25]:box('table perimeter',x,-.16,0,.20,.34,9.8,'edge')
for z in [-4.8,4.8]:box('table perimeter',0,-.16,z,12.7,.34,.2,'edge')
for x in [-5.9,5.9]:
 for z in [-4.25,4.25]:
  box('square leg',x,-1.13,z,.48,1.96,.48,'timber')
  box('leg collar',x,-.46,z,.58,.17,.58,'edge')
  box('leg foot',x,-2.04,z,.57,.15,.57,'timber')
  for dx in [-.25,.25]:box('leg tenon pin',x+dx,-.76,z,.035,.12,.12,'bronze')
 for z in [-3.7,3.7]:
  o=box('corner brace',x,-.75,z,.18,1.0,.17,'edge');o.rotation_euler.x=.58 if z<0 else -.58
 box('side stretcher',x,-1.61,0,.22,.24,8.6,'edge')
for z in [-4.25,4.25]:
 box('long stretcher',0,-1.60,z,11.8,.22,.20,'edge')
 box('carved apron',0,-.52,z,11.8,.47,.17,'timber')
 box('apron lower molding',0,-.76,z+.015,11.8,.055,.19,'edge')
for x in [-6.15,6.15]:
 for z in [-4.6,4.6]:
  box('bronze corner cap',x,-.018,z,.48,.035,.48,'bronze')
  for dx in [-.16,.16]:
   for dz in [-.16,.16]:cylinder('cap rivet',x+dx,.01,z+dz,.028,.022,'bronze')
# Keep the 10.018754 × 7.514066 geographic paper rectangle clear, no raised frame.
for x in [-5.63,5.63]:
 cylinder('bronze paperweight',x,.055,3.92,.17,.08,'bronze');torus('paperweight ring',x,.1,3.92,.10,.018,'bronze')
for z in [-1.6,-.8]:
 cylinder('rolled parchment',-5.68,.15,z,.15,1.05,'paper','x')
 cylinder('scroll spindle',-5.68,.15,z,.045,1.22,'timber','x')
 torus('scroll end spiral',-6.19,.15,z,.12,.012,'edge').rotation_euler.y=math.pi/2
 cylinder('scroll tie',-5.7,.15,z,.154,.032,'red','x')
box('inkstone',5.7,.07,.8,.60,.16,.88,'ink')
for x in [5.43,5.97]:box('inkstone raised rim',x,.16,.8,.045,.08,.84,'ink')
for z in [.4,1.2]:box('inkstone raised rim',5.7,.16,z,.54,.08,.04,'ink')
for i in range(2):
 o=cylinder('writing brush',5.68,.065,1.6+i*.22,.024,.83,'edge','x');o.rotation_euler.z=.12
 cylinder('brush tip',6.10,.065,1.6+i*.22,.034,.16,'ink','x')
box('brush rest',5.7,.04,1.9,.5,.06,.12,'bronze')
vessel('celadon washer',5.7,0,-.6,[(.12,0),(.22,.03),(.26,.16),(.24,.2),(.20,.17),(.1,.05),(0,.05)],'celadon')
# Staggered timber floorboards replace the tiled slabs.
for ix in range(30):
 x=-8.85+ix*.60
 for iz in range(7):
  z=-7.45+iz*2.3+(ix%2)*.55
  if z>7.7:continue
  box('floor plank',x,-2.2,z,.586,.13,2.285,'floor')
# Earthen plaster wall and visible post / beam joinery.
box('plaster back',0,.65,-7.2,18,5.7,.18,'wall')
for x in [-8.8,-4.4,0,4.4,8.8]:
 box('back column',x,.7,-7.02,.34,5.8,.32,'timber')
 for y in [2.85,3.04]:box('bracket block',x,y,-6.91,.75-(y-2.85)*1.4,.18,.46,'edge')
for y in [-1.86,2.72,3.35]:box('back beam',0,y,-6.95,18,.22,.34,'timber')
for side in [-1,1]:
 x=side*8.85
 box('window base wall',x,-1.34,0,.20,1.56,14.4,'wall')
 box('window head wall',x,3.13,0,.20,.74,14.4,'wall')
 for z in [-6.8,-3.4,0,3.4,6.8]:box('side column',x,.66,z,.32,5.7,.30,'timber')
 for z in [-5.1,-1.7,1.7,5.1]:
  box('window silk',x,1.03,z,.02,3.02,2.91,'window silk')
  for dz in [-1.48,1.48]:box('window jamb',x-side*.17,1.03,z+dz,.15,3.17,.13,'edge')
  for y in [-.53,2.58]:box('window rail',x-side*.17,y,z,.15,.13,3.03,'edge')
  for k in range(9):box('fine vertical lattice',x-side*.23,1.03,z-1.28+k*.32,.07,3.02,.038,'timber')
  for y in [-.10,.45,1.,1.55,2.1]:box('fine cross lattice',x-side*.24,y,z,.075,.035,2.9,'timber')
  # Partially rolled bamboo blinds: actual slats and suspension cords.
  for k in range(11):box('blind slat',x-side*.35,2.45-k*.040,z,.06,.025,2.92,'woven reed')
  for dz in [-1.05,1.05]:box('blind cord',x-side*.40,2.17,z+dz,.018,.8,.018,'ink')
# Open the camera-facing roof bays; no crossbeam may cover the interactive map.
box('rear tie beam',0,3.5,-6.9,17.8,.28,.32,'timber')
# Scroll cabinet along the back wall, with visible stacked rolls and bindings.
box('cabinet back',-1.8,-.88,-6.26,6.0,2.35,.13,'timber')
for x in [-4.85,-2.85,-.85,1.25]:box('cabinet divider',x,-.94,-5.91,.10,2.35,.78,'edge')
for y in [-2.06,-1.33,-.6,.14]:box('cabinet shelf',-1.8,y,-5.91,6.2,.105,.87,'timber')
for y in [-1.86,-1.12,-.40]:
 for i in range(18):
  x=-4.60+i*.32
  cylinder('stored scroll',x,y,-5.91,.11,.61,'paper')
  bpy.context.object.rotation_euler.x=math.pi/2
  cylinder('scroll spindle',x,y,-5.57,.029,.032,'edge').rotation_euler.x=math.pi/2
  cylinder('scroll binding',x,y,-5.91,.114,.028,'red').rotation_euler.x=math.pi/2
# Freestanding textile screen at back right, no borrowed painted scene.
box('screen backing',4.75,.12,-6.1,3.0,4.0,.075,'cushion')
for x in [3.18,6.32]:
 box('screen post',x,.05,-6.1,.11,4.42,.16,'timber');box('screen foot',x,-2.08,-6.1,.19,.12,.9,'timber')
for y in [-1.98,2.24]:box('screen rail',4.75,y,-6.1,3.28,.12,.18,'bronze')
# Preserve a simple UV silk panel for a subdued runtime landscape impression.
mesh=bpy.data.meshes.new('silk face');mesh.from_pydata([(3.3,6.048,-1.85),(6.2,6.048,-1.85),(6.2,6.048,2.1),(3.3,6.048,2.1)],[],[(0,1,2,3)]);mesh.materials.append(materials['screen silk']);mesh.update();uv=mesh.uv_layers.new()
for loop in mesh.loops:
 v=mesh.vertices[loop.vertex_index].co;uv.data[loop.index].uv=((v.x-3.3)/2.9,(v.z+1.85)/3.95)
ob=bpy.data.objects.new('Study screen painting',mesh);scene.collection.objects.link(ob)
for x in [-7.15,7.15]:
 vessel('oil lamp stand',x,-2.1,-5.55,[(.38,0),(.38,.08),(.24,.14),(.10,.28),(.07,1.8),(.16,1.9),(.15,2.0),(.38,2.1),(.42,2.20),(.38,2.24),(.20,2.18),(0,2.18)],'bronze')
 cylinder('lamp oil',x,.08,-5.55,.25,.012,'ink')
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=1,location=(x,5.55,.31));ob=bpy.context.object;ob.name='Study flame';ob.scale=(.045,.045,.20);ob.data.materials.append(materials['flame'])
# Woven mats and a kneeling cushion, no modern chair furniture.
for x,z,w,d in [(0,6.3,3.4,2.2),(-7.5,1.6,1.3,4.4),(7.5,1.6,1.3,4.4)]:
 box('woven floor mat',x,-2.1,z,w,.04,d,'woven reed')
 for dx in [-w/2+.06,w/2-.06]:box('mat binding',x+dx,-2.073,z,.07,.012,d-.06,'cushion')
box('kneeling cushion',0,-1.98,6.2,1.9,.23,.95,'cushion')
for x in [-.68,.68]:box('cushion piping',x,-1.852,6.2,.04,.013,.90,'red')
# Use the established per-material batching and contact-occlusion bake.
tail=builder.split('# Batch by material:')[1].split('\n',1)[1]
tail=tail.replace("'public/art/campaign/atlas-study.glb'","'public/art/campaign/atlas-study-v2.glb'")
exec(tail)
bpy.data.libraries.write(str(root/'.cache/map-room-refinement/atlas-study-v2.blend'),{scene},fake_user=True,compress=True)
print('STUDY_RESULT',result)
