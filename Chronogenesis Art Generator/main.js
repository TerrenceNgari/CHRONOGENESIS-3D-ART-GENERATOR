import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ArchitecturalGrammar, CONFIG, buildAtmosphere } from './architecture.mjs';
import { FORMS, generateGenome, evolveGenome, evaluateGenome, hashGenome, seededRandom, getPlatformPose } from './core.mjs';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// CHRONOGENESIS V4: hierarchical grammar-based cinematic architectural art.
// Space-frame artistic transformation ≠ rigid-body physical simulation.
const $ = id => document.getElementById(id);
const viewport = $('viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080d1a);
scene.fog = new THREE.FogExp2(0x10182d, 0.0049);
const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 370);
const homeCamera = new THREE.Vector3(35, 26, 49); // Hero composition framing
camera.position.copy(homeCamera);
const renderer = new THREE.WebGLRenderer({antialias:true, alpha:false, preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
viewport.prepend(renderer.domElement);

const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.55, // Glow strength
  0.45, // Glow radius
  0.85 // Brightness threshold
);


composer.addPass(bloomPass);
const controls = new OrbitControls(camera, renderer.domElement);


controls.enableDamping = true;

controls.dampingFactor = 0.055;
controls.minDistance = 14;
controls.maxDistance = 160;
controls.target.set(0, 9, 0);
controls.maxPolarAngle = Math.PI * 0.93;

// Warm, directional highlights reveal architectural depth without white clipping.
scene.add(new THREE.HemisphereLight(0x9fb9d8, 0x171e2f, 1.45));
const keyLight=new THREE.DirectionalLight(0xffe3b6,2.7);
keyLight.position.set(25,55,30);
keyLight.castShadow=true;
keyLight.shadow.mapSize.set(1536,1536);
keyLight.shadow.camera.left=-65;keyLight.shadow.camera.right=65;
keyLight.shadow.camera.top=65;keyLight.shadow.camera.bottom=-65;
keyLight.shadow.camera.near=1;keyLight.shadow.camera.far=180;
keyLight.shadow.bias=-.00045;keyLight.shadow.normalBias=.025;
scene.add(keyLight);
const fillLight=new THREE.DirectionalLight(0x5f97e8,1.15);
fillLight.position.set(-25,8,-35);scene.add(fillLight);
const rimLight=new THREE.PointLight(0xa87ad7,180,145,1.7);
rimLight.position.set(-27,28,-22);scene.add(rimLight);
const goldLight=new THREE.PointLight(0xffc681,110,120,1.75);
goldLight.position.set(12,18,20);scene.add(goldLight);
const skyDome=buildAtmosphere(THREE,scene);

// Curated dark stone / brushed-gold palettes are deliberate, not random neon.
const PALETTES=[
  {
    stone:0x172a49, detail:0x284f72,
    roof:0x10203c, bronze:0x3c82ab,
    gold:0x29edff, deep:0x071426,
    glass:0x12b6ff, glass2:0x9164ff,
    light:0x9dffff
  },
  {
    stone:0x222746, detail:0x414e80,
    roof:0x14132d, bronze:0x7678b8,
    gold:0xa66aff, deep:0x0b1025,
    glass:0x8d6aff, glass2:0xff69d5,
    light:0xffa8ee
  },
  {
    stone:0x133b3d, detail:0x23656d,
    roof:0x0c2c36, bronze:0x39a0a0,
    gold:0x50ffdb, deep:0x061c24,
    glass:0x15efc8, glass2:0x5caaff,
    light:0xc4fff3
  },
  {
    stone:0x222f48, detail:0x425a81,
    roof:0x0b1c37, bronze:0x648fc3,
    gold:0x63baff, deep:0x081326,
    glass:0x4dd6ff, glass2:0xb47fff,
    light:0xe0f8ff
  }
];

// Shared scene state and material factory (restored in the V4 startup fix).
// These bindings must exist before rebuildWorld() is called.
const GRAVITIES = [

  {label:'DOWN',  vector:new THREE.Vector3( 0,-1, 0)},
  
  {label:'UP',    vector:new THREE.Vector3( 0, 1, 0)},
  {label:'WEST',  vector:new THREE.Vector3(-1, 0, 0)},
  {label:'EAST',  vector:new THREE.Vector3( 1, 0, 0)},
  {label:'NORTH', vector:new THREE.Vector3( 0, 0,-1)},
  {label:'SOUTH', vector:new THREE.Vector3( 0, 0, 1)},
];
let state = {
  seed:483921, genome:generateGenome(483921),
  gravity:0, branch:0, action:'Initial generation'
};
let history = [];
let branchedAfterRewind = false;
let world = null;
let platformRefs = [];
let bridgeRefs = [];
let sculptureRings = [];
let materials = null;
let transition = null;
let elapsed = 0;
const clock = new THREE.Clock();
const debris = [];
let toastTimeout;

function mat(color, metalness=.25, roughness=.65, emissive=0x000000, emissiveIntensity=0) {
  return new THREE.MeshStandardMaterial({color, metalness, roughness, emissive, emissiveIntensity});
}
function materialsFor(palette) {
 const p=PALETTES[palette % PALETTES.length];
  return {
    stone: mat(p.stone,.12,.82),
    stoneDetail: mat(p.detail,.18,.72),
    roof: mat(p.roof,.27,.51),
    bronze: mat(p.bronze,.65,.36),
    gold: mat(p.gold,.22,.31,p.gold,.65),
    deep: mat(p.deep,.14,.88),
    trim: mat(p.bronze,.53,.43),
    glass: new THREE.MeshStandardMaterial({color:p.glass,emissive:p.glass,emissiveIntensity:1.2,
      metalness:.08,roughness:.26,side:THREE.DoubleSide}),
    glass2: new THREE.MeshStandardMaterial({color:p.glass2,emissive:p.glass2,emissiveIntensity:1.1,
      metalness:.08,roughness:.26,side:THREE.DoubleSide}),
    light: mat(p.light,.05,.25,p.light,1.7),
    crystal: new THREE.MeshPhysicalMaterial({color:p.light,emissive:p.light,
      emissiveIntensity:1.2,metalness:.12,roughness:.19,clearcoat:.8,
      transparent:true,opacity:.9,flatShading:true}),
  };
}

// Reproducible surface grain, created once in memory; no image assets required.
function stoneGrain(){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');
  const pixels=ctx.createImageData(256,256);
  const rand=seededRandom(644209);
  for(let i=0;i<pixels.data.length;i+=4){
    const v=185+Math.floor(rand()*48);
    pixels.data[i]=v;pixels.data[i+1]=v;pixels.data[i+2]=v;
    pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  ctx.strokeStyle='rgba(26,30,38,.15)';ctx.lineWidth=1;
  for(let y=0;y<=256;y+=52){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();}
  const tex=new THREE.CanvasTexture(canvas);
  tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.RepeatWrapping;
  tex.repeat.set(2,2);tex.colorSpace=THREE.SRGBColorSpace;
  tex.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
  return tex;
}
const surfaceGrain=stoneGrain();

// CHRONOGENESIS V4: architectural models are assembled in architecture.mjs.
// The pure mathematical generation/evolution engine is still core.mjs.
let grammar=null;
function mesh(geom,material,parent,x=0,y=0,z=0){
  const obj=new THREE.Mesh(geom,material);obj.position.set(x,y,z);parent.add(obj);return obj;
}
function makeBridge(pair){
  const root=new THREE.Group();world.add(root);
  const beam=mesh(new THREE.BoxGeometry(1,1,1),materials.stoneDetail,root);
  const spine=mesh(new THREE.BoxGeometry(1,1,1),materials.gold,root);
  const leftRail=mesh(new THREE.BoxGeometry(1,1,1),materials.bronze,root);
  const rightRail=mesh(new THREE.BoxGeometry(1,1,1),materials.bronze,root);
  const lowerBeam=mesh(new THREE.BoxGeometry(1,1,1),materials.deep,root);
  return {from:pair[0],to:pair[1],beam,spine,leftRail,rightRail,lowerBeam};
}

function disposeWorld(group, oldMaterials){
  if(!group)return;
  scene.remove(group);
  group.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();});
  if(oldMaterials)Object.values(oldMaterials).forEach(m=>m.dispose());
}
function setWorldOpacity(mats,opacity){
  for(const material of Object.values(mats)){
    material.transparent=opacity<.995;
    material.opacity=opacity;
    material.depthWrite=opacity>.995;
  }
}
function rebuildWorld(animateChange=false){
  // Clean up any prior completed transition before constructing a new world.
  if(transition){
    disposeWorld(transition.previousWorld,transition.previousMaterials);
    transition=null;
  }
  const previousWorld=world;
  const previousMaterials=materials;
  const oldPositions=platformRefs.map(ref=>ref.root.position.clone());
  world=new THREE.Group();
  scene.add(world);
  materials=materialsFor(state.genome.palette);
  platformRefs=[];
  bridgeRefs=[];
  sculptureRings=[];
  debris.length=0;
  const rng=seededRandom(state.genome.seed+Math.imul(state.genome.generation+1,401));
  grammar=new ArchitecturalGrammar(THREE,materials,state.genome,{debris,rings:sculptureRings});
  for(const node of state.genome.nodes){
    const root=grammar.buildPlatform(node,world,rng);
    const pose=getPlatformPose(state.genome,node);
    root.position.set(pose.x,pose.y,pose.z);
    platformRefs.push({node,root});
  }
  for(const pair of state.genome.edges)bridgeRefs.push(makeBridge(pair));
  //grammar.buildFormOrnaments(world);
  if(animateChange && previousWorld){
    transition={previousWorld,previousMaterials,oldPositions,start:elapsed,duration:4.3};
    setWorldOpacity(materials,0);
    $('morphStatus').textContent='MORPHING · 0%';
  }else{
    disposeWorld(previousWorld,previousMaterials);
    updateWorld(elapsed,10);
    $('morphStatus').textContent='READY TO EVOLVE';
  }
  updateUI();
}

