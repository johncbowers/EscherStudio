import { useEffect, useRef, useState } from 'react';
import { examples } from './examples';
import DiscoveryPanel from './components/DiscoveryPanel';
import { parse } from './engine/parser';
import { ruleVertexLabels } from './engine/subdivide';
import { type Drawing,type Program,type Tiling,type Mesh,type Tile } from './engine/types';
import { edgeKey } from './engine/topology';
interface Result {program:Program;tiling:Tiling;drawing:Drawing;}
const colors=['#dea566','#69aaa2','#a5b773','#d47c67','#9b94bd','#e3c67c','#7ea1bd','#ba91a1'];
const color=(n:number)=>colors[((n*2654435761)>>>0)%colors.length];
const group=(t:Tile,level:number)=>t.path.slice(0,level).join('.');
function download(name:string,content:string,type:string) {const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function Canvas({mesh,drawing,aggregate,mode,selected,onSelect,labels,svgRef}:{mesh:Mesh;drawing:Drawing;aggregate:number;mode:string;selected:string|null;onSelect:(id:string|null)=>void;labels?:string[];svgRef:React.RefObject<SVGSVGElement>}) {
  const [zoom,setZoom]=useState(1),[pan,setPan]=useState<[number,number]>([0,0]);
  const drag=useRef<{x:number;y:number;pan:[number,number];moved:boolean}|null>(null);
  useEffect(()=>{setPan([0,0]);setZoom(1);},[mesh]);
  useEffect(()=>{const node=svgRef.current;if(!node)return;const prevent=(event:WheelEvent)=>event.preventDefault();node.addEventListener('wheel',prevent,{passive:false});return()=>node.removeEventListener('wheel',prevent);},[svgRef]);
  const points=(vs:number[])=>vs.map(v=>`${drawing.points[v][0]*300},${drawing.points[v][1]*300}`).join(' ');
  const groups=new Map<string,number>();mesh.tiles.forEach(t=>{const g=group(t,aggregate);if(!groups.has(g))groups.set(g,groups.size);});
  const edgeGroups=new Map<string,string[]>();
  mesh.tiles.forEach(t=>t.vertices.forEach((a,i)=>{const key=edgeKey(a,t.vertices[(i+1)%t.vertices.length]);const gs=edgeGroups.get(key)??[];gs.push(group(t,aggregate));edgeGroups.set(key,gs);}));
  const hasSelection=selected!==null;
  return <div className="canvas-wrap">
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="-350 -350 700 700" role="img" aria-label="Interactive tiling drawing. Click a tile to inspect its ancestry." style={{touchAction:'none'}}
      onWheel={e=>{setZoom(z=>Math.max(.5,Math.min(8,z*Math.exp(-e.deltaY*.001))));}}
      onPointerDown={e=>{if(e.button!==0)return;drag.current={x:e.clientX,y:e.clientY,pan,moved:false};}}
      onPointerMove={e=>{if(!drag.current)return;const d=drag.current;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>4){d.moved=true;e.currentTarget.setPointerCapture(e.pointerId);}if(d.moved){const scale=700/e.currentTarget.getBoundingClientRect().width;setPan([d.pan[0]+(e.clientX-d.x)*scale,d.pan[1]+(e.clientY-d.y)*scale]);}}}
      onPointerUp={e=>{const d=drag.current;if(d?.moved){e.preventDefault();}else {const target=e.target as SVGElement;onSelect(target.dataset.tile??null);}drag.current=null;}}
      onPointerCancel={()=>drag.current=null}>
      <rect x="-350" y="-350" width="700" height="700" fill="#f5f2e9"/>
      <g transform={`translate(${pan.join(' ')}) scale(${zoom})`}>
        {mode==='tutte'&&<circle r="300" fill="none" stroke="#d6d5c9" strokeDasharray="3 5"/>}
        <g stroke="#284b49" strokeWidth="0.7" strokeLinejoin="round">
          {mesh.tiles.map(t=><polygon key={t.id} data-tile={t.id} tabIndex={mesh.tiles.length<=512?0:undefined} role="button" aria-label={`${t.type} tile ${t.id}`} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(t.id);}}} points={points(t.vertices)} fill={color(groups.get(group(t,aggregate))!)} fillOpacity={hasSelection && !(t.id===selected || t.id.startsWith(selected+'.')) ? .16 : .88}><title>{t.type} · {t.id}</title></polygon>)}
        </g>
        <g fill="none" stroke="#244442" strokeWidth="1.9" pointerEvents="none">
          {[...edgeGroups].filter(([,gs])=>gs.length===1 || gs[0]!==gs[1]).map(([key])=>{const [a,b]=key.split(':').map(Number);return <polyline key={key} points={points([a,b])}/>;})}
        </g>
        {drawing.radii&&<g fill="none" stroke="#254c47" strokeWidth=".6" opacity=".55" pointerEvents="none">{drawing.points.map(([x,y],i)=><circle key={i} cx={x*300} cy={y*300} r={drawing.radii![i]*300}/>)}</g>}
        {labels&&<g fontFamily="monospace" fontSize="13" textAnchor="middle" fill="#183e3b" paintOrder="stroke" stroke="#f5f2e9" strokeWidth="4" pointerEvents="none">{labels.map((name,i)=><text key={i} x={drawing.points[i][0]*300} y={drawing.points[i][1]*300-7}>{name}</text>)}</g>}
      </g>
    </svg>
    <div className="canvas-tools"><button aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(.5,z/1.25))}>−</button><span>{Math.round(zoom*100)}%</span><button aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(8,z*1.25))}>+</button><button onClick={()=>{setZoom(1);setPan([0,0]);}}>Fit</button></div>
  </div>;
}
export default function App() {
  const [source,setSource]=useState(()=>{try{return localStorage.getItem('escher.script.v1')??examples[0].source;}catch{return examples[0].source;}});
  const [workspace,setWorkspace]=useState('studio');
  const [revision,setRevision]=useState(0);
  const [compiled,setCompiled]=useState(source),[depth,setDepth]=useState(()=>{try{return parse(source).depth;}catch{return 3;}}),[aggregate,setAggregate]=useState(1);
  const [method,setMethod]=useState('tutte'),[view,setView]=useState('tiling'),[rule,setRule]=useState('Chair');
  const [result,setResult]=useState<Result|null>(null),[error,setError]=useState<{message:string;line?:number}|null>(null),[busy,setBusy]=useState(false),[selected,setSelected]=useState<string|null>(null),[help,setHelp]=useState(false);
  const [example,setExample]=useState(()=>examples.find(e=>e.source===source)?.name??'Custom'); const worker=useRef<Worker|null>(null),serial=useRef(0),svg=useRef<SVGSVGElement>(null),input=useRef<HTMLInputElement>(null),editor=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{if(!help)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setHelp(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[help]);
  useEffect(()=>{try{localStorage.setItem('escher.script.v1',source);}catch{}},[source]);
  useEffect(()=>{
    const w=new Worker(new URL('./engine/worker.ts',import.meta.url),{type:'module'});worker.current=w;const id=++serial.current;setBusy(true);setError(null);setSelected(null);
    const timeout=setTimeout(()=>{w.terminate();setBusy(false);setError({message:'Computation exceeded 30 seconds. Reduce depth and run again.'});},30000);
    w.onmessage=e=>{if(e.data.id!==id)return;clearTimeout(timeout);setBusy(false);if(e.data.error)setError({message:e.data.error,line:e.data.line});else setResult(e.data);};
    w.onerror=e=>{clearTimeout(timeout);setBusy(false);setError({message:e.message||'Worker failed to load. Serve the app with Vite or a static web server.'});};
    w.postMessage({id,source:compiled,depth,method,rule:view==='rule'?rule:undefined});
    return()=>{clearTimeout(timeout);w.terminate();};
  },[compiled,depth,method,view,rule,revision]);
  const run=(text=source)=>{try{const p=parse(text);setRule(Object.keys(p.rules)[0]);setDepth(p.depth);setAggregate(a=>Math.min(a,p.depth));setCompiled(text);setError(null);setRevision(r=>r+1);}catch(e){setError({message:(e as Error).message,line:(e as {line?:number}).line});}};
  const mesh=result?.tiling.levels.at(-1),drawing=result?.drawing,displayDepth=view==='rule'?1:depth;
  const currentTile=mesh?.tiles.find(t=>t.id===selected);
  let labels:string[]|undefined;
  if(view==='rule' && result){const r=result.program.rules[rule];if(r)labels=ruleVertexLabels(r);}
  const goToError=()=>{if(!error?.line)return;const start=source.split('\n').slice(0,error.line-1).join('\n').length+(error.line>1?1:0);editor.current?.focus();editor.current?.setSelectionRange(start,start+(source.split('\n')[error.line-1]?.length??0));};
  return <div className="app">
    <header><a className="brand" href="#" onClick={e=>e.preventDefault()}><span className="mark">E<span>↗</span></span><span>escher<span className="brand-light"> studio</span><small>A LABORATORY FOR COMBINATORIAL TILINGS</small></span></a><div className="header-actions"><div className="workspace-nav" aria-label="Workspace"><button className={workspace==='studio'?'active':''} onClick={()=>setWorkspace('studio')}>Studio</button><button className={workspace==='discovery'?'active':''} onClick={()=>setWorkspace('discovery')}>Discovery</button></div><button className="quiet" onClick={()=>setHelp(true)}>Language guide <span>↗</span></button><a href="https://archive.bridgesmathart.org/2024/bridges2024-455.pdf" target="_blank" rel="noreferrer">The paper ↗</a></div></header>
    <div className="workspace">
      <aside className="editor-pane"><div className="pane-heading"><span className="eyebrow">01 / DEFINE</span><span className="tag">ESCHER</span></div><h1>Subdivision script</h1><p className="intro">Define prototiles and their subdivisions.<br/>Run the script to draw the tiling.</p>
        <label className="field-label" htmlFor="example">START WITH AN EXAMPLE</label><select id="example" value={example} onChange={e=>{const ex=examples.find(x=>x.name===e.target.value)!;setExample(ex.name);setSource(ex.source);run(ex.source);}}>{example==='Custom'&&<option disabled>Custom</option>}{examples.map(e=><option key={e.name}>{e.name}</option>)}</select><p className="example-caption">{examples.find(e=>e.name===example)?.subtitle??'User-defined subdivision script'}</p>
        <div className="filebar"><span><i/> {example.toLowerCase().replaceAll(' ','-')}.escher</span><span>{source!==compiled?'Edited':'Saved locally'}</span></div>
        <div className="code-editor"><div aria-hidden="true" className="line-numbers">{source.split('\n').map((_,i)=><div key={i}>{i+1}</div>)}</div><textarea ref={editor} aria-label="Escher script" spellCheck={false} value={source} onChange={e=>setSource(e.target.value)} onScroll={e=>{const el=e.currentTarget.previousElementSibling as HTMLElement;el.scrollTop=e.currentTarget.scrollTop;}} onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();run();}if(e.key==='Tab'){e.preventDefault();const el=e.currentTarget,a=el.selectionStart,b=el.selectionEnd;setSource(source.slice(0,a)+'  '+source.slice(b));requestAnimationFrame(()=>el.setSelectionRange(a+2,a+2));}}}/></div>
        <div className="editor-footer"><button className="primary" onClick={()=>run()} disabled={busy}>▶ {busy?'Computing…':'Run script'} <kbd>⌘ ↵</kbd></button><div className="file-actions"><button onClick={()=>input.current?.click()}>Open script</button><button onClick={()=>download('tiling.escher',source,'text/plain')}>Save script ↓</button></div><input ref={input} type="file" accept=".escher,.txt" hidden onChange={async e=>{const file=e.target.files?.[0];if(file){if(file.size>100000){setError({message:'Script exceeds the 100 KB limit.'});return;}const text=await file.text();setSource(text);run(text);}e.target.value='';}}/></div>
      </aside>
      {workspace==='discovery'?<DiscoveryPanel source={source} onApply={text=>{setSource(text);setExample(examples.find(e=>e.source===text)?.name??'Custom');run(text);}}/>:<><main><div className="main-heading"><div><span className="eyebrow">02 / EXPLORE</span><h2>{view==='tiling'?'The tiling':'Subdivision rule'}</h2></div><button className="outline" disabled={!result||busy||!!error} onClick={()=>{if(svg.current)download('escher-tiling.svg',new XMLSerializer().serializeToString(svg.current),'image/svg+xml');}}>Export SVG ↗</button></div>
        <div className="toolbar"><div className="segmented" aria-label="Drawing view"><button className={view==='tiling'?'active':''} onClick={()=>setView('tiling')}>Recursive tiling</button><button className={view==='rule'?'active':''} onClick={()=>setView('rule')}>Rule diagram</button></div><label className="embedding-label">Embedding <select aria-label="Embedding" value={method} onChange={e=>setMethod(e.target.value)}><option value="tutte">Tutte / barycentric</option><option value="packing">Circle packing / Euclidean</option></select></label></div>
        <div className="controls"><label>{view==='rule'?'Prototile':'Subdivision depth'} {view==='rule'?<select aria-label="Rule prototile" value={rule} onChange={e=>setRule(e.target.value)}>{Object.keys(result?.program.rules??{[rule]:true}).map(n=><option key={n}>{n}</option>)}</select>:<><input aria-label="Subdivision depth" type="range" min="0" max="7" value={depth} onChange={e=>{setDepth(+e.target.value);setAggregate(a=>Math.min(a,+e.target.value));}}/><strong>{depth}</strong></>}</label><label>Color by ancestor <input aria-label="Ancestor level" type="range" min="0" max={displayDepth} value={Math.min(aggregate,displayDepth)} onChange={e=>setAggregate(+e.target.value)}/><strong>{Math.min(aggregate,displayDepth)}</strong></label></div>
        {error&&<div className="error" role="alert"><strong>Couldn’t build this tiling{error.line?` · line ${error.line}`:''}</strong><p>{error.message}</p>{error.line&&<button onClick={goToError}>Go to line {error.line} →</button>}</div>}
        <div className={`drawing-area ${busy?'computing':''}`}>
          {mesh&&drawing?<Canvas mesh={mesh} drawing={drawing} aggregate={Math.min(aggregate,displayDepth)} mode={method} selected={selected} onSelect={setSelected} labels={labels} svgRef={svg}/>:<div className="empty">{busy?'Building your first tiling…':'Run a valid script to draw a tiling.'}</div>}
          {busy&&<div className="busy" role="status">Computing in worker… <button onClick={()=>{worker.current?.terminate();setBusy(false);setError({message:'Computation cancelled. Change a setting to try again.'});}}>Cancel</button></div>}
          {!busy&&source!==compiled&&<div className="stale">Script edited · run to update drawing</div>}
          {!busy&&error&&mesh&&<div className="stale">Showing the last successful drawing</div>}
          <div className="canvas-caption"><span>DRAG TO PAN · SCROLL TO ZOOM</span><span>Click a tile to trace its ancestry</span></div>
        </div>
        <div className="metrics" aria-label="Tiling statistics"><div><strong>{mesh?.tiles.length.toLocaleString()??'—'}</strong><span>TILES</span></div><div><strong>{mesh?.vertexCount.toLocaleString()??'—'}</strong><span>VERTICES</span></div><div><strong>{mesh?.edges.length.toLocaleString()??'—'}</strong><span>EDGES</span></div><div><strong>{mesh?.boundary.length.toLocaleString()??'—'}</strong><span>BOUNDARY</span></div><div className="topology-status"><i/> {mesh?'Validated disk':'Awaiting script'}</div></div>
      </main>
      <aside className="inspector"><span className="eyebrow">03 / UNDERSTAND</span><h2>Inside the pattern</h2><div className="inspector-section"><span className="field-label">HIERARCHY</span><p>Level {Math.min(aggregate,displayDepth)} ancestors share a color. Dark edges outline their aggregate tiles.</p><div className="level-list">{result?.tiling.levels.map((level,i)=><button key={i} className={aggregate===i?'chosen':''} onClick={()=>setAggregate(i)}><span><i/> Level {i}</span><strong>{level.tiles.length.toLocaleString()} <small>tiles</small></strong></button>)}</div></div>
        <div className="inspector-section"><span className="field-label">{selected?'SELECTED TILE':'TILE INSPECTOR'}</span>{selected?<><h3>{currentTile?.type??'Aggregate'} <code>{selected}</code></h3><p>{currentTile?.vertices.length??'—'} vertices · ancestry from root</p><div className="ancestry">{Array.from({length:selected.split('.').length},(_,i)=>selected.split('.').slice(0,i+1).join('.')).map((id,i)=><button key={id} onClick={()=>setSelected(id)}><span>↳ Level {i}</span><code>{id}</code></button>)}</div><button className="text-button" onClick={()=>setSelected(null)}>Clear selection</button></>:<p className="hint">Select any tile in the drawing to see its type and place in the subdivision tree.</p>}</div>
        <div className="inspector-section"><span className="field-label">EMBEDDING NOTES</span><h3>{method==='tutte'?'Tutte embedding':'Euclidean packing'}</h3><p>{method==='tutte'?'Boundary vertices sit on a circle. Each interior vertex is the average of its graph neighbors.':'Each face is star-triangulated. Interior angle sums are solved by Newton iteration with equal, fixed boundary radii.'}</p>{drawing&&<dl><dt>Iterations</dt><dd>{drawing.iterations}</dd><dt>{method==='tutte'?'Barycenter error':'Angle error (rad)'}</dt><dd>{drawing.residual.toExponential(1)}</dd>{drawing.tangency!==undefined&&<><dt>Relative tangency error</dt><dd>{drawing.tangency.toExponential(1)}</dd></>}<dt>Status</dt><dd>{drawing.converged?'Converged':'Not converged'}</dd></dl>}{method==='packing'&&<p className="notice">Experimental Euclidean boundary condition. This is not a maximal hyperbolic disk packing. Global overlaps are not certified.</p>}</div>
        <a className="research-link" href="https://github.com/johncbowers/koebepy" target="_blank" rel="noreferrer">Built on the ideas of Escher & KoebePy <span>↗</span></a>
      </aside></>}
    </div>
    <footer><span>ESCHER STUDIO · COMBINATORIAL TILINGS</span><span>Inspired by Bowers & Lawson · Bridges 2024</span></footer>
    {help&&<div className="modal-backdrop" onClick={()=>setHelp(false)}><section className="guide" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={e=>e.stopPropagation()}><button className="close" autoFocus onClick={()=>setHelp(false)}>Close ×</button><span className="eyebrow">LANGUAGE / v0.1</span><h2 id="guide-title">Escher script syntax</h2><p>This new browser language expresses the prototile, split, interior-vertex, and child-cycle model used by Escher and KoebePy. It is not an existing Escher file format.</p><pre>{`tile Quad(A,B,C,D) {\n  split A B -> a;\n  // … split the other edges\n  vertex o;\n  child Quad(A,a,o,d);\n  // … list the other children\n}\nstart Quad;\ndepth 3;`}</pre><p>Names are case sensitive. Separate vertices with commas. Split endpoints follow the parent cycle. A child's first vertex corresponds to its prototile's first vertex, and its cycle must preserve orientation. Adjacent tiles must request the same number of split vertices on their shared edge.</p><p>Every rule must fill one disk, use every declared vertex, and have exactly the split parent boundary. Comments begin with <code>#</code> or <code>//</code>. Depth ranges from 0 to 7, with a 12,000-tile safety limit.</p><p>Use Rule diagram to check labels and Recursive tiling to explore aggregate tiles. Save a script to keep a file; the current draft also stays in this browser.</p></section></div>}
  </div>;
}
