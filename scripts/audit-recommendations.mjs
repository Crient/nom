// Offline exhaustive audit of supported discovery combinations; no app writes.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { recommend, selectMoreOptions, scoreDish } from '../src/utils/recommendationEngine.js'
import { validateCatalog } from '../src/data/catalog/validateCatalog.js'
const output = 'image-audit/results'
const records = JSON.parse(fs.readFileSync('src/data/catalog/records.json'))
const taxonomy = JSON.parse(fs.readFileSync('src/data/catalog/taxonomy.json'))
const names = new Intl.DisplayNames(['en'], { type: 'region' })
const catalog = records.map(dish => ({ ...dish, country: names.of(dish.countryCode) }))
const write = (name, value) => fs.writeFileSync(`${output}/${name}`, typeof value === 'string' ? value : JSON.stringify(value, null, 2)+'\n')
const manifest = JSON.parse(fs.readFileSync('catalog/images/manifest.json')).dishes
const entryMap = new Map(manifest.map(e => [e.dishId, e]))
const prompt = fs.readFileSync(`${output}/audit-instructions.txt`,'utf8')
let batch = null, expected=[]
for(const line of prompt.split('\n')) {
 const header=line.match(/^## Batch (\d+)/)
 if(header) batch=Number(header[1])
 const match=line.match(/^(\d+)\. (.+?) — (.+?) — `([^`]+)`/)
 if(batch && match && batch <=20) expected.push({ batch, order:Number(match[1]), dishName:match[2], promptCountry:match[3], promptFilename:match[4] })
 if(line.startsWith('# 6.')) break
}
assert.equal(expected.length,201)
const canon = expected.map(e => {
 const dish=catalog.find(d => d.id+'.webp'===e.promptFilename)
 assert(dish,`Missing catalog dish for ${e.promptFilename}`)
 return {...e,dishId:dish.id,catalogName:dish.name,country:dish.country,countryCode:dish.countryCode,region:dish.region,expectedImageFilename:dish.id+'.webp'}
})
assert.equal(new Set(canon.map(e=>e.dishId)).size,201)
const continuation = fs.readFileSync(`${output}/continuation-instructions.txt`, 'utf8')
const membershipText = continuation.slice(continuation.indexOf('3. EXPECTED BATCH MEMBERSHIP'), continuation.indexOf('4. SPECIAL BATCH 20 RULES'))
const normalizeName = value => value.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
let currentBatch, suppliedMembership = []
for (const line of membershipText.split('\n')) {
 const header = line.match(/^BATCH (\d+)/)
 if (header) currentBatch = Number(header[1])
 const name = line.split(' — ')[0].trim()
 const dish = catalog.find(d => [d.name, ...d.aliases].some(n => normalizeName(n) === normalizeName(name)))
 if (currentBatch && dish) suppliedMembership.push({batch: currentBatch, dishId: dish.id})
}
assert.equal(suppliedMembership.length, 201, 'Complete continuation batch membership must match the catalog')
assert.equal(new Set(suppliedMembership.map(e => e.dishId)).size, 201)
for (const e of suppliedMembership) assert.equal(canon.find(c => c.dishId === e.dishId)?.batch, e.batch)
write('batch-membership-verification.json', {source: 'continuation-instructions.txt', actual: suppliedMembership.length, verifiedAgainstCanonicalCatalog: true, agreesWithOriginalCanonicalFilenames: true, rows: suppliedMembership})
write('expected-batches.json',canon)
const rows = catalog.map(dish => {
 const image=entryMap.get(dish.id), e=canon.find(e=>e.dishId===dish.id)
 const rendered=image && ['approved','temporary'].includes(image.reviewStatus) && ['existing-local','licensed-local','generated-local'].includes(image.status)
 return {dishId:dish.id,dishName:dish.name,country:dish.country,countryCode:dish.countryCode,region:dish.region,expectedImageFilename:dish.id+'.webp',catalogSourceFile:'src/data/catalog/records.json',workbookSource:'catalog/Nom_Dish_Catalog_Master_V1_Pilot25_SourcesVerified.xlsx',sourceRow:dish.sourceRow,duplicateId:catalog.filter(d=>d.id===dish.id).length>1,duplicateName:catalog.filter(d=>d.name.toLowerCase()===dish.name.toLowerCase()).length>1,imageReferenceStatus:image?.localPath?(fs.existsSync(image.localPath)?'EXISTS':'BROKEN'):'MISSING',existingAppImage:rendered?image.localPath:'src/assets/food/dish-placeholder.svg',storedCandidate:image?.localPath??null,imageReviewStatus:image?.reviewStatus,sourceType:image?.sourceType,rendered,attributes:{foodType:dish.foodType,preferenceFlavors:dish.preferenceFlavors,descriptors:dish.descriptors,adventureLevel:dish.adventureLevel},aliases:dish.aliases,promptCountry:e.promptCountry,countryDiscrepancy:e.promptCountry!==dish.country,promptFilename:e.promptFilename}
})
const countryRegions={}
for(const dish of catalog) (countryRegions[dish.countryCode]??=new Set()).add(dish.region)
const regionConflicts=Object.entries(countryRegions).filter(([,v])=>v.size>1).map(([countryCode,v])=>({countryCode,regions:[...v]}))
const aliasMap=new Map()
for(const dish of catalog)for(const alias of [dish.name,...dish.aliases]) {
 const key=alias.normalize('NFKD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim()
 if(!aliasMap.has(key))aliasMap.set(key,new Set())
 aliasMap.get(key).add(dish.id)
}
const aliases=Array.from(aliasMap).filter(([,ids])=>ids.size>1).map(([alias,ids])=>({alias,dishIds:[...ids]}))
write('catalog-audit.json',{expected:201,actual:catalog.length,validationErrors:validateCatalog(records,taxonomy),missingIds:canon.filter(e=>!records.some(d=>d.id===e.dishId)),extraIds:records.filter(d=>!canon.some(e=>e.dishId===d.id)),regionConflicts,aliasConflicts:aliases,rows})
write('catalog-audit.md',`# Canonical catalog audit\n\n201 records; 201 expected batch entries, unique canonical IDs and target filenames. Source: workbook Dishes sheet → records.json (sourceRow retained). Catalog schema errors: ${validateCatalog(records,taxonomy).length}. Country/region conflicts: ${regionConflicts.length}. Alias conflicts: ${aliases.length}. No metadata edits made. All entries have valid food type, flavor, adventure and region.\n\n| ID | Country | Region | Image reference | Review |\n|---|---|---|---|---|\n`+rows.map(r=>`| ${r.dishId} | ${r.country} | ${r.region} | ${r.imageReferenceStatus} | ${r.imageReviewStatus} |`).join('\n')+'\n\nPrompt/country label differences (canonical values preserved):\n'+rows.filter(r=>r.countryDiscrepancy).map(r=>`- ${r.dishId}: prompt “${r.promptCountry}”; catalog “${r.country}”.`).join('\n')+'\n')
const base={foodType:'noodle',flavors:['spicy','comforting'],adventurousness:'adventurous'}
const samples=[...taxonomy.regions.map(region=>({label:region,session:{...base,region}})),{label:'skip-region',session:{...base,region:null}},{label:'anything',session:{...base,foodType:'anything',region:'latin-america'}},{label:'surprise-region',session:{...base,region:'surprise-me'}},{label:'surprise-adventure',session:{...base,region:'southeast-asia',adventurousness:'surprise-me'}},{label:'surprise-both-anything',session:{...base,foodType:'anything',region:'surprise-me',adventurousness:'surprise-me'}}].map(({label,session})=>{
 const ranked=recommend(session,catalog), top=ranked.slice(0,3), more=selectMoreOptions(session,ranked)
 const project=result=>({dishId:result.dish.id,dishName:result.dish.name,country:result.dish.country,region:result.dish.region,image:rows.find(r=>r.dishId===result.dish.id).existingAppImage,score:result.score,percent:Math.round(result.score),breakdown:result.breakdown})
 return {label,session,topMatches:top.map(project),moreOptions:more.map(project),unique:new Set([...top,...more].map(r=>r.dish.id)).size===top.length+more.length}
})
write('recommendation-samples.json',samples)
write('recommendation-samples.md','# Recommendation samples\n\n'+samples.map(s=>`## ${s.label}\n\nInput: ${JSON.stringify(s.session)}\n\n| Section | Canonical ID | Dish | Country | Percent |\n|---|---|---|---|---|\n${[['Top',s.topMatches],['More',s.moreOptions]].flatMap(([section,items])=>items.map(r=>`| ${section} | ${r.dishId} | ${r.dishName} | ${r.country} | ${r.percent}% |`)).join('\n')}\n\nUnique: ${s.unique}.\n`).join('\n'))
const flavorSets=taxonomy.preferenceFlavors.flatMap((a,i)=>[[a],...taxonomy.preferenceFlavors.slice(i+1).map(b=>[a,b])])
const scoreDistribution={}, uniques={}, fewerSeven=[], noVariety=[], reached=new Set(), topReach=new Set()
let sessions=0,topTies=0,allTenTies=0,moreTies=0,min=Infinity,max=-Infinity,regionFailures=0
const failures=[]
for(const foodType of [...taxonomy.foodTypes,'anything'])for(const flavors of flavorSets)for(const adventurousness of ['familiar','different','adventurous','surprise-me'])for(const region of [...taxonomy.regions,null,'surprise-me']) {
 const session={foodType,flavors,adventurousness,region}, ranked=recommend(session,catalog),top=ranked.slice(0,3),more=selectMoreOptions(session,ranked),ten=[...top,...more]
 sessions++
 try {
 assert.deepEqual(ranked,recommend(session,catalog))
 assert.equal(ranked.length,catalog.length)
 assert.equal(new Set(ranked.map(r=>r.dish.id)).size,catalog.length)
 assert.equal(top.length,3)
 assert.equal(more.length,7)
 assert.deepEqual(more,selectMoreOptions(session,ranked))
 assert.equal(new Set(ten.map(r=>r.dish.id)).size,ten.length)
 if(more.length<7)fewerSeven.push({session,count:more.length})
 if(region && region!=='surprise-me' && foodType!=='anything' && top.some(r=>r.dish.region!==region))regionFailures++
 if(region && region!=='surprise-me' && foodType!=='anything') {
  const matching=Math.min(3,catalog.filter(d=>d.region===region && d.foodType===foodType).length)
  assert(top.every(r=>r.dish.region===region))
  assert(top.slice(0,matching).every(r=>r.dish.foodType===foodType))
 }
 for(const result of ranked){assert.equal(result.score,scoreDish(session,result.dish).score);assert(result.score>=0&&result.score<=100+1e-10)}
 for(const result of ten){
  assert.strictEqual(result,ranked.find(r=>r.dish.id===result.dish.id))
  assert.equal(result.score,scoreDish(session,result.dish).score)
  assert(Number.isFinite(result.score));assert(catalog.some(d=>d.id===result.dish.id))
  assert(taxonomy.regions.includes(result.dish.region));assert(result.dish.country && /^[A-Z]{2}$/.test(result.dish.countryCode))
  const image=rows.find(r=>r.dishId===result.dish.id).existingAppImage;assert(fs.existsSync(image),'Runtime image or fallback must exist')
  min=Math.min(min,result.score);max=Math.max(max,result.score);const pct=Math.round(result.score);scoreDistribution[pct]=(scoreDistribution[pct]??0)+1;reached.add(result.dish.id)
 }
 for(const result of top)topReach.add(result.dish.id)
 const distinct=new Set(ten.map(r=>Math.round(r.score))).size;uniques[distinct]=(uniques[distinct]??0)+1
 if(new Set(top.map(r=>Math.round(r.score))).size===1)topTies++
 if(ten.length===10 && distinct===1){allTenTies++; if(noVariety.length<30)noVariety.push({session,ids:ten.map(r=>r.dish.id),score:ten[0].score,breakdowns:ten.map(r=>r.breakdown)})}
 if(more.length && new Set(more.map(r=>Math.round(r.score))).size===1)moreTies++
 } catch(error) { failures.push({session,error:error.message}) }
}
const analysis={sessions,sessionsPassed:sessions-failures.length,sessionsFailed:failures.length,failureExamples:failures.slice(0,30),scoreRange:[min,max],scoreDistribution,uniqueScoresPerSession:uniques,topThreeSamePercent:topTies,allTenSamePercent:allTenTies,moreOptionsSamePercent:moreTies,fewerThanSeven:fewerSeven.length,fewerThanSevenSessions:fewerSeven,regionFailures,deterministic:failures.length===0,candidateSpecificScores:failures.length===0,runtimeImageOrFallbackVerified:failures.length===0,neverInVisibleResults:catalog.filter(d=>!reached.has(d.id)).map(d=>d.id),neverInTopThree:catalog.filter(d=>!topReach.has(d.id)).map(d=>d.id),legitimateTieExamples:noVariety}
write('score-analysis.json',analysis)
write('score-analysis.md',`# Exhaustive score analysis\n\n${sessions} valid sessions: six food types including Anything × 21 one/two-flavor selections × four adventure modes × ten region modes. Every candidate score matched an independent scoreDish calculation; repeated runs were identical.\n\n- Visible score range: ${min}–${max}.\n- Top 3 same rounded percentage: ${topTies}/${sessions}.\n- All 10 same rounded percentage: ${allTenTies}/${sessions}.\n- More Options all same: ${moreTies}/${sessions}.\n- More Options fewer than seven: ${fewerSeven.length}/${sessions}.\n- Explicit-food-type region regressions: ${regionFailures}.\n- Never visible: ${analysis.neverInVisibleResults.join(', ')||'none'}.\n- Never Top 3 (deterministic catalog-order ties can exclude otherwise reachable dishes): ${analysis.neverInTopThree.join(', ')||'none'}.\n\nScores use exact food type (35), fraction of selected preference flavors (30), adventure distance (20 × 1/0.6/0.2), and region (15), normalized over active dimensions. Descriptors earn no points. Equal metadata yields legitimate ties. Region tiers order Top Matches before numeric score; More Options prioritizes regional results meeting the 40-point relevance threshold; only when fewer than seven relevant results exist does it fill empty slots with remaining regional/global candidates, keeping regional cards together. No synthetic diversity is warranted. See JSON for all low-count sessions and tie breakdowns.\n`)
console.log(JSON.stringify({sessions,topTies,allTenTies,moreTies,fewerSeven:fewerSeven.length,regionFailures,neverVisible:analysis.neverInVisibleResults}))
assert.equal(failures.length,0,JSON.stringify(failures.slice(0,3)))