function smooth(t){return t*t*(3-2*t);}
function updateWorld(t,rate){
  const g=GRAVITIES[state.gravity].vector;
  const progress=transition?Math.max(0,Math.min(1,(t-transition.start)/transition.duration)):1;
  const blend=smooth(progress);
  for(const {node,root} of platformRefs){
    const pose=getPlatformPose(state.genome,node);
    const strength=(node.hub?1.25:3.2+node.id*.27)*node.lift;
    const wave=node.hub?0:Math.sin(t*.45+node.id*.9)*.32;
    const desired=new THREE.Vector3(pose.x,pose.y+wave,pose.z).addScaledVector(g,strength);
    if(transition){
      const origin=transition.oldPositions[node.id]??new THREE.Vector3(0,0,0);
      root.position.lerpVectors(origin,desired,blend);
      const growing=.09+.91*smooth(Math.max(0,Math.min(1,progress*1.2-.08)));
      root.scale.setScalar(growing);
    }else{
      root.position.lerp(desired,Math.min(1,rate));
      root.scale.setScalar(1);
    }
    // A flip rotates architectural elements instead of abruptly reflecting them.
    const flipAngle=pose.flip===-1?Math.PI:0;
    const torque=node.hub?.025:.085;
    const tiltX=pose.tiltX+(g.z*torque)+flipAngle;
    const tiltZ=pose.tiltZ-g.x*torque;
    root.rotation.x+=((transition?tiltX*blend:tiltX)-root.rotation.x)*Math.min(1,transition?1:rate*.6);
    root.rotation.z+=((transition?tiltZ*blend:tiltZ)-root.rotation.z)*Math.min(1,transition?1:rate*.6);
    root.rotation.y=node.rotation+Math.sin(t*.11+node.id)*.008;
  }
  for(const bridge of bridgeRefs){
    const a=platformRefs[bridge.from].root.position;
    const b=platformRefs[bridge.to].root.position;
    const dir=new THREE.Vector3().subVectors(b,a);
    const length=Math.max(.01,dir.length());
    dir.multiplyScalar(1/length);
    const midpoint=new THREE.Vector3().addVectors(a,b).multiplyScalar(.5);
    const up=new THREE.Vector3(0,1,0);
    const cross=new THREE.Vector3().crossVectors(dir,up).normalize();
    if(cross.lengthSq()<.01)cross.set(1,0,0);
    const quat=new THREE.Quaternion().setFromUnitVectors(up,dir);
    const s=transition?Math.max(.02,blend):1;
    // Recalculate offsets each frame. Never translate() every frame:
    // that previously accumulated unwanted drift in V3 bridge rails.
    function place(segment,side,depth,width,beamLength){
      segment.position.copy(midpoint).addScaledVector(cross,side);
      segment.position.y+=depth;
      segment.quaternion.copy(quat);
      segment.scale.set(width*s,beamLength,width*s);
    }
    place(bridge.beam,0,0,.77,length);
    place(bridge.lowerBeam,0,-.55,.58,length);
    place(bridge.spine,0,.40,.10,length*1.002);
    place(bridge.leftRail,.65,.64,.13,length*1.005);
    place(bridge.rightRail,-.65,.64,.13,length*1.005);
  }
  for(const {m,phase,speed} of debris){
    m.rotation.y=t*speed;
    m.rotation.z=t*speed*.3;
    m.scale.setScalar(1+Math.sin(t*1.2+phase)*.08);
  }
  for(const {m,speed} of sculptureRings)m.rotation.y+=speed/60;
  if(transition){
    setWorldOpacity(materials,Math.min(1,blend*1.6));
    setWorldOpacity(transition.previousMaterials,Math.max(0,1-blend*1.4));
    transition.previousWorld.scale.setScalar(1-blend*.25);
    transition.previousWorld.position.y=blend*5;
    $('morphStatus').textContent=`RECONSTRUCTING · ${Math.round(progress*100)}%`;
    if(progress>=1){
      disposeWorld(transition.previousWorld,transition.previousMaterials);
      transition=null;
      setWorldOpacity(materials,1);
      $('morphStatus').textContent='TRANSFORMATION COMPLETE';
      $('evolve').disabled=false;
      $('generate').disabled=false;
      $('rewind').disabled=false;
    }
  }
}

