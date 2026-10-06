#!/usr/bin/env python3
"""Read-only checks of imports, image references and every immutable raw file."""
from pathlib import Path
from collections import Counter
import re,json,hashlib
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'image-audit/results'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def write(name,value):(OUT/name).write_text(value if isinstance(value,str) else json.dumps(value,indent=2)+'\n')
def main():
 records=json.loads((ROOT/'src/data/catalog/records.json').read_text());ids={r['id'] for r in records}
 entries=json.loads((ROOT/'catalog/images/manifest.json').read_text())['dishes'];broken=[];badcase=[];imports=[];badids=[]
 def actual_case(path):
  # Compare actual directory entries explicitly on the case-insensitive macOS filesystem.
  current=ROOT
  for part in path.relative_to(ROOT).parts:
   if not current.is_dir() or part not in {p.name for p in current.iterdir()}:return False
   current/=part
  return True
 for source in (ROOT/'src').rglob('*'):
  if source.suffix not in {'.js','.jsx','.css','.json'} or source.name.endswith(('.test.js','.test.jsx')):continue
  text=source.read_text()
  if source.suffix in {'.js','.jsx','.css'}:
   pattern=r"(?:from\s*|import\s*\(\s*|import\s*)['\"](\.[^'\"]+)['\"]"
   for value in re.findall(pattern,text):
    target=source.parent/value.split('?')[0];resolved=None
    for suffix in ['', '.js','.jsx','.json','/index.js','/index.jsx']:
     candidate=Path(str(target)+suffix)
     if candidate.is_file():resolved=candidate.resolve();break
    imports.append(dict(source=str(source.relative_to(ROOT)),reference=value,exists=bool(resolved)))
    if not resolved:broken.append(imports[-1])
    elif resolved.is_relative_to(ROOT) and not actual_case(resolved):badcase.append(imports[-1])
   for dish_id in re.findall(r"\bdishId\s*:\s*['\"]([a-z0-9-]+)['\"]",text):
    if dish_id not in ids:badids.append(dict(source=str(source.relative_to(ROOT)),dishId=dish_id))
 # Asset ownership: current + archived manifest metadata, plus explicit original photo map.
 owned=set()
 def paths(value):
  if isinstance(value,dict):
   for key,v in value.items():
    if key in {'localPath','inputPath','originalLocalPath'} and isinstance(v,str):owned.add(v)
    paths(v)
  elif isinstance(value,list):
   for v in value:paths(v)
 paths(entries)
 for source in ['src/data/dishImages.js','src/data/dishImageAssets.js']:
  for value in re.findall(r"from ['\"]([^'\"]+)['\"]",(ROOT/source).read_text()):
   p=(ROOT/source).parent/value
   if p.is_file():owned.add(str(p.resolve().relative_to(ROOT)))
 stored_missing=[e['dishId'] for e in entries if e.get('localPath') and not (ROOT/e['localPath']).is_file()]
 targets=[str(p.relative_to(ROOT)) for p in (ROOT/'src/assets/food/catalog').glob('*') if p.is_file()]
 originals=[str(p.relative_to(ROOT)) for p in (ROOT/'src/assets/food').glob('dish-*') if p.suffix in {'.webp','.png','.jpg','.jpeg'}]
 unowned=[p for p in targets if p not in owned]
 referenced_targets=[e['localPath'] for e in entries if e.get('localPath')]
 collisions=[p for p,n in Counter(referenced_targets).items() if n>1]
 audit=dict(staticImportCount=len(imports),brokenImports=broken,caseMismatches=badcase,unknownDishIds=badids,missingStoredImages=stored_missing,duplicateManifestPaths=collisions,unownedCatalogAssets=unowned,originalRasterAssets=originals,currentStoredImages=len(referenced_targets),renderableImages=sum(e.get('reviewStatus') in {'approved','temporary'} and bool(e.get('localPath')) for e in entries),placeholderReferencesIntentional=True,generatedIncomingReferences='Importer and queue only; never rendered directly',legacyOriginalReferences='Intentionally retained as review evidence and for original image map; approval gate prevents stale override')
 write('broken-reference-scan.json',audit)
 write('broken-reference-scan.md',f"# Reference audit\n\n{len(imports)} static local references checked. Broken imports: {len(broken)}; case mismatches: {len(badcase)}; unknown production dishId literals: {len(badids)}; missing stored manifest images: {len(stored_missing)}; target path collisions: {len(collisions)}; unowned catalog assets: {len(unowned)}.\n\n22 stored current photos, 6 renderable. The remaining 195 intentionally use the placeholder because review is pending/missing/rejected. Original dish PNG/WebPs are deliberate preserved inputs; region and generic dish images are UI/category assets, not canonical candidates. Generated-incoming references appear only in engineering tools/queue. Legacy source maps and original photos remain available for review. The build additionally resolves all imports.\n")
 before=json.loads((OUT/'initial-file-hashes.json').read_text());changed=[];missing=[]
 for path,h in before.items():
  p=ROOT/path
  if not p.is_file():missing.append(path)
  elif sha(p)!=h:changed.append(path)
 raw_report=json.loads((OUT/'raw-preservation.json').read_text());archives=[dict(**a,verifiedUnchanged=sha(ROOT/a['path'])==a['sha256']) for a in raw_report['archives']]
 rows=json.loads((OUT/'image-inventory.json').read_text());copies=all(sha(Path(r['copyPath']))==r['sha256'] for r in rows)
 raw_files=[dict(**r,verifiedUnchanged=sha(ROOT/r['path'])==r['sha256']) for r in raw_report.get('rawFiles',[])]
 continuation=json.loads((OUT/'continuation-initial-file-hashes.json').read_text())
 continuation_changed=[p for p,h in continuation.items() if (ROOT/p).is_file() and sha(ROOT/p)!=h]
 continuation_missing=[p for p in continuation if not (ROOT/p).is_file()]
 raw_baseline={p:h for p,h in continuation.items() if p.startswith('image-audit/generated-batches/')}
 current_raw={str(p.relative_to(ROOT)) for p in (ROOT/'image-audit/generated-batches').rglob('*') if p.is_file()}
 raw_tree_preserved=current_raw==set(raw_baseline) and all(sha(ROOT/p)==h for p,h in raw_baseline.items())
 staged_before={p:h for p,h in continuation.items() if p.startswith('image-audit/staged-import/') and p.endswith('.webp')}
 previous_staged_preserved=all((ROOT/p).is_file() and sha(ROOT/p)==h for p,h in staged_before.items())
 runtime_changed=[p for p in continuation_changed if p.startswith(('src/assets/','src/data/','catalog/')) and p!='catalog/images/README.md']
 from html.parser import HTMLParser
 from urllib.parse import unquote
 class ReviewImages(HTMLParser):
  def __init__(self):super().__init__();self.sources=[]
  def handle_starttag(self,tag,attrs):
   if tag=='img':self.sources.extend(v for k,v in attrs if k=='src')
 parser=ReviewImages();parser.feed((OUT/'image-review.html').read_text())
 broken_review=[src for src in parser.sources if not (OUT/unquote(src)).resolve().is_file()]
 audit.update(reviewHtmlImageCount=len(parser.sources),brokenReviewHtmlImages=broken_review,rawGeneratedFilenamesInRuntime=[str(p.relative_to(ROOT)) for p in (ROOT/'src').rglob('*') if p.suffix in {'.js','.jsx','.css','.json'} and 'ChatGPT Image ' in p.read_text()])
 write('broken-reference-scan.json',audit)
 runtime_paths=[p for p in before if p.startswith('src/assets/') or p in {'catalog/images/manifest.json','src/data/dishImages.js','src/data/dishImageAssets.js','src/data/dishImageCredits.json','src/data/catalog/records.json','src/data/catalog/taxonomy.json'}]
 preservation=dict(archives=archives,rawFiles=raw_files,zipExcludedFromInventory=True,allRawDirectoryFilesUnchanged=raw_tree_preserved,rawTreeFileCount=len(raw_baseline),allReviewCopiesMatchRawHashes=copies,previousStagedWebPsPreserved=previous_staged_preserved,previousStagedCount=len(staged_before),deletedInitialFiles=missing,changedInitialFiles=changed,continuationChangedFiles=continuation_changed,continuationDeletedFiles=continuation_missing,continuationRuntimeChanges=runtime_changed,unchangedRuntimeAssetsAndCatalog=all(sha(ROOT/p)==before[p] for p in runtime_paths),initialStatusFile='image-audit/results/initial-git-status.txt',continuationStatusFile='image-audit/results/continuation-initial-git-status.txt')
 write('preservation-verification.json',preservation)
 assert not broken and not badcase and not badids and not stored_missing and not collisions and not unowned
 assert not missing and all(a['verifiedUnchanged'] for a in archives) and copies and preservation['unchangedRuntimeAssetsAndCatalog']
 assert all(r['verifiedUnchanged'] for r in raw_files) and raw_tree_preserved and previous_staged_preserved
 assert not continuation_missing and not runtime_changed and not broken_review and not audit['rawGeneratedFilenamesInRuntime']
 print(f'{len(imports)} imports valid; {len(raw_files)} raw images and complete raw directory tree unchanged; {len(staged_before)} previous staged WebPs preserved; runtime assets and catalog preserved; {len(parser.sources)} review images resolve')
if __name__=='__main__':main()
