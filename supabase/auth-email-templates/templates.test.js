import {readFileSync} from 'node:fs'
import {describe,it,expect} from 'vitest'
const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8')
const subjects=JSON.parse(read('subjects.json')),patch=JSON.parse(read('config-patch.json'))
describe('reviewed Nom Auth templates',()=>{
  it.each(Object.keys(subjects))('brands %s without vendor footers, secrets, or remote assets',name=>{
    const html=read(name+'.html')
    expect(html).toContain('Nom');expect(subjects[name]).toContain('Nom')
    expect(html).not.toMatch(/Supabase|supabase\.co|Vercel|localhost|—|<script|<img|sb_secret_|GOCSPX/i)
    const suffix=name.replaceAll('-','_')
    expect(patch['mailer_subjects_'+suffix]).toBe(subjects[name])
    expect(patch['mailer_templates_'+suffix+'_content']).toBe(html)
  })
  it('preserves token-aware links and keeps reauthentication as a code',()=>{
    for(const name of ['confirmation','recovery','email-change','invite','magic-link'])expect(read(name+'.html')).toContain('href="{{ .ConfirmationURL }}"')
    expect(read('reauthentication.html')).toContain('{{ .Token }}')
    expect(subjects.confirmation).toBe('Confirm your Nom account');expect(subjects.recovery).toBe('Reset your Nom password')
    expect(Object.keys(patch).every(k=>k.startsWith('mailer_subjects_')||k.startsWith('mailer_templates_'))).toBe(true)
  })
})