function makeStars() {
  const r=seededRandom(994461);
  const positions=[];
  for(let i=0;i<1400;i++) {
    const a=r()*Math.PI*2, z=r()*2-1;
    const radius=Math.sqrt(1-z*z);
    const dist=85 + r()*90;
    positions.push(Math.cos(a)*radius*dist,z*dist,Math.sin(a)*radius*dist);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const stars=new THREE.Points(geometry,new THREE.PointsMaterial({color:0x9bbce7,size:.25,transparent:true,opacity:.66,depthWrite:false}));
  scene.add(stars);
}
makeStars();

function copyState(s) {return JSON.parse(JSON.stringify(s));}
function applyAction(next, description) {
  if(transition){showToast('Finish this transformation before another action');return;}
  const shouldRebuild = next.genome !== state.genome;
  history.push(copyState(state));
  if(history.length>28) history.shift();
  const increment = branchedAfterRewind ? 1 : 0;
  branchedAfterRewind = false;
  state=copyState({...next,branch:state.branch+increment,action:description});
  if(shouldRebuild){
    rebuildWorld(true);
    $('evolve').disabled=true;
    $('generate').disabled=true;
    $('rewind').disabled=true;
  }
  else updateUI();
  showToast(description);
}

function generateNew() {
  const val=Number($('seed').value);
  if(!Number.isInteger(val)||val<1||val>4294967295){showToast('Enter an integer seed between 1 and 4294967295');return;}
  applyAction({...state,seed:val,genome:generateGenome(val),gravity:0},'New architectural world generated');
}
function evolve() {
  // A reproducible candidate set for a given world, branch and generation.
  const mutationSeed=(state.seed ^ Math.imul(state.genome.generation+1,2654435761) ^ Math.imul(state.branch+1,9929))>>>0;
  const result=evolveGenome(state.genome,mutationSeed,12);
  applyAction({...state,genome:result.genome},`Evolved 12 candidate sculptures — selected score ${result.metrics.score}`);
}
function gravity(index) {
  if(index===state.gravity)return;
  applyAction({...state,gravity:index},`Gravity field changed: ${GRAVITIES[index].label}`);
}
function rewind() {
  if(transition){showToast('Finish this transformation before rewinding');return;}
  if(!history.length){showToast('No earlier state available');return;}
  state=history.pop();
  branchedAfterRewind=true;
  $('seed').value=state.seed;
  rebuildWorld(true);
  $('evolve').disabled=true;$('generate').disabled=true;$('rewind').disabled=true;
  showToast('Reconstructing an earlier sculpture — choose a new future');
}
function updateUI() {
  const m=evaluateGenome(state.genome);
  $('score').textContent=m.score.toFixed(1);
  $('platforms').textContent=m.platforms;
  $('towers').textContent=m.towers;
  $('bridges').textContent=m.bridges;
  $('generation').textContent=state.genome.generation;
  $('formName').textContent=FORMS[state.genome.form??0];
  $('branch').textContent=state.branch<26?String.fromCharCode(65+state.branch):String(state.branch+1);
  $('steps').textContent=`${history.length} SAVED`;
  $('historyLabels').textContent=`Present: ${state.action}`;
  $('fingerprint').textContent=hashGenome(state.genome).toUpperCase();
  $('sceneMeta').textContent=`SEED ${state.seed} · GEN ${state.genome.generation} · BRANCH ${state.branch+1}`;
  $('connectivity').textContent=m.connected?'● GRAPH INTEGRITY: VERIFIED':'● GRAPH INTEGRITY: FAILED';
  $('connectivity').style.color=m.connected?'#74d9b9':'#ff938d';
  for(const [name,val] of [['balance',m.balance],['variation',m.variation],['detail',m.detail]]){
    $(name+'Num').textContent=val+'%';
    $(name+'Bar').style.width=val+'%';
  }
  document.querySelectorAll('[data-gravity]').forEach(b=>{
    const active=Number(b.dataset.gravity)===state.gravity;
    b.classList.toggle('active',active);
    b.setAttribute('aria-pressed',active?'true':'false');
  });
}
function showToast(message) {
  const toast=$('toast');
  toast.textContent=message;
  toast.classList.add('shown');
  clearTimeout(toastTimeout);
  toastTimeout=setTimeout(()=>toast.classList.remove('shown'),2200);
}
function resetView(){camera.position.copy(homeCamera);controls.target.set(0,9,0);controls.update();showToast('Camera restored');}
function download(blob,filename) {
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=filename;
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),500);
}
function exportJson(){
  const exportData={project:'CHRONOGENESIS',algorithm:'TAGE',exported:new Date().toISOString(),state,metrics:evaluateGenome(state.genome),fingerprint:hashGenome(state.genome)};
  download(new Blob([JSON.stringify(exportData,null,2)],{type:'application/json'}),`Chronogenesis Seed ${state.seed} Gen ${state.genome.generation}.json`);
  showToast('World data exported');
}
function exportImage(){
  renderer.render();
  renderer.domElement.toBlob(blob=>{
    if(blob) download(blob,`Chronogenesis Seed ${state.seed} Gen ${state.genome.generation}.png`);
    else showToast('Could not export image');
  },'image/png');
}

