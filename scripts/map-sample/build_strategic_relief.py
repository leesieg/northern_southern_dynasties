"""National strategic normal/elevation texture from the real overview DEM, independent of camera LOD."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[2];out=root/'public/art/campaign'
m=json.loads((out/'national-terrain.json').read_text())
a=np.fromfile(out/'national-elevation.bin',dtype='<f4').reshape(m['rows'],m['columns'])
a=a.reshape(m['rows']//2,2,m['columns']//2,2).mean(axis=(1,3));rows,columns=a.shape
my=m['north']+(np.arange(rows)+.5)/rows*m['height'];lat=np.arctan(np.sinh(np.pi*(1-2*my)))
height=np.maximum(a,0)*.01/np.cos(lat[:,None]);dz,dx=np.gradient(height,m['height']*40075.016686/rows,m['width']*40075.016686/columns)
normal=np.stack([-dx,np.ones_like(height),-dz],axis=2);normal/=np.linalg.norm(normal,axis=2,keepdims=True)
rgba=np.concatenate([(normal*.5+.5)*255,np.clip(height/180,0,1)[:,:,None]*255],axis=2)
Image.fromarray(np.rint(rgba).astype('uint8')).save(out/'national-relief.png',optimize=True)
print(f'{columns}x{rows}, {(out/"national-relief.png").stat().st_size} bytes')
