"""Rebuild inline loading silhouettes after replacing brand artwork. Requires Pillow.
Only reads supplied raster alpha channels; writes TypeScript SVG geometry.
"""
from pathlib import Path
from PIL import Image
import json,math
root=Path(__file__).resolve().parents[1]
def simplify(points,tolerance=.65):
 if len(points)<3:return points
 a,b=points[0],points[-1];dx,dy=b[0]-a[0],b[1]-a[1]
 def distance(p):return abs(dy*p[0]-dx*p[1]+b[0]*a[1]-b[1]*a[0])/math.hypot(dx,dy) if dx or dy else math.dist(p,a)
 index=max(range(1,len(points)-1),key=lambda i:distance(points[i]))
 if distance(points[index])<=tolerance:return [a,b]
 return simplify(points[:index+1],tolerance)[:-1]+simplify(points[index:],tolerance)
def trace(image):
 image=image.convert('RGBA');image.thumbnail((256,256),Image.Resampling.LANCZOS)
 alpha=image.getchannel('A');w,h=image.size
 filled={(x,y) for y in range(h) for x in range(w) if alpha.getpixel((x,y))>24}
 edges={}
 def edge(a,b):edges.setdefault(a,[]).append(b)
 for x,y in sorted(filled):
  if (x,y-1) not in filled:edge((x,y),(x+1,y))
  if (x+1,y) not in filled:edge((x+1,y),(x+1,y+1))
  if (x,y+1) not in filled:edge((x+1,y+1),(x,y+1))
  if (x-1,y) not in filled:edge((x,y+1),(x,y))
 paths=[]
 while edges:
  start=next(iter(edges));point=start;loop=[point]
  while point in edges:
   target=edges[point].pop()
   if not edges[point]:del edges[point]
   point=target;loop.append(point)
   if point==start:break
  area=abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(loop,loop[1:]))/2)
  if area<3:continue
  split=max(range(1,len(loop)),key=lambda i:math.dist(loop[0],loop[i]))
  points=simplify(loop[:split+1])[:-1]+simplify(loop[split:])[:-1]
  paths.append('M'+'L'.join(f'{x},{y}' for x,y in points)+'Z')
 return {'viewBox':f'0 0 {w} {h}','path':''.join(paths)}
sources={'jamb':'images/exams/jamb.png','waec':'images/exams/waec.png','pastq':'pastq-icon-192.png','scholar-wave':'pets/scholar/wave.png','scholar-account':'pets/scholar/67.webp'}
shapes={key:trace(Image.open(root/'public'/name)) for key,name in sources.items()}
shapes['scholar-wave']['viewBox']='42 0 108 208'
atlas=Image.open(root/'public/pets/scholar/spritesheet.webp')
for name,(row,column) in {'idle':(0,0),'study':(8,1),'thinking':(7,0),'waiting':(6,2),'encourage':(5,5),'celebrate':(8,5)}.items():
 shapes['scholar-'+name]=trace(atlas.crop((column*192,row*208,(column+1)*192,(row+1)*208)))
out=root/'src/app/components/skeletonShapes.ts'
out.write_text('// Silhouettes traced from the alpha channel of our shipped artwork. No new raster images.\nexport const skeletonShapes = '+json.dumps(shapes,separators=(',',':'))+' as const;\nexport type SkeletonShapeName = keyof typeof skeletonShapes;\n',encoding='utf-8')
