import { type Mesh, type Drawing, type Point } from './types';
import { cg } from './linear';
import { edgeKey } from './topology';
import { MAX_CIRCLES } from './limits';
const TAU=2*Math.PI;
const clamp=(x:number)=>Math.max(-1,Math.min(1,x));
export function triangulate(mesh:Mesh) {
  let n=mesh.vertexCount;const triangles:number[][]=[];
  for(const tile of mesh.tiles){const center=n++;tile.vertices.forEach((a,i)=>triangles.push([a,tile.vertices[(i+1)%tile.vertices.length],center]));}
  return {n,triangles};
}
/** Euclidean fixed-boundary-radii packing. Newton in log radii; not GOPack or a hyperbolic solver. */
export function pack(mesh:Mesh,options:{boundary?:'equal'|'wave'}={}):Drawing {
  if(mesh.vertexCount+mesh.tiles.length>MAX_CIRCLES)throw new Error(`Circle packing is limited to ${MAX_CIRCLES.toLocaleString()} circles. This patch needs ${(mesh.vertexCount+mesh.tiles.length).toLocaleString()}. Reduce depth or use Tutte.`);
  const {n,triangles}=triangulate(mesh);
  const boundary=new Set(mesh.boundary),interior=Array.from({length:n},(_,i)=>i).filter(i=>!boundary.has(i));
  const index=new Map(interior.map((v,i)=>[v,i]));let u=Array(n).fill(0),iterations=0;
  if(options.boundary==='wave')mesh.boundary.forEach((v,i)=>{const angle=2*Math.PI*i/mesh.boundary.length;u[v]=.35*Math.cos(2*angle)+.2*Math.sin(3*angle);});
  const evaluate=(logs:number[],jacobian=false)=>{
    const r=logs.map(Math.exp),sums=Array(n).fill(0),diag=Array(interior.length).fill(0),adj=interior.map(()=>new Map<number,number>());
    for(const t of triangles) {
      const [a,b,c]=t,ra=r[a],rb=r[b],rc=r[c],s=ra+rb+rc;
      if(!Number.isFinite(s) || Math.min(ra,rb,rc)<1e-20)throw new Error('Packing radii exceeded numerical range.');
      // Stable half-angle formula avoids cancellation for disparate radii.
      for(let p=0;p<3;p++) {
        const i=t[p],j=t[(p+1)%3],k=t[(p+2)%3];
        sums[i]+=2*Math.atan(Math.sqrt(r[j]*r[k]/(r[i]*s)));
      }
      if(jacobian) {
        const inradius=Math.sqrt(ra*rb*rc/s);
        for(let p=0;p<3;p++) {
          const a=t[p],b=t[(p+1)%3],w=inradius/(r[a]+r[b]),i=index.get(a),j=index.get(b);
          if(i!==undefined){diag[i]+=w;if(j!==undefined)adj[i].set(j,(adj[i].get(j)??0)+w);}
          if(j!==undefined){diag[j]+=w;if(i!==undefined)adj[j].set(i,(adj[j].get(i)??0)+w);}
        }
      }
    }
    const residual=interior.map(v=>sums[v]-TAU);
    return {r,diag,adj,residual,max:Math.max(0,...residual.map(Math.abs)),energy:residual.reduce((s,x)=>s+x*x,0)};
  };
  let state=evaluate(u,true);
  for(;iterations<60 && state.max>1e-10;iterations++) {
    const delta=cg(state.diag,state.adj,state.residual,1e-10,4000).x;
    let accepted=false;
    for(let step=1;step>=1/32768;step/=2) {
      const candidate=[...u];interior.forEach((v,i)=>candidate[v]+=step*delta[i]);
      if(candidate.some(x=>Math.abs(x)>40))continue;
      const next=evaluate(candidate);
      if(next.energy<state.energy){u=candidate;accepted=true;break;}
    }
    if(!accepted)break;
    state=evaluate(u,true);
  }
  const radii=state.r;
  // Develop the oriented triangulation across its dual graph.
  const points:Point[]=Array.from({length:n},()=>[NaN,NaN]);
  const place=(a:number,b:number,c:number)=>{
    const [x,y]=points[a],dx=points[b][0]-x,dy=points[b][1]-y,d=Math.hypot(dx,dy);
    const ac=radii[a]+radii[c],ab=radii[a]+radii[b],bc=radii[b]+radii[c];
    const co=clamp((ac*ac+ab*ab-bc*bc)/(2*ac*ab)),si=Math.sqrt(Math.max(0,1-co*co));
    points[c]=[x+ac*(co*dx-si*dy)/d,y+ac*(co*dy+si*dx)/d];
  };
  const [a,b,c]=triangles[0];points[a]=[0,0];points[b]=[radii[a]+radii[b],0];place(a,b,c);
  const edgeFaces=new Map<string,number[]>();
  triangles.forEach((t,i)=>t.forEach((a,p)=>{const key=edgeKey(a,t[(p+1)%3]);const fs=edgeFaces.get(key)??[];fs.push(i);edgeFaces.set(key,fs);}));
  const visited=new Set<number>(),queue=[0];
  for(let h=0;h<queue.length;h++) {
    const f=queue[h];if(visited.has(f))continue;visited.add(f);const t=triangles[f];
    const missing=t.filter(v=>!Number.isFinite(points[v][0]));
    if(missing.length===1){const p=t.indexOf(missing[0]);place(t[(p+1)%3],t[(p+2)%3],missing[0]);}
    if(missing.length>1)throw new Error('Could not develop the triangulation.');
    t.forEach((a,p)=>edgeFaces.get(edgeKey(a,t[(p+1)%3]))!.forEach(f=>{if(!visited.has(f))queue.push(f);}));
  }
  if(points.some(p=>!Number.isFinite(p[0])))throw new Error('Packing layout contains unplaced vertices.');
  let tangency=0;
  for(const [key] of edgeFaces){const [a,b]=key.split(':').map(Number);tangency=Math.max(tangency,Math.abs(Math.hypot(points[a][0]-points[b][0],points[a][1]-points[b][1])/(radii[a]+radii[b])-1));}
  const minX=Math.min(...points.map((p,i)=>p[0]-radii[i])),maxX=Math.max(...points.map((p,i)=>p[0]+radii[i]));
  const minY=Math.min(...points.map((p,i)=>p[1]-radii[i])),maxY=Math.max(...points.map((p,i)=>p[1]+radii[i]));
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2,scale=1.9/Math.max(maxX-minX,maxY-minY);
  return {points:points.map(([x,y])=>[(x-cx)*scale,(y-cy)*scale]),radii:radii.map(r=>r*scale),triangles,iterations,residual:state.max,tangency,converged:state.max<1e-8 && tangency<1e-6,method:'Euclidean circle packing'};
}
