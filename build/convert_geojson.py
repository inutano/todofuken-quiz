import json, math

d = json.load(open('/tmp/japan.geojson'))
feats = d['features']

# --- projection: equirectangular, scale lon by cos(mean lat) ---
# gather all coords to find mean lat
all_lats=[]
for f in feats:
    def collect(o):
        if isinstance(o,list):
            if o and isinstance(o[0],(int,float)):
                all_lats.append(o[1]); return
            for x in o: collect(x)
    collect(f['geometry']['coordinates'])
mean_lat = sum(all_lats)/len(all_lats)
k = math.cos(math.radians(mean_lat))
def proj(lon,lat):
    return (lon*k, -lat)  # y flipped (screen down)

# --- Douglas-Peucker ---
def dp(pts, eps):
    if len(pts)<3: return pts
    # find point with max distance from line pts[0]-pts[-1]
    a=pts[0]; b=pts[-1]
    dx=b[0]-a[0]; dy=b[1]-a[1]
    dmax=0; idx=0
    seglen2=dx*dx+dy*dy
    for i in range(1,len(pts)-1):
        px,py=pts[i]
        if seglen2==0:
            dist=math.hypot(px-a[0],py-a[1])
        else:
            t=((px-a[0])*dx+(py-a[1])*dy)/seglen2
            projx=a[0]+t*dx; projy=a[1]+t*dy
            dist=math.hypot(px-projx,py-projy)
        if dist>dmax: dmax=dist; idx=i
    if dmax>eps:
        left=dp(pts[:idx+1],eps); right=dp(pts[idx:],eps)
        return left[:-1]+right
    else:
        return [a,b]

def ring_area(pts):
    s=0
    for i in range(len(pts)):
        x1,y1=pts[i]; x2,y2=pts[(i+1)%len(pts)]
        s+=x1*y2-x2*y1
    return abs(s)/2

EPS=0.010          # simplify tolerance in projected deg
AREA_MIN=0.0008    # drop islands smaller than this (projected deg^2)

pref={}
for f in feats:
    pid=f['properties']['id']; name=f['properties']['nam_ja']
    geom=f['geometry']
    polys = geom['coordinates'] if geom['type']=='MultiPolygon' else [geom['coordinates']]
    rings_out=[]
    for poly in polys:
        outer=poly[0]
        pr=[proj(x,y) for x,y in outer]
        if ring_area(pr) < AREA_MIN:  # skip tiny island
            continue
        simp=dp(pr,EPS)
        if len(simp)>=4:
            rings_out.append(simp)
    if not rings_out:  # ensure at least the largest ring survives
        biggest=max(polys,key=lambda p:ring_area([proj(x,y) for x,y in p[0]]))
        rings_out=[dp([proj(x,y) for x,y in biggest[0]],EPS)]
    pref[pid]={'name':name,'rings':rings_out}

# --- fit to viewBox width=1000 ---
xs=[p[0] for pr in pref.values() for r in pr['rings'] for p in r]
ys=[p[1] for pr in pref.values() for r in pr['rings'] for p in r]
minx,maxx=min(xs),max(xs); miny,maxy=min(ys),max(ys)
W=1000.0
scale=W/(maxx-minx)
H=(maxy-miny)*scale
def tx(x): return round((x-minx)*scale,1)
def ty(y): return round((y-miny)*scale,1)

out={'viewBox':[0,0,round(W,1),round(H,1)],'prefectures':{}}
total_pts=0
for pid,pr in pref.items():
    dpath=''
    cx_sum=cy_sum=area_sum=0
    bxmin=bymin=1e9; bxmax=bymax=-1e9
    for r in pr['rings']:
        total_pts+=len(r)
        pts=[(tx(x),ty(y)) for x,y in r]
        dpath+='M'+' '.join(f'{x},{y}' for x,y in pts)+'Z'
        # centroid via area
        for i in range(len(pts)):
            x1,y1=pts[i]; x2,y2=pts[(i+1)%len(pts)]
            cross=x1*y2-x2*y1
            area_sum+=cross; cx_sum+=(x1+x2)*cross; cy_sum+=(y1+y2)*cross
        for x,y in pts:
            bxmin=min(bxmin,x); bxmax=max(bxmax,x); bymin=min(bymin,y); bymax=max(bymax,y)
    if area_sum!=0:
        cx=round(cx_sum/(3*area_sum),1); cy=round(cy_sum/(3*area_sum),1)
    else:
        cx=round((bxmin+bxmax)/2,1); cy=round((bymin+bymax)/2,1)
    out['prefectures'][pid]={'name':pr['name'],'d':dpath,
        'c':[cx,cy],'bbox':[round(bxmin,1),round(bymin,1),round(bxmax-bxmin,1),round(bymax-bymin,1)]}

js=json.dumps(out,ensure_ascii=False,separators=(',',':'))
open('/tmp/prefectures.json','w').write(js)
print('viewBox',out['viewBox'],'total pts',total_pts,'bytes',len(js.encode()))
print('sample 13 Tokyo:',out['prefectures']['13']['c'],out['prefectures']['13']['bbox'])
print('count prefectures:',len(out['prefectures']))
