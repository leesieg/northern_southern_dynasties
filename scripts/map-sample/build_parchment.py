"""Pre-render geographic parchment for the map; no gameplay entities or UI capture."""
from pathlib import Path
import json, math, sys
import numpy as np
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[2];out=root/'public/art/campaign'
m=json.loads((out/'national-terrain.json').read_text());dem=np.fromfile(out/'national-elevation.bin',dtype='<f4').reshape(m['rows'],m['columns'])
w,h=2048,1536;rng=np.random.default_rng(546);yy,xx=np.mgrid[:h,:w]
grain=(rng.random((h,w))-.5)*4+np.sin(xx*.018+np.sin(yy*.009))*2+np.cos(yy*.021)*2
edge=np.maximum(abs(xx/w-.5),abs(yy/h-.5))**5*120
rgb=np.stack([232+grain-edge,227+grain-edge,208+grain-edge],axis=2).clip(0,255).astype('uint8')
paper=Image.fromarray(rgb).convert('RGBA');ink=Image.new('RGBA',(w,h));d=ImageDraw.Draw(ink)
def point(p):
 lon,lat=p[:2];lat=max(-85,min(85,lat));x=(lon+180)/360;y=(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2
 return ((x-m['west'])/m['width']*w,(y-m['north'])/m['height']*h)
land=json.loads((root/'public/data/land.geojson').read_text());mask=Image.new('L',(w,h));md=ImageDraw.Draw(mask)
for f in land['features']:
 g=f['geometry'];polys=[g['coordinates']] if g['type']=='Polygon' else g['coordinates'] if g['type']=='MultiPolygon' else []
 for polygon in polys:
  for i,ring in enumerate(polygon):
   path=[point(p) for p in ring];md.polygon(path,fill=255 if i==0 else 0);d.line(path,fill=(100,106,89,90),width=1)
sea=Image.fromarray(np.stack([164+grain,188+grain,187+grain],axis=2).clip(0,255).astype('uint8')).convert('RGBA');soil=Image.new('RGBA',(w,h),(234,229,210,40));paper=Image.alpha_composite(paper,Image.composite(soil,sea,mask))
# Continuous, geographically aligned hillshade; no repeated mountain pictograms.
padded=np.pad(dem,1,mode='edge')
smoothed=sum(padded[j:j+h,i:i+w] for j in range(3) for i in range(3))/9
north,east=np.gradient(smoothed)
east=east/(m['width']*40075016.686/w)*8
north=north/(m['height']*40075016.686/h)*8
light=(-east*.6-north*.5+1)/np.sqrt(east*east+north*north+1)
shade=np.clip(.98+(light-.7)*.16,.86,1.025)
shade=np.where(np.asarray(mask)>127,shade,1)
pixels=np.asarray(paper).copy();pixels[:,:,:3]=(pixels[:,:,:3]*shade[:,:,None]).clip(0,255).astype('uint8');paper=Image.fromarray(pixels)
for f in json.loads((root/'public/data/rivers.geojson').read_text())['features']:
 g=f['geometry'];paths=[g['coordinates']] if g['type']=='LineString' else g['coordinates'] if g['type']=='MultiLineString' else []
 for path in paths:d.line([point(p) for p in path],fill=(107,143,145,100),width=1)
Image.alpha_composite(paper,ink).convert('RGB').save(out/'national-parchment.webp',quality=88,method=6)
print((out/'national-parchment.webp').stat().st_size)

if '--national-only' in sys.argv: sys.exit(0)

# Separate fog-only artwork: sparse ink washes and bamboo, never a tiled symbol pattern.
# Decorative scenery, not additional geographic or game-world data.
hidden=Image.alpha_composite(paper,ink)
wash=Image.new('RGBA',(w,h));brush=ImageDraw.Draw(wash)
for cx,cy,width,height in [(210,420,320,160),(430,1200,380,175),(1660,1080,330,160),(1800,360,330,190)]:
 for layer in range(3):
  ridge=[]
  for i in range(33):
   x=cx-width/2+i*width/32
   silhouette=(math.sin(i*.17+layer)*.18+math.sin(i*.41+layer*.7)*.12+.65)
   y=cy-height*silhouette*(1-layer*.22)+layer*22
   ridge.append((x,y))
  brush.polygon(ridge+[(cx+width/2,cy+28),(cx-width/2,cy+28)],fill=(56+layer*8,70+layer*6,63+layer*7,35+layer*12))
  brush.line(ridge,fill=(52,66,60,70),width=2)
 # A few cloud washes crossing the ridges, with generous unpainted space.
 for i in range(3):
  y=cy-35+i*23
  brush.line([(cx-width*.55+j*width/22,y+math.sin(j*.32+i)*5) for j in range(25)],fill=(223,220,197,125),width=8)
 for stem in range(3):
  x=cx+width*.32+stem*9;y=cy+32;tip=y-70-stem*11
  brush.line([(x,y),(x-7,tip)],fill=(46,64,53,105),width=2)
  for j in range(4):
   sy=y-15-j*15;sign=1 if j%2 else -1
   brush.line([(x-2,sy),(x+sign*20,sy-13)],fill=(46,64,53,105),width=2)
   for k in range(3):
    px=x+sign*(8+k*6);py=sy-5-k*3
    brush.polygon([(px,py),(px+sign*13,py-11),(px+sign*6,py-1)],fill=(46,64,53,100))
Image.alpha_composite(hidden,wash).convert('RGB').save(out/'hidden-shanshui.webp',quality=88,method=6)
