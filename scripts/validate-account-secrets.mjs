import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnv } from 'vite'

const mode = process.argv.includes('--mode') ? process.argv[process.argv.indexOf('--mode') + 1] : 'production'
const problems = []
const privileged = /sb_secret_[A-Za-z0-9_-]{16,}|eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/g
const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
for (const key of Object.keys(env)) if (/^VITE_.*(?:SECRET|SERVICE_ROLE|PRIVATE_KEY)/i.test(key) && env[key]) problems.push(`Privileged browser environment variable: ${key}`)
function inspect(dir, browser, generated = false) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = `${dir}/${entry.name}`
    if (entry.isDirectory()) { if (!['node_modules', 'vendor', '.git', '.vite'].includes(entry.name)) inspect(file, browser, generated); continue }
    if (!entry.isFile() || !/\.(?:[cm]?js|jsx|ts|tsx|html)$/.test(file)) continue
    if (!generated && (/\.(?:test|spec)\./.test(file) || file.includes('/test/'))) continue
    const source = readFileSync(file, 'utf8')
    if (browser && /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/.test(source)) problems.push(`Server credential referenced in browser source: ${file}`)
    for (const match of source.matchAll(privileged)) {
      if (match[0].startsWith('sb_secret_')) { problems.push(`Hardcoded privileged value in ${file}`); break }
      try { if (JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url')).role === 'service_role') { problems.push(`Hardcoded privileged JWT in ${file}`); break } } catch { /* Not a service-role JWT. */ }
    }
  }
}
inspect('src', true); inspect('server', false); inspect('api', false)
if (process.argv.includes('--dist')) inspect(resolve('dist'), true, true)
if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1 }
else console.log('Account credential boundary passed (no privileged browser env, references, or embedded keys).')
