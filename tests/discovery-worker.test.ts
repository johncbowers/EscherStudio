import {beforeAll,afterAll,it,expect,vi} from 'vitest';
import {examples} from '../src/examples';
const messages:any[]=[];const endpoint={onmessage:null as null|((event:{data:unknown})=>void),postMessage:(value:unknown)=>messages.push(value)};
beforeAll(async()=>{vi.stubGlobal('self',endpoint);await import('../src/engine/discovery-worker');});afterAll(()=>{vi.unstubAllGlobals();});
it('streams progress and returns a reproducible experiment snapshot',()=>{
 const source=examples[1].source;endpoint.onmessage!({data:{id:7,task:'experiment',source,options:{seedDepth:1,target:'auto',collar:-1,refinements:1,boundaries:['equal']}}});
 expect(messages.some(x=>x.id===7&&x.progress)).toBe(true);expect(messages.at(-1)).toMatchObject({id:7,task:'experiment',result:{source,target:expect.any(String),rows:expect.any(Array)}});
});
it('returns geometry coordinates and numerical status',()=>{endpoint.onmessage!({data:{id:8,task:'fit',source:examples[1].source,options:{iterations:20,attempts:1}}});expect(messages.at(-1)).toMatchObject({id:8,task:'fit',result:{passed:true,tiles:expect.any(Array)}});});
it('reports unsupported tasks as structured errors',()=>{endpoint.onmessage!({data:{id:9,task:'unknown',source:examples[1].source,options:{}}});expect(messages.at(-1)).toMatchObject({id:9,error:'Unknown discovery task.'});});
it('reports invalid scripts without attempting numerical work',()=>{endpoint.onmessage!({data:{id:10,task:'fit',source:'broken;',options:{}}});expect(messages.at(-1)).toMatchObject({id:10,error:expect.stringContaining('Unknown command')});});
