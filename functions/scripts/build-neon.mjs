import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(root+'dist-neon',{recursive:true});
await build({ entryPoints:[root+'neon/index.ts'], outfile:root+'dist-neon/index.mjs', bundle:true,
  platform:'node',target:'node24',format:'esm', sourcemap:false,
  banner:{js:"import{createRequire as ___cr}from'node:module';import{fileURLToPath as ___f}from'node:url';import{dirname as ___d}from'node:path';const require=___cr(import.meta.url);const __filename=___f(import.meta.url);const __dirname=___d(__filename);"},
});
execFileSync('python3',['-c',"import sys,zipfile; z=zipfile.ZipFile(sys.argv[1],'w',zipfile.ZIP_DEFLATED); z.write(sys.argv[2],'index.mjs'); z.close()",root+'dist-neon/function.zip',root+'dist-neon/index.mjs']);
console.log('Built functions/dist-neon/index.mjs and function.zip for Node24 (no credentials included)');
