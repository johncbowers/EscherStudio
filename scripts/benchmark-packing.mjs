import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
await mkdir('work',{recursive:true});
await build({entryPoints:['benchmarks/packing.ts'],outfile:'work/packing-benchmark.mjs',bundle:true,platform:'node',format:'esm'});
const {report}=await import(pathToFileURL(resolve('work/packing-benchmark.mjs')).href);
await writeFile('work/packing-benchmark.json',JSON.stringify(report,null,2)+'\n');
