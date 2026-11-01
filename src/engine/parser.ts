import { MAX_DEPTH } from './limits';
import { EscherError, type Program, type Rule } from './types';
import { makeMesh } from './topology';
interface Token { value: string; line: number; }
export function parse(source: string): Program {
  if(source.length>100000) throw new EscherError('Script exceeds the 100 KB limit.');
  const tokens: Token[]=[]; let line=1, pos=0;
  while(pos<source.length) {
    const rest=source.slice(pos), m=/^(\s+|#[^\n]*|\/\/[^\n]*|->|[A-Za-z_][A-Za-z_0-9]*|\d+|[(){},;])/.exec(rest);
    if(!m) throw new EscherError(`Unexpected character ${JSON.stringify(source[pos])}.`,line);
    const value=m[0]; if(!/^\s|^#|^\/\//.test(value)) tokens.push({value,line});
    line+=(value.match(/\n/g)??[]).length; pos+=value.length;
  }
  let i=0; const rules: Record<string,Rule>=Object.create(null); let start='', depth=3, sawDepth=false;
  const peek=()=>tokens[i]?.value;
  const take=(expected?:string)=>{const t=tokens[i++]; if(!t || (expected && t.value!==expected)) throw new EscherError(`Expected ${expected??'a token'}, found ${t?.value??'end of script'}.`,t?.line??line); return t.value;};
  const name=()=>{const t=tokens[i]; const v=take(); if(!/^[A-Za-z_][A-Za-z_0-9]*$/.test(v)) throw new EscherError('Expected a name.',t.line); return v;};
  const names=()=>{const result=[name()]; while(peek()===','){take(',');result.push(name());} return result;};
  const cycle=()=>{take('('); const vs=names(); take(')');return vs;};
  while(i<tokens.length) {
    const ln=tokens[i].line, command=take();
    if(command==='tile') {
      const n=name(); if(Object.hasOwn(rules,n))throw new EscherError(`Duplicate tile ${n}.`,ln);
      const rule:Rule={name:n,vertices:cycle(),splits:Object.create(null),interior:[],children:[],line:ln}; take('{');
      while(peek()!=='}') {
        const cl=tokens[i]?.line??line, c=take();
        if(c==='split'){const a=name(), b=name(); take('->');const vs=names();
          const idx=rule.vertices.indexOf(a);
          if(idx<0 || rule.vertices[(idx+1)%rule.vertices.length]!==b) throw new EscherError(`Split ${a} ${b} must follow a directed prototile edge.`,cl);
          if(Object.hasOwn(rule.splits,a))throw new EscherError(`Duplicate split at ${a}.`,cl);
          rule.splits[a]=vs;
        } else if(c==='vertex') rule.interior.push(...names());
        else if(c==='child') rule.children.push({type:name(),vertices:cycle()});
        else throw new EscherError(`Unknown rule command ${c}. Use split, vertex, or child.`,cl);
        take(';');
      }
      take('}'); rules[n]=rule;
    } else if(command==='start'){if(start)throw new EscherError('Duplicate start command.',ln);start=name();take(';');}
    else if(command==='depth'){if(sawDepth)throw new EscherError('Duplicate depth command.',ln);sawDepth=true;const v=take();if(!/^\d+$/.test(v))throw new EscherError('Depth must be an integer.',ln); depth=Number(v);take(';');}
    else throw new EscherError(`Unknown command ${command}. Use tile, start, or depth.`,ln);
  }
  start ||= Object.keys(rules)[0];
  const program={rules,start,depth}; validate(program);return program;
}
export function validate(p: Program) {
  if(!p.start || !Object.hasOwn(p.rules,p.start))throw new EscherError('Choose a defined starting tile.');
  if(p.depth<0 || p.depth>MAX_DEPTH)throw new EscherError(`Depth must be between 0 and ${MAX_DEPTH}.`);
  for(const rule of Object.values(p.rules)) {
    try {
      const names=[...rule.vertices,...Object.values(rule.splits).flat(),...rule.interior];
      if(rule.vertices.length<3)throw new EscherError('A prototile needs at least three vertices.');
      if(new Set(names).size!==names.length)throw new EscherError('Vertex names must be distinct within a rule.');
      const index=new Map(names.map((n,i)=>[n,i]));
      if(!rule.children.length) throw new EscherError('Each tile needs at least one child.');
      const mesh=makeMesh(names.length,rule.children.map((child,k)=>{
        if(!Object.hasOwn(p.rules,child.type))throw new EscherError(`Unknown child type ${child.type}.`);
        if(child.vertices.length!==p.rules[child.type].vertices.length)throw new EscherError(`Child ${child.type} needs ${p.rules[child.type].vertices.length} vertices.`);
        return {id:String(k),type:child.type,parent:null,path:[k],vertices:child.vertices.map(v=>{if(!index.has(v))throw new EscherError(`Undeclared vertex ${v}.`);return index.get(v)!;})};
      }));
      const expected=rule.vertices.flatMap(v=>[index.get(v)!,...(rule.splits[v]??[]).map(n=>index.get(n)!)]);
      const offset=mesh.boundary.indexOf(expected[0]);
      if(expected.length!==mesh.boundary.length || expected.some((v,i)=>v!==mesh.boundary[(i+offset)%mesh.boundary.length])) throw new EscherError('Child boundary must match the split parent boundary in the same orientation.');
    } catch(error) {throw new EscherError(`${rule.name}: ${(error as Error).message}`,rule.line);}
  }
}
