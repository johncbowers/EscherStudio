import {MAX_SEED_DEPTH,MAX_REFINEMENTS} from './limits';
import { type Mesh, type Point, type Program, type Tile, type Drawing } from './types';
import { edgeKey, makeMesh } from './topology';
import { generate, subdivide, ruleVertexLabels } from './subdivide';
import { pack } from './packing';
import { tutte } from './tutte';
export type BoundaryCondition='equal'|'wave';
export interface ExperimentOptions {seedDepth:number;target:string;collar:number;refinements:number;boundaries:BoundaryCondition[];}
export interface ShapeMetrics {lengths:number[];arcLengths:number[];angles:number[];straightness:number;area:number;}
export interface ShapeSample extends ShapeMetrics {polygon:Point[];corners:Point[];}
export interface ExperimentRow {depth:number;boundary:BoundaryCondition;tiles:number;circles:number;margin:number;accepted:boolean;residual:number;tangency:number;boundarySensitivity?:number;shape?:ShapeSample;delta?:number;parityDelta?:number;error?:string;}
export interface ExperimentResult {options:ExperimentOptions;target:string;type:string;source:string;createdAt:string;rows:ExperimentRow[];}
export interface Structure {types:string[];matrix:number[][];growth:number;contraction:number;areaWeights:number[];boundaryCounts:{depth:number;counts:number[]}[];}
export const belongs=(leaf:Tile,id:string)=>leaf.id===id||leaf.id.startsWith(id+'.');
export const distance=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function pointSegment(p:Point,a:Point,b:Point) {
 const dx=b[0]-a[0],dy=b[1]-a[1],d=dx*dx+dy*dy;
 const t=d?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/d)):0;
 return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
}
export function signedArea(points:Point[]) {return points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p[0]*q[1]-p[1]*q[0];},0)/2;}
export function incidences(mesh:Mesh) {
 const edges=new Map<string,number[]>();mesh.tiles.forEach((t,i)=>t.vertices.forEach((a,j)=>{const k=edgeKey(a,t.vertices[(j+1)%t.vertices.length]);const list=edges.get(k)??[];list.push(i);edges.set(k,list);}));
 const neighbors=mesh.tiles.map(()=>new Set<number>()),exterior=new Set<number>();
 for(const fs of edges.values()) {if(fs.length===1)exterior.add(fs[0]);else{neighbors[fs[0]].add(fs[1]);neighbors[fs[1]].add(fs[0]);}}
 return {neighbors,exterior};
}
export function margins(mesh:Mesh):number[] {
 const {neighbors,exterior}=incidences(mesh),result=mesh.tiles.map(()=>Infinity),queue=[...exterior];queue.forEach(i=>result[i]=0);
 for(let h=0;h<queue.length;h++){const a=queue[h];for(const b of neighbors[a])if(result[b]===Infinity){result[b]=result[a]+1;queue.push(b);}}
 return result;
}
export function aggregateBoundary(mesh:Mesh,id:string):number[] {
 const edges=new Map<string,[number,number][]>();
 for(const t of mesh.tiles)if(belongs(t,id))t.vertices.forEach((a,i)=>{const b=t.vertices[(i+1)%t.vertices.length],key=edgeKey(a,b),list=edges.get(key)??[];list.push([a,b]);edges.set(key,list);});
 const next=new Map<number,number>();for(const list of edges.values())if(list.length===1)next.set(...list[0]);
 if(!next.size)throw new Error('The target aggregate is absent from this patch.');
 const start=next.keys().next().value!,seen=new Set<number>(),cycle:number[]=[];let v=start;
 while(!seen.has(v)){seen.add(v);cycle.push(v);const n=next.get(v);if(n===undefined)throw new Error('Open aggregate boundary.');v=n;}
 if(v!==start||cycle.length!==next.size)throw new Error('Target aggregate has more than one boundary component.');return cycle;
}
export function prepareExperiment(p:Program,options:ExperimentOptions) {
 if(!Number.isInteger(options.seedDepth)||options.seedDepth<0||options.seedDepth>MAX_SEED_DEPTH)throw new Error(`Seed depth must be 0–${MAX_SEED_DEPTH}.`);
 if(!Number.isInteger(options.refinements)||options.refinements<0||options.refinements>MAX_REFINEMENTS)throw new Error(`Refinements must be 0–${MAX_REFINEMENTS}.`);
 if(!Number.isInteger(options.collar)||options.collar< -1||options.collar>20)throw new Error('Collar must be all surroundings or 0–20 rings.');
 if(!options.boundaries.length||options.boundaries.some(b=>b!=='equal'&&b!=='wave'))throw new Error('Choose a supported boundary condition.');
 const seed=generate(p,options.seedDepth).levels.at(-1)!,margin=margins(seed);
 const automatic=seed.tiles.reduce((best,t,i)=>margin[i]>margin[best]?i:best,0);
 const target=options.target==='auto'?seed.tiles[automatic]:seed.tiles.find(t=>t.id===options.target);
 if(!target)throw new Error('Target tile is not present at this seed depth.');
 let chosen=new Set(seed.tiles.map((_,i)=>i));
 if(options.collar>=0) {
   const {neighbors,exterior}=incidences(seed),center=seed.tiles.indexOf(target),steps=seed.tiles.map(()=>Infinity),queue=[center];steps[center]=0;chosen=new Set([center]);
   for(let h=0;h<queue.length;h++){const a=queue[h];if(steps[a]>=options.collar)continue;for(const b of neighbors[a])if(steps[b]===Infinity){steps[b]=steps[a]+1;queue.push(b);chosen.add(b);}}
   // Fill bounded holes, retaining every complementary component connected to the original exterior.
   const outside=new Set<number>(),flood=[...exterior].filter(i=>!chosen.has(i));flood.forEach(i=>outside.add(i));
   for(let h=0;h<flood.length;h++)for(const b of neighbors[flood[h]])if(!chosen.has(b)&&!outside.has(b)){outside.add(b);flood.push(b);}
   seed.tiles.forEach((_,i)=>{if(!outside.has(i))chosen.add(i);});
 }
 const used=[...new Set(seed.tiles.filter((_,i)=>chosen.has(i)).flatMap(t=>t.vertices))].sort((a,b)=>a-b),map=new Map(used.map((v,i)=>[v,i]));
 const patch=makeMesh(used.length,seed.tiles.filter((_,i)=>chosen.has(i)).map(t=>({...t,vertices:t.vertices.map(v=>map.get(v)!)})));
 const compactTarget=patch.tiles.find(t=>t.id===target.id)!;
 return {seed,target,patch,compactTarget,margin,selected:chosen};
}
export function normalize(points:Point[],a:Point,b:Point):Point[] {
 const dx=b[0]-a[0],dy=b[1]-a[1],s=dx*dx+dy*dy;if(s<1e-20)throw new Error('Target base edge collapsed.');
 return points.map(p=>{const x=p[0]-a[0],y=p[1]-a[1];return [(x*dx+y*dy)/s,(y*dx-x*dy)/s];});
}
export function sampleShape(mesh:Mesh,drawing:Drawing,target:Tile):ShapeSample {
 const boundary=aggregateBoundary(mesh,target.id),at=boundary.indexOf(target.vertices[0]);const cycle=[...boundary.slice(at),...boundary.slice(0,at)];
 const normalized=normalize(drawing.points,drawing.points[target.vertices[0]],drawing.points[target.vertices[1]]);
 const corners=target.vertices.map(v=>normalized[v]),polygon=cycle.map(v=>normalized[v]);
 let straightness=0;const arcLengths:number[]=[],lengths:number[]=[],angles:number[]=[];
 for(let i=0;i<target.vertices.length;i++) {
   const a=corners[i],b=corners[(i+1)%corners.length],prev=corners[(i+corners.length-1)%corners.length];
   const start=cycle.indexOf(target.vertices[i]),end=cycle.indexOf(target.vertices[(i+1)%corners.length]);
   if(start<0||end<0)throw new Error('A designated target corner is missing.');
   let arc=0,j=start;
   while(j!==end){straightness=Math.max(straightness,pointSegment(polygon[j],a,b));const k=(j+1)%cycle.length;arc+=distance(polygon[j],polygon[k]);j=k;}
   arcLengths.push(arc);lengths.push(distance(a,b));
   const ux=prev[0]-a[0],uy=prev[1]-a[1],vx=b[0]-a[0],vy=b[1]-a[1];
   let angle=Math.atan2(ux*vy-uy*vx,ux*vx+uy*vy);if(angle<=0)angle+=2*Math.PI;
   // CCW boundary: the interior angle is the clockwise turn from previous to next.
   angles.push((2*Math.PI-angle)*180/Math.PI);
 }
 return {polygon,corners,lengths,arcLengths,angles,straightness,area:signedArea(polygon)};
}
export function samplePolyline(poly:Point[],count=160):Point[] {
 const lengths=poly.map((p,i)=>distance(p,poly[(i+1)%poly.length])),total=lengths.reduce((s,x)=>s+x,0);if(total<1e-15)return [poly[0]];
 const result:Point[]=[];let j=0,start=0;
 for(let i=0;i<count;i++){const d=total*i/count;while(j<poly.length-1&&start+lengths[j]<d){start+=lengths[j++];}const t=lengths[j]?(d-start)/lengths[j]:0,a=poly[j],b=poly[(j+1)%poly.length];result.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}return result;
}
/** Sampled symmetric boundary distance: an estimate, not a certified Hausdorff bound. */
export function shapeDistance(a:Point[],b:Point[]) {
 const one=(from:Point[],to:Point[])=>Math.max(...samplePolyline(from).map(p=>Math.min(...to.map((q,i)=>pointSegment(p,q,to[(i+1)%to.length])))));
 return Math.max(one(a,b),one(b,a));
}
export function runExperiment(p:Program,source:string,options:ExperimentOptions,progress?:(message:string)=>void):ExperimentResult {
 const prepared=prepareExperiment(p,options),rows:ExperimentRow[]=[];let mesh=prepared.patch;
 for(let depth=0;depth<=options.refinements;depth++) {
  if(depth) {try{mesh=subdivide(mesh,p);}catch(e){rows.push({depth,boundary:options.boundaries[0],tiles:0,circles:0,margin:0,accepted:false,residual:Infinity,tangency:Infinity,error:(e as Error).message});break;}}
  const margin=margins(mesh),targetMargin=Math.min(...mesh.tiles.map((t,i)=>belongs(t,prepared.target.id)?margin[i]:Infinity));
  for(const boundary of [...new Set(options.boundaries)]) {
   progress?.(`Refinement ${depth}/${options.refinements} · ${boundary==='equal'?'equal':'varied'} radii · ${mesh.tiles.length} tiles`);
   try {
    const drawing=pack(mesh,{boundary}),shape=sampleShape(mesh,drawing,prepared.compactTarget),accepted=drawing.converged;
    const previous=rows.find(r=>r.boundary===boundary&&r.depth===depth-1&&r.accepted),parity=rows.find(r=>r.boundary===boundary&&r.depth===depth-2&&r.accepted);
    rows.push({depth,boundary,tiles:mesh.tiles.length,circles:drawing.points.length,margin:targetMargin,accepted,residual:drawing.residual,tangency:drawing.tangency!,shape,
     delta:accepted&&previous?.shape?shapeDistance(shape.polygon,previous.shape.polygon):undefined,
     parityDelta:accepted&&parity?.shape?shapeDistance(shape.polygon,parity.shape.polygon):undefined,
     error:accepted?undefined:'Numerical tolerances were not met; this row is excluded from convergence comparisons.'});
   }catch(e){rows.push({depth,boundary,tiles:mesh.tiles.length,circles:0,margin:targetMargin,accepted:false,residual:Infinity,tangency:Infinity,error:(e as Error).message});}
  }
 }
 for(const row of rows){const other=rows.find(r=>r.depth===row.depth&&r.boundary!==row.boundary&&r.accepted);if(row.accepted&&row.shape&&other?.shape)row.boundarySensitivity=shapeDistance(row.shape.polygon,other.shape.polygon);}
 return {options,target:prepared.target.id,type:prepared.target.type,source,createdAt:new Date().toISOString(),rows};
}
export function structure(p:Program):Structure {
 const types=Object.keys(p.rules),matrix=types.map(t=>types.map(u=>p.rules[t].children.filter(c=>c.type===u).length));
 // Shift by I so bipartite substitution matrices also have a stable Perron iteration.
 let v=types.map(()=>1),growth=1;
 for(let k=0;k<300;k++){const w=matrix.map((row,i)=>v[i]+row.reduce((s,x,j)=>s+x*v[j],0)),scale=Math.max(...w);v=w.map(x=>x/scale);growth=scale-1;}
 const levels=[generate(p,0).levels[0]];for(let i=1;i<=4;i++){try{levels.push(subdivide(levels[i-1],p));}catch{break;}}
 const boundaryCounts=levels.map((m,depth)=>({depth,counts:p.rules[p.start].vertices.map((_,i)=>{const a=m.boundary.indexOf(i),b=m.boundary.indexOf((i+1)%p.rules[p.start].vertices.length);return (b-a+m.boundary.length)%m.boundary.length;})}));
 return {types,matrix,growth,contraction:1/Math.sqrt(growth),areaWeights:v,boundaryCounts};
}
export function serialize(p:Program) {
 return Object.values(p.rules).map(r=>`tile ${r.name}(${r.vertices.join(',')}) {\n`+r.vertices.flatMap((v,i)=>r.splits[v]?.length?[`  split ${v} ${r.vertices[(i+1)%r.vertices.length]} -> ${r.splits[v].join(',')};`]:[]).join('\n')+(Object.keys(r.splits).length?'\n':'')+(r.interior.length?`  vertex ${r.interior.join(',')};\n`:'')+r.children.map(c=>`  child ${c.type}(${c.vertices.join(',')});`).join('\n')+'\n}').join('\n')+`\nstart ${p.start};\ndepth ${p.depth};`;
}
export function seedDrawing(p:Program,options:ExperimentOptions){const prepared=prepareExperiment(p,options);return {...prepared,drawing:tutte(prepared.seed)};}
