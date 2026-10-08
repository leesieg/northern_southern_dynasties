"""Package complete national z7 Terrarium coverage as gzip Int16 metre tiles.
Keeps geographic source samples (rounded to metres), never synthesizes relief.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import gzip, json, subprocess
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[2]
cache=root/'.cache/map-style-sample/detail-dem';cache.mkdir(parents=True,exist_ok=True)
out=root/'public/art/campaign/elevation';out.mkdir(parents=True,exist_ok=True)
jobs=[(x,y) for x in range(84,116) for y in range(36,60)]
def build(pair):
 x,y=pair;target=out/f'{x}-{y}.bin.gz'
 if target.exists() and len(gzip.decompress(target.read_bytes()))==256*256*2:return
 image=cache/f'{x}-{y}.png'
 if not image.exists():
  temp=image.with_suffix('.part')
  subprocess.run(['curl','--fail','--silent','--show-error','--retry','3','--retry-all-errors','--max-time','50',f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/7/{x}/{y}.png','-o',str(temp)],check=True)
  temp.replace(image)
 with Image.open(image) as source:a=np.asarray(source.convert('RGB'),dtype=np.float32)
 height=np.rint(a[:,:,0]*256+a[:,:,1]+a[:,:,2]/256-32768).astype('<i2')
 target.write_bytes(gzip.compress(height.tobytes(),compresslevel=6,mtime=0))
with ThreadPoolExecutor(max_workers=8) as pool:
 futures=[pool.submit(build,pair) for pair in jobs]
 for i,f in enumerate(as_completed(futures),1):
  f.result()
  if i%96==0:print(f'{i}/{len(jobs)} tiles',flush=True)
manifest=dict(zoom=7,west=84,east=116,north=36,south=60,tileSize=256,format='gzip little-endian int16 metres',source='Mapzen Terrain Tiles on AWS / Terrarium z7',attribution='SRTM and GMTED2010 courtesy USGS; ETOPO1 courtesy NOAA',tiles=len(jobs))
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Complete: {sum(p.stat().st_size for p in out.glob("*.gz"))/1048576:.1f} MiB',flush=True)
