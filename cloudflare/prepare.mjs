import {writeFile} from 'node:fs/promises';
await writeFile('dist/_headers', '/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n');
await writeFile('dist/_redirects', '/* /index.html 200\n');
await writeFile('dist/_worker.js', `export {default} from '../cloudflare/worker.js';\n`);
await writeFile('dist/_routes.json', JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
