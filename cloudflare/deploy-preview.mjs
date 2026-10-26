import {readFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';
const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
if(!process.env.CLOUDFLARE_ACCOUNT_ID)throw Error('Set CLOUDFLARE_ACCOUNT_ID to the verified free account before publishing.');
const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','pages','deploy','dist','--project-name',config.name,'--branch','migration-20261026','--commit-dirty','true'],{stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});process.exit(r.status??1);
