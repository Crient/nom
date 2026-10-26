import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {loadEnv} from 'vite';

const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
if(process.env.CLOUDFLARE_ACCOUNT_ID!=='07f48608f6c0c2e51553c6f0d53418ea'||config.name!=='leng-nom-preview-20261026')throw Error('Only the existing approved Nom Preview account/project is allowed.');
if(process.env.CLOUDFLARE_ENV==='production'||process.env.VERCEL_ENV==='production')throw Error('Production is outside this preview command.');
const publicEnv=loadEnv('production',process.cwd(),'VITE_');
if(publicEnv.VITE_SUPABASE_URL!=='https://iwamwxsosrhxsdcsuoiu.supabase.co'||!publicEnv.VITE_SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_'))throw Error('Matching public Nom settings are required before deploying.');

// Wrangler replaces plain dashboard vars on deploy. Declare public values in
// the Preview override; the encrypted server secret stays managed by Cloudflare.
const vars={VITE_SUPABASE_URL:publicEnv.VITE_SUPABASE_URL,VITE_SUPABASE_PUBLISHABLE_KEY:publicEnv.VITE_SUPABASE_PUBLISHABLE_KEY};
if(Object.values(vars).some(value=>value.includes('sb_secret_')))throw Error('Privileged credentials are forbidden in the deployment config.');
config.env={...config.env,preview:{...config.env?.preview,vars}};
config.pages_build_output_dir=resolve('dist');
await mkdir('.cloudflare-build',{recursive:true});
const generatedRoot=resolve('.cloudflare-build');
const generated=resolve(generatedRoot,'wrangler.jsonc');
await writeFile(generated,JSON.stringify(config,null,2)+'\n',{mode:0o600});
if(process.argv.includes('--check')){console.log(JSON.stringify({project:config.name,environment:'preview',publicBindingNames:Object.keys(vars),serverSecretInFile:false}));process.exit(0);}
// Pages discovers wrangler.jsonc from cwd; custom --config paths are unsupported.
const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','pages','deploy',resolve('dist'),'--cwd',generatedRoot,'--project-name',config.name,'--branch','migration-20261026','--commit-dirty','true'],{stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
process.exit(r.status??1);
