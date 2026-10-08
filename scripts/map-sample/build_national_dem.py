"""Real AWS Terrarium z5 DEM for the national Three.js campaign, no synthetic relief.
Run with Python + Pillow + numpy. Downloads are cached; output is little-endian float32.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess,json
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[2]; cache=root/'.cache/map-style-sample/national-dem';cache.mkdir(parents=True,exist_ok=True)
west,east,north,south=21,29,9,15
jobs=[(x,y) for x in range(west,east) for y in range(north,south)]
def load(pair):
 x,y=pair;p=cache/f'{x}-{y}.png'
 if not p.exists():subprocess.run(['curl','--fail','--silent','--show-error','--retry','2','--max-time','45',f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/5/{x}/{y}.png','-o',str(p)],check=True)
 a=np.asarray(Image.open(p).convert('RGB'),dtype=np.float32);return x,y,a[:,:,0]*256+a[:,:,1]+a[:,:,2]/256-32768
m=np.zeros(((south-north)*256,(east-west)*256),dtype=np.float32)
with ThreadPoolExecutor(max_workers=6) as pool:
 for x,y,a in pool.map(load,jobs):m[(y-north)*256:(y-north+1)*256,(x-west)*256:(x-west+1)*256]=a
# Keep all source samples. Runtime terrain uses distance-based sampling budgets.
out=root/'public/art/campaign';m.astype('<f4').tofile(out/'national-elevation.bin')
meta=dict(columns=m.shape[1],rows=m.shape[0],west=west/32,north=north/32,width=(east-west)/32,height=(south-north)/32,source='Mapzen Terrain Tiles on AWS / Terrarium z5',heightUnit='metres',attribution='SRTM and GMTED2010 courtesy USGS; ETOPO1 courtesy NOAA')
(out/'national-terrain.json').write_text(json.dumps(meta,indent=2)+'\n');print(f'{m.shape[1]} x {m.shape[0]}, {m.min():.0f}..{m.max():.0f} m')
