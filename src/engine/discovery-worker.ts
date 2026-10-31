import { parse } from './parser';
import { runExperiment } from './discovery';
import { fitGeometry } from './geometry';
import { searchRules } from './search';
self.onmessage=(event:MessageEvent)=>{
 const {id,task,source,options}=event.data;
 const progress=(message:string)=>self.postMessage({id,progress:message});
 try{
  const p=parse(source);
  const result=task==='experiment'?runExperiment(p,source,options,progress):task==='fit'?fitGeometry(p,options,progress):task==='search'?searchRules(p,options,progress):null;
  if(result===null)throw new Error('Unknown discovery task.');
  self.postMessage({id,task,result});
 }catch(e){self.postMessage({id,error:(e as Error).message});}
};
