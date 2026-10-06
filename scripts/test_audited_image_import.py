"""Safety regression for catalog-grounded staged imports; fixtures never touch raw inputs."""
import copy,hashlib,json,runpy,sys,tempfile,unittest
from pathlib import Path
from zipfile import ZipFile
from unittest.mock import Mock,patch
from types import SimpleNamespace
SCRIPTS=Path(__file__).resolve().parent
sys.path.insert(0,str(SCRIPTS))
MODULE=runpy.run_path(str(SCRIPTS/'import-generated-images.py'))
IMPORTER=runpy.run_path(str(SCRIPTS/'import-dish-images.py'))
RECORD=next(r for r in json.loads((SCRIPTS.parent/'src/data/catalog/records.json').read_text()) if r['id']=='bibimbap')
def sha(data):return hashlib.sha256(data).hexdigest()

class AuditedImportSafetyTests(unittest.TestCase):
 def setUp(self):
  self.folder=tempfile.TemporaryDirectory();self.root=Path(self.folder.name).resolve()
  stage=self.root/'image-audit/staged-import';stage.mkdir(parents=True)
  raw=self.root/'image-audit/generated-batches';raw.mkdir(parents=True)
  self.raw=b'irreplaceable-generated-source';self.output=b'RIFF1234WEBPfixture'
  self.source=stage/'bibimbap.webp';self.source.write_bytes(self.output)
  archive=raw/'batches.zip'
  with ZipFile(archive,'w') as z:z.writestr('nom_batch2/raw.png',self.raw)
  self.row=dict(dishId='bibimbap',dishName='Bibimbap',sourceBatch='nom_batch2',sourceFilename='raw.png',sourceHash=sha(self.raw),sourceArchive='image-audit/generated-batches/batches.zip',sourceArchiveMember='nom_batch2/raw.png',sourceRelativePath='image-audit/generated-batches/batches.zip::nom_batch2/raw.png',targetFilename='bibimbap.webp',targetRelativePath='image-audit/staged-import/bibimbap.webp',confidence='HIGH',auditStatus='READY',sourceType='generated',documentaryEvidence=False,outputHash=sha(self.output),outputBytes=len(self.output),outputWidth=1000,outputHeight=800,notes='Fixture audit')
  self.document=dict(version=1,dishes=[self.row]);self.records={'bibimbap':copy.deepcopy(RECORD)}
  self.importer={'dimensions':Mock(return_value=(1000,800)),'optimize_photo':Mock(side_effect=AssertionError('Must not recompress audited WebP')),'write':IMPORTER['write'],'read_json':IMPORTER['read_json']}
 def tearDown(self):self.folder.cleanup()
 def validate(self,document=None):return MODULE['validate_staged_manifest'](document or self.document,self.records,self.root,self.importer)
 def test_accepts_complete_validated_provenance_without_writing_sources(self):
  before=self.source.read_bytes();archive=self.root/self.row['sourceArchive'];raw_before=archive.read_bytes()
  self.assertEqual(self.validate(),[self.row]);self.assertEqual(self.source.read_bytes(),before);self.assertEqual(archive.read_bytes(),raw_before)
 def test_rejects_unknown_id_low_or_medium_confidence_wrong_status_and_wrong_name(self):
  for key,value in [('dishId','unknown'),('confidence','LOW'),('confidence','MEDIUM'),('auditStatus','AMBIGUOUS'),('dishName','Ramen'),('sourceType','real'),('documentaryEvidence',True)]:
   candidate=copy.deepcopy(self.document);candidate['dishes'][0][key]=value
   with self.subTest(key=key,value=value),self.assertRaises(ValueError):self.validate(candidate)
 def test_rejects_output_traversal_and_symlink_escape(self):
  candidate=copy.deepcopy(self.document);candidate['dishes'][0]['targetRelativePath']='image-audit/staged-import/../../other.webp'
  with self.assertRaises(ValueError):self.validate(candidate)
  self.source.unlink();outside=self.root/'outside.webp';outside.write_bytes(self.output);self.source.symlink_to(outside)
  with self.assertRaises(ValueError):self.validate()
 def test_rejects_filename_collision_duplicate_candidate_and_duplicate_output(self):
  candidate=copy.deepcopy(self.document);candidate['dishes'].append(copy.deepcopy(self.row))
  with self.assertRaises(ValueError):self.validate(candidate)
  candidate=copy.deepcopy(self.document);candidate['dishes'][0]['targetFilename']='ramen.webp'
  with self.assertRaises(ValueError):self.validate(candidate)
  other=copy.deepcopy(self.row);other.update(dishId='ramen',dishName='Ramen',targetFilename='ramen.webp',targetRelativePath='image-audit/staged-import/ramen.webp')
  self.records['ramen']={'id':'ramen','name':'Ramen'};(self.source.parent/'ramen.webp').write_bytes(self.output)
  candidate=copy.deepcopy(self.document);candidate['dishes'].append(other)
  with self.assertRaisesRegex(ValueError,'reused'):self.validate(candidate)
 def test_rejects_missing_corrupt_modified_output_and_wrong_decoded_dimensions(self):
  self.importer['dimensions'].return_value=(1,1)
  with self.assertRaisesRegex(ValueError,'dimensions'):self.validate()
  self.importer['dimensions'].return_value=(1000,800)
  self.source.write_bytes(b'not-a-webp')
  with self.assertRaises(ValueError):self.validate()
  self.source.unlink()
  with self.assertRaises(ValueError):self.validate()
 def test_rejects_modified_raw_source_and_unsafe_archive_reference(self):
  candidate=copy.deepcopy(self.document);candidate['dishes'][0]['sourceHash']='0'*64
  with self.assertRaisesRegex(ValueError,'Raw source checksum'):self.validate(candidate)
  candidate=copy.deepcopy(self.document);candidate['dishes'][0]['sourceArchiveMember']='../raw.png'
  with self.assertRaises(ValueError):self.validate(candidate)
 def direct_source(self):
  path=self.root/'image-audit/generated-batches/Dish Images/nom_batch2/raw.png';path.parent.mkdir(parents=True);path.write_bytes(self.raw)
  self.row.update(sourceArchive=None,sourceArchiveMember=None,sourceRelativePath=str(path.relative_to(self.root)),batch=2)
  return path
 def test_direct_batch_provenance_requires_matching_filename_batch_and_safe_path(self):
  path=self.direct_source();self.assertEqual(self.validate(),[self.row])
  for key,value in [('sourceFilename','different.png'),('sourceBatch','nom_batch3'),('batch',3),('sourceArchiveMember','nom_batch2/raw.png'),('sourceRelativePath',str(path)),('sourceRelativePath','image-audit/generated-batches/Dish Images/nom_batch2/../nom_batch2/raw.png')]:
   candidate=copy.deepcopy(self.document);candidate['dishes'][0][key]=value
   with self.subTest(key=key,value=value),self.assertRaises(ValueError):self.validate(candidate)
  path.write_bytes(b'')
  with self.assertRaisesRegex(ValueError,'size'):self.validate()
 def test_direct_source_refuses_even_an_in_raw_directory_symlink_and_changed_catalog_count(self):
  path=self.direct_source();actual=path.with_name('actual.png');path.rename(actual);path.symlink_to(actual)
  with self.assertRaises(ValueError):self.validate()
  path.unlink();actual.rename(path)
  candidate=copy.deepcopy(self.document);candidate['catalogCount']=201
  with self.assertRaisesRegex(ValueError,'catalog count'):self.validate(candidate)
 def test_copy_import_retains_original_backup_and_clears_real_attribution(self):
  self.validate()
  path=self.root/'src/assets/food/catalog/bibimbap.webp';path.parent.mkdir(parents=True);path.write_bytes(b'old-real-photo')
  entry=dict(dishId='bibimbap',status='licensed-local',sourceType='real',reviewStatus='needs-replacement',localPath='src/assets/food/catalog/bibimbap.webp',creator='Real author',sourcePageUrl='https://example.org/real',license='CC0-1.0',licenseUrl='https://example.org/license')
  MODULE['import_generated'](entry,RECORD,{'dishId':'bibimbap','prompt':'Catalog prompt'},self.source,{},self.importer,self.root,audited_provenance=self.row)
  self.assertEqual(path.read_bytes(),self.output);self.importer['optimize_photo'].assert_not_called()
  self.assertEqual(entry['reviewStatus'],'generated-pending');self.assertIsNone(entry['creator']);self.assertIsNone(entry['sourcePageUrl'])
  self.assertEqual(entry['sourceSha256'],sha(self.raw));self.assertEqual(entry['auditProvenance'],self.row)
  self.assertEqual((self.root/entry['history'][0]['localPath']).read_bytes(),b'old-real-photo')
  self.assertEqual(self.source.read_bytes(),self.output)
 def test_bulk_optimizer_skips_catalog_archive_and_incoming_originals(self):
  script=self.root/'scripts/optimize-images.py';script.parent.mkdir(parents=True);script.write_text((SCRIPTS/'optimize-images.py').read_text())
  data=self.root/'src/data';data.mkdir(parents=True)
  protected=[]
  for folder in ['catalog','archive','incoming','generated-incoming']:
   path=self.root/'src/assets/food'/folder/'candidate.png';path.parent.mkdir(parents=True);path.write_bytes(b'original-png')
   target=path.with_suffix('.webp');target.write_bytes(b'owned-webp');protected.extend([path,target])
  with patch('subprocess.run') as process:
   runpy.run_path(str(script));process.assert_not_called()
  self.assertTrue(all(p.read_bytes()==(b'original-png' if p.suffix=='.png' else b'owned-webp') for p in protected))
 def test_dry_run_is_idempotent_and_does_not_create_runtime_assets_or_change_manifest(self):
  manifest_path=self.root/'catalog/images/manifest.json';manifest_path.parent.mkdir(parents=True)
  manifest={'version':1,'dishes':[{'dishId':'bibimbap','status':'needs-image','sourceType':'missing','reviewStatus':'missing'}]}
  manifest_path.write_text(json.dumps(manifest));before=manifest_path.read_bytes()
  records_path=self.root/'src/data/catalog/records.json';records_path.parent.mkdir(parents=True);records_path.write_text(json.dumps([RECORD]))
  stage_path=self.source.parent/'manifest.json';stage_path.write_text(json.dumps(self.document))
  args=SimpleNamespace(staged_manifest='image-audit/staged-import/manifest.json',apply=False)
  function=MODULE['import_audited'];old_root=function.__globals__['ROOT'];function.__globals__['ROOT']=self.root
  try:
   function(args,self.importer);report=(self.root/'image-audit/results/import-dry-run.json').read_bytes()
   function(args,self.importer);self.assertEqual((self.root/'image-audit/results/import-dry-run.json').read_bytes(),report)
   destination=self.root/'src/assets/food/catalog/bibimbap.webp';destination.parent.mkdir(parents=True);destination.write_bytes(self.output)
   manifest['dishes'][0].update(status='generated-local',localPath=str(destination.relative_to(self.root)),sha256=sha(self.output),sourceSha256=sha(self.raw))
   manifest_path.write_text(json.dumps(manifest))
   function(args,self.importer)
   plan=json.loads((self.root/'image-audit/results/import-dry-run.json').read_text())
   self.assertEqual(plan['dishes'][0]['action'],'unchanged')
   destination.write_bytes(b'user-modified-current-image')
   with self.assertRaisesRegex(ValueError,'pixels differ'):function(args,self.importer)
   self.assertEqual(destination.read_bytes(),b'user-modified-current-image')
   manifest_path.write_bytes(before)
  finally:function.__globals__['ROOT']=old_root
  self.assertEqual(manifest_path.read_bytes(),before)
 def test_complete_dry_run_preserves_protected_images_and_reports_replacement(self):
  self.direct_source();manifest_path=self.root/'catalog/images/manifest.json';manifest_path.parent.mkdir(parents=True)
  records_path=self.root/'src/data/catalog/records.json';records_path.parent.mkdir(parents=True);records_path.write_text(json.dumps([RECORD]))
  (self.source.parent/'manifest.json').write_text(json.dumps(self.document))
  destination=self.root/'src/assets/food/catalog/bibimbap.webp';destination.parent.mkdir(parents=True);destination.write_bytes(b'current-real-pixels')
  args=SimpleNamespace(staged_manifest='image-audit/staged-import/manifest.json',apply=False)
  function=MODULE['import_audited'];old_root=function.__globals__['ROOT'];function.__globals__['ROOT']=self.root
  try:
   for status,action in [('approved','protected'),('temporary','protected'),('needs-replacement','would replace')]:
    manifest_path.write_text(json.dumps({'version':1,'dishes':[dict(dishId='bibimbap',status='licensed-local',sourceType='real',reviewStatus=status,localPath=str(destination.relative_to(self.root)))]}));before=manifest_path.read_bytes()
    function(args,self.importer);plan=json.loads((self.root/'image-audit/results/import-dry-run.json').read_text())
    self.assertEqual(plan['actionCounts'],{action:1});self.assertEqual(plan['dishes'][0]['action'],action)
    self.assertEqual(destination.read_bytes(),b'current-real-pixels');self.assertEqual(manifest_path.read_bytes(),before)
  finally:function.__globals__['ROOT']=old_root
 def test_apply_rerun_does_not_rewrite_pixels_or_add_duplicate_history(self):
  self.direct_source();manifest_path=self.root/'catalog/images/manifest.json';manifest_path.parent.mkdir(parents=True)
  destination=self.root/'src/assets/food/catalog/bibimbap.webp';destination.parent.mkdir(parents=True);destination.write_bytes(b'old-real-photo')
  manifest_path.write_text(json.dumps({'version':1,'dishes':[dict(dishId='bibimbap',status='licensed-local',sourceType='real',reviewStatus='needs-replacement',localPath=str(destination.relative_to(self.root)),creator='Prior photographer',license='CC0-1.0')]}))
  records_path=self.root/'src/data/catalog/records.json';records_path.parent.mkdir(parents=True);records_path.write_text(json.dumps([RECORD]))
  (self.source.parent/'manifest.json').write_text(json.dumps(self.document))
  importer={**self.importer,'country_names':Mock(return_value={'KR':'South Korea'}),'prepare_catalog':Mock()}
  args=SimpleNamespace(staged_manifest='image-audit/staged-import/manifest.json',apply=True)
  function=MODULE['import_audited'];old_root=function.__globals__['ROOT'];function.__globals__['ROOT']=self.root
  try:
   with patch('subprocess.run'):
    function(args,importer);first=manifest_path.read_bytes();first_pixels=destination.read_bytes();first_time=destination.stat().st_mtime_ns
    function(args,importer)
   self.assertEqual(manifest_path.read_bytes(),first);self.assertEqual(destination.read_bytes(),first_pixels);self.assertEqual(destination.stat().st_mtime_ns,first_time)
   entry=json.loads(first)['dishes'][0];self.assertEqual(len(entry['history']),1);self.assertIsNone(entry['creator']);self.assertEqual((self.root/entry['history'][0]['localPath']).read_bytes(),b'old-real-photo')
   plan=json.loads((self.root/'image-audit/results/import-applied.json').read_text());self.assertEqual(plan['actionCounts'],{'unchanged':1})
  finally:function.__globals__['ROOT']=old_root

 def review_document(self, entry, decision='USE_GENERATED'):
  current=self.root/entry['localPath'] if entry.get('localPath') else None
  row=dict(dishId='bibimbap',dishName='Bibimbap',decision=decision,approved=True,promptReviewed=True,
           candidateSourceHash=self.row['sourceHash'],candidateOutputHash=self.row['outputHash'],
           currentImageHash=sha(current.read_bytes()) if current else None,
           selectedRuntimePath='src/assets/food/catalog/bibimbap.webp',reason='User completed visual/cultural review of exact pixels')
  return dict(version=1,catalogCount=1,humanReviewCompleted=True,dishes=[row])
 def reviewed_entry(self):
  target=self.root/'src/assets/food/catalog/bibimbap.webp';target.parent.mkdir(parents=True);target.write_bytes(b'approved-real-pixels')
  return dict(dishId='bibimbap',status='licensed-local',sourceType='real',reviewStatus='approved',localPath=str(target.relative_to(self.root)),creator='Real author',license='CC0-1.0')
 def test_final_replacement_sources_allow_only_explicit_roots_and_two_gap_dishes(self):
  raw=self.root/'image-audit/replacements/final.png';raw.parent.mkdir();raw.write_bytes(self.raw)
  self.source.rename(self.source.with_name('ceviche.webp'))
  self.row.update(dishId='ceviche',dishName='Ceviche',targetFilename='ceviche.webp',targetRelativePath='image-audit/staged-import/ceviche.webp',sourceKind='final-replacement',sourceBatch='replacements',sourceFilename='final.png',sourceRelativePath=str(raw.relative_to(self.root)),sourceArchive=None,sourceArchiveMember=None)
  self.records={'ceviche':{'id':'ceviche','name':'Ceviche'}}
  self.assertEqual(self.validate(),[self.row])
  for key,value in [('sourceKind','batch'),('sourceBatch','nom_batch5'),('sourceFilename','other.png'),('sourceRelativePath','image-audit/other/final.png')]:
   candidate=copy.deepcopy(self.document);candidate['dishes'][0][key]=value
   with self.subTest(key=key),self.assertRaises(ValueError):self.validate(candidate)
  actual=raw.with_name('actual.png');raw.rename(actual);raw.symlink_to(actual)
  with self.assertRaises(ValueError):self.validate()
  raw.unlink();actual.rename(raw)
  candidate=copy.deepcopy(self.document);candidate['dishes'][0].update(dishId='bibimbap',dishName='Bibimbap',targetFilename='bibimbap.webp',targetRelativePath='image-audit/staged-import/bibimbap.webp')
  self.records['bibimbap']=RECORD;(self.source.parent/'bibimbap.webp').write_bytes(self.output)
  with self.assertRaisesRegex(ValueError,'replacement'):self.validate(candidate)
 def test_final_human_decisions_require_complete_unique_ids_and_exact_candidate_approval(self):
  entry=self.reviewed_entry();doc=self.review_document(entry)
  fn=MODULE['validate_review_decisions'];entries={'bibimbap':entry}
  self.assertEqual(fn(doc,[self.row],entries,self.records,self.root)['bibimbap'],doc['dishes'][0])
  for key,value in [('approved',False),('promptReviewed',False),('candidateSourceHash','0'*64),('candidateOutputHash','0'*64),('selectedRuntimePath','src/assets/food/catalog/ramen.webp'),('currentImageHash','0'*64),('dishId','unknown')]:
   bad=copy.deepcopy(doc);bad['dishes'][0][key]=value
   with self.subTest(key=key),self.assertRaises(ValueError):fn(bad,[self.row],entries,self.records,self.root)
  for dishes in [[],doc['dishes']*2]:
   bad=copy.deepcopy(doc);bad['dishes']=dishes
   with self.assertRaises(ValueError):fn(bad,[self.row],entries,self.records,self.root)
 def test_keep_existing_choice_requires_renderable_unchanged_pixels(self):
  entry=self.reviewed_entry();doc=self.review_document(entry,'KEEP_EXISTING');fn=MODULE['validate_review_decisions']
  fn(doc,[self.row],{'bibimbap':entry},self.records,self.root)
  (self.root/entry['localPath']).write_bytes(b'user-edited-current-photo')
  with self.assertRaisesRegex(ValueError,'pixels changed'):fn(doc,[self.row],{'bibimbap':entry},self.records,self.root)
  (self.root/entry['localPath']).write_bytes(b'approved-real-pixels');entry['reviewStatus']='pending-review'
  with self.assertRaisesRegex(ValueError,'renderable'):fn(doc,[self.row],{'bibimbap':entry},self.records,self.root)
 def test_explicit_replacement_approves_exact_pixels_and_preserves_prior_approved_history(self):
  entry=self.reviewed_entry();authorization=self.review_document(entry)['dishes'][0]
  with self.assertRaisesRegex(ValueError,'protected'):
   MODULE['import_generated'](entry,RECORD,{'dishId':'bibimbap','prompt':'Catalog prompt'},self.source,{},self.importer,self.root,audited_provenance=self.row)
  bad=copy.deepcopy(authorization);bad['candidateOutputHash']='0'*64
  with self.assertRaisesRegex(ValueError,'authorization'):
   MODULE['import_generated'](entry,RECORD,{'dishId':'bibimbap','prompt':'Catalog prompt'},self.source,{},self.importer,self.root,audited_provenance=self.row,review_authorization=bad)
  MODULE['import_generated'](entry,RECORD,{'dishId':'bibimbap','prompt':'Catalog prompt'},self.source,{},self.importer,self.root,audited_provenance=self.row,review_authorization=authorization)
  self.assertEqual(entry['reviewStatus'],'approved');self.assertFalse(entry['needsPromptReview']);self.assertTrue(entry['visuallyReviewed'])
  self.assertEqual(entry['history'][0]['reviewStatus'],'approved');self.assertEqual(entry['history'][0]['creator'],'Real author')
  self.assertEqual((self.root/entry['history'][0]['localPath']).read_bytes(),b'approved-real-pixels')
  self.assertIsNone(entry['creator']);self.assertIsNone(entry['generation']['promptUsed'])
 def test_explicit_review_dry_run_and_apply_are_safe_and_rerunnable(self):
  self.direct_source();entry=self.reviewed_entry();doc=self.review_document(entry)
  manifest_path=self.root/'catalog/images/manifest.json';manifest_path.parent.mkdir(parents=True);manifest_path.write_text(json.dumps({'version':1,'dishes':[entry]}))
  records_path=self.root/'src/data/catalog/records.json';records_path.parent.mkdir(parents=True);records_path.write_text(json.dumps([RECORD]))
  (self.source.parent/'manifest.json').write_text(json.dumps(self.document))
  review_path=self.root/'image-audit/results/final-image-decisions.json';review_path.parent.mkdir();review_path.write_text(json.dumps(doc))
  function=MODULE['import_audited'];old_root=function.__globals__['ROOT'];function.__globals__['ROOT']=self.root
  args=SimpleNamespace(staged_manifest='image-audit/staged-import/manifest.json',review_decisions='image-audit/results/final-image-decisions.json',apply=False)
  importer={**self.importer,'country_names':Mock(return_value={'KR':'South Korea'}),'prepare_catalog':Mock()}
  try:
   before=manifest_path.read_bytes();function(args,importer)
   self.assertEqual(manifest_path.read_bytes(),before)
   self.assertEqual(json.loads((review_path.parent/'import-dry-run.json').read_text())['actionCounts'],{'would replace':1})
   args.apply=True
   with patch('subprocess.run'):
    function(args,importer);after=manifest_path.read_bytes();target=self.root/entry['localPath'];mtime=target.stat().st_mtime_ns
    function(args,importer)
   self.assertEqual(manifest_path.read_bytes(),after);self.assertEqual(target.stat().st_mtime_ns,mtime)
   self.assertEqual(json.loads(after)['dishes'][0]['reviewStatus'],'approved')
   self.assertEqual(json.loads((review_path.parent/'import-applied.json').read_text())['actionCounts'],{'unchanged':1})
  finally:function.__globals__['ROOT']=old_root

if __name__=='__main__':unittest.main()
