"""Execute with Blender MCP. Builds a separate scene and portable campaign assets.
DEM: AWS Terrarium z8; rivers: Natural Earth 1:10m. No generated mountains.
Coordinates: 1 unit ~ 1 km, elevation exaggerated 10x for campaign readability.
"""
import bpy, math, os, json, random, struct
import numpy as np
from mathutils import Vector
ROOT=os.environ['FYNBC_PROJECT_ROOT']; OUT=ROOT+'/public/art/campaign'
os.makedirs(OUT,exist_ok=True)
scene=bpy.data.scenes.new('Campaign_Rebuild'); bpy.context.window.scene=scene
rng=random.Random(546)
def mat(name,c):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=.91
 return m
materials=[mat('Warm limestone',(.36,.335,.275)),mat('Lime plaster',(.57,.52,.42)),mat('Slate tile',(.064,.091,.095)),mat('Dark timber',(.18,.105,.055)),mat('Courtyard earth',(.37,.31,.18)),mat('Ridge pottery',(.185,.18,.145)),mat('Leaf olive',(.072,.139,.061)),mat('Leaf light',(.15,.21,.074)),mat('Pine green',(.039,.093,.055))]
def mesh(name,verts,faces,material):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.materials.append(material);me.update()
 if name.startswith('City '):
  colors=me.color_attributes.new(name='Weathering',type='FLOAT_COLOR',domain='CORNER')
  base=material.diffuse_color
  for poly in me.polygons:
   for li in poly.loop_indices:
    v=me.vertices[me.loops[li].vertex_index].co
    shade=.80+.20*(.5+.5*math.sin(v.x*31.7+v.y*19.3+v.z*9.1))
    colors.data[li].color=(shade,shade,shade,1)
 ob=bpy.data.objects.new(name,me);scene.collection.objects.link(ob);return ob
def export(objects,name):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=OUT+'/'+name+'.glb',use_selection=True,use_active_scene=True,export_format='GLB',export_materials='EXPORT')
# Decode rounded 8-bit Non-Color channels: fractional decode produced spikes in old study.
mosaic=np.zeros((1024,1536),np.float32)
for tx in range(204,210):
 for ty in range(100,104):
  im=bpy.data.images.load(ROOT+f'/.cache/map-style-sample/dem8/{tx}-{ty}.png',check_existing=False); im.colorspace_settings.name='Non-Color'
  a=np.empty(256*256*4,np.float32);im.pixels.foreach_get(a);a=np.rint(a.reshape(256,256,4)[::-1]*255)
  mosaic[(ty-100)*256:(ty-99)*256,(tx-204)*256:(tx-203)*256]=a[:,:,0]*256+a[:,:,1]+a[:,:,2]/256-32768
  bpy.data.images.remove(im)
