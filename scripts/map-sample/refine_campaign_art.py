"""Original campaign asset art pass, executed through Blender MCP.
Reads the original builder exports from FYNBC_ART_SOURCE and writes a separate output.
No external game assets; keeps the approved footprint and construction lot positions.
"""
import bpy, os, math, random, json
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from pathlib import Path
source=Path(os.environ['FYNBC_ART_SOURCE']);out=Path(os.environ['FYNBC_ART_OUTPUT'])
if source.resolve()==out.resolve():raise ValueError('Art source and output must be separate directories')
out.mkdir(parents=True,exist_ok=True)
scene=bpy.data.scenes.new('Campaign_Painted_Art');bpy.context.window.scene=scene
palette={'Warm limestone':(.46,.405,.30),'Lime plaster':(.67,.61,.47),'Slate tile':(.055,.074,.088),'Dark timber':(.105,.062,.035),'Courtyard earth':(.40,.335,.21),'Ridge pottery':(.19,.20,.19)}
report={}
def surface(name,rgb):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*rgb,1)
 bsdf=m.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(*rgb,1);bsdf.inputs['Roughness'].default_value=.7 if name.startswith('Slate') else .93
 return m

def bake(objects,trees=False):
 # Ray-traced local contact shading. Runtime sun/shadow remains dynamic.
 vertices=[];faces=[]
 for ob in objects:
  offset=len(vertices);vertices.extend([ob.matrix_world@v.co for v in ob.data.vertices]);faces.extend([tuple(offset+i for i in p.vertices) for p in ob.data.polygons])
 bvh=BVHTree.FromPolygons(vertices,faces)
 directions=[Vector(v).normalized() for v in [(1,0,1),(-1,0,1),(0,1,1),(0,-1,1),(.5,.5,1),(-.5,-.5,1)]]
 for ob in objects:
  mesh=ob.data
  for c in list(mesh.color_attributes):mesh.color_attributes.remove(c)
  color=mesh.color_attributes.new(name='Campaign AO',type='FLOAT_COLOR',domain='CORNER');cache={}
  for face in mesh.polygons:
   for li in face.loop_indices:
    vi=mesh.loops[li].vertex_index;v=mesh.vertices[vi];normal=ob.matrix_world.to_3x3()@v.normal;normal.normalize();p=ob.matrix_world@v.co
    key=(vi,tuple(round(n,2) for n in normal))
    if key not in cache:
     applicable=[d for d in directions if d.dot(normal)>-.1];blocked=0
     for direction in applicable:
      hit=bvh.ray_cast(p+normal*.012+direction*.006,direction,1.4 if not trees else .45)[0]
      if hit is not None:blocked+=1
     ao=blocked/max(1,len(applicable));shade=1-ao*(.38 if not trees else .22)
     if trees:shade*=.75+.25*max(0,min(1,p.z/1.25))
     cache[key]=shade
    shade=cache[key];rgb=mesh.materials[face.material_index].diffuse_color
    color.data[li].color=(rgb[0]*shade,rgb[1]*shade,rgb[2]*shade,1)
  mesh.color_attributes.active_color=color
  mesh.color_attributes.render_color_index=0
  for m in mesh.materials:
   nodes=m.node_tree.nodes;bsdf=nodes.get('Principled BSDF');attr=nodes.new('ShaderNodeVertexColor');attr.layer_name=color.name
   m.node_tree.links.new(attr.outputs['Color'],bsdf.inputs['Base Color'])

def export(objects,name):
 bpy.ops.object.select_all(action='DESELECT')
 for ob in objects:ob.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=str(out/(name+'.glb')),use_selection=True,use_active_scene=True,export_format='GLB',export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='Campaign AO',export_all_vertex_colors=False)
 report[name]={'triangles':sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in objects),'bytes':(out/(name+'.glb')).stat().st_size}
 for ob in objects:ob.hide_set(True)

