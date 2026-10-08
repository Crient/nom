import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const scanner = fileURLToPath(new URL('./validate-account-secrets.mjs', import.meta.url))
const fixtures = []
function fixture(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'nom-secret-scan-')); fixtures.push(root)
  for (const dir of ['src', 'shared', 'server', 'api', 'dist']) mkdirSync(join(root, dir))
  for (const [path, content] of Object.entries(files)) {
    const target = join(root, path); mkdirSync(join(target, '..'), { recursive: true }); writeFileSync(target, content)
  }
  return root
}
function scan(root) {
  // Do not inherit credentials or local project env into synthetic fixtures.
  return spawnSync(process.execPath, [scanner, '--dist'], { cwd: root, encoding: 'utf8', env: { PATH: process.env.PATH } })
}
afterEach(() => { for (const root of fixtures.splice(0)) rmSync(root, { recursive: true, force: true }) })
describe('account credential scanner', () => {
  it('accepts safe emitted assets and ordinary public variable references', () => {
    const result = scan(fixture({
      'dist/assets/nested/app.js': 'const client = { url: import.meta.env.VITE_SUPABASE_URL, key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY };',
      'dist/index.html': '<script src="/assets/nested/app.js"></script>',
      'server/config.js': 'const secret = process.env.SUPABASE_SECRET_KEY;',
    }))
    expect(result.status).toBe(0)
  })
  it.each(['dist/assets/nested/app.js', 'dist/catalog/chunk.mjs', 'dist/test/asset.test.js'])('rejects embedded secrets in %s without printing values', path => {
    const secret = `sb_secret_${'syntheticfixture'.repeat(3)}`
    const result = scan(fixture({ [path]: `const key = '${secret}';` }))
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(path)
    expect(result.stderr).not.toContain(secret)
    expect(result.stdout).not.toContain(secret)
  })
  it('rejects service-role JWTs in built chunks without disclosing them', () => {
    const jwt = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
      Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url'), 'syntheticsignatureonly'].join('.')
    const result = scan(fixture({ 'dist/assets/auth.js': `const token = '${jwt}'` }))
    expect(result.status).toBe(1); expect(result.stderr).toContain('privileged JWT'); expect(result.stderr).not.toContain(jwt)
  })
  it('retains vendor exclusions and skips binary assets', () => {
    const secret = `sb_secret_${'syntheticfixture'.repeat(3)}`
    const result = scan(fixture({ 'dist/vendor/sample.js': secret, 'dist/node_modules/sample/index.js': secret,
      'dist/assets/picture.png': secret, 'src/test/accountFixtures.js': secret }))
    expect(result.status).toBe(0)
  })
  it('rejects browser references to privileged server variables in built assets', () => {
    const result = scan(fixture({ 'dist/assets/config.js': 'const key = process.env.SUPABASE_SERVICE_ROLE_KEY;' }))
    expect(result.status).toBe(1); expect(result.stderr).toContain('Server credential referenced')
  })
})
