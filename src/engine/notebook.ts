import {MAX_SEED_DEPTH,MAX_REFINEMENTS} from './limits';
import {parse} from './parser';
import {type ExperimentOptions} from './discovery';
export interface Entry {id:string;title:string;kind:string;source:string;options:ExperimentOptions;createdAt:string;}
export function validEntry(value:unknown):value is Entry {
 if(!value||typeof value!=='object')return false;const e=value as Entry,o=e.options;
 return typeof e.id==='string'&&typeof e.title==='string'&&e.title.length<500&&typeof e.kind==='string'&&typeof e.createdAt==='string'&&Number.isFinite(Date.parse(e.createdAt))&&typeof e.source==='string'&&e.source.length<=100000&&!!o&&Number.isInteger(o.seedDepth)&&o.seedDepth>=0&&o.seedDepth<=MAX_SEED_DEPTH&&typeof o.target==='string'&&o.target.length<100&&Number.isInteger(o.collar)&&o.collar>=-1&&o.collar<=20&&Number.isInteger(o.refinements)&&o.refinements>=0&&o.refinements<=MAX_REFINEMENTS&&Array.isArray(o.boundaries)&&o.boundaries.length>0&&o.boundaries.length<=2&&o.boundaries.every(b=>b==='equal'||b==='wave');
}

export function decodeNotebook(text:string):Entry[] {
 if(text.length>2000000)throw new Error('Import is limited to 2 MB.');
 const data=JSON.parse(text);let incoming:Entry[];
 if(data.schema===1&&Array.isArray(data.entries)){
  if(!data.entries.every(validEntry))throw new Error('Invalid notebook entry.');incoming=data.entries;
 }else if(data.schema===1&&typeof data.source==='string'&&data.options){
  const entry={id:'imported',title:'Imported experiment',kind:'experiment',source:data.source,options:data.options,createdAt:new Date().toISOString()};
  if(!validEntry(entry))throw new Error('Invalid experiment settings.');incoming=[entry];
 }else throw new Error('Choose an exported Escher notebook or convergence experiment.');
 incoming.forEach(entry=>parse(entry.source));return incoming.slice(0,20);
}
