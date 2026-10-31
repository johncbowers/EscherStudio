import {beforeAll,afterAll,it,expect,vi} from 'vitest';
import {examples} from '../src/examples';
const messages:any[]=[];
const endpoint={onmessage:null as null|((event:{data:unknown})=>void),postMessage:(value:unknown)=>messages.push(value)};
beforeAll(async()=>{vi.stubGlobal('self',endpoint);await import('../src/engine/worker');});
afterAll(()=>{vi.unstubAllGlobals();});
it('returns a complete recursive drawing with request identity',()=>{
  endpoint.onmessage!({data:{id:21,source:examples[0].source,depth:3,method:'tutte'}});
  const response=messages.at(-1);expect(response.id).toBe(21);expect(response.tiling.levels[3].tiles).toHaveLength(64);expect(response.drawing.converged).toBe(true);
});
it('draws the requested single subdivision independently of depth',()=>{
  endpoint.onmessage!({data:{id:22,source:examples[3].source,depth:5,method:'packing',rule:'Teal'}});
  const response=messages.at(-1);expect(response.tiling.levels).toHaveLength(2);expect(response.tiling.levels[0].tiles[0].type).toBe('Teal');expect(response.drawing.radii).toHaveLength(13);
});
it('returns structured diagnostics instead of dropping invalid requests',()=>{
  endpoint.onmessage!({data:{id:23,source:'# header\nbad;',depth:3,method:'tutte'}});
  expect(messages.at(-1)).toMatchObject({id:23,line:2,error:expect.stringContaining('Unknown command')});
});
