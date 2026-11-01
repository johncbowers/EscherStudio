import {it,expect} from 'vitest';
import {examples} from '../src/examples';
import {parse} from '../src/engine/parser';
import {generate} from '../src/engine/subdivide';
import {pack} from '../src/engine/packing';
import {MAX_DEPTH,MAX_CIRCLES,MAX_SEED_DEPTH,MAX_REFINEMENTS} from '../src/engine/limits';
import {validEntry} from '../src/engine/notebook';
it('accepts the extended depth range without removing combinatorial size checks',()=>{
 const source=`tile Identity(A,B,C) { child Identity(A,B,C); } depth ${MAX_DEPTH};`;
 const p=parse(source);expect(generate(p).levels).toHaveLength(MAX_DEPTH+1);
 expect(()=>parse(source.replace(`depth ${MAX_DEPTH}`,`depth ${MAX_DEPTH+1}`))).toThrow(/Depth/);
 expect(()=>generate(p,MAX_DEPTH+1)).toThrow(/Depth/);
});
it('rejects an oversized packing before creating its triangulation',()=>{
 expect(()=>pack({vertexCount:MAX_CIRCLES+1,tiles:[],edges:[],boundary:[]})).toThrow(/50,000 circles.*50,001/);
});
it('packs a grid beyond the previous circle budget with the same accuracy tolerances',()=>{
 const mesh=generate(parse(examples[1].source),6).levels[6],drawing=pack(mesh);
 expect(drawing.points).toHaveLength(8321);expect(drawing.converged).toBe(true);
 expect(drawing.residual).toBeLessThan(1e-8);expect(drawing.tangency!).toBeLessThan(1e-6);
});
it('restores notebooks using the new discovery ranges',()=>{
 expect(validEntry({id:'extended',title:'Larger experiment',kind:'experiment',source:examples[0].source,createdAt:'2026-10-31T12:00:00Z',options:{seedDepth:MAX_SEED_DEPTH,target:'auto',collar:-1,refinements:MAX_REFINEMENTS,boundaries:['equal']}})).toBe(true);
});
