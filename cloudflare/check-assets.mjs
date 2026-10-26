import {readdir,stat} from 'node:fs/promises';
import {join} from 'node:path';
const files=[];
async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){const path=join(dir,item.name);if(item.isDirectory())await walk(path);else if(item.isFile())files.push({path,bytes:(await stat(path)).size})}}
await walk('dist');
if(files.length>20000||files.some(f=>f.bytes>25*1024*1024))throw Error('Cloudflare Free asset limit exceeded');
console.log(JSON.stringify({files:files.length,largest:files.sort((a,b)=>b.bytes-a.bytes)[0],freeAssetLimits:'PASS'}));
