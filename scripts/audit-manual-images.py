#!/usr/bin/env python3
"""Inventory immutable physical batch files and create separate review copies/sheets.
No writes occur anywhere in generated-batches. Native macOS decoder avoids dependencies.
"""
from pathlib import Path
import hashlib,json,re,subprocess,csv
from collections import Counter,defaultdict
ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'image-audit/generated-batches'
OUT=ROOT/'image-audit/results'
EXT={'.png','.jpg','.jpeg','.webp','.heic'}
def sha(data): return hashlib.sha256(data).hexdigest()
def metadata(data):
 result={}
 if data.startswith(b'\x89PNG\r\n\x1a\n'):
  offset=8
  while offset+12<=len(data):
   length=int.from_bytes(data[offset:offset+4],'big');kind=data[offset+4:offset+8];chunk=data[offset+8:offset+8+length]
   if kind==b'tEXt':
    k,_,v=chunk.partition(b'\0');result[k.decode('latin1')]=v.decode('latin1')
   elif kind in {b'iTXt',b'zTXt'}: result[kind.decode()]=chunk[:1000].decode('utf8','replace')
   offset+=12+length
 return result

def main():
 OUT.mkdir(parents=True,exist_ok=True)
 copies=OUT/'raw-copies';sheets=OUT/'contact-sheets';sheets.mkdir(exist_ok=True)
 rows=[];ignored=[]
 batches=sorted((p for p in RAW.rglob('*') if p.is_dir() and re.fullmatch(r'nom_batch\d+',p.name)),key=lambda p:int(p.name[9:]))
 if [int(p.name[9:]) for p in batches]!=list(range(1,21)):
  raise ValueError('Expected exactly one physical directory for each batch 1–20')
 for directory in batches:
  if directory.is_symlink():raise ValueError(f'Batch symlink refused: {directory}')
  for source in sorted(directory.rglob('*')):
   if not source.is_file():continue
   if '__MACOSX' in source.parts or source.name.startswith('._') or source.suffix.lower() not in EXT:
    ignored.append(str(source.relative_to(ROOT)));continue
   if source.is_symlink() or not source.resolve().is_relative_to(RAW.resolve()):raise ValueError(f'Unsafe raw path: {source}')
   data=source.read_bytes()
   # Normalized review-copy paths retain the previous 131 verified copies.
   target=copies/directory.name/source.relative_to(directory)
   target.parent.mkdir(parents=True,exist_ok=True)
   if target.exists() and sha(target.read_bytes())!=sha(data):raise ValueError('Review copy conflicts; preserve existing copy')
   if not target.exists():target.write_bytes(data)
   rows.append(dict(batch=int(directory.name[9:]),batchDirectory=directory.name,filename=source.name,relativePath=str(source.relative_to(ROOT)),archive=None,archiveMember=None,copyPath=str(target),bytes=len(data),sha256=sha(data),format=source.suffix[1:].upper(),generationMetadata=metadata(data)))
 for batch in range(1,21):
  group=sorted([r for r in rows if r['batch']==batch],key=lambda r:(int(re.search(r'-(\d+)\.',r['filename'])[1]) if re.search(r'-(\d+)\.',r['filename']) else 999,r['filename']))
  for i,row in enumerate(group,1):row.update(index=i,identifier=f'B{batch:02d}-{i:02d}')
 rows.sort(key=lambda r:(r['batch'],r['index']))
 inventory=OUT/'image-inventory.json';inventory.write_text(json.dumps(rows,indent=2)+'\n')
 binary=Path('/private/tmp/nom-audit-image-sheets')
 subprocess.run(['swiftc','-module-cache-path','/private/tmp/nom-audit-swift-cache','-framework','AppKit','-framework','ImageIO',str(ROOT/'scripts/audit-image-sheets.swift'),'-o',str(binary)],check=True)
 subprocess.run([str(binary),str(inventory),str(sheets)],check=True)
 rows=json.loads(inventory.read_text());groups=defaultdict(list)
 for r in rows:groups[r['sha256']].append(r['identifier'])
 exact=[v for v in groups.values() if len(v)>1];pairs=[]
 for i,a in enumerate(rows):
  for b in rows[i+1:]:
   if 'dHash' not in a or 'dHash' not in b:continue
   dist=(int(a['dHash'],16)^int(b['dHash'],16)).bit_count()
   if dist<=10:pairs.append(dict(a=a['identifier'],b=b['identifier'],distance=dist,exact=a['sha256']==b['sha256'],sameBatch=a['batch']==b['batch']))
 for r in rows:
  r['exactDuplicateGroup']=next((f'exact-{i+1}' for i,g in enumerate(exact) if r['identifier'] in g),None)
  r['perceptualCandidates']=[p for p in pairs if r['identifier'] in {p['a'],p['b']}]
 inventory.write_text(json.dumps(rows,indent=2)+'\n')
 with (OUT/'image-inventory.csv').open('w') as f:
  keys=['identifier','batch','batchDirectory','filename','relativePath','bytes','width','height','format','aspectRatio','sha256','dHash','readable','exactDuplicateGroup']
  w=csv.DictWriter(f,fieldnames=keys,extrasaction='ignore');w.writeheader();w.writerows(rows)
 (OUT/'duplicate-analysis.json').write_text(json.dumps(dict(method='64-bit luminance dHash; Hamming <=10 is a candidate, never automatic proof',exactGroups=exact,nearCandidates=pairs),indent=2)+'\n')
 (OUT/'raw-preservation.json').write_text(json.dumps(dict(inputMode='physical batch directories only',archives=[],zipExcluded=True,rawImageCount=len(rows),rawBytes=sum(r['bytes'] for r in rows),ignoredMetadataEntries=len(ignored),ignoredFiles=ignored,batchDirectories=[str(p.relative_to(ROOT)) for p in batches],rawFiles=[dict(path=r['relativePath'],sha256=r['sha256'],bytes=r['bytes']) for r in rows],batches=dict(Counter(r['batch'] for r in rows))),indent=2)+'\n')
 print('Image counts:',dict(Counter(r['batch'] for r in rows)),'exact groups',exact,'near pairs',len(pairs))
if __name__=='__main__':main()
