"""Real 30 m-scale Terrarium samples around Yubi. No synthetic plateau or cliff.
Published tiles: Mapzen/AWS, SRTM/USGS attribution retained in manifest.
Run with Python + Pillow + numpy; the nine PNG originals stay in .cache.
"""
from pathlib import Path
import concurrent.futures, gzip, json, subprocess
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[2]
cache=root/'.cache/changan-fix/yubi-dem';cache.mkdir(parents=True,exist_ok=True)
out=root/'public/art/campaign/elevation/yubi';out.mkdir(parents=True,exist_ok=True)
def build(pair):
 x,y=pair;source=cache/f'{x}-{y}.png'
 if not source.exists():
  subprocess.run(['curl','--fail','--silent','--show-error','--max-time','30',f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/{x}/{y}.png','-o',str(source)],check=True)
 with Image.open(source) as im:a=np.asarray(im.convert('RGB'),dtype=np.float32)
 heights=np.rint(a[:,:,0]*256+a[:,:,1]+a[:,:,2]/256-32768).astype('<i2')
 (out/f'{x}-{y}.bin.gz').write_bytes(gzip.compress(heights.tobytes(),mtime=0))
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(build,[(x,y) for x in range(3309,3312) for y in range(1613,1616)]))
(out/'manifest.json').write_text(json.dumps(dict(zoom=12,west=3309,east=3312,north=1613,south=1616,tileSize=256,tiles=9,format='gzip little-endian int16 metres',source='Mapzen Terrain Tiles on AWS / Terrarium z12',attribution='SRTM and GMTED2010 courtesy USGS; ETOPO1 courtesy NOAA',rights='https://github.com/tilezen/joerd/blob/master/docs/attribution.md',note='Modern measured terrain, not a reconstruction of 546 CE. About 31 m per source pixel at Yubi; rounded to integer metres, resampled for display.'),indent=2)+'\n')
print('Yubi: 9 measured terrain tiles packaged')
