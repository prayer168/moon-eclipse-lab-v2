"""Rebuild Natural Earth map with Pillow. Sources cached, SHA256 recorded."""
import json, hashlib, urllib.request
from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]; cache=root/'.cache/earth';cache.mkdir(parents=True,exist_ok=True)
W,H=4096,2048
img=Image.new('RGB',(W,H),(35,100,151));d=ImageDraw.Draw(img);sources=[]
def layer(name,color):
 url=f'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_50m_{name}.geojson'
 path=cache/(name+'.geojson')
 if not path.exists(): urllib.request.urlretrieve(url,path)
 raw=path.read_bytes();data=json.loads(raw);sources.append(dict(layer=name,url=url,sha256=hashlib.sha256(raw).hexdigest(),features=len(data['features'])))
 for f in data['features']:
  g=f['geometry'];polys=[g['coordinates']] if g['type']=='Polygon' else g['coordinates']
  for rings in polys:
   mask=Image.new('1',(W,H));md=ImageDraw.Draw(mask)
   for j,ring in enumerate(rings):
    points=[((lon+180)/360*(W-1),(90-lat)/180*(H-1)) for lon,lat,*_ in ring]
    if len(points)>2:md.polygon(points,fill=1 if j==0 else 0)
   img.paste(color,(0,0,W,H),mask)
layer('land',(123,153,97));layer('lakes',(35,100,151));layer('glaciated_areas',(226,237,238))
# No bathymetry, climate, borders or elevations invented; colors are map styling.
output=root/'public/maps';output.mkdir(exist_ok=True,parents=True);img.save(output/'natural-earth.png',optimize=True)
(root/'docs/earth-map-sources.json').write_text(json.dumps(dict(provider='Natural Earth',license='Public domain',scale='1:50 million',projection='Equirectangular, lon -180..180 / lat +90..-90',size=[W,H],sources=sources,outputSHA256=hashlib.sha256((output/'natural-earth.png').read_bytes()).hexdigest()),indent=2),encoding='utf8')
print('Map generated:',output/'natural-earth.png')
