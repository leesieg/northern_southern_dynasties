"""Original branched / compound-leaf campaign trees. Run in an isolated scene via Blender MCP.
Two silhouettes per species: <= 1000 triangles regional, <= 4500 triangles close.
No textures or assets from the reference game. FYNBC_FOLIAGE_OUTPUT selects export directory.
"""
import bpy, os, math, random, json
from pathlib import Path
from mathutils import Vector
out=Path(os.environ['FYNBC_FOLIAGE_OUTPUT']);out.mkdir(parents=True,exist_ok=True)
scene=bpy.data.scenes.new('Campaign_Branched_Foliage');bpy.context.window.scene=scene
report={}
for variant in range(3):
 for detailed in [False,True]:
  rng=random.Random(1381+variant);verts=[];faces=[];colors=[]
  def face(indices,color):faces.append(indices);colors.append(color)
  def branch(a,b,r):
   a,b=Vector(a),Vector(b);axis=(b-a).normalized();u=axis.cross(Vector((0,1,0))).normalized();v=axis.cross(u);n=5;off=len(verts)
   for p,rr in [(a,r),(b,r*.48)]:
    for j in range(n):verts.append(tuple(p+(u*math.cos(j*math.tau/n)+v*math.sin(j*math.tau/n))*rr))
   for j in range(n):face((off+j,off+(j+1)%n,off+n+(j+1)%n,off+n+j),(.105,.072,.032))
   face(tuple(off+j for j in reversed(range(n))),(.105,.072,.032));face(tuple(off+n+j for j in range(n)),(.105,.072,.032))
  def leaf_cluster(center,size,seed,light):
   # Closed irregular octahedra give many small leaf tips and lit / shaded planes.
   rr=random.Random(seed);c=Vector(center);sx,sy,sz=size;angle=rr.random()*math.tau;off=len(verts)
   for x,y,z in [(1,0,0),(0,1,0),(-1,0,0),(0,-1,0),(0,0,1),(0,0,-1)]:
    rag=rr.uniform(.8,1.18);xx=x*sx*rag;yy=y*sy*rag;verts.append(tuple(c+Vector((xx*math.cos(angle)-yy*math.sin(angle),xx*math.sin(angle)+yy*math.cos(angle),z*sz*rag))))
   base=(.105,.165,.035) if variant<2 else (.052,.108,.046)
   for j in range(4):
    shade=light*rr.uniform(.85,1.14);col=tuple(v*shade for v in base)
    face((off+j,off+(j+1)%4,off+4),col);face((off+(j+1)%4,off+j,off+5),tuple(v*.72 for v in col))
  branch((0,0,0),(.026,-.02,1.1),.035)
  # A shared branch skeleton ensures LOD changes don't change a tree's silhouette or origin.
  branches=10 if variant<2 else 14
  for k in range(branches):
   angle=k*2.399;z=.55+(k%4)*.12 if variant<2 else .3+k*.055
   rad=(.28 if variant==0 else .23)+rng.random()*.11 if variant<2 else .40-k*.019
   end=(math.cos(angle)*rad,math.sin(angle)*rad,z)
   branch((.02,0,z*.58),end,.014 if variant<2 else .012)
   for fork in range(3 if detailed else 1):
    a=angle+(fork-1)*.8;tip=(end[0]+math.cos(a)*.10,end[1]+math.sin(a)*.10,z+.05+(fork%2)*.09)
    if detailed:branch(end,tip,.005)
    count=10 if detailed else 6
    for j in range(count):
     phi=j*2.4;spread=.10 if detailed else .16
     center=(tip[0]+math.cos(phi)*spread*rng.random(),tip[1]+math.sin(phi)*spread*rng.random(),tip[2]+rng.uniform(-.055,.085))
     s=(.074,.046,.030) if detailed else (.115,.087,.055)
     if variant==2:s=(s[0]*1.1,s[1]*.65,s[2]*.7)
     leaf_cluster(center,s,831+k*100+fork*20+j,.85+(z*.35)+rng.random()*.35)
  mesh=bpy.data.meshes.new('Branching leaf clusters');mesh.from_pydata(verts,[],faces);mesh.update()
  attr=mesh.color_attributes.new(name='Campaign AO',type='FLOAT_COLOR',domain='CORNER')
  for polygon,color in zip(mesh.polygons,colors):
   for li in polygon.loop_indices:attr.data[li].color=(*color,1)
  mesh.color_attributes.active_color=attr;mesh.color_attributes.render_color_index=0
  mat=bpy.data.materials.new('Leaf detailed' if variant<2 else 'Pine detailed');mat.use_nodes=True
  bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.94
  node=mat.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='Campaign AO';mat.node_tree.links.new(node.outputs['Color'],bsdf.inputs['Base Color']);mesh.materials.append(mat)
  ob=bpy.data.objects.new('Branched crown',mesh);scene.collection.objects.link(ob)
  bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
  name=('tree-close-' if detailed else 'tree-')+str(variant)
  bpy.ops.export_scene.gltf(filepath=str(out/(name+'.glb')),use_selection=True,use_active_scene=True,export_format='GLB',export_vertex_color='NAME',export_vertex_color_name='Campaign AO',export_all_vertex_colors=False)
  report[name]={'triangles':sum(len(p.vertices)-2 for p in mesh.polygons),'bytes':(out/(name+'.glb')).stat().st_size};ob.hide_set(True)
bpy.data.libraries.write(str(out/'campaign-branched-foliage.blend'),{scene},fake_user=True,compress=True)
(out/'report.json').write_text(json.dumps(report,indent=2))
result={'scene':scene.name,'assets':report}