$('generate').addEventListener('click',generateNew);
$('randomSeed').addEventListener('click',()=>{
  $('seed').value=Math.floor(Math.random()*4294967294)+1;
  generateNew();
});
$('evolve').addEventListener('click',evolve);
$('rewind').addEventListener('click',rewind);
$('resetView').addEventListener('click',resetView);
$('exportJson').addEventListener('click',exportJson);
$('exportImage').addEventListener('click',exportImage);
$('cinemaMode').addEventListener('click',()=>{
  document.querySelector('.shell').classList.toggle('cinematic');
  $('cinemaMode').textContent=document.querySelector('.shell').classList.contains('cinematic')?'↩ EXIT CINEMA':'⛶ CINEMATIC VIEW';
  setTimeout(resize,40);
});
document.querySelectorAll('[data-gravity]').forEach(btn=>btn.addEventListener('click',()=>gravity(Number(btn.dataset.gravity))));
document.addEventListener('keydown',event=>{
  const target=event.target;
  if(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
  if(event.repeat)return;
  if(event.key.toLowerCase()==='g')gravity((state.gravity+1)%6);
  if(event.key.toLowerCase()==='r')rewind();
  if(event.key.toLowerCase()==='e')evolve();
  if(event.key.toLowerCase()==='n')generateNew();
  if(event.key.toLowerCase()==='f')$('cinemaMode').click();
});

function resize() {
  const w=viewport.clientWidth,h=viewport.clientHeight;
  if(!w||!h)return;
  camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
  composer.setSize(w,h);
}
window.addEventListener('resize',resize);
new ResizeObserver(resize).observe(viewport);

try {
  rebuildWorld();
  resize();
  $('loading').classList.add('hidden');
  function animate() {
    requestAnimationFrame(animate);
    const dt=Math.min(clock.getDelta(),0.06);
    elapsed+=dt;
    if(skyDome.material.uniforms)skyDome.material.uniforms.uTime.value=elapsed;
    updateWorld(elapsed,Math.min(1,dt*2.2));
    controls.update();
    renderer.render(scene,camera);
  }
  animate();
}catch(err){
  console.error(err);
  $('loading').textContent=`RENDERING ERROR: ${err.message} — OPEN DEVELOPER CONSOLE FOR DETAILS`;
}
