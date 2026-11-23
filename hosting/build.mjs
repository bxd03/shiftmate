import { build } from 'esbuild';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

await mkdir('dist/signup', { recursive: true });
const shell = await readFile('../public/shiftmate-shell.html', 'utf8');
const page = (content) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ShiftMate · Warehouse workforce</title><link rel="stylesheet" href="/styles.css"><link rel="icon" href="/favicon.svg"></head><body>${content}</body></html>`;
await Promise.all(['styles.css','app.js','favicon.svg'].map(file => copyFile('../public/'+file,'dist/'+file)));
await writeFile('dist/signup/index.html', page(`<div data-shiftmate-mode="signup">${shell}</div><script src="/app.js"></script>`));
await writeFile('dist/index.html', page(await readFile('login.html','utf8')));
await build({entryPoints:['login.mjs'],outfile:'dist/login.js',bundle:true,platform:'browser',format:'esm',loader:{'.html':'text'},target:'es2022'});
await build({
  entryPoints:['api.mjs'], outfile:'functions/api.mjs', bundle:true,
  platform:'node', format:'esm', packages:'external',
  plugins:[{ name:'shiftmate-storage', setup(builder) {
    builder.onResolve({filter:/\/lib\/shiftmate-api$/}, () => ({path:resolve('runtime.mjs')}));
  }}]
});
