import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const script = fileURLToPath(new URL('./ship.sh', import.meta.url)), fixtures = []
const migration = 'supabase/migrations/202610060001_nom_accounts.sql', sqlTest = 'supabase/tests/accounts_rls.sql'
function run(root, command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' })
  if (result.error) throw result.error
  return result
}
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'nom-ship-')); fixtures.push(root)
  run(root, 'git', ['init', '-b', 'main']); run(root, 'git', ['config', 'user.name', 'Fixture'])
  run(root, 'git', ['config', 'user.email', 'fixture@example.invalid'])
  writeFileSync(join(root, '.gitignore'), '.env\n.env.*\n!.env.example\nnode_modules/\ndist/\n')
  run(root, 'git', ['add', '.gitignore']); run(root, 'git', ['commit', '-m', 'Fixture baseline'])
  const files = { [migration]: '-- migration', [sqlTest]: '-- isolation tests',
    'supabase/config.toml': 'local = true', 'supabase/.temp/state': 'local CLI state', 'supabase/.env': 'LOCAL_ONLY=true',
    'supabase/notes.txt': 'development notes', '.env.local': 'LOCAL_ONLY=true', '.env.example': 'VITE_SUPABASE_URL=',
    'docs/account-stabilization-validation/report.md': 'Validation', 'docs/account-stabilization-validation/debug.txt': 'Development',
    'scratch.txt': 'Unrelated development artifact' }
  for (const dir of ['src', 'api', 'server', 'shared', 'public', 'scripts']) files[`${dir}/fixture.js`] = 'export const safe = true;'
  for (const file of ['package.json', 'package-lock.json', 'vite.config.js', 'vercel.json', 'index.html']) files[file] = '{}'
  for (const [path, content] of Object.entries(files)) {
    const target = join(root, path); mkdirSync(join(target, '..'), { recursive: true }); writeFileSync(target, content)
  }
  return root
}
afterEach(() => { for (const root of fixtures.splice(0)) rmSync(root, { recursive: true, force: true }) })
describe('ship packaging', () => {
  it('dry runs the actual staging paths including SQL without changing index or HEAD', () => {
    const root = fixture(), head = run(root, 'git', ['rev-parse', 'HEAD']).stdout
    const status = run(root, 'git', ['status', '--porcelain']).stdout
    const result = run(root, 'bash', [script, '--dry-run'])
    expect(result.status).toBe(0)
    for (const path of [migration, sqlTest, '.env.example', 'src/fixture.js', 'docs/account-stabilization-validation/report.md']) expect(result.stdout).toContain(path)
    for (const path of ['supabase/config.toml', 'supabase/.temp/state', 'supabase/.env', '.env.local', 'supabase/notes.txt', 'scratch.txt', 'debug.txt']) expect(result.stdout).not.toContain(path)
    expect(run(root, 'git', ['rev-parse', 'HEAD']).stdout).toBe(head)
    expect(run(root, 'git', ['diff', '--cached', '--name-only']).stdout).toBe('')
    expect(run(root, 'git', ['status', '--porcelain']).stdout).toBe(status)
  })
  it.each([migration, sqlTest])('stops before staging when required artifact %s is missing', path => {
    const root = fixture(); unlinkSync(join(root, path))
    const result = run(root, 'bash', [script, 'Must not commit'])
    expect(result.status).toBe(1); expect(result.stderr).toContain(path)
    expect(run(root, 'git', ['diff', '--cached', '--name-only']).stdout).toBe('')
  })
})
