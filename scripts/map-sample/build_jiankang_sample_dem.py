"""Measured Terrarium z11 detail for the isolated Jiankang art sample only."""
from pathlib import Path
import concurrent.futures, gzip, json, math, subprocess
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[2]
cache = root / '.cache/map-art-sample/refine/dem'
out = root / 'public/art/campaign/art-sample/jiankang-dem'
cache.mkdir(parents=True, exist_ok=True)
out.mkdir(parents=True, exist_ok=True)
zoom = 11
x = math.floor((118.78 + 180) / 360 * 2**zoom) - 1
y = math.floor((1 - math.asinh(math.tan(math.radians(32.05))) / math.pi) / 2 * 2**zoom) - 1

def build(pair):
    tx, ty = pair
    source = cache / f'{tx}-{ty}.png'
    if not source.exists():
        subprocess.run(['curl', '--fail', '--silent', '--show-error', '--max-time', '40',
                        f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{zoom}/{tx}/{ty}.png',
                        '-o', str(source)], check=True)
    with Image.open(source) as image:
        rgb = np.asarray(image.convert('RGB'), dtype=np.float32)
    if rgb.shape != (256, 256, 3):
        raise ValueError('Unexpected source tile dimensions')
    heights = np.rint(rgb[:, :, 0] * 256 + rgb[:, :, 1] + rgb[:, :, 2] / 256 - 32768).astype('<i2')
    (out / f'{tx}-{ty}.bin.gz').write_bytes(gzip.compress(heights.tobytes(), mtime=0))

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    list(pool.map(build, [(tx, ty) for tx in range(x, x+3) for ty in range(y, y+3)]))
(out / 'manifest.json').write_text(json.dumps(dict(
    zoom=zoom, west=x, east=x+3, north=y, south=y+3, tileSize=256, tiles=9,
    format='gzip little-endian int16 metres', source='Mapzen Terrain Tiles on AWS / Terrarium z11',
    attribution='SRTM and GMTED2010 courtesy USGS; ETOPO1 courtesy NOAA',
    rights='https://github.com/tilezen/joerd/blob/master/docs/attribution.md',
    note='Modern measured terrain, about 65 m source sampling near Jiankang. Art sample only; not a reconstruction of 546 CE.'
), indent=2) + '\n')
print('Jiankang sample: 9 measured elevation tiles packaged')
