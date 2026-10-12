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
        # Broad jointed rock volumes: asymmetric rings form weathered faces, not stretched spheres.
        verts=[];faces=[];rings=12
        phase=kind*.83+index*.47
        radial=[1+rng.uniform(-.13,.13) for _ in range(rings)]
        levels=[(-.78,.86),(-.55,1),(-.08,.96),(.30,.98),(.64,.87),(.88,.63),(1,.27)]
        for row,(height,radius) in enumerate(levels):
            for j in range(rings):
                angle=j/rings*math.tau+phase
                x=math.cos(angle)*radius*radial[j]
                y=math.sin(angle)*radius*radial[j]
                z=height+(math.sin(angle*2+phase)*.075 if row else 0)
                x+=height*.10+math.sin(height*4+phase)*.045
                verts.append((x*scale[0]+center[0],y*scale[1]+center[1],z*scale[2]+center[2]))
                if row:
                    previous=(j+1)%rings
                    faces.append(((row-1)*rings+j,(row-1)*rings+previous,row*rings+previous,row*rings+j))
        faces.append(tuple(reversed(range(rings))))
        faces.append(tuple((len(levels)-1)*rings+j for j in range(rings)))
        mesh=bpy.data.meshes.new('Jointed limestone');mesh.from_pydata(verts,[],faces);mesh.update()
        ob=bpy.data.objects.new(f'Sample rock {kind} {name}',mesh);scene.collection.objects.link(ob)
        bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
        bevel=ob.modifiers.new('Weathered edges','BEVEL');bevel.width=.055;bevel.segments=2
        bpy.ops.object.modifier_apply(modifier=bevel.name)
        shift=Vector((kind*7.7,index*5.1,1.9))
        for v in ob.data.vertices:
            v.co+=v.normal*noise.noise(v.co*5+shift)*.022
        ob.data.update();ob.data.materials.append(material)
        colors=ob.data.color_attributes.new(name='Mineral',type='FLOAT_COLOR',domain='CORNER')
        for poly in ob.data.polygons:
            poly.use_smooth=True
            for li in poly.loop_indices:
                p=ob.data.vertices[ob.data.loops[li].vertex_index].co
                shade=.86+noise.noise(p*3+shift)*.12
                moist=max(0,min(1,(.32-p.z)*1.2))
                colors.data[li].color=((.44-moist*.10)*shade,(.455-moist*.08)*shade,(.405-moist*.12)*shade,1)
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
