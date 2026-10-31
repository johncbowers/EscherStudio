import { type Program, type Point } from './types';
import { generate, ruleVertexLabels } from './subdivide';
import { pack } from './packing';
import { tutte } from './tutte';
import { cg } from './linear';
import { distance, normalize, pointSegment, signedArea, structure } from './discovery';
export interface GeometryTile {name:string;vertices:string[];points:Record<string,Point>;children:{type:string;vertices:string[]}[];similarities?:{type:string;a:Point;b:Point;scale:number}[];}
export interface GeometryFit {contraction:number;residual:number;maxResidual:number;iterations:number;attempts:number;passed:boolean;issues:string[];tiles:GeometryTile[];}
interface Transform {a:Point;b:Point;}
interface Equation {terms:[number,number][];rhs:number;}
const multiply=([a,b]:Point,[x,y]:Point):Point=>[a*x-b*y,a*y+b*x];
function fitTransform(source:Point[],target:Point[],scale:number):Transform {
 const mean=(p:Point[]):Point=>[p.reduce((s,q)=>s+q[0],0)/p.length,p.reduce((s,q)=>s+q[1],0)/p.length];
 const s=mean(source),t=mean(target);let re=0,im=0;
 source.forEach((p,i)=>{const x=p[0]-s[0],y=p[1]-s[1],a=target[i][0]-t[0],b=target[i][1]-t[1];re+=x*a+y*b;im+=x*b-y*a;});
 const norm=Math.hypot(re,im),a:Point=norm>1e-20?[scale*re/norm,scale*im/norm]:[scale,0],as=multiply(a,s);
 return {a,b:[t[0]-as[0],t[1]-as[1]]};
}
export function geometryChecks(tile:GeometryTile):string[] {
 const issues:string[]=[],points=tile.points,parent=tile.vertices.map(v=>points[v]);
 if(signedArea(parent)<1e-6)issues.push('Parent polygon is collapsed or has reversed orientation.');
 const parentArea=signedArea(parent),childAreas=tile.children.map(c=>signedArea(c.vertices.map(v=>points[v])));
 if(childAreas.some(a=>a<1e-7))issues.push('A child polygon is collapsed or reversed.');
 if(Math.abs(childAreas.reduce((s,a)=>s+a,0)-parentArea)>1e-4*Math.max(1,Math.abs(parentArea)))issues.push('Child areas do not sum to the parent area.');
 const edgeMap=new Map<string,[string,string]>();for(const c of tile.children)c.vertices.forEach((a,i)=>{const b=c.vertices[(i+1)%c.vertices.length];edgeMap.set([a,b].sort().join(':'),[a,b]);});
 const edges=[...edgeMap.values()];if(edges.some(([a,b])=>distance(points[a],points[b])<1e-7))issues.push('A subdivision edge has collapsed.');const cross=(a:Point,b:Point,c:Point)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 let collisions=0;
 for(let i=0;i<edges.length;i++)for(let j=0;j<i;j++) {
  const [a,b]=edges[i],[c,d]=edges[j];
  const shared=[a,b].find(v=>v===c||v===d);
  if(shared){const origin=points[shared],u=points[a===shared?b:a],v=points[c===shared?d:c];if(Math.abs(cross(origin,u,v))<1e-10&&(u[0]-origin[0])*(v[0]-origin[0])+(u[1]-origin[1])*(v[1]-origin[1])>1e-10)collisions++;continue;}
  const [p,q,r,s]=[a,b,c,d].map(v=>points[v]);
  const crossing=cross(p,q,r)*cross(p,q,s)<-1e-16&&cross(r,s,p)*cross(r,s,q)<-1e-16;
  const touching=Math.min(pointSegment(p,r,s),pointSegment(q,r,s),pointSegment(r,p,q),pointSegment(s,p,q))<1e-7;
  if(crossing||touching)collisions++;
 }
 if(collisions)issues.push(`${collisions} crossings or contacts between edges without a shared vertex.`);
 return issues;
}
/** Alternating constrained least squares. A small numerical fit is evidence, not an existence proof. */
export function fitGeometry(p:Program,options:{iterations?:number;attempts?:number}={},progress?:(message:string)=>void):GeometryFit {
 const stats=structure(p),scale=stats.contraction;
 if(!Number.isFinite(scale)||scale<=0||scale>=.999999)throw new Error('Geometric fitting needs a subdivision with growth greater than one.');
 const rules=Object.values(p.rules),labels=rules.map(ruleVertexLabels),offsets:number[]=[];let n=0;
 labels.forEach(vs=>{offsets.push(n);n+=vs.length;});
 if(n>320||rules.reduce((s,r)=>s+r.children.length,0)>180)throw new Error('Geometry fitting is limited to 320 local vertices and 180 children.');
 const ruleIndex=new Map(rules.map((r,i)=>[r.name,i])),indices=labels.map((vs,k)=>new Map(vs.map((v,i)=>[v,offsets[k]+i])));
 const proto=(name:string)=>{const k=ruleIndex.get(name)!;return rules[k].vertices.map(v=>indices[k].get(v)!);};
 const fixed=new Map<number,number>();rules.forEach((r,k)=>{const a=indices[k].get(r.vertices[0])!,b=indices[k].get(r.vertices[1])!;fixed.set(2*a,0);fixed.set(2*a+1,0);fixed.set(2*b+1,0);if(r.name===p.start)fixed.set(2*b,1);});
 const free=Array.from({length:2*n},(_,i)=>i).filter(i=>!fixed.has(i)),freeIndex=new Map(free.map((v,i)=>[v,i]));
 const initial:Point[]=Array.from({length:n},()=>[0,0]);
 rules.forEach((rule,k)=>{
  let mesh=generate(p,2,rule.name).levels[2],drawing;try{drawing=pack(mesh);}catch{drawing=tutte(mesh);}
  const points=normalize(drawing.points,drawing.points[0],drawing.points[1]);labels[k].forEach((_,i)=>initial[offsets[k]+i]=points[i]);
 });
 const iterations=Math.min(1200,Math.max(1,options.iterations??500)),attempts=Math.min(4,Math.max(1,options.attempts??2));
 let best:GeometryFit|null=null;
 for(let attempt=0;attempt<attempts;attempt++) {
  let coordinates=initial.map(([x,y],i):Point=>[x+(attempt?.08*Math.sin(i*37+attempt*3):0),y+(attempt?.08*Math.cos(i*13+attempt*7):0)]);
  fixed.forEach((v,i)=>coordinates[Math.floor(i/2)][i%2]=v);
  let last=Infinity,used=0;
  const equations=(points:Point[])=>{
   const eq:Equation[]=[];
   const add=(terms:[number,number][],rhs:number)=>eq.push({terms,rhs});
   rules.forEach((rule,k)=>{
    for(const child of rule.children) {
      const src=proto(child.type),dst=child.vertices.map(v=>indices[k].get(v)!),transform=fitTransform(src.map(i=>points[i]),dst.map(i=>points[i]),scale),[re,im]=transform.a;
      src.forEach((s,j)=>{const d=dst[j];add([[2*d,1],[2*s,-re],[2*s+1,im]],transform.b[0]);add([[2*d+1,1],[2*s,-im],[2*s+1,-re]],transform.b[1]);});
    }
    // Project each edge's split parameters, preserving their declared order.
    rule.vertices.forEach((v,i)=>{
     const a=indices[k].get(v)!,b=indices[k].get(rule.vertices[(i+1)%rule.vertices.length])!,names=rule.splits[v]??[];
     const dx=points[b][0]-points[a][0],dy=points[b][1]-points[a][1],den=dx*dx+dy*dy;let lower=0;
     names.forEach((v,j)=>{const q=indices[k].get(v)!,t=den?((points[q][0]-points[a][0])*dx+(points[q][1]-points[a][1])*dy)/den:(j+1)/(names.length+1);
      const value=Math.max(lower+1e-5,Math.min(1-(names.length-j)*1e-5,t));lower=value;
      for(let axis=0;axis<2;axis++)add([[2*q+axis,1],[2*a+axis,-(1-value)],[2*b+axis,-value]],0);
     });
    });
   });return eq;
  };
  for(;used<iterations;used++) {
    if(used%50===0)progress?.(`Geometry fit · attempt ${attempt+1}/${attempts} · iteration ${used}/${iterations}`);
    const eq=equations(coordinates),diag=free.map(()=>1e-9),adj=free.map(()=>new Map<number,number>()),rhs=free.map((v)=>coordinates[Math.floor(v/2)][v%2]*1e-9);
    for(const e of eq) {
      const merged=new Map<number,number>();e.terms.forEach(([v,c])=>merged.set(v,(merged.get(v)??0)+c));
      let value=e.rhs;for(const [v,c] of merged)if(fixed.has(v))value-=c*fixed.get(v)!;
      const terms=[...merged].filter(([v])=>freeIndex.has(v)).map(([v,c])=>[freeIndex.get(v)!,c] as [number,number]);
      for(const [i,a] of terms){rhs[i]+=a*value;for(const [j,b] of terms)if(i===j)diag[i]+=a*b;else adj[i].set(j,(adj[i].get(j)??0)-a*b);}
    }
    const solution=cg(diag,adj,rhs,1e-10,1600);free.forEach((v,i)=>coordinates[Math.floor(v/2)][v%2]=solution.x[i]);
    const flat=coordinates.flat(),errors=equations(coordinates).map(e=>e.terms.reduce((s,[i,c])=>s+flat[i]*c,-e.rhs)),energy=errors.reduce((s,x)=>s+x*x,0)/errors.length;
    if(!Number.isFinite(energy))throw new Error('Geometry fit exceeded numerical range.');
    if(energy<1e-16||Math.abs(last-energy)<1e-15){used++;break;}last=energy;
  }
  const flat=coordinates.flat(),errors=equations(coordinates).map(e=>e.terms.reduce((s,[i,c])=>s+flat[i]*c,-e.rhs)),residual=Math.sqrt(errors.reduce((s,x)=>s+x*x,0)/errors.length),maxResidual=Math.max(...errors.map(Math.abs));
  const tiles=rules.map((r,k)=>({name:r.name,vertices:r.vertices,points:Object.fromEntries(labels[k].map(v=>[v,coordinates[indices[k].get(v)!]])),children:r.children,similarities:r.children.map(child=>{const transform=fitTransform(proto(child.type).map(i=>coordinates[i]),child.vertices.map(v=>coordinates[indices[k].get(v)!]),scale);return {type:child.type,...transform,scale};})}));
  const issues=tiles.flatMap(tile=>geometryChecks(tile).map(s=>`${tile.name}: ${s}`));
  if(residual>=1e-5||maxResidual>=1e-4)issues.unshift('Similarity and straight-edge constraints have not reached the fitting tolerance.');
  const fit={contraction:scale,residual,maxResidual,iterations:used,attempts:attempt+1,passed:issues.length===0,issues,tiles};
  if(!best||(fit.passed&&!best.passed)||(fit.passed===best.passed&&fit.residual<best.residual))best=fit;
  if(fit.passed)break;
 }
 return best!;
}
