"""Original period-inspired atlas study. Run through Blender MCP background mode.
No claim of archaeological reconstruction. The open tabletop holds the live geographic scene.
"""
import bpy, math, os, random
from mathutils import Vector
scene=bpy.data.scenes.new('Nanbeichao_Atlas_Study')
bpy.context.window.scene=scene
materials={}
def material(name,rgb,metal=0):
 m=bpy.data.materials.new('Study '+name);m.diffuse_color=(*rgb,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=.28 if name=='celadon' else .42 if metal else .76;p.inputs['Metallic'].default_value=metal
 materials[name]=m;return m
material('timber',(.13,.059,.029));material('edge',(.24,.12,.055));material('paper',(.61,.55,.40));material('wall',(.39,.35,.26));material('ink',(.018,.025,.024));material('bronze',(.36,.26,.10),.45);material('celadon',(.13,.29,.25));material('floor',(.20,.18,.145));material('red',(.30,.07,.045));material('screen silk',(.9,.85,.7));material('window silk',(.76,.75,.65))
def box(name,x,y,z,w,h,d,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.name='Study '+name;o.scale=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(materials[mat])
 if min(w,h,d)>.045:
  bevel=o.modifiers.new('Soft worked edges','BEVEL');bevel.width=min(.022,min(w,h,d)*.15);bevel.segments=2
  bpy.ops.object.modifier_apply(modifier=bevel.name)
 return o
def cylinder(name,x,y,z,r,h,mat,axis='up'):
 bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=r,depth=h,location=(x,-z,y));o=bpy.context.object;o.name='Study '+name
 if axis=='x':o.rotation_euler.y=math.pi/2
 o.data.materials.append(materials[mat]);return o
def vessel(name,x,y,z,profile,mat):
 verts=[];faces=[];segments=48
 for radius,height in profile:
  for i in range(segments):
   t=i*math.tau/segments;verts.append((x+math.cos(t)*radius,-z+math.sin(t)*radius,y+height))
 for j in range(len(profile)-1):
  for i in range(segments):a=j*segments+i;b=j*segments+(i+1)%segments;faces.append((a,b,b+segments,a+segments))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.materials.append(materials[mat]);mesh.update()
 obj=bpy.data.objects.new('Study '+name,mesh);scene.collection.objects.link(obj)
 for poly in mesh.polygons:poly.use_smooth=True
 return obj
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
vessel('hollow celadon washer',-5.75,-.01,-1.2,[(.13,0),(.13,.035),(.24,.08),(.32,.23),(.33,.27),(.30,.29),(.275,.25),(.22,.10),(.0,.07)],'celadon');cylinder('washer water',-5.75,.10,-1.2,.215,.006,'ink')
box('seal base',5.7,.1,1.4,.35,.20,.35,'bronze');cylinder('seal grip',5.7,.27,1.4,.09,.18,'bronze')
box('red ink tray',5.7,.07,2.15,.5,.12,.5,'timber');cylinder('seal paste',5.7,.14,2.15,.18,.018,'red')
# Screen, low seat, plaster wall, timber structural bays.
for i in range(5):
 x=(i-2)*1.2
 box('screen panel',x,1.05,-5.5,1.10,3.0,.10,'paper')
 for dx in [-.57,.57]:box('screen stile',x+dx,1.05,-5.5,.085,3.18,.16,'timber')
 for y in [-.50,2.6]:box('screen rail',x,y,-5.5,1.2,.10,.16,'edge')
 # One panoramic silk painting spread over the screen; supplied as a runtime texture.
 verts=[(x-.51,5.435,-.39),(x+.51,5.435,-.39),(x+.51,5.435,2.49),(x-.51,5.435,2.49)]
 mesh=bpy.data.meshes.new('screen painting');mesh.from_pydata(verts,[],[(0,1,2,3)]);mesh.materials.append(materials['screen silk']);mesh.update()
 uv=mesh.uv_layers.new(name='UVMap')
 for loop in mesh.loops:
  v=mesh.vertices[loop.vertex_index].co;uv.data[loop.index].uv=((v.x+2.91)/5.82,(v.z+.39)/2.88)
 obj=bpy.data.objects.new('Study painted silk',mesh);scene.collection.objects.link(obj)
box('low seat',0,-1.45,-4.95,1.7,.25,.7,'timber')
box('back wall',0,.5,-7.0,18,6,.2,'wall')
for x in [-8.8,-4.4,0,4.4,8.8]:box('pillar',x,.5,-6.75,.25,6,.25,'timber')
for y in [-1.6,2.8]:box('beam',0,y,-6.73,18,.2,.28,'timber')
box('side wall',-8.8,.5,0,.2,6,14,'wall')
box('right wall sill course',8.85,-1.32,0,.24,1.62,14,'wall')
box('right wall head course',8.85,2.98,0,.24,.86,14,'wall')
for z,width in [(-6.625,.75),(-3.5,.5),(-.5,.5),(2.5,.5),(6.125,1.75)]:box('right wall pier',8.85,1,z,.24,3.02,width,'wall')
for z in [-5,-2,1,4]:
 box('window silk',8.82,1,z,.025,2.9,2.4,'window silk')
 for y in [-.5,2.5]:box('window lintel',8.7,y,z,.24,.12,2.6,'edge')
 for dz in [-1.25,1.25]:box('window jamb',8.7,1,z+dz,.24,3.1,.12,'edge')
 for k in range(6):box('window lattice',8.60,1,z-1+k*.4,.12,3,.04,'timber')
 for y in [0,1,2]:box('window crossbar',8.58,y,z,.12,.055,2.5,'timber')
for x in range(-9,9):
 for z in range(-7,8):box('floor slab',x+.5,-2.15,z+.5,.985,.12,.985,'floor')
for x in [-7.3,7.3]:
 box('scroll cabinet',x,-.9,-4.6,1.3,2.3,1.4,'timber')
 for y in [-1.5,-.8,-.1]:
  box('shelf',x,y,-4.45,1.35,.08,1.5,'edge')
  for j in range(3):cylinder('stored scroll',x-.38+j*.38,y+.16,-4.45,.12,1.1,'paper','x')
# Layered joinery, drawer fronts, ironstone rim and rolled-paper edges.
for x in [-4.8,-2.4,0,2.4,4.8]:
 box('drawer inset',x,-.57,4.835,2.2,.36,.06,'ink')
 box('drawer face',x,-.55,4.88,2.1,.30,.06,'timber')
 for dx in [-1.02,1.02]:box('drawer molding',x+dx,-.55,4.925,.035,.29,.028,'edge')
 for y in [-.68,-.42]:box('drawer molding',x,y,4.925,2.06,.025,.028,'edge')
 o=cylinder('drawer escutcheon',x,-.55,4.94,.075,.025,'bronze');o.rotation_euler.x=math.pi/2
 bpy.ops.mesh.primitive_torus_add(major_radius=.065,minor_radius=.012,major_segments=20,minor_segments=6,location=(x,-4.965,-.62),rotation=(math.pi/2,0,0));bpy.context.object.data.materials.append(materials['bronze'])
for x in [-6.1,6.1]:
 for z in [-4.4,4.4]:
  box('leg collar',x,-.73,z,.40,.12,.40,'timber');box('leg foot',x,-2.01,z,.43,.15,.43,'edge')
 for z in [-3.5,0,3.5]:box('side tenon',x,-.60,z,.035,.18,.28,'bronze')
for i in range(4):
 z=-2.5+i*.64
 for x in [5.24,6.16]:cylinder('silk rolled edge',x,.17,z,.172,.025,'edge','x')
 cylinder('silk binding',5.7,.17,z,.176,.025,'red','x')
# Turned vase with narrow lip and foot, and a long, shaped brush rest.
vessel('celadon neck vase',-7.3,.3,-4.6,[(.13,0),(.18,.04),(.30,.20),(.33,.42),(.22,.65),(.12,.8),(.12,1.04),(.15,1.08),(.125,1.10),(.095,1.04),(.095,.82)],'celadon')
for x in [-5.98,-5.7,-5.42]:vessel('brush rest peak',x,.0,2.35,[(.09,0),(.11,.05),(.065,.16),(.025,.22)],'celadon')
for x in [-5.99,-5.47]:box('inkstone lip',x,.14,1.3,.055,.12,.9,'ink')
for z in [.85,1.75]:box('inkstone lip',-5.73,.14,z,.55,.12,.055,'ink')
# Modest carved corner lattice within the actual table apron.
for x in [-5.8,5.8]:
 for k in range(5):
  o=box('apron diamond',x+(k-2)*.09,-.57,4.84,.035,.27,.032,'bronze');o.rotation_euler.y=.65
# Batch by material: bounded draw calls, preserve all existing scenes.
for mat in materials.values():
 objects=[o for o in scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==mat]
 if not objects:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 if len(objects)>1:bpy.ops.object.join()
 objects[0].name=mat.name
# Bake ambient contact occlusion into vertex colors; no runtime shadow pass required.
from mathutils.bvhtree import BVHTree
verts=[];faces=[]
for obj in scene.objects:
 offset=len(verts);verts.extend(obj.matrix_world@v.co for v in obj.data.vertices)
 faces.extend(tuple(offset+i for i in p.vertices) for p in obj.data.polygons)
tree=BVHTree.FromPolygons(verts,faces)
directions=[Vector((math.cos(i*2.399)*math.sqrt(1-((i+.5)/12)**2),math.sin(i*2.399)*math.sqrt(1-((i+.5)/12)**2),(i+.5)/12)) for i in range(12)]
for obj in scene.objects:
 mesh=obj.data;attr=mesh.color_attributes.new(name='Contact occlusion',type='FLOAT_COLOR',domain='POINT');norm=obj.matrix_world.to_3x3().inverted().transposed()
 for v in mesh.vertices:
  p=obj.matrix_world@v.co;n=(norm@v.normal).normalized();q=Vector((0,0,1)).rotation_difference(n);hits=0
  for direction in directions:
   ray=q@direction;hit=tree.ray_cast(p+n*.006,ray,2.4)
   if hit[0] is not None:hits+=max(0,1-hit[3]/2.4)
  shade=max(.48,1-hits/12*.7);attr.data[v.index].color=(shade,shade,shade,1)
bpy.ops.object.select_all(action='SELECT')
out=os.path.join(os.environ['FYNBC_PROJECT_ROOT'],'public/art/campaign/atlas-study.glb')
bpy.ops.export_scene.gltf(filepath=out,use_selection=True,use_active_scene=True,export_format='GLB',export_yup=True,export_vertex_color='ACTIVE')
result={'path':out,'meshes':len(scene.objects),'triangles':sum(len(o.data.polygons)*2 for o in scene.objects if o.type=='MESH')}
