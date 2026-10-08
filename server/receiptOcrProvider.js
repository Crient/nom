// Raw image/text remain in request memory only. No bucket, filesystem or logs.
export function createReceiptOcrProvider({ apiKey, fetchImpl = globalThis.fetch } = {}) {
  return { configured: Boolean(apiKey), async analyze(image) {
    if (!apiKey) throw Object.assign(new Error('OCR unavailable'), { code: 'provider_not_configured' })
    try {
      const response = await fetchImpl('https://vision.googleapis.com/v1/images:annotate', {
        method:'POST', headers:{'Content-Type':'application/json','X-Goog-Api-Key':apiKey}, redirect:'error', signal:AbortSignal.timeout(15000),
        body:JSON.stringify({requests:[{image:{content:image},features:[{type:'DOCUMENT_TEXT_DETECTION'}]}]}) })
      if (!response.ok) throw new Error('Provider failed')
      const body = await response.json(), result = body.responses?.[0]
      if (!result || result.error) throw new Error('Provider failed')
      const annotation = result.fullTextAnnotation
      const confidences = (annotation?.pages ?? []).flatMap(p => (p.blocks ?? []).flatMap(b => (b.paragraphs ?? []).flatMap(p => (p.words ?? []).map(w => w.confidence))))
        .filter(Number.isFinite)
      return { text:annotation?.text ?? '',confidence:confidences.length ? confidences.reduce((a,b)=>a+b,0)/confidences.length : 0 }
    } catch { throw Object.assign(new Error('Receipt analysis failed'),{code:'provider_error'}) }
  } }
}

export function decodeReceiptUpload(upload) {
  if (!upload || !['image/jpeg','image/png','image/webp'].includes(upload.type) || typeof upload.base64 !== 'string' || upload.base64.length > 2800000
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(upload.base64)) throw Object.assign(new Error('Invalid receipt'),{code:'upload_error'})
  const bytes = Buffer.from(upload.base64,'base64')
  if (!bytes.length || bytes.length > 2_000_000) throw Object.assign(new Error('Invalid receipt'),{code:'upload_error'})
  const jpeg = bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff
  const png = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
  const webp = bytes.subarray(0,4).toString()==='RIFF' && bytes.subarray(8,12).toString()==='WEBP'
  if (!(upload.type==='image/jpeg'&&jpeg || upload.type==='image/png'&&png || upload.type==='image/webp'&&webp)) throw Object.assign(new Error('Invalid receipt'),{code:'upload_error'})
  return bytes
}
