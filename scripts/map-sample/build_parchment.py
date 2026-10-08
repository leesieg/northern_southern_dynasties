"""Pre-render geographic parchment for the map; no gameplay entities or UI capture."""
from pathlib import Path
import json, math
import numpy as np
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[2];out=root/'public/art/campaign'
m=json.loads((out/'national-terrain.json').read_text());dem=np.fromfile(out/'national-elevation.bin',dtype='<f4').reshape(m['rows'],m['columns'])
w,h=2048,1536;rng=np.random.default_rng(546);yy,xx=np.mgrid[:h,:w]
grain=(rng.random((h,w))-.5)*9+np.sin(xx*.018+np.sin(yy*.009))*2+np.cos(yy*.021)*2
edge=np.maximum(abs(xx/w-.5),abs(yy/h-.5))**5*320
rgb=np.stack([202+grain-edge,202+grain-edge,180+grain-edge],axis=2).clip(0,255).astype('uint8')
paper=Image.fromarray(rgb).convert('RGBA');ink=Image.new('RGBA',(w,h));d=ImageDraw.Draw(ink)
def point(p):
 lon,lat=p[:2];lat=max(-85,min(85,lat));x=(lon+180)/360;y=(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2
 return ((x-m['west'])/m['width']*w,(y-m['north'])/m['height']*h)
land=json.loads((root/'public/data/land.geojson').read_text());mask=Image.new('L',(w,h));md=ImageDraw.Draw(mask)
for f in land['features']:
 g=f['geometry'];polys=[g['coordinates']] if g['type']=='Polygon' else g['coordinates'] if g['type']=='MultiPolygon' else []
 for polygon in polys:
  for i,ring in enumerate(polygon):
   path=[point(p) for p in ring];md.polygon(path,fill=255 if i==0 else 0);d.line(path,fill=(80,64,41,125),width=1)
sea=Image.fromarray(np.stack([67+grain,98+grain,111+grain],axis=2).clip(0,255).astype('uint8')).convert('RGBA');soil=Image.new('RGBA',(w,h),(225,224,195,60));paper=Image.alpha_composite(paper,Image.composite(soil,sea,mask))
for y in range(8,h-8,12):
 for x in range(8,w-8,13):
  altitude=float(dem[y,x]);relief=abs(float(dem[y,x+5])-altitude)+abs(float(dem[y+5,x])-altitude)
  if altitude<450 or relief<75 or rng.random()>.68 or mask.getpixel((x,y))==0:continue
  px=x+(rng.random()-.5)*8;py=y+(rng.random()-.5)*6;peak=min(9,2+relief/200);width=3+rng.random()*3
  d.polygon([(px-width,py+2),(px-.8,py-peak),(px+width,py+1)],fill=(69,76,66,90))
  d.polygon([(px-width,py+2),(px-.8,py-peak),(px,py+1)],fill=(238,239,214,150))
  d.line([(px-width,py+2),(px-.8,py-peak),(px+width,py+1)],fill=(61,71,64,110),width=1)
  for j in range(1,4):d.line([(px+j*.8,py-peak+j*1.5),(px+j*.8+2,py+1)],fill=(61,71,64,65))
for f in json.loads((root/'public/data/rivers.geojson').read_text())['features']:
 g=f['geometry'];paths=[g['coordinates']] if g['type']=='LineString' else g['coordinates'] if g['type']=='MultiLineString' else []
 for path in paths:d.line([point(p) for p in path],fill=(86,99,91,105),width=1)
Image.alpha_composite(paper,ink).convert('RGB').save(out/'national-parchment.webp',quality=88,method=6)
print((out/'national-parchment.webp').stat().st_size)
