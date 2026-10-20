"""NASA CGI Moon Kit 2019 4K albedo + LOLA height-derived unit normals.
Requires Pillow and numpy; raw downloads are cached, never sent to browser.
"""
from pathlib import Path
import urllib.request,hashlib,json,time
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1];cache=root/'.cache/moon';cache.mkdir(parents=True,exist_ok=True);out=root/'public/maps';out.mkdir(exist_ok=True)
sources=[]
def download(name):
 url='https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/'+name;p=cache/name
 expected=33201026 if name.startswith('ldem') else 13095388
 mirror='https://raw.githubusercontent.com/Project-10/OpenRT/ef6205f8ca51fd123da4a2f0b7b7a6ad27809b80/data/'+name
 if not p.exists() or p.stat().st_size!=expected:
  print('Downloading in verified ranges',name,flush=True)
  def chunk(start):
   end=min(expected-1,start+262143)
   for attempt in range(3):
    try:
     req=urllib.request.Request(mirror,headers={'Range':f'bytes={start}-{end}'})
     with urllib.request.urlopen(req,timeout=25) as r:
      assert r.status==206 and r.headers.get('Content-Range')==f'bytes {start}-{end}/{expected}'
      data=r.read();assert len(data)==end-start+1;return data
    except Exception:
     if attempt==2:raise
     time.sleep(1)
  with ThreadPoolExecutor(max_workers=8) as pool: parts=list(pool.map(chunk,range(0,expected,262144)))
  p.write_bytes(b''.join(parts))
 expected_sha='384279330e69e66455092a558505242d5009ff3f' if name.startswith('ldem') else '1cfd3825f64ebe3f357183a29767710eca65f571'
 raw=p.read_bytes();assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==expected_sha
 sources.append(dict(url=url,downloadURL='https://raw.githubusercontent.com/Project-10/OpenRT/ef6205f8ca51fd123da4a2f0b7b7a6ad27809b80/data/'+name,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
 return p
color=Image.open(download('lroc_color_poles_4k.tif')).convert('RGB');color.save(out/'moon-albedo.jpg',quality=94,subsampling=0,optimize=True)
height=Image.open(download('ldem_16_uint.tif'));h=Image.fromarray((np.array(height,dtype=np.float32)-20000)*.5).resize((4096,2048),Image.Resampling.BILINEAR);h=np.array(h)
W,H=4096,2048;lon=(np.arange(W,dtype=np.float32)+.5)/W*2*np.pi-np.pi;lat=np.pi/2-(np.arange(H,dtype=np.float32)+.5)/H*np.pi
co=np.cos(lon)[None,:];si=np.sin(lon)[None,:];cl=np.cos(lat)[:,None];sl=np.sin(lat)[:,None]
dl=(np.roll(h,-1,axis=1)-np.roll(h,1,axis=1))/(4*np.pi/W);dp=np.gradient(h,axis=0)/(-np.pi/H)
a=dl/(1737400*np.maximum(cl,.02));b=dp/1737400
n=np.stack(np.broadcast_arrays(cl*co+a*si+b*sl*co,cl*si-a*co+b*sl*si,sl-b*cl),axis=-1);n/=np.linalg.norm(n,axis=-1,keepdims=True)
# Pole normal shading is damped near the singularity. No vertex displacement or relief exaggeration.
Image.fromarray(np.uint8(np.clip((n+1)*127.5,0,255))).save(out/'moon-normal.png',optimize=True)
meta=dict(provider="NASA Scientific Visualization Studio / LRO LROC and LOLA",sourcePage='https://svs.gsfc.nasa.gov/4720/',colorVersion='2019 RGB map, 4K',dem='LOLA 16 pixels/degree uint16 half-meters, offset +10000m',size=[W,H],projection='Equirectangular, 0 longitude centered; east positive; north at top',sources=sources,outputs=[dict(file=f.name,sha256=hashlib.sha256(f.read_bytes()).hexdigest(),bytes=f.stat().st_size) for f in [out/'moon-albedo.jpg',out/'moon-normal.png']])
(root/'docs/moon-map-sources.json').write_text(json.dumps(meta,indent=2),encoding='utf8');print('Moon maps ready',flush=True)
