#!/usr/bin/env python3
"""Reconcile explicit visual decisions against catalog; stage HIGH/READY copies only.
Raw batch files and runtime assets are never written. Requires macOS sips + cwebp.
"""
from pathlib import Path
from collections import Counter
import json,csv,hashlib,runpy,sys,subprocess,statistics,html
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'image-audit/results';STAGE=ROOT/'image-audit/staged-import'
sys.path.insert(0,str(ROOT/'scripts'))
from image_workflow import is_renderable

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def write(name,value):
 (OUT/name).write_text(value if isinstance(value,str) else json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def main():
 expected=json.loads((OUT/'expected-batches.json').read_text());records={r['id']:r for r in json.loads((ROOT/'src/data/catalog/records.json').read_text())}
 inventory=json.loads((OUT/'image-inventory.json').read_text());byid={r['identifier']:r for r in inventory}
 entries={e['dishId']:e for e in json.loads((ROOT/'catalog/images/manifest.json').read_text())['dishes']}
 decisions=[];seen=set();semantic=json.loads((OUT/'semantic-duplicate-reviews.json').read_text())
 for line in (OUT/'visual-decisions.tsv').read_text().splitlines():
  identifier,dish_id,confidence,status,role,note=line.split('\t',5);raw=byid[identifier]
  assert dish_id in records and identifier not in seen;seen.add(identifier)
  expected_row=next(e for e in expected if e['dishId']==dish_id)
  assert raw['batch']==expected_row['batch'],f'Out of batch mapping: {dish_id}'
  assert confidence in {'HIGH','MEDIUM','LOW'} and status in {'READY','DUPLICATE','WRONG_DISH','AMBIGUOUS','EXTRA','COLLAGE','CORRUPT'}
  assert role in {'PRIMARY_CANDIDATE','REVIEW_CANDIDATE','SECONDARY_CANDIDATE'}
  assert status!='READY' or (confidence=='HIGH' and role=='PRIMARY_CANDIDATE' and raw['readable'])
  group=next((g['group'] for g in semantic if identifier in g['identifiers']),None)
  decisions.append(dict(identifier=identifier,dishId=dish_id,detectedDish=records[dish_id]['name'] if status!='AMBIGUOUS' else 'Intended Lort Cha; long flat noodle presentation uncertain',confidence=confidence,status=status,candidateRole=role,duplicateGroup=group,reason=note,visuallyInspected=True,reviewEvidence=f"image-audit/results/contact-sheets/batch-{raw['batch']:02d}.png",rawHash=raw['sha256'],culturalApproval=False))
 assert set(byid)==seen,'Every raw file requires explicit visual decision'
 primaries=[d for d in decisions if d['candidateRole'] in {'PRIMARY_CANDIDATE','REVIEW_CANDIDATE'}]
 assert len({d['dishId'] for d in primaries})==len(primaries),'At most one selected candidate per dish'
 write('image-candidate-audit.json',decisions)
 mappings=[]
 for e in expected:
  candidates=[d for d in decisions if d['dishId']==e['dishId']];d=next((d for d in candidates if d['candidateRole'] in {'PRIMARY_CANDIDATE','REVIEW_CANDIDATE'}),None);r=byid[d['identifier']] if d else {};old=entries[e['dishId']]
  mappings.append(dict(batch=e['batch'],expectedOrder=e['order'],dishId=e['dishId'],dishName=e['catalogName'],country=e['country'],region=e['region'],expectedTargetFilename=e['expectedImageFilename'],candidateCurrentFilename=r.get('filename'),candidateRelativePath=r.get('relativePath'),candidateReviewCopyPath=str(Path(r['copyPath']).relative_to(ROOT)) if r else None,width=r.get('width'),height=r.get('height'),candidateDimensions=f"{r['width']}x{r['height']}" if r else None,candidateHash=r.get('sha256'),candidateIdentifier=r.get('identifier'),detectedDish=d['detectedDish'] if d else None,confidence=d['confidence'] if d else None,status=d['status'] if d else 'MISSING',duplicateGroup=d.get('duplicateGroup') if d else None,existingAppImage=old.get('localPath') if is_renderable(old) else 'src/assets/food/dish-placeholder.svg',existingStoredCandidate=old.get('localPath'),existingImageReviewStatus=old['reviewStatus'],existingSourceType=old['sourceType'],recommendedCandidate=r.get('relativePath') if d and d['status']=='READY' and d['confidence']=='HIGH' else None,candidateCount=len(candidates),candidateIdentifiers=[c['identifier'] for c in candidates],primaryCandidateCount=int(bool(d and d['status']=='READY' and d['confidence']=='HIGH')),notes=d['reason'] if d else 'No matching image found in supplied batch after full visual review. Batch 5 repeats Goulash and has no citrus-marinated seafood Ceviche candidate.'))
 write('dish-image-mapping.json',mappings)
 with (OUT/'dish-image-mapping.csv').open('w') as f:
  w=csv.DictWriter(f,fieldnames=list(mappings[0]));w.writeheader();w.writerows(mappings)
 counts=Counter(m['status'] for m in mappings)
 write('dish-image-mapping.md',f"# Dish/image reconciliation\n\n{len(mappings)} canonical rows; {len(inventory)} raw images. Canonical statuses: {dict(counts)}. Raw statuses are separately reported in image-candidate-audit.json: a secondary semantic duplicate does not substitute for missing Ceviche. Exactly one candidate: {sum(m['candidateCount']==1 for m in mappings)}; multiple candidates: {sum(m['candidateCount']>1 for m in mappings)}; zero candidates: {sum(m['candidateCount']==0 for m in mappings)}. READY means confident identification and usable staging, not human cultural approval or production activation. Only HIGH/READY has a recommended primary. Raw directory paths are canonical; ZIP excluded.\n\n| Batch/order | Dish ID | Candidate | Confidence | Status | Visual evidence |\n|---|---|---|---|---|---|\n"+'\n'.join(f"| {m['batch']}/{m['expectedOrder']} | {m['dishId']} | {m['candidateIdentifier'] or '—'} | {m['confidence'] or '—'} | {m['status']} | {m['notes']} |" for m in mappings)+'\n')
 STAGE.mkdir(parents=True,exist_ok=True);importer=runpy.run_path(str(ROOT/'scripts/import-dish-images.py'));staged=[]
 old_manifest=STAGE/'manifest.json'
 old_rows=json.loads(old_manifest.read_text())['dishes'] if old_manifest.exists() else []
 for i,m in enumerate(mappings):
  if m['status']!='READY' or m['confidence']!='HIGH':continue
  raw=byid[m['candidateIdentifier']];source=Path(raw['copyPath']);assert sha(source)==raw['sha256']
  target=STAGE/m['expectedTargetFilename']
  # Never overwrite a staged file from a different decision/provenance.
  if target.exists():
   previous=next((r for r in old_rows if r['dishId']==m['dishId']),None)
   if not previous or previous['sourceHash']!=raw['sha256'] or previous['outputHash']!=sha(target):raise ValueError(f'Staged conflict: {target}')
   width,height=importer['dimensions'](target)
  else:width,height=importer['optimize_photo'](source,target)
  ratio=width/height;assert abs(ratio-raw['aspectRatio'])<0.002
  row=dict(dishId=m['dishId'],dishName=m['dishName'],country=m['country'],batch=m['batch'],sourceBatch=raw['batchDirectory'],sourceFilename=raw['filename'],sourceHash=raw['sha256'],sourceRelativePath=raw['relativePath'],sourceArchive=raw['archive'],sourceArchiveMember=raw['archiveMember'],targetFilename=m['expectedTargetFilename'],targetRelativePath=str(target.relative_to(ROOT)),confidence='HIGH',auditStatus='READY',outputWidth=width,outputHeight=height,outputBytes=target.stat().st_size,outputHash=sha(target),conversion={'encoder':'cwebp','quality':82,'method':6,'maximumEdge':1200,'crop':False,'upscale':False},sourceType='generated',documentaryEvidence=False,notes=m['notes'])
  staged.append(row)
  # Checkpoint so an interruption leaves reusable verified copies.
  checkpoint=staged+[r for r in old_rows if r['dishId'] not in {s['dishId'] for s in staged}]
  old_manifest.write_text(json.dumps(dict(version=1,catalogCount=201,culturalApproval=False,dishes=checkpoint),ensure_ascii=False,indent=2)+'\n')
  if len(staged)%10==0:print(f'Verified {len(staged)} staged WebPs',flush=True)
 old_manifest.write_text(json.dumps(dict(version=1,catalogCount=len(records),culturalApproval=False,inputMode='physical batch directories only',dishes=staged),ensure_ascii=False,indent=2)+'\n')
 sizes=[r['outputBytes'] for r in staged];raw_bytes=sum(r['bytes'] for r in inventory)
 performance=dict(rawBytes=raw_bytes,stagedBytes=sum(sizes),medianBytes=statistics.median(sizes),largest=sorted(staged,key=lambda r:r['outputBytes'],reverse=True)[:10],smallest=sorted(staged,key=lambda r:r['outputBytes'])[:10],above500KB=[r['dishId'] for r in staged if r['outputBytes']>500000])
 write('image-performance.json',performance)
 write('image-performance.md',f"# Image performance\n\n{len(inventory)} raw images: {raw_bytes:,} bytes. {len(staged)} staged WebPs: {sum(sizes):,} bytes. Median: {statistics.median(sizes):,.0f} bytes. Maximum: {max(sizes):,}; minimum: {min(sizes):,}. Above 500 KB: {len(performance['above500KB'])}. Conversion follows existing importer: quality 82, method 6, max edge 1200, no crop/upscale, verified dimensions and aspect ratios.\n\nThe browser only requests displayed image URLs; prepare_catalog emits approved imports. Staging is outside src and is not bundled.\n")
 unresolved=[m for m in mappings if m['status']!='READY' or m['confidence']!='HIGH']
 protected=[m for m in mappings if m['status']=='READY' and m['existingImageReviewStatus'] in {'approved','temporary'}]
 write('manual-review-needed.md','# Genuine review needs\n\n## Catalog coverage\n\n'+'\n'.join(f"- **{m['dishName']}** ({m['dishId']}): {m['status']}; {m['notes']}" for m in unresolved)+'\n\n## Retained repeated generation\n\nB05-10 is a second Goulash-compatible stew, not Ceviche. B05-08 is the preferred primary for fuller bowl framing. Both raw files remain intact; only the primary is staged.\n\n## Protected existing image decisions\n\n'+', '.join(m['dishName']+' ('+m['existingImageReviewStatus']+')' for m in protected)+' remain protected by the importer. Compare their generated candidates with the already reviewed photos before deliberately changing those review decisions. No override or approval was fabricated.\n\n## Activation and responsive crops\n\nHIGH/READY is engineering identification, not human cultural approval. Generated candidates retain the existing individual cultural/visual approval gate before rendering. Actual generation prompts/model are unknown. Adana is 1376×1143 with tighter framing: check actual mobile/hero cover crops. Maafe peanut content and Harees grain/meat composition cannot be proved from pixels; evaluate against the catalog context. Canadian Split Pea Soup was independently inspected at full resolution: yellow pulse-thickened soup with ham/carrot, distinct from Locro large hominy/squash/meat. Dark Arroz con Coco is selected; no white alternate is present in the physical batches.\n')
 review=['<!doctype html><meta charset="utf-8"><title>Nom audited candidates</title><style>body{font:16px system-ui;padding:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}img{width:100%;object-fit:contain}article{border:1px solid #ccc;padding:12px}code{overflow-wrap:anywhere}</style><h1>Audited manual-generated candidates</h1><p>Identification/staging only. Human cultural approval is pending. Raw directory files remain intact. Ambiguous/secondary images are displayed from review copies and are not staged.</p><main>']
 for m in mappings:
  if m['status']=='MISSING':continue
  src='../staged-import/'+m['expectedTargetFilename'] if m['status']=='READY' else '../../'+m['candidateReviewCopyPath'];old=m['existingStoredCandidate'];old_html=f'<p>Existing ({html.escape(m["existingImageReviewStatus"])}):</p><img loading="lazy" src="../../{html.escape(old)}">' if old else '<p>No existing stored photo.</p>'
  review.append(f'<article><h2>{html.escape(m["dishName"])}</h2><p>{html.escape(m["country"])} · {m["candidateIdentifier"]} · {m["confidence"]} · {m["status"]}</p><img loading="lazy" src="{html.escape(src)}" alt="Generated candidate for {html.escape(m["dishName"])}"><p>{html.escape(m["notes"])}</p>{old_html}<code>{html.escape(m["candidateRelativePath"])}</code></article>')
 for d in decisions:
  if d['candidateRole']=='SECONDARY_CANDIDATE':
   raw=byid[d['identifier']];src='../../'+str(Path(raw['copyPath']).relative_to(ROOT))
   review.append(f'<article><h2>Retained secondary: {html.escape(d["detectedDish"])}</h2><p>{d["identifier"]} · {d["status"]}</p><img loading="lazy" src="{html.escape(src)}"><p>{html.escape(d["reason"])}</p></article>')
 review.append('</main>');write('image-review.html','\n'.join(review))
 duplicate=json.loads((OUT/'duplicate-analysis.json').read_text())
 reviews=json.loads((OUT/'duplicate-visual-reviews.json').read_text())
 assert {(p['a'],p['b'],p['distance']) for p in reviews}=={(p['a'],p['b'],p['distance']) for p in duplicate['nearCandidates']},'Every current perceptual candidate needs explicit review'
 for pair in duplicate['nearCandidates']:
  a=next(d for d in decisions if d['identifier']==pair['a']);b=next(d for d in decisions if d['identifier']==pair['b'])
  review=next(p for p in reviews if (p['a'],p['b'])==(pair['a'],pair['b']))
  pair.update(visualReview=review['visualReview'],confirmedDuplicate=review['confirmedDuplicate'],reviewSheet=review['reviewSheet'],reason=f"{a['detectedDish']}: {a['reason']} Compared with {b['detectedDish']}: {b['reason']}")
 duplicate.update(confirmedNearDuplicates=sum(p['confirmedDuplicate'] for p in reviews),semanticDuplicates=sum(len(g['identifiers'])-1 for g in semantic),semanticGroups=semantic,collages=sum(d['status']=='COLLAGE' for d in decisions));write('duplicate-analysis.json',duplicate)
 write('duplicate-analysis.md',f"# Duplicate review\n\nSHA-256 exact groups: {len(duplicate['exactGroups'])}. dHash ≤10 identified {len(reviews)} pairs across the complete directory dataset; every pair was visually compared in ten paired sheets. Confirmed near-identical pairs: {duplicate['confirmedNearDuplicates']}. Similar centered bowl/plate compositions explain the false matches.\n\nSemantic repeated generations: {duplicate['semanticDuplicates']}. B05-08 and B05-10 are two different Goulash-compatible beef stews; B05-08 is selected, B05-10 retained as secondary. Ceviche is absent. This semantic duplicate was found by batch reconciliation, not by assuming a perceptual hash proves completeness.\n\nBatch 17 has ten distinct expected dishes, one Adana, no collage. No raw files removed. dHash is a screening method and does not prove absence of every transformed duplicate.\n\n"+'\n'.join(f"- {p['a']} / {p['b']} (distance {p['distance']}): {p['visualReview']}. {p['reason']}" for p in duplicate['nearCandidates'])+'\n')
 print(f"Canonical rows: {len(mappings)}; statuses {dict(Counter(m['status'] for m in mappings))}; staged {len(staged)}",flush=True)
if __name__=='__main__':main()
