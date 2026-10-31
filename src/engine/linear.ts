/** Jacobi-preconditioned conjugate gradient for a positive definite sparse operator. */
export function cg(diag:number[], adjacency:Map<number,number>[], rhs:number[], tolerance=1e-11,maxIterations=5000) {
  const n=rhs.length,x=Array(n).fill(0),r=[...rhs],z=r.map((v,i)=>v/diag[i]); let p=[...z];
  const dot=(a:number[],b:number[])=>a.reduce((s,v,i)=>s+v*b[i],0);
  let rz=dot(r,z), iterations=0; const norm=Math.max(1,Math.sqrt(dot(rhs,rhs)));
  if(Math.sqrt(dot(r,r))<=tolerance*norm)return {x,iterations,residual:Math.sqrt(dot(r,r))};
  for(;iterations<maxIterations;iterations++) {
    const ap=p.map((v,i)=>diag[i]*v-[...adjacency[i]].reduce((s,[j,w])=>s+w*p[j],0));
    const denom=dot(p,ap);if(!(denom>0))throw new Error('Linear system is not positive definite.');
    const alpha=rz/denom;
    for(let i=0;i<n;i++){x[i]+=alpha*p[i];r[i]-=alpha*ap[i];}
    if(Math.sqrt(dot(r,r))<=tolerance*norm){iterations++;break;}
    for(let i=0;i<n;i++)z[i]=r[i]/diag[i];
    const next=dot(r,z),beta=next/rz;for(let i=0;i<n;i++)p[i]=z[i]+beta*p[i];rz=next;
  }
  return {x,iterations,residual:Math.sqrt(dot(r,r))/norm};
}
