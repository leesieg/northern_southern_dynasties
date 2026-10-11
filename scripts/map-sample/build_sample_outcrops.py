"""Original weathered outcrop variants for the independent Jiankang sample.
Run in background Blender. Does not overwrite shared campaign assets.
"""
import bpy, math, random
from mathutils import Vector, noise
from pathlib import Path

root=Path(__file__).resolve().parents[2]
out=root/'public/art/campaign/art-sample'
out.mkdir(parents=True,exist_ok=True)
scene=bpy.data.scenes.new('Jiankang_Weathered_Outcrops')
bpy.context.window.scene=scene
material=bpy.data.materials.new('Sample weathered mineral');material.use_nodes=True
bsdf=material.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.94
vertex=material.node_tree.nodes.new('ShaderNodeVertexColor');vertex.layer_name='Mineral'
material.node_tree.links.new(vertex.outputs['Color'],bsdf.inputs['Base Color'])
configurations=[
 [('main',(0,0,.70),(1.08,.70,1.0)),('shoulder',(-.65,.10,.38),(.74,.64,.66)),('foot',(.62,-.22,.15),(.66,.52,.36))],
 [('ridge',(0,0,.72),(.65,.78,1.2)),('ledge',(.47,.20,.33),(.60,.60,.63)),('base',(-.45,-.1,.13),(.7,.66,.38))],
 [('talus',(-.43,0,.14),(.60,.42,.34)),('talus2',(.24,.12,.20),(.60,.50,.43)),('chip',(.60,-.23,.08),(.33,.32,.23)),('chip2',(-.5,.45,.09),(.43,.29,.25))],
]
result=[]
for kind,pieces in enumerate(configurations):
    rng=random.Random(546+kind*100)
    objects=[]
    for index,(name,center,scale) in enumerate(pieces):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4,radius=1)
        ob=bpy.context.object;ob.name=f'Sample rock {kind} {name}'
        shift=Vector((kind*7.7,index*5.1,1.9))
        for v in ob.data.vertices:
            p=v.co.copy()
            coarse=noise.noise(p*1.65+shift)
            fine=noise.noise(p*5.5+shift)
            p*=1+coarse*.24+fine*.045
            # Oblique joint planes break the spherical outline without uniform stacked slabs.
            p.x=min(p.x,.74-p.z*.14)
            p.y=max(p.y,-.78+p.z*.08)
            p.x+=.14*p.z+.04*math.sin(p.z*4+kind)
            p.z=max(-.78,p.z)
            v.co=Vector((p.x*scale[0],p.y*scale[1],p.z*scale[2]))+Vector(center)
        ob.data.update();ob.data.materials.append(material)
        colors=ob.data.color_attributes.new(name='Mineral',type='FLOAT_COLOR',domain='CORNER')
        for poly in ob.data.polygons:
            poly.use_smooth=True
            for li in poly.loop_indices:
                p=ob.data.vertices[ob.data.loops[li].vertex_index].co
                shade=.86+noise.noise(p*3+shift)*.12
                moist=max(0,min(1,(.32-p.z)*1.2))
                colors.data[li].color=((.39-moist*.055)*shade,(.365-moist*.025)*shade,(.295-moist*.045)*shade,1)
        ob.data.color_attributes.active_color=colors
        objects.append(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    ob=bpy.context.object;ob.name=f'Weathered outcrop {kind}'
    bpy.ops.export_scene.gltf(filepath=str(out/f'outcrop-{kind}.glb'),use_selection=True,export_format='GLB',use_active_scene=True,export_vertex_color='NAME',export_vertex_color_name='Mineral')
    result.append({'variant':kind,'triangles':sum(len(p.vertices)-2 for p in ob.data.polygons)})
    ob.location.x=kind*4
bpy.data.libraries.write(str(root/'art/campaign/sample-outcrops.blend'),{scene},fake_user=True,compress=True)
print(result)
