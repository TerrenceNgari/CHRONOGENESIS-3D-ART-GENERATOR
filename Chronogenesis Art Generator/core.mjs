// CHRONOGENESIS — TAGE v2: Temporal Architectural Grammar Evolution
// Pure deterministic generator and evaluator. No Three.js dependency.

export const FORMS = ['Floating Citadel', 'Helical Megastructure', 'Inverted Crown', 'Orbital Cathedral'];
export function seededRandom(seed) {
  let state = (Number(seed) >>> 0) || 1;
  return function () {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (r, low, high) => low + (high - low) * r();
const whole = (r, low, high) => Math.floor(between(r, low, high + 1));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function makeNode(rng, id, x, y, z, hub) {
  const size = hub ? 8.3 : between(rng, 3.0, 5.8);
  const count = hub ? 8 : whole(rng, 3, 6);
  const towers = [];
  for (let k = 0; k < count; k++) {
    const angle = (k / count) * Math.PI * 2 + between(rng, -0.20, 0.20);
    const offset = hub ? between(rng, 2.8, 4.8) : between(rng, 1.25, size * 0.66);
    towers.push({
      x: Math.cos(angle) * offset, z: Math.sin(angle) * offset,
      width: between(rng, hub ? .7 : .42, hub ? 1.35 : 1.0),
      height: between(rng, hub ? 5.4 : 3.5, hub ? 16 : 10.5),
      tiers: whole(rng, 2, 5), spire: rng() > .24, twist: between(rng, -.35, .35)
    });
  }
  return {id,x,y,z,size,hub,rotation:between(rng,-.55,.55),teeth:whole(rng,7,12),
    towers,style:whole(rng,0,2),lift:between(rng,.5,1.5)};
}

export function generateGenome(seed=24011) {
  const rng=seededRandom(seed);
  const count=whole(rng,7,10);
  const nodes=[makeNode(rng,0,0,2.2,0,true)];
  for(let i=0;i<count;i++){
    const a=i/count*Math.PI*2+between(rng,-.14,.14);
    const r=between(rng,13.8,21.4);
    nodes.push(makeNode(rng,i+1,Math.cos(a)*r,between(rng,-4,6.2),Math.sin(a)*r,false));
  }
  const edges=[];
  for(let i=1;i<=count;i++){
    edges.push([0,i]);
    edges.push([i,i===count?1:i+1]);
  }
  for(let i=1;i<=Math.floor(count/2);i++){
    if(rng()>.47)edges.push([i,i+Math.floor(count/2)]);
  }
  return {seed:Number(seed)>>>0,generation:0,nodes,edges,palette:whole(rng,0,3),
    crystalScale:between(rng,.75,1.25),haloRadius:between(rng,22,30),
    form:0,formPower:1};
}

// One genome can take four distinctly different architectural forms.
// The same nodes, artistic parts, and edge connections are transformed
// into new geometric spatial grammars — these are NOT pre-made 3D models.
export function getPlatformPose(genome,node) {
  const form=genome.form??0;
  const power=clamp(genome.formPower??1,.7,1.4);
  const count=genome.nodes.length-1;
  const index=node.id-1;
  const a= index/count*Math.PI*2;
  const base={x:node.x,y:node.y,z:node.z,flip:1,tiltX:0,tiltZ:0};
  if(node.hub){
    if(form===1) return {...base,y:-3*power};
    if(form===2) return {...base,y:20*power,flip:-1};
    if(form===3) return {...base,y:0};
    return base;
  }
  if(form===1){
    const theta=a*1.65+index*.12;
    const radius=(8.5+index*1.35)*power;
    return {x:Math.cos(theta)*radius,y:(index-(count-1)/2)*4.7*power,
      z:Math.sin(theta)*radius,flip:1,tiltX:.12*Math.cos(theta),tiltZ:.12*Math.sin(theta)};
  }
  if(form===2){
    const radius=(15.5+Math.sin(a*3)*2.4)*power;
    return {x:Math.cos(a)*radius,y:(10+Math.sin(a*2)*5.5)*power,
      z:Math.sin(a)*radius,flip:-1,tiltX:.2*Math.cos(a),tiltZ:.2*Math.sin(a)};
  }
  if(form===3){
    const radius=21*power;
    return {x:Math.cos(a)*radius,y:Math.sin(a)*19*power,
      z:Math.sin(a*2)*8*power,flip:1,
      tiltX:Math.sin(a)*.65,tiltZ:Math.cos(a)*.65};
  }
  return base;
}

function mutateTower(t,rng){
  t.height=clamp(t.height*between(rng,.64,1.52),2.1,23);
  t.width=clamp(t.width*between(rng,.83,1.20),.36,1.75);
  t.tiers=clamp(t.tiers+whole(rng,-1,2),1,7);
  t.twist+=between(rng,-.35,.35);
  if(rng()>.75)t.spire=!t.spire;
}

export function mutateGenome(base,mutationSeed){
  const rng=seededRandom(mutationSeed);
  const g=structuredClone(base);
  g.generation+=1;
  // Structural mutation: every evolution selects a different FORM, not merely x/y changes.
  g.form=((base.form??0)+whole(rng,1,3))%FORMS.length;
  g.formPower=clamp((base.formPower??1)*between(rng,.86,1.18),.75,1.35);
  if(rng()>.55)g.palette=whole(rng,0,3);
  for(const node of g.nodes){
    if(!node.hub){
      node.y=clamp(node.y+between(rng,-2.8,2.8),-9,11);
      node.size=clamp(node.size*between(rng,.79,1.23),2.4,7.5);
    }
    node.rotation+=between(rng,-.46,.46);
    node.teeth=clamp(node.teeth+whole(rng,-2,3),5,18);
    if(rng()>.65)node.style=whole(rng,0,2);
    for(const tower of node.towers)mutateTower(tower,rng);
    // Topological mutation inside the platform: spires can be born or removed.
    if(!node.hub && rng()>.42){
      if(rng()>.44 && node.towers.length<9){
        const t=structuredClone(node.towers[whole(rng,0,node.towers.length-1)]);
        const angle=between(rng,0,2*Math.PI);
        const dist=between(rng,.9,node.size*.7);
        t.x=Math.cos(angle)*dist;t.z=Math.sin(angle)*dist;
        mutateTower(t,rng);
        node.towers.push(t);
      }else if(node.towers.length>2)node.towers.splice(whole(rng,0,node.towers.length-1),1);
    }
  }
  g.crystalScale=clamp(g.crystalScale*between(rng,.85,1.17),.6,1.5);
  return g;
}

export function validateGraph(genome){
  const ids=new Set(genome.nodes.map(n=>n.id));
  if(!ids.has(0)||ids.size!==genome.nodes.length)return false;
  const adjacency=new Map([...ids].map(i=>[i,[]]));
  for(const [a,b] of genome.edges){
    if(!ids.has(a)||!ids.has(b)||a===b)return false;
    adjacency.get(a).push(b);adjacency.get(b).push(a);
  }
  const seen=new Set([0]),pending=[0];
  while(pending.length){
    for(const nxt of adjacency.get(pending.pop()))if(!seen.has(nxt)){seen.add(nxt);pending.push(nxt);}
  }
  return seen.size===ids.size;
}

/** Heuristics describe structural properties, NOT objective beauty. */
export function evaluateGenome(genome){
  const nodes=genome.nodes;
  const positions=nodes.map(n=>getPlatformPose(genome,n));
  const center=positions.reduce((acc,p)=>({x:acc.x+p.x,z:acc.z+p.z}),{x:0,z:0});
  const balance=clamp(1-Math.hypot(center.x/nodes.length,center.z/nodes.length)/8,0,1);
  const heights=nodes.flatMap(n=>n.towers.map(t=>t.height));
  const mean=heights.reduce((a,b)=>a+b,0)/heights.length;
  const variance=heights.reduce((a,b)=>a+(b-mean)**2,0)/heights.length;
  const diversity=clamp(Math.sqrt(variance)/5,0,1);
  const detail=clamp((heights.length/75)*.55+(nodes.reduce((a,n)=>a+n.teeth,0)/(nodes.length*16))*.45,0,1);
  const connectivity=validateGraph(genome)?1:0;
  const score=100*(.25*balance+.25*diversity+.2*detail+.3*connectivity);
  return {score:Math.round(score*10)/10,balance:Math.round(balance*100),
    variation:Math.round(diversity*100),detail:Math.round(detail*100),connected:!!connectivity,
    platforms:nodes.length,towers:heights.length,bridges:genome.edges.length,
    form:FORMS[genome.form??0],formId:genome.form??0};
}

/** Candidate score rewards coherence; structural novelty is a separate selection signal. */
export function evolveGenome(base,generationSeed,candidateCount=12){
  if(!Number.isInteger(candidateCount)||candidateCount<1)throw new Error('candidateCount must be >=1');
  let best=null,bestMetrics=null,bestRank=-Infinity;
  for(let i=0;i<candidateCount;i++){
    const candidate=mutateGenome(base,(Number(generationSeed)+Math.imul(i+1,7919))>>>0);
    const metrics=evaluateGenome(candidate);
    const sizeDelta=Math.abs(candidate.nodes.reduce((n,x)=>n+x.towers.length,0)-base.nodes.reduce((n,x)=>n+x.towers.length,0));
    // All candidates differ by architectural family. Prefer quality + visible variation.
    const rank=metrics.score+Math.min(6,sizeDelta*.8)+Math.abs(candidate.formPower-(base.formPower??1))*3;
    if(rank>bestRank){best=candidate;bestMetrics=metrics;bestRank=rank;}
  }
  return {genome:best,metrics:bestMetrics,candidates:candidateCount};
}

export function hashGenome(genome){
  const str=JSON.stringify(genome);let hash=2166136261;
  for(let i=0;i<str.length;i++){hash^=str.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return(hash>>>0).toString(16).padStart(8,'0');
}
