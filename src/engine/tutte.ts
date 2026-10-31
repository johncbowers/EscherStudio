import { type Mesh,type Drawing,type Point } from './types';
import { cg } from './linear';
export function tutte(mesh:Mesh):Drawing {
  const fixed=new Set(mesh.boundary),interior=Array.from({length:mesh.vertexCount},(_,i)=>i).filter(i=>!fixed.has(i));
  const index=new Map(interior.map((v,i)=>[v,i])); const neighbors=Array.from({length:mesh.vertexCount},()=>new Set<number>());
  mesh.edges.forEach(([a,b])=>{neighbors[a].add(b);neighbors[b].add(a);});
  const points:Point[]=Array.from({length:mesh.vertexCount},()=>[0,0]);
  mesh.boundary.forEach((v,i)=>{const angle=2*Math.PI*i/mesh.boundary.length-Math.PI/2;points[v]=[Math.cos(angle),Math.sin(angle)];});
  const diag=interior.map(v=>neighbors[v].size),adj=interior.map(v=>new Map([...neighbors[v]].filter(w=>index.has(w)).map(w=>[index.get(w)!,1])));
  let iterations=0;
  for(let axis=0;axis<2;axis++) {
    const rhs=interior.map(v=>[...neighbors[v]].filter(w=>fixed.has(w)).reduce((s,w)=>s+points[w][axis],0));
    const result=cg(diag,adj,rhs);iterations=Math.max(iterations,result.iterations);interior.forEach((v,i)=>points[v][axis]=result.x[i]);
  }
  let residual=0;
  interior.forEach(v=>{for(let axis=0;axis<2;axis++)residual=Math.max(residual,Math.abs(points[v][axis]-[...neighbors[v]].reduce((s,w)=>s+points[w][axis],0)/neighbors[v].size));});
  return {points,iterations,residual,converged:residual<1e-8,method:'Tutte'};
}
