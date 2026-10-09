"""Original eroded limestone cluster, offline Blender; no synthetic geographic relief."""
import bpy, math, random
from pathlib import Path
from mathutils import Vector, noise
root=Path(__file__).resolve().parents[2]
scene=bpy.data.scenes.new('Campaign_Limestone');bpy.context.window.scene=scene
rng=random.Random(546);objects=[]
mat=bpy.data.materials.new('Weathered limestone');mat.diffuse_color=(1,1,1,1);mat.use_nodes=True
bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.94
for k in range(4):
 vertices=[];faces=[];n=12;levels=6
 center=Vector((rng.uniform(-.46,.46),rng.uniform(-.35,.35),.08+k*.06))
 radii=[rng.uniform(.84,1.12) for _ in range(n)]
 for level in range(levels):
  z=level/(levels-1)*(.68+k*.09)
  for j in range(n):
   angle=j/n*math.tau;ridge=radii[j]*(1-.12*level/(levels-1))
   x=math.copysign(abs(math.cos(angle))**.55,math.cos(angle))*.42*ridge
   y=math.copysign(abs(math.sin(angle))**.55,math.sin(angle))*.32*ridge
   offset=.012*math.sin(level*1.9+j*.6+k)
   vertices.append((x+offset+center.x,y+offset+center.y,z+.028*math.sin(j*1.8+k)+center.z))
 for level in range(levels-1):
  for j in range(n):faces.append((level*n+j,level*n+(j+1)%n,(level+1)*n+(j+1)%n,(level+1)*n+j))
 faces.append(tuple(range((levels-1)*n,levels*n)))
 mesh=bpy.data.meshes.new('Fractured limestone');mesh.from_pydata(vertices,[],faces);mesh.update()
 ob=bpy.data.objects.new('Eroded limestone '+str(k),mesh);scene.collection.objects.link(ob)
 bpy.context.view_layer.objects.active=ob;ob.select_set(True)
 bevel=ob.modifiers.new('Eroded fracture edges','BEVEL');bevel.width=.025;bevel.segments=2;bevel.limit_method='ANGLE';bevel.angle_limit=.55
 bpy.ops.object.modifier_apply(modifier=bevel.name)
 ob.data.materials.append(mat);ob.data.update()
 col=ob.data.color_attributes.new(name='Rock mineral',type='FLOAT_COLOR',domain='CORNER')
 for poly in ob.data.polygons:
  poly.use_smooth=False
  for li in poly.loop_indices:
   v=ob.data.vertices[ob.data.loops[li].vertex_index];n=noise.noise_vector(v.co*9)[0];shade=.84+.14*n
   moss=max(0,1-v.co.z*2)*.22
   col.data[li].color=((.36-moss*.22)*shade,(.36-moss*.10)*shade,(.30-moss*.12)*shade,1)
 ob.data.color_attributes.active_color=col;objects.append(ob)
node=mat.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='Rock mineral';mat.node_tree.links.new(node.outputs['Color'],bsdf.inputs['Base Color'])
bpy.ops.object.select_all(action='DESELECT')
for ob in objects:ob.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.ops.export_scene.gltf(filepath=str(root/'public/art/campaign/rocks.glb'),use_selection=True,export_format='GLB',use_active_scene=True,export_vertex_color='NAME',export_vertex_color_name='Rock mineral')
bpy.data.libraries.write(str(root/'art/campaign/limestone.blend'),{scene},fake_user=True,compress=True)
print('Limestone export:',sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in objects),'triangles')
