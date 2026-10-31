import { parse } from './parser';
import { generate } from './subdivide';
import { tutte } from './tutte';
import { pack } from './packing';
import { EscherError } from './types';
self.onmessage=(event:MessageEvent<{id:number;source:string;depth:number;method:string;rule?:string}>)=>{
  const {id,source,depth,method,rule}=event.data;
  try {
    const program=parse(source), tiling=generate(program,rule?1:depth,rule??program.start),mesh=tiling.levels.at(-1)!;
    const drawing=method==='packing'?pack(mesh):tutte(mesh);
    self.postMessage({id,program,tiling,drawing});
  } catch(error) {self.postMessage({id,error:(error as Error).message,line:error instanceof EscherError?error.line:undefined});}
};