west,east,south,north=107.6,113.8,33.1,35.6
nx,nz=769,385
lons=np.linspace(west,east,nx);lats=np.linspace(north,south,nz)
px=((lons+180)/360*256-204)*256
py=((1-np.arcsinh(np.tan(np.radians(lats)))/math.pi)/2*256-100)*256
ix=np.floor(px).astype(int);iy=np.floor(py).astype(int);fx=px-ix;fy=py-iy
h=(mosaic[iy[:,None],ix]*(1-fx)+mosaic[iy[:,None],ix+1]*fx)*(1-fy[:,None])+(mosaic[iy[:,None]+1,ix]*(1-fx)+mosaic[iy[:,None]+1,ix+1]*fx)*fy[:,None]
h=np.maximum(h,0).astype(np.float32)
# Gentle one-cell filter only, retaining measured ridge positions.
h[1:-1,1:-1]=h[1:-1,1:-1]*.60+(h[:-2,1:-1]+h[2:,1:-1]+h[1:-1,:-2]+h[1:-1,2:])*.10
h.astype('<f4').tofile(OUT+'/elevation.bin')
meta={'west':west,'east':east,'south':south,'north':north,'columns':nx,'rows':nz,'originLon':110.6,'originLat':34.4,'lonScale':92,'latScale':111,'heightScale':.01,'heightUnit':'metres','source':'AWS Open Data Terrain Tiles / Terrarium z8','riverSource':'Natural Earth 1:10m rivers (public domain)','treeBudget':18000}
json.dump(meta,open(OUT+'/terrain.json','w'),indent=2)
verts=[((lon-110.6)*92,(lat-34.4)*111,float(h[j,i])*.01) for j,lat in enumerate(lats) for i,lon in enumerate(lons)]
faces=[(j*nx+i,(j+1)*nx+i,(j+1)*nx+i+1,j*nx+i+1) for j in range(nz-1) for i in range(nx-1)]
terrain=mesh('Measured mountain terrain',verts,faces,mat('Landscape',(.44,.48,.25)))
uv=terrain.data.uv_layers.new(name='RegionalUV')
for p in terrain.data.polygons:
 p.use_smooth=True
 for li in p.loop_indices:
  vi=terrain.data.loops[li].vertex_index;uv.data[li].uv=(vi%nx/(nx-1),1-vi//nx/(nz-1))
export([terrain],'terrain')
# Preserve real river centre lines, clipped by points with one point of margin.
rivers=[]
for f in json.load(open(ROOT+'/.cache/map-style-sample/rivers-10m.geojson'))['features']:
 lines=f['geometry']['coordinates'] if f['geometry']['type']=='MultiLineString' else [f['geometry']['coordinates']]
 for line in lines:
  section=[]
  for p in line:
   if west-.05<p[0]<east+.05 and south-.05<p[1]<north+.05:section.append(p[:2])
   elif section:
    if len(section)>1:rivers.append({'name':f['properties'].get('name',''),'points':section})
    section=[]
  if len(section)>1:rivers.append({'name':f['properties'].get('name',''),'points':section})
json.dump(rivers,open(OUT+'/rivers.json','w'),separators=(',',':'))
# Accumulate architectural components by material, avoiding thousands of draw calls.
parts={i:[[],[]] for i in range(len(materials))}
def add(v,f,m):
 a,b=parts[m];offset=len(a);a.extend(v);b.extend([tuple(i+offset for i in face) for face in f])
def box(x,y,z,w,d,h,m):
 v=[(x+sx*w/2,y+sy*d/2,z+sz*h) for sz in (0,1) for sy in (-1,1) for sx in (-1,1)]
 add(v,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)],m)
def roof(x,y,z,w,d,height):
 # Hipped, bowed roof, raised eaves and tiled ribs. Ridge east-west.
 n=10;v=[]
 for side in (-1,1):
  for j in range(n+1):
   t=j/n; halfw=w*.36+w*.19*t
   rise=height*(1-t)**1.6+.13*t**8
   v.extend([(x-halfw,y+side*d*.58*t,z+rise),(x+halfw,y+side*d*.58*t,z+rise)])
 f=[]
 for s in range(2):
  for j in range(n):
   a=s*(n+1)*2+j*2;f.append((a,a+1,a+3,a+2) if s else (a+2,a+3,a+1,a))
 add(v,f,2)
 # Triangular hips close roof ends.
 for sign in (-1,1):
  add([(x+sign*w*.36,y,z+height),(x+sign*w*.55,y-d*.58,z+.13),(x+sign*w*.55,y+d*.58,z+.13)],[(0,1,2)],2)
 box(x,y,z+height,w*.76,.055,.065,5)
 for k in range(1,int(w*9)):
  xx=x-w*.5+k/(int(w*9))*w
  for s in (-1,1):
   points=[(xx,y+s*d*.58*j/n,z+height*(1-j/n)**1.6+.13*(j/n)**8+.012) for j in range(n+1)]
   vv=[(p[0]+o,p[1],p[2]) for p in points for o in (-.009,.009)]
   add(vv,[(j*2,j*2+1,j*2+3,j*2+2) for j in range(n)],5)
def building(x,y,w,d,height,palace=False):
 box(x,y,0,w+.15,d+.15,.14,0);box(x,y,.14,w,d,height,1)
 for side in (-1,1):
  for k in range(4):box(x-w*.43+k*w*.286,y+side*d*.505,.15,.055,.045,height,3)
  box(x,y+side*d*.51,.32,w*.9,.045,.10,3)
 roof(x,y,height+.18,w,d,.60 if palace else .34)
# Square city with open south gate, spaced gatehouses, irregular outer hamlets.
box(0,0,-.06,12.8,10.8,.06,4)
for s in (-1,1):
 box(s*6.3,0,0,.38,10.8,.86,0)
 box(0,s*5.3,0,12.8,.38,.86,0) if s==1 else None
for x in (-3.65,3.65):box(x,-5.3,0,5.3,.38,.86,0)
for side in (-1,1):
 for k in range(49):box(-6.25+k*.26,side*5.3,.86,.14,.40,.20,0) if side==1 or abs(-6.25+k*.26)>1.0 else None
 for k in range(41):box(side*6.3,-5.25+k*.26,.86,.40,.14,.20,0)
