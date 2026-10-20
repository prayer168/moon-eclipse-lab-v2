from pathlib import Path
import hashlib,json
from PIL import Image
root=Path(__file__).resolve().parents[1];maps=root/'public/maps'
Image.open(maps/'moon-albedo.jpg').resize((1024,512),Image.Resampling.LANCZOS).save(maps/'moon-albedo-low.jpg',quality=88,optimize=True)
Image.open(maps/'moon-normal.png').resize((512,256),Image.Resampling.BILINEAR).save(maps/'moon-normal-low.png',optimize=True)
Image.open(maps/'moon-normal.png').save(maps/'moon-normal.webp',lossless=True,method=6)
files=['moon-albedo-low.jpg','moon-normal-low.png','moon-albedo.jpg','moon-normal.webp']
(root/'docs/moon-lod-sources.json').write_text(json.dumps([dict(file=f,bytes=(maps/f).stat().st_size,sha256=hashlib.sha256((maps/f).read_bytes()).hexdigest()) for f in files],indent=2),encoding='utf8')
print([(f,(maps/f).stat().st_size) for f in files])
