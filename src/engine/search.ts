import { type Program } from './types';
import { validate, parse } from './parser';
import { generate } from './subdivide';
import { fitGeometry, type GeometryFit } from './geometry';
import { serialize } from './discovery';
export interface SearchCandidate {id:number;mutation:string;source:string;residual:number;passed:boolean;issues:string[];}
export interface SearchResult {baseline:{residual:number;passed:boolean}|null;source:string;seed:number;tried:number;valid:number;rejected:Record<string,number>;candidates:SearchCandidate[];}
export function searchRules(program:Program,options:{seed:number;trials:number},progress?:(message:string)=>void):SearchResult {
 if(!Number.isSafeInteger(options.seed)||options.seed<0||options.seed>4294967295)throw new Error('Search seed must be an integer from 0 to 4294967295.');
 const mutations:{type:string;child:number;offset?:number;replace?:string;label:string}[]=[];
 for(const rule of Object.values(program.rules))rule.children.forEach((child,i)=>{
  for(let offset=1;offset<child.vertices.length;offset++)mutations.push({type:rule.name,child:i,offset,label:`${rule.name} child ${i}: rotate correspondence by ${offset}`});
  for(const other of Object.values(program.rules))if(other.name!==child.type&&other.vertices.length===child.vertices.length)mutations.push({type:rule.name,child:i,replace:other.name,label:`${rule.name} child ${i}: use ${other.name}`});
 });
 let state=(options.seed>>>0)||1;const random=()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296;};
 for(let i=mutations.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[mutations[i],mutations[j]]=[mutations[j],mutations[i]];}
 progress?.('Fitting the starting rule for comparison…');let baseline:SearchResult['baseline']=null;try{const fit=fitGeometry(program,{iterations:160,attempts:1});baseline={residual:fit.residual,passed:fit.passed};}catch{}
 const result:SearchResult={source:serialize(program),baseline,seed:options.seed,tried:0,valid:0,rejected:{},candidates:[]};
 const trials=Math.min(60,Math.max(1,Math.floor(options.trials)));
 for(const mutation of mutations.slice(0,trials)) {
  result.tried++;progress?.(`Rule search · ${result.tried}/${Math.min(trials,mutations.length)} trials · ${result.valid} recursively valid`);
  const p=parse(serialize(program)),child=p.rules[mutation.type].children[mutation.child];
  if(mutation.offset)child.vertices=[...child.vertices.slice(mutation.offset),...child.vertices.slice(0,mutation.offset)];
  if(mutation.replace)child.type=mutation.replace;
  try{validate(p);generate(p,3);}catch(e){const message=(e as Error).message.replace(/ at .*?:/,':');result.rejected[message]=(result.rejected[message]??0)+1;continue;}
  result.valid++;let fit:GeometryFit;
  try{fit=fitGeometry(p,{iterations:160,attempts:1});}
  catch(e){const reason=`Fit unavailable: ${(e as Error).message}`;result.rejected[reason]=(result.rejected[reason]??0)+1;continue;}
  result.candidates.push({id:result.tried,mutation:mutation.label,source:serialize(p),residual:fit.residual,passed:fit.passed,issues:fit.issues});
 }
 result.candidates.sort((a,b)=>Number(b.passed)-Number(a.passed)||a.residual-b.residual);return result;
}
