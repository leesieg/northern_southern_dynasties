"""Run through Blender MCP against the approved study; writes original preview assets only."""
import bpy, math, random, os
from mathutils import Vector

ROOT = os.environ['FYNBC_PROJECT_ROOT']
OUT = os.path.join(ROOT, 'public/art/map-sample')
source = bpy.data.scenes.get('Guanzhong_Heluo_Style_Study_v2')
if source is None:
    raise RuntimeError('Open guanzhong-heluo-sample.blend before exporting')
bpy.context.window.scene = source
cx, cy = (108.94-110.5)*28, (34.27-34.4)*34
foundation = next(o for o in source.objects if o.name.startswith('Changan terrace'))
cz = sum(v.co.z for v in foundation.data.vertices)/len(foundation.data.vertices)-.1
prefixes = ('Changan terrace', 'Building foundation', 'Plaster building', 'Timber facade',
            'Sweeping tiled roof', 'Tile seam', 'Roof ridge', 'City rampart', 'Wall merlon', 'Gate wall')
originals = []
for ob in source.objects:
    if not ob.name.startswith(prefixes):
        continue
    center = sum((ob.matrix_world @ Vector(p) for p in ob.bound_box), Vector())/8
    if abs(center.x-cx)<4 and abs(center.y-cy)<3.5:
        originals.append(ob)

scene = bpy.data.scenes.new('Runtime sample assets')
deps = bpy.context.evaluated_depsgraph_get()
parts=[]
for ob in originals:
    me=bpy.data.meshes.new_from_object(ob.evaluated_get(deps))
    for v in me.vertices:
        v.co=ob.matrix_world @ v.co-Vector((cx,cy,cz))
    copy=bpy.data.objects.new('City component',me);scene.collection.objects.link(copy);parts.append(copy)
bpy.context.window.scene=scene
# Low-rise suburbs break the isolated rectangular silhouette; original architectural vocabulary.
wallmat=next(m for ob in originals for m in ob.data.materials if m and m.name.startswith('Pale plaster'))
roofmat=next(m for ob in originals for m in ob.data.materials if m and m.name.startswith('Grey green roof tiles'))
random.seed(546)
for i in range(24):
    side=-1 if i<12 else 1
    x=side*random.uniform(3.8,5.0);y=random.uniform(-2.7,2.7)
    w=random.uniform(.25,.45);d=random.uniform(.22,.35);h=random.uniform(.18,.28)
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,y,h/2))
    ob=bpy.context.object;ob.scale=(w,d,h);ob.data.materials.append(wallmat);parts.append(ob)
    verts=[(x-w*.6,y-d*.65,h),(x+w*.6,y-d*.65,h),(x-w*.6,y+d*.65,h),(x+w*.6,y+d*.65,h),(x-w*.6,y,h+.15),(x+w*.6,y,h+.15)]
    me=bpy.data.meshes.new('Suburb roof');me.from_pydata(verts,[],[(0,1,5,4),(4,5,3,2),(0,4,2),(1,3,5)]);me.materials.append(roofmat)
    ob=bpy.data.objects.new('Suburb roof',me);scene.collection.objects.link(ob);parts.append(ob)
# Static draped standard: a readable silhouette without an animation loop.
woodmat=next(m for ob in originals for m in ob.data.materials if m and m.name.startswith('Dark timber'))
bpy.ops.mesh.primitive_cylinder_add(vertices=7,radius=.035,depth=3.1,location=(3.25,.5,1.55))
pole=bpy.context.object;pole.data.materials.append(woodmat);parts.append(pole)
cloth=bpy.data.materials.new('Muted cinnabar standard');cloth.use_nodes=True
cloth.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.34,.045,.025,1)
cloth.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.95
verts=[(3.25+i*.12,.5+math.sin(i*.7-j*.2)*.10,3.02-j*.16) for j in range(10) for i in range(8)]
faces=[(j*8+i,j*8+i+1,(j+1)*8+i+1,(j+1)*8+i) for j in range(9) for i in range(7)]
me=bpy.data.meshes.new('Draped standard');me.from_pydata(verts,[],faces);me.materials.append(cloth)
flag=bpy.data.objects.new('Draped standard',me);scene.collection.objects.link(flag);parts.append(flag)
bpy.ops.object.select_all(action='DESELECT')
for ob in parts:ob.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.object.join()
city=bpy.context.object;city.name='Northern walled city'
# Merge coincident surfaces and store portable UV coordinates for weathering textures.
uv=city.data.uv_layers.new(name='SurfaceUV')
for poly in city.data.polygons:
    axis=max(range(3),key=lambda i:abs(poly.normal[i]))
    axes=[i for i in range(3) if i!=axis]
    for li in poly.loop_indices:
        p=city.data.vertices[city.data.loops[li].vertex_index].co
        uv.data[li].uv=(p[axes[0]]*2,p[axes[1]]*2)
random.seed(546)
for slot in city.material_slots:
    if slot.material is None:continue
    m=slot.material.copy();slot.material=m
    p=m.node_tree.nodes.get('Principled BSDF')
    base=tuple(p.inputs['Base Color'].default_value)
    im=bpy.data.images.new(m.name+' weathering',width=64,height=64)
    pixels=[]
    for y in range(64):
        for x in range(64):
            grain=random.uniform(.87,1.09)
            if 'wall' in m.name.lower() and (y%12==0 or (x+(6 if y//12%2 else 0))%24==0):grain*=.72
            pixels.extend([min(1,c*grain) for c in base[:3]]+[1])
    # Albedo is color data: exporting a Non-Color image darkened the runtime city.
    im.colorspace_settings.name='sRGB';im.pixels=pixels;im.pack()
    tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im
    m.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
bpy.ops.export_scene.gltf(filepath=OUT+'/northern-city.glb',use_selection=True,use_active_scene=True,export_format='GLB',export_materials='EXPORT')

# One linked, low-detail tree for GPU instancing: irregular clustered canopy, visible trunk.
bpy.ops.object.select_all(action='DESELECT')
treeparts=[]
def material(name,color):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*color,1)
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.95
    return m
leaf=material('Olive woodland',(.16,.25,.075));wood=material('Tree bark',(.20,.13,.065))
bpy.ops.mesh.primitive_cone_add(vertices=6,radius1=.075,radius2=.035,depth=.95,location=(0,0,.475))
trunk=bpy.context.object;trunk.data.materials.append(wood);treeparts.append(trunk)
for i in range(6):
    angle=i*2.4;radius=.28 if i<5 else 0
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.40,location=(math.cos(angle)*radius,math.sin(angle)*radius,.85+(i%3)*.17))
    ob=bpy.context.object;ob.scale=(1,.85,1.1);ob.data.materials.append(leaf)
    for v in ob.data.vertices:v.co*=random.uniform(.8,1.12)
    for p in ob.data.polygons:p.use_smooth=True
    treeparts.append(ob)
bpy.ops.object.select_all(action='DESELECT')
for ob in treeparts:ob.select_set(True)
bpy.context.view_layer.objects.active=trunk;bpy.ops.object.join();tree=bpy.context.object;tree.name='Sparse woodland tree'
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
bpy.ops.export_scene.gltf(filepath=OUT+'/woodland-tree.glb',use_selection=True,use_active_scene=True,export_format='GLB',export_materials='EXPORT')
result={'city_components':len(originals),'city_triangles':sum(len(p.vertices)-2 for p in city.data.polygons),'tree_triangles':sum(len(p.vertices)-2 for p in tree.data.polygons),'files':[OUT+'/northern-city.glb',OUT+'/woodland-tree.glb']}