# Retain the approved Chinese roof and courtyard layout; add worked masonry edges.
for name in ['city']+[f'{kind}-{level}' for kind in ['market','granary','hostel'] for level in [1,2,3]]+[f'worksite-{i}' for i in range(3)]:
 before=set(scene.objects);bpy.ops.import_scene.gltf(filepath=str(source/(name+'.glb')));objects=[o for o in scene.objects if o not in before and o.type=='MESH']
 for ob in objects:
  for index,old in enumerate(ob.data.materials):
   key=next((key for key in palette if old.name.startswith(key)),None)
   if key:ob.data.materials[index]=surface(key,palette[key])
  if any(m.name.startswith(('Warm limestone','Dark timber')) for m in ob.data.materials):
   bpy.context.view_layer.objects.active=ob;ob.select_set(True)
   bevel=ob.modifiers.new('Worked edges','BEVEL');bevel.width=.012;bevel.segments=1;bevel.limit_method='ANGLE';bevel.angle_limit=.7
   bpy.ops.object.modifier_apply(modifier=bevel.name)
  bpy.context.view_layer.update()
 bake(objects);export(objects,name)

# Layered broadleaf crowns and irregular tiered conifers; three silhouettes, no billboards.
for variant in range(3):
 rng=random.Random(831+variant);verts=[];faces=[];material_ids=[]
 mats=[surface('Dark timber',(.09,.063,.031)),surface('Leaf olive',(.13,.19,.037)),surface('Leaf light',(.24,.285,.065)),surface('Pine green',(.057,.105,.055))]
 def branch(a,b,radius):
  a,b=Vector(a),Vector(b);axis=(b-a).normalized();u=axis.cross(Vector((0,1,0))).normalized();v=axis.cross(u);offset=len(verts)
  for p,r in [(a,radius),(b,radius*.5)]:
   for j in range(5):verts.append(tuple(p+(u*math.cos(j*math.tau/5)+v*math.sin(j*math.tau/5))*r))
  for j in range(5):faces.append((offset+j,offset+(j+1)%5,offset+5+(j+1)%5,offset+5+j));material_ids.append(0)
 branch((0,0,0),(.025,0,.98),.045)
 if variant<2:
  for k in range(7):
   angle=k*2.4;rad=.0 if k==0 else .24+rng.random()*.07;cx=math.cos(angle)*rad;cy=math.sin(angle)*rad;cz=.99 if k==0 else .62+rng.random()*.25
   branch((0,0,.34),(cx,cy,cz),.023)
   rx=.27+rng.random()*.07;ry=.23+rng.random()*.06;rz=.20 if variant==0 else .28;offset=len(verts);segments=8;rings=4
   for ring in range(rings):
    phi=math.pi*(ring+.15)/(rings-1+.3)
    for j in range(segments):
     theta=j*math.tau/segments;rag=1+rng.uniform(-.15,.15);verts.append((cx+math.cos(theta)*math.sin(phi)*rx*rag,cy+math.sin(theta)*math.sin(phi)*ry*rag,cz+math.cos(phi)*rz))
   for ring in range(rings-1):
    for j in range(segments):faces.append((offset+ring*segments+j,offset+ring*segments+(j+1)%segments,offset+(ring+1)*segments+(j+1)%segments,offset+(ring+1)*segments+j));material_ids.append(1 if k%3 else 2)
 else:
  for k in range(6):
   z=.28+k*.14;r=.34-k*.043;n=9;offset=len(verts)
   verts.append((.015*math.sin(k*3),.015*math.cos(k*2),z+.36))
   for j in range(n):
    angle=j*math.tau/n;rr=r*rng.uniform(.78,1.18);verts.append((math.cos(angle)*rr,math.sin(angle)*rr,z+rng.uniform(-.06,.02)))
   for j in range(n):faces.append((offset,offset+1+j,offset+1+(j+1)%n));material_ids.append(3)
 mesh=bpy.data.meshes.new('Layered grove');mesh.from_pydata(verts,[],faces);mesh.update()
 for m in mats:mesh.materials.append(m)
 for poly,mi in zip(mesh.polygons,material_ids):poly.material_index=mi;poly.use_smooth=mi!=0
 ob=bpy.data.objects.new('Campaign tree '+str(variant),mesh);scene.collection.objects.link(ob);bpy.context.view_layer.update();bake([ob],True);export([ob],'tree-'+str(variant))
# Save a separate editable asset library; never overwrite the user's scene.
bpy.data.libraries.write(str(out/'campaign-painted-art.blend'),{scene},fake_user=True,compress=True)
(out/'asset-report.json').write_text(json.dumps(report,indent=2))
result={'scene':scene.name,'output':str(out),'assets':report}
