// Preview-only measurements, never shipped as production telemetry.
// Fictional data; no network, persistence or recording of typed contents.
type Sample = {kind:string; milliseconds:number};
const samples:Sample[]=[];
let longTasks=0,longTaskMilliseconds=0;
const result=document.createElement('output');
result.id='review-performance';result.hidden=true;document.body.append(result);
const publish=()=>{result.textContent=JSON.stringify({samples,longTasks,longTaskMilliseconds:Math.round(longTaskMilliseconds),viewport:[innerWidth,innerHeight],dpr:devicePixelRatio});};
for(const name of ['pointerdown','keydown']){
 document.addEventListener(name,()=>{
  const start=performance.now();
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   samples.push({kind:name,milliseconds:Math.round((performance.now()-start)*10)/10});if(samples.length>100)samples.shift();publish();
  }));
 },{capture:true,passive:true});
}
if(typeof PerformanceObserver!=='undefined'){
 try{new PerformanceObserver(list=>{for(const entry of list.getEntries()){longTasks++;longTaskMilliseconds+=entry.duration;}publish();}).observe({type:'longtask',buffered:true});}catch{}
}
publish();