for x,y in [(-6.3,-5.3),(6.3,-5.3),(-6.3,5.3),(6.3,5.3),(0,-5.3),(0,5.3)]:
 box(x,y,.85,1,.9,.58,1);roof(x,y,1.43,1.3,1.2,.39)
# Palace precinct at north, distinct courtyards and broad axial street.
for x,y,w,d,hh in [(0,2.5,2.6,1.2,.95),(0,.65,2,1,.67),(-2.1,2,1,2,.43),(2.1,2,1,2,.43)]:building(x,y,w,d,hh,True)
# Upper palace hall and corner roof silhouette, kept within the same original asset.
box(0,2.5,1.50,1.75,.78,.70,1);roof(0,2.5,2.20,2.1,1.15,.58)
for x in (-1,1):
 box(x*.71,2.08,1.5,.07,.07,.70,3)
for ix in range(-4,5):
 for iy in range(-3,5):
  x=ix*1.2;y=iy*1.04
  if abs(x)<.7 or (abs(x)<3 and y>0):continue
  building(x+rng.uniform(-.08,.08),y,.68+rng.random()*.25,.58+rng.random()*.18,.25+rng.random()*.29)
for i in range(22):
 x=rng.choice([-1,1])*rng.uniform(7,9.5);y=rng.uniform(-4.7,4.7)
 building(x,y,.50+rng.random()*.25,.45+rng.random()*.2,.23)
city=[]
for m,(v,f) in parts.items():
 if v:city.append(mesh('City '+materials[m].name,v,f,materials[m]))
export(city,'city')
# Three irregular tree crowns, authored at unit height, instanced at runtime.
for variant in range(3):
 parts={i:[[],[]] for i in range(len(materials))}
 box(0,0,0,.045,.045,.75,3)
 if variant==2:
  # Tiered pine crowns around a visible trunk; one small mesh per material.
  for k in range(4):
   z=.28+k*.18;r=.29-k*.048;n=9
   v=[(0,0,z+.37)]+[(math.cos(a/n*math.tau)*r,math.sin(a/n*math.tau)*r,z+rng.uniform(-.03,.03)) for a in range(n)]
   add(v,[(0,1+a,1+(a+1)%n) for a in range(n)]+[tuple(range(1,n+1))],8)
 else:
  for k in range(5):
   theta=k/5*math.tau;rad=.09 if k==0 else .18
   x=math.cos(theta)*rad;y=math.sin(theta)*rad;z=.78 if k==0 else .53+rng.random()*.20
   radius=.17+rng.random()*.05;v=[];n=8
   for ring in range(5):
    angle=math.pi*(ring+.12)/4.24
    for a in range(n):
     t=a/n*math.tau;rr=radius*math.sin(angle)*rng.uniform(.88,1.12)
     v.append((x+math.cos(t)*rr,y+math.sin(t)*rr,z+math.cos(angle)*radius*(1.4 if variant else .9)))
   f=[(j*n+a,j*n+(a+1)%n,(j+1)*n+(a+1)%n,(j+1)*n+a) for j in range(4) for a in range(n)]
   add(v,f,6+k%2)
 obs=[mesh('Tree '+str(variant)+' '+str(m),v,f,materials[m]) for m,(v,f) in parts.items() if v]
 export(obs,'tree-'+str(variant))
# Irregular exposed rocks; decorative details follow measured ridges, not new terrain.
parts={i:[[],[]] for i in range(len(materials))}
for k in range(5):
 x=rng.uniform(-.45,.45);y=rng.uniform(-.3,.3);w=rng.uniform(.22,.45);h0=rng.uniform(.5,1.4)
 v=[]
 for z in (0,h0*.65,h0):
  for j in range(5):
   a=j/5*math.tau;v.append((x+math.cos(a)*w*rng.uniform(.7,1.1),y+math.sin(a)*w*rng.uniform(.7,1.1),z))
 f=[tuple(range(10,15))]+[(j*5+i,j*5+(i+1)%5,(j+1)*5+(i+1)%5,(j+1)*5+i) for j in range(2) for i in range(5)]
 add(v,f,0)
rocks=[mesh('Ridge rock',*parts[0],materials[0])];export(rocks,'rocks')
# Save only this rebuild into an independent .blend, leave existing study untouched.
library=os.environ['FYNBC_CAMPAIGN_BLEND']
bpy.data.libraries.write(library,{scene},fake_user=True,compress=True)
result={'scene':scene.name,'terrainVertices':nx*nz,'rivers':len(rivers),'output':OUT,'blend':library,'heightRange':[float(h.min()),float(h.max())]}
