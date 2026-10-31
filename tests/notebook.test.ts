import {it,expect} from 'vitest';
import {decodeNotebook,validEntry} from '../src/engine/notebook';
import {examples} from '../src/examples';
const entry={id:'test',title:'Pinwheel experiment',kind:'experiment',source:examples.find(e=>e.name==='Pinwheel')!.source,options:{seedDepth:2,target:'auto',collar:-1,refinements:2,boundaries:['equal','wave']},createdAt:'2026-10-31T03:49:26.949Z'};
it('round trips notebook sources and scientific parameters',()=>{expect(decodeNotebook(JSON.stringify({schema:1,entries:[entry]}))).toEqual([entry]);});
it('imports experiment configuration without trusting embedded numerical results',()=>{const entries=decodeNotebook(JSON.stringify({schema:1,source:entry.source,options:entry.options,result:{claimedProof:true}}));expect(entries[0].source).toBe(entry.source);expect(entries[0]).not.toHaveProperty('result');});
it('rejects malformed or oversized inputs and invalid scripts',()=>{expect(()=>decodeNotebook('{')).toThrow();expect(()=>decodeNotebook('x'.repeat(2000001))).toThrow(/2 MB/);expect(()=>decodeNotebook(JSON.stringify({schema:1,entries:[{...entry,source:'broken;'}]}))).toThrow();});
it('validates bounded parameters before restoring them',()=>{expect(validEntry({...entry,options:{...entry.options,refinements:100}})).toBe(false);expect(()=>decodeNotebook(JSON.stringify({schema:1,entries:[{...entry,options:{...entry.options,collar:-10}}]}))).toThrow();});
