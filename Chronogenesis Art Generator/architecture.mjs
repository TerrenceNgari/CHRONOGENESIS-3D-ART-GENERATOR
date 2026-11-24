/**
 * CHRONOGENESIS V4 — Hierarchical architectural shape grammar.
 *
 * All visible buildings are assembled from mathematical rules, meshes,
 * splines, and the seeded genome. No imported building assets are used.
 * Generated forms are sculptures, not physically engineered buildings.
 *
 * ARCHITECTURAL CONCEPTS:
 *     WORLD → ISLANDS → MAJOR HALLS / TOWERS → FACADES → MOTIFS → TRACERY
 *
 * Try editing CONFIG at the top: every change has a visible artistic impact.
 */

export const CONFIG = {
  monumentScale: 1.23,    // Overall floating-island scale
  facadeBays: 5,          // Number of window/column bays along central nave
  ornamentLevel: 2,       // 0 = silhouettes, 1 = windows, 2 = tracery + buttresses
  archCurvature: 0.82,    // Controls Gothic arches; ~0.5–1.2 recommended
  spireStretch: 1.16,     // Vertical emphasis on major spires
  bronzeLineWeight: 0.075,
};

export class ArchitecturalGrammar {
  constructor(THREE, materials, genome, hooks = {}) {
    this.T = THREE;
    this.m = materials;
    this.g = genome;
    this.debris = hooks.debris || [];
    this.rings = hooks.rings || [];
  }

  mesh(geometry, material, parent, x=0,y=0,z=0, shadow=false) 
  {
    const obj = new this.T.Mesh(geometry, material);
    
    obj.position.set(x,y,z);

    if (shadow) { obj.castShadow = true; obj.receiveShadow = true; }

    parent.add(obj);

    return obj;
  }
  box(parent, x,y,z,w,h,d, material=this.m.stone, shadows=false) 
  {
    return this.mesh(new this.T.BoxGeometry(w,h,d), material,parent,x,y,z,shadows);
  }
  cylinder(parent, x,y,z, top,bottom,height,material=this.m.stone,sides=12,shadows=false)
  {
    return this.mesh(new this.T.CylinderGeometry(top,bottom,height,sides),material,parent,x,y,z,shadows);
  }
  line(parent,a,b,width,material=this.m.trim,round=false){
    const A=new this.T.Vector3(...a), B=new this.T.Vector3(...b);

    const delta=new this.T.Vector3().subVectors(B,A), length=delta.length();

    if(length<.0001)return null;

    const obj=this.mesh(round ? new this.T.CylinderGeometry(width,width,length,7)

      : new this.T.BoxGeometry(width,length,width),material,parent);
    obj.position.copy(A).add(B).multiplyScalar(.5);
    obj.quaternion.setFromUnitVectors(new this.T.Vector3(0,1,0),delta.multiplyScalar(1/length));
    return obj;
  }
  tube(parent,points,radius,material=this.m.trim,closed=false){
    const curve=new this.T.CatmullRomCurve3(points.map(p=>new this.T.Vector3(...p)),closed,'centripetal',.5);
    return this.mesh(new this.T.TubeGeometry(curve,Math.min(128,Math.max(16,points.length*5)),radius,7,closed),material,parent);
  }
  torus(parent,x,y,z,radius,pipe,material=this.m.trim,rotateX=Math.PI/2){
    const ring=this.mesh(new this.T.TorusGeometry(radius,pipe,7,72),material,parent,x,y,z);
    ring.rotation.x=rotateX;
    return ring;
  }
  columns(parent, w, h, d, count=6, y=0, colSize=.13){
    for(let i=0;i<count;i++){
      const x=(i-(count-1)/2) * (w/(count-1));
      this.cylinder(parent,x,y+h/2,d/2,.12+colSize*.4,.15+colSize*.5,h,this.m.trim,8);
      this.box(parent,x,y+.14,d/2,colSize*2.0,.28,colSize*2.0,this.m.bronze);
      this.box(parent,x,y+h-.17,d/2,colSize*2.6,.33,colSize*2.6,this.m.bronze);
    }
  }
  // A sharp, two-curve arch has a markedly different appearance from a semicircle.
  pointedArch(parent, halfW, rise, y, z=0, material=this.m.bronze, thickness=.13, withLegs=true){
    const p=CONFIG.archCurvature;
    for(const side of [-1,1]){
      const start=[side*halfW,y,z];
      const mid=[side*halfW*(.55-p*.20),y+rise*.58,z];
      const peak=[0,y+rise,z];
      const curve=new this.T.QuadraticBezierCurve3(
        new this.T.Vector3(...start),new this.T.Vector3(...mid),new this.T.Vector3(...peak));
      this.mesh(new this.T.TubeGeometry(curve,14,thickness,6,false),material,parent);
      if(withLegs)this.line(parent,[side*halfW,0,z],[side*halfW,y,z],thickness,material,true);
    }
  }
  window(parent,x,y,z,w=1.05,h=3.1,rotationY=0,palette=0){
    const holder=new this.T.Group(); holder.position.set(x,y,z);holder.rotation.y=rotationY;parent.add(holder);
    const glass=palette%2===0?this.m.glass:this.m.glass2;
    this.box(holder,0,0,0,w,h*.78,.075,this.m.deep);
    this.box(holder,0,-.07,.052,w*.78,h*.67,.02,glass);
    const sp=new this.T.Shape();
    sp.moveTo(-w*.39,h*.26);sp.lineTo(0,h*.51);sp.lineTo(w*.39,h*.26);sp.closePath();
    this.mesh(new this.T.ShapeGeometry(sp),glass,holder,0,0,.064);
    this.pointedArch(holder,w*.48,h*.32,h*.19,.09,this.m.bronze,.055,true);
    this.box(holder,0,-h*.405,.09,w*1.15,.12,.19,this.m.trim);
    this.line(holder,[0,-h*.39,.13],[0,h*.46,.13],.038,this.m.bronze,true);
    this.line(holder,[-w*.36,-h*.03,.14],[w*.36,-h*.03,.14],.04,this.m.bronze,true);
    if(CONFIG.ornamentLevel>=2){
      this.torus(holder,0,h*.12,.14,w*.16,.037,this.m.gold,0);
      for(const q of [-1,1]){
        this.line(holder,[q*w*.25,h*.05,.13],[0,h*.36,.13],.023,this.m.bronze,true);
      }
    }
    return holder;
  }
  roseWindow(parent,x,y,z,r=1.3,rotationY=0){

    const group=new this.T.Group();group.position.set(x,y,z);group.rotation.y=rotationY;parent.add(group);
    this.mesh(new this.T.CircleGeometry(r*.93,24),this.m.deep,group,0,0,0);
    this.mesh(new this.T.CircleGeometry(r*.82,24),this.m.glass2,group,0,0,.028);
    this.torus(group,0,0,.08,r,.15,this.m.bronze,0);
    this.torus(group,0,0,.11,r*.42,.075,this.m.gold,0);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      this.line(group,[Math.cos(a)*r*.40,Math.sin(a)*r*.40,.10],
        [Math.cos(a)*r*.92,Math.sin(a)*r*.92,.10],.053,this.m.bronze,true);
    }
    this.mesh(new this.T.IcosahedronGeometry(.26,0),this.m.light,group,0,0,.18);
  }
  // Flying buttresses are geometric support arches linked to an outer pier.
  flyingButtress(parent,side,z,wallX=4,wallTop=8)
  {
    const x0=side*wallX, x1=side*(wallX+2.4);

    this.cylinder(parent,x1,3.6,z,.36,.44,7.2,this.m.stoneDetail,8,true);

    this.box(parent,x1,7.3,z,1.15,.35,1.25,this.m.bronze);

    this.tube(parent,[[x0,wallTop,z],[x0+side*.3,wallTop+1.3,z],

      [x1-side*.7,wallTop-.8,z],[x1,6.9,z]],.20,this.m.trim);

    this.tube(parent,[[x0,wallTop-.95,z],[x0+side*.7,wallTop-.2,z],
      
      [x1-side*.5,5.5,z],[x1,4.6,z]],.1,this.m.bronze);
    const fin=this.mesh(new this.T.ConeGeometry(.42,2.2,6),this.m.bronze,parent,x1,8.3,z);
    fin.rotation.y=Math.PI/6;
  }
  spire(parent,x,y,z,r,h){
    this.cylinder(parent,x,y+h*.15,z,r*.48,r*.68,h*.30,this.m.stoneDetail,8,true);
    this.cylinder(parent,x,y+h*.39,z,r*.32,r*.52,h*.18,this.m.trim,8);
    this.mesh(new this.T.ConeGeometry(r*.72,h*.45*CONFIG.spireStretch,8),
      this.m.roof,parent,x,y+h*.71,z,true);
    this.mesh(new this.T.IcosahedronGeometry(r*.26,0),this.m.light,parent,x,y+h*.97,z);
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2;
      this.line(parent,[x+Math.cos(a)*r*.48,y+h*.18,z+Math.sin(a)*r*.48],
        [x,y+h*.80,z],.045,this.m.gold,true);
    }
  }
  // Castle tower made from separate modules: base, shaft, gallery, lancets, crown.
  tower(parent,x,z,w,h,style=0){
    const group=new this.T.Group(); group.position.set(x,.52,z); parent.add(group);
    const count=style===0?8:style===1?6:10;
    this.cylinder(group,0,1.0,0,w*1.13,w*1.27,2.0,this.m.deep,count,true);
    const floors=Math.max(2,Math.floor(h/3.4));
    for(let f=0;f<floors;f++){
      const yy=2+f*(h-2)/floors, fh=(h-2)/floors;
      const taper=1-f/floors*.25;
      this.cylinder(group,0,yy+fh/2,0,w*taper*.9,w*taper,fh*.96,this.m.stone,count,f<2);
      this.cylinder(group,0,yy+.08,0,w*taper*1.08,w*taper*1.08,.18,this.m.bronze,count);
      if(CONFIG.ornamentLevel>0 && f%2===0 && h>=7){
        const faces=h>14?2:1;
        for(let d=0;d<faces;d++){
          const a=d*Math.PI;
          const radius=w*taper*.94;
          const win=this.window(group,Math.sin(a)*radius,yy+fh*.5,Math.cos(a)*radius,
            Math.min(.55,w*.45),Math.min(1.9,fh*.65),a,f+d);
        }
      }
    }
    this.cylinder(group,0,h+.18,0,w*1.26,w*1.26,.42,this.m.trim,count);
    if(style===1){
      // A dome changes the upper silhouette radically.
      this.mesh(new this.T.SphereGeometry(w*1.15,16,8,0,Math.PI*2,0,Math.PI/2),
        this.m.roof,group,0,h+.4,0,true);
      this.spire(group,0,h+w*1.13,0,w*.35,2.4);
    }else if(style===2){
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        this.box(group,Math.sin(a)*w*1.1,h+.45,Math.cos(a)*w*1.1,.4,.65,.4,this.m.bronze);
      }
      this.mesh(new this.T.ConeGeometry(w*1.08,h*.34,8),this.m.roof,group,0,h+h*.17+.46,0,true);
      this.torus(group,0,h+.1,0,w*.98,.12,this.m.gold);
    }else{
      this.cylinder(group,0,h+.65,0,w*.9,w*1.1,.8,this.m.trim,count);
      this.spire(group,0,h+.95,0,w*.75,h*.36);
    }
    return group;
  }
  // A dense focal point: central nave, luminous cathedral façade, transept,
  // four towers, a ribbed roof and a buttress gallery.
  grandCathedral(parent,size,rng){
    const group=new this.T.Group();group.position.y=.62;parent.add(group);
    const W=7.4,L=14.6,H=10.9;
    this.box(group,0,.32,0,W+3.4,.6,L+2.8,this.m.bronze,true);
    this.box(group,0,1.14,0,W+1.6,1.15,L+1.0,this.m.deep,true);
    this.box(group,0,1.9+H/2,0,W,H,L,this.m.stone,true);
    this.box(group,0,1.9+H*.55,0,W+4.9,H*.56,5.1,this.m.stoneDetail,true);
    // Pilasters and long arched windows are generated at regular bays.
    for(let i=0;i<CONFIG.facadeBays;i++){
      const z=-L*.40 + i*(L*.8/(CONFIG.facadeBays-1));
      for(const s of [-1,1]){
        const win=this.window(group,s*(W*.5+.07),8.0,z,1.07,3.95,s*Math.PI/2,i);
        this.flyingButtress(group,s,z,W*.5,11.25);
        this.box(group,s*(W*.5+.2),5.1,z, .46,6.8,.36,this.m.trim);
      }
    }
    // Deep profiled gables and high-pitched slate roofs.
    for(const sign of [-1,1]){
      const roof=this.box(group,sign*W*.25,13.35,0,
        Math.hypot(W*.5,4.1)+.1,.37,L+.75,this.m.roof,true);
      roof.rotation.z=sign*.84;
      for(let i=0;i<9;i++){
        const z=-L*.48+i*L*.12;
        this.line(group,[0,15.45,z],[sign*(W*.5+.35),11.35,z],.08,this.m.gold);
      }
    }
    this.line(group,[0,15.6,-L*.52],[0,15.6,L*.52],.15,this.m.gold,true);
    // Front façade portals and traceried circular rose window.
    this.box(group,0,7,L/2+.23,W+.50,11.3,.60,this.m.stoneDetail);
    this.roseWindow(group,0,10.5,L/2+.60,2.00);
    for(const sign of [-1,1]){
      this.window(group,sign*2.8,7.2,L/2+.65,.83,2.8,0,1);
      this.pointedArch(group,1.45,2.7,3.25,L/2+.69,this.m.bronze,.16,true);
    }
    this.box(group,0,2.6,L/2+.64,2.30,4.3,.1,this.m.deep);
    // Front staircase, landing and glowing ceremonial entrance.
    for(let i=0;i<4;i++){
      this.box(group,0,.28+i*.16,L/2+1.4+i*.42,4.8-i*.38,.35,1.45,this.m.stoneDetail);
    }
    for(const sign of [-1,1]){
      this.tower(group,sign*5.18,5.5,1.58,20.0,0);
      this.tower(group,sign*5.18,-5.65,1.38,16.6,2);
    }
    // Illuminated crossing dome and ornament above the nave.
    this.cylinder(group,0,16.4,0,2.52,2.80,1.2,this.m.trim,12);
    this.mesh(new this.T.SphereGeometry(2.63,22,12,0,Math.PI*2,0,Math.PI/2),
      this.m.roof,group,0,17.0,0,true);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      this.line(group,[Math.sin(a)*2.5,17.0,Math.cos(a)*2.5],
        [0,19.55,0],.057,this.m.gold,true);
    }
    this.spire(group,0,19.5,0,.85,5.1);
    // Generated buttress colonnade connects the mass visually to the island.
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      const x=Math.cos(a)*(size*.78),z=Math.sin(a)*(size*.78);
      this.cylinder(group,x,2.0,z,.25,.37,3.9,this.m.stoneDetail,7);
      this.box(group,x,4.0,z,.8,.25,.8,this.m.gold);
    }
    return group;
  }
  // Smaller but architecturally distinct pavilions on the other islands.
  cloister(parent,s,variant=0){
    const g=new this.T.Group();g.position.y=.56;parent.add(g);
    const w=s*.95, d=s*1.02, h=3.9;
    this.box(g,0,.48,0,w*1.6,.95,d*1.45,this.m.deep);
    this.box(g,0,2.2,0,w*1.35,3.4,d*1.2,this.m.stone);
    for(let i=0;i<4;i++){
      const x=(i-1.5)*w*.40;
      this.pointedArch(g,w*.16,1.18,2.7,d*.62,this.m.gold,.065,true);
      this.window(g,x,2.65,d*.62+.07,w*.28,1.75,0,i);
    }
    const roof=this.mesh(new this.T.ConeGeometry(w*1.08,2.4,4),this.m.roof,g,0,5.06,0);
    roof.rotation.y=Math.PI/4;
    for(let side of [-1,1]){
      this.tower(g,side*w*.72,-d*.52,.59,5.3+variant,variant%3);
    }
    return g;
  }
  observatory(parent,s,variant=0){
    const g=new this.T.Group();g.position.y=.54;parent.add(g);
    const r=s*.64;
    this.cylinder(g,0,.52,0,r*1.34,r*1.34,1.05,this.m.bronze,12);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      const x=Math.cos(a)*r,z=Math.sin(a)*r;
      this.cylinder(g,x,3.15,z,.14,.19,5.2,this.m.trim,8);
      this.box(g,x,5.85,z,.5,.35,.52,this.m.gold);
    }
    this.cylinder(g,0,6.0,0,r*1.22,r*1.22,.64,this.m.stoneDetail,12);
    this.mesh(new this.T.SphereGeometry(r*1.22,20,9,0,Math.PI*2,0,Math.PI/2),
      this.m.roof,g,0,6.33,0);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      this.line(g,[Math.cos(a)*r*1.2,6.38,Math.sin(a)*r*1.2],
        [0,6.4+r*1.20,0],.052,this.m.gold,true);
    }
    this.roseWindow(g,0,3.7,r+.08,r*.27);
    this.spire(g,0,6.3+r*1.2,0,.45,3.2+variant);
    return g;
  }
  bellSanctuary(parent,s,variant=0){
    const g=new this.T.Group();g.position.y=.55;parent.add(g);
    this.box(g,0,.55,0,s*1.48,1.1,s*1.48,this.m.deep);
    for(let q=0;q<4;q++){
      const a=q*Math.PI/2;
      const x=Math.cos(a)*s*.56,z=Math.sin(a)*s*.56;
      this.tower(g,x,z,.72,8+variant*.7,q%3);
    }
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2;
      const group=new this.T.Group();group.rotation.y=a;g.add(group);
      this.pointedArch(group,s*.50,2.6,2.5,s*.54,this.m.bronze,.14,true);
    }
    this.mesh(new this.T.OctahedronGeometry(s*.50,1),this.m.crystal,g,0,7.5,0);
    return g;
  }

// VS: Procedurally generated central energy megastructure
neonCore(parent, size, rng) {
  const g = new this.T.Group();
  g.position.y = 0.65;
  parent.add(g);

  const r = Math.min(size * 0.54, 6.4);
  const power = this.g.formPower ?? 1;
  const towers = this.g.nodes[0].towers;


  // Layered floating foundation.
  this.cylinder(g, 0, 0.6, 0,
    r * 1.38, r * 1.47, 1.2, this.m.deep, 12, true);

  this.cylinder(g, 0, 1.4, 0,
    r * 0.98, r * 1.13, 0.42, this.m.gold, 12);

  // Central reactor tower
  this.cylinder(g, 0, 6.5, 0,
    2.4, 3.0, 10, this.m.stone, 12, true);

  // Glowing energy bands.
  for (let y =3; y <=11; y += 2) {
    this.torus(g, 0, y, 0, 2.7, 0.11, this.m.gold);
  }

  // Eight pylons generated from genome tower heights.
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const height = 8 + towers[i % towers.length].height * 0.36;

    this.cylinder(g, x, height / 2 + 1, z,
      0.42, 0.75, height, this.m.stoneDetail, 8);

    this.cylinder(g, x, height + 1.15, z,
      0.68, 0.68, 0.25, this.m.gold, 8);

    this.mesh(
      new this.T.ConeGeometry(0.68, 1.2, 8),
      this.m.roof, g, x, height + 2.1, z
    );

    this.line(g,
      [x, height + 0.7, z],
      [x * 0.38, 12.4, z * 0.38],
      0.12, this.m.trim
    );
  }
  

  // Four suspended architectural wings,
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const wing = new this.T.Group();


    wing.position.set(
      Math.cos(a) * r * 0.63,
      3.9,
      Math.sin(a) * r * 0.63
    );
    wing.rotation.y = -a;
    g.add(wing);

    this.box(wing, 0, 0, 0,
      3, 2.7, 5.4, this.m.stoneDetail, true);

    this.box(wing, 0, 1.47, 0,
      3.5, 0.2, 5.9, this.m.trim);

    this.box(wing, 0, -0.9, 2.73,
      2.7, 0.15, 0.13, this.m.gold);

    for (const side of [-1, 1]) {
      for (let k = -1; k <= 1; k++) {
        this.box(wing,
          side * 1.55, 0.28, k * 1.3,
          0.06, 1.05, 0.75, this.m.glass
        );
      }
    }
}

// Levitation chamber with a generated crystal.
const core = this.mesh(
  new this.T.IcosahedronGeometry(2.5 * power, 1),
  this.m.crystal, g, 0, 16, 0
);

this.debris.push({
  m: core,
  phase: 2.1,
  speed: 0.24
});

// Two rotating containment rings.
for (let i = 0; i < 2; i++) {
  const ring = this.torus(
    g, 0, 16, 0,
    5 + i * 1.2, 0.14,
    i === 0 ? this.m.gold : this.m.glass2,
    0
  );

  ring.rotation.set(0.5 + i * 0.5, 0.3, i * 0.05);
  this.rings.push({
    m: ring,
    speed: i ? -0.07 : 0.06
  });
}

return g;

}


helixSpire(parent, size, node, rng) {
  const g = new this.T.Group();
  parent.add(g);

  // Genome-controlled architectural parameters.
  const tower = node.towers[0];
  const height = 8 + tower.height * 0.5;
  const radius = Math.min(size * 0.35, 2.8);
  const turns = 1.5 + rng() * 2;
  const floors = 18;

  // Central structural spine.
  this.cylinder(
    g, 0, height / 2, 0,
    0.35, 0.55, height,
    this.m.stoneDetail, 8
  );

  // Procedurally generated twisting floors.
  for (let i = 0; i < floors; i++) {
    const t = i / (floors - 1);
    const y = 0.6 + t * height;
    const angle = t * Math.PI * 2 * turns;

    const x = Math.cos(angle) * radius * 0.32;
    const z = Math.sin(angle) * radius * 0.32;

    const floor = new this.T.Group();
    floor.position.set(x, y, z);
    floor.rotation.y = angle;
    g.add(floor);

    this.box(
      floor, 0, 0, 0,
      radius * 1.7, 0.18, radius * 1.1,
      this.m.stone
    );

    // Illuminated floor perimeter.
    this.box(
      floor, 0, 0.12, 0,
      radius * 1.8, 0.055, radius * 1.2,
      this.m.gold
    );
  }

  // Helical energy conduits.
  for (let strand = 0; strand < 3; strand++) {
    let previous = null;

    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      const angle =
        t * Math.PI * 2 * turns +
        strand * Math.PI * 2 / 3;

      const point = [
        Math.cos(angle) * radius * 0.9,
        0.6 + t * height,
        Math.sin(angle) * radius * 0.9
      ];

      if (previous) {
        this.line(
          g, previous, point,
          0.065, this.m.gold
        );
      }

      previous = point;
    }
  }

  // Floating crystalline crown.
  const crown = this.mesh(
    new this.T.OctahedronGeometry(radius * 0.7, 0),
    this.m.crystal,
    g, 0, height + 1.6, 0
  );

  this.debris.push({
    m: crown,
    phase: rng() * Math.PI * 2,
    speed: 0.2
  });

  return g;
}


fracturedMonolith(parent, size, node, rng) {
  const g = new this.T.Group();
  g.position.y = 0.58;
  parent.add(g);

  const radius = Math.min(size * 0.38, 2.8);
  const fragments = 7 + Math.floor(rng() * 5);
  const totalHeight = 13 + rng() * 8;
  const gap = 0.22 + rng() * 0.35;
  const segmentHeight =
    (totalHeight - gap * (fragments - 1)) / fragments;

  const twist = (rng() - 0.5) * 0.7;
  const phase = rng() * Math.PI * 2;

  // Central energy spine.
  this.cylinder(
    g, 0, totalHeight / 2, 0,
    0.13, 0.13, totalHeight,
    this.m.gold, 8
  );

  for (let i = 0; i < fragments; i++) {
    const t = i / Math.max(1, fragments - 1);
    const y = segmentHeight / 2 +
      i * (segmentHeight + gap);

    // Controlled displacement creates the fractured effect.
    const displacement = Math.sin(t * Math.PI) * radius * 0.55;
    const angle = phase + i * 1.7;

    const x = Math.cos(angle) * displacement;
    const z = Math.sin(angle) * displacement;

    const fragment = new this.T.Group();
    fragment.position.set(x, y, z);
    fragment.rotation.set(
      (rng() - 0.5) * 0.16,
      twist * i,
      (rng() - 0.5) * 0.16
    );
    g.add(fragment);

    const width = radius * (1.4 - t * 0.4);

    // Main floating architectural fragment.
    this.box(
      fragment, 0, 0, 0,
      width, segmentHeight * 0.9, width,
      this.m.stone, true
    );

    // Glowing horizontal fracture surface.
    this.box(
      fragment, 0, segmentHeight * 0.46, 0,
      width * 1.06, 0.08, width * 1.06,
      this.m.gold
    );

    // Vertical illuminated facade.
    for (let side = -1; side <= 1; side += 2) {
      this.box(
        fragment,
        side * width * 0.5,
        0,
        0,
        0.07,
        segmentHeight * 0.72,
        width * 0.7,
        this.m.glass
      );
    }

    // Floating energy nodes around selected fragments.
    if (i % 2 === 0) {
      this.mesh(
        new this.T.OctahedronGeometry(radius * 0.22, 0),
        this.m.crystal,
        fragment,
        width * 0.75,
        0,
        0
      );
    }
  }

  // Suspended energy crown.
  const crown = this.mesh(
    new this.T.OctahedronGeometry(radius * 0.85, 0),
    this.m.crystal,
    g, 0, totalHeight + 1.5, 0
  );

  this.debris.push({
    m: crown,
    phase: rng() * Math.PI * 2,
    speed: 0.16
  });

  return g;
}




// Generates futristic satellite stations from each node.
neonOutpost(parent, size, node, rng) {
  const variant = 0;

  const g = new this.T.Group();
  g.position.y = 0.58;
  parent.add(g);

  const r = Math.min(size * 0.62, 4.3);

    this.cylinder(g, 0, 0.4, 0,
      r * 1.15, r * 1.35, 0.8, this.m.deep, 8);

    this.torus(g, 0, 0.92, 0,
      r * 1.1, 0.11, this.m.gold);

    if (variant === 0) {
      // Orbital research laboratory.
      this.cylinder(g, 0, 3.1, 0,
        r * 0.85, r * 0.9, 4.2, this.m.stone, 10);

      this.mesh(
        new this.T.SphereGeometry(
          r * 0.8, 16, 10,
          0, Math.PI * 2, 0, Math.PI / 2
        ),
        this.m.glass2, g, 0, 5.3, 0
      );

      this.torus(g, 0, 5.2, 0,
        r * 1.1, 0.12, this.m.gold);

    } else if (variant === 1) {
      // Vertical signal tower.
      this.cylinder(g, 0, 5, 0,
        r * 0.42, r * 0.72, 8.2,
        this.m.stoneDetail, 8);

      for (let y = 2; y <= 9; y += 1.7) {
        this.torus(g, 0, y, 0,
          r * 0.58, 0.1, this.m.gold);
      }

      this.mesh(
        new this.T.OctahedronGeometry(r * 0.62, 0),
        this.m.crystal, g, 0, 10.1, 0
      );

    } else {
      // Floating research gallery.
      this.box(g, 0, 2.6, 0,
        r * 2, 3.5, r * 1.5, this.m.stone, true);

      this.box(g, 0, 4.5, 0,
        r * 2.25, 0.24, r * 1.7, this.m.trim);

      for (let k = -2; k <= 2; k++) {
        this.box(g,
          k * r * 0.36, 2.8, r * 0.77,
          r * 0.22, 1.35, 0.1, this.m.glass
        );
      }

      this.torus(g, 0, 5.7, 0,
        r * 0.75, 0.13, this.m.gold, 0.35);
    }

    // Antenna heights respond to the generated genome.
    for (let i = 0; i < Math.min(2, node.towers.length); i++) {
      const t = node.towers[i];
      const x = Math.cos(i * Math.PI + 0.7) * r * 0.8;
      const z = Math.sin(i * Math.PI + 0.7) * r * 0.8;
      const h = 2 + t.height * 0.35;

      this.cylinder(g, x, h / 2 + 1, z,
        0.2, 0.34, h, this.m.stoneDetail, 6);

      this.mesh(
        new this.T.OctahedronGeometry(0.4, 0),
        this.m.light, g, x, h + 1.1, z
      );
    }

    return g;
  }



  buildPlatform(node,parent,rng){
    const group=new this.T.Group();parent.add(group);
    group.rotation.y=node.rotation;
    const s=node.size*CONFIG.monumentScale;
    const n=node.hub?16:12;
    // Floating fragments have layered masonry, corbels and a tapering undercroft.
    this.cylinder(group,0,0,0,s,s*1.03,.68,this.m.stone,n,true);
    this.cylinder(group,0,-.54,0,s*.94,s*.81,.40,this.m.bronze,n);
    this.cylinder(group,0,-1.30,0,s*.82,s*.62,1.25,this.m.deep,n,true);
    this.cylinder(group,0,-2.25,0,s*.66,s*.36,1.1,this.m.stoneDetail,n);
    const keel=this.mesh(new this.T.ConeGeometry(s*.35,3.6,n),this.m.deep,group,0,-4.38,0);
    keel.rotation.z=Math.PI;
    this.torus(group,0,.38,0,s*.98,.10,this.m.gold);
    this.torus(group,0,-.84,0,s*.77,.08,this.m.bronze);
    for(let i=0;i<node.teeth;i++){
      const a=i*2*Math.PI/node.teeth;
      const x=Math.cos(a)*s*.85,z=Math.sin(a)*s*.85;
      this.box(group,x,-.15,z,.50,1.2,.46,this.m.stoneDetail);
      this.line(group,[x*.85,-1.3,z*.85],[x*.56,-3.4,z*.56],.16,this.m.bronze);
    }
    // On an artistic world, each island is a constructed architectural object.
    
    if (node.hub) {
    this.neonCore(group, s, rng);
    } else {
    this.neonOutpost(group, s, node, rng);
    }

    const crystal=this.mesh(new this.T.IcosahedronGeometry(node.hub?1.2:.62,1),
      this.m.crystal,group,0,node.hub?22:10.2,0);
    this.debris.push({m:crystal,phase:node.id*.71,speed:.19+rng()*.13});
    return group;
  }
  buildFormOrnaments(world){
    const form=this.g.form??0;
    // Structural super-forms are generated from deterministic parametric curves.
    // They are NOT loaded meshes, and form choice is produced by the evolution engine.
    if(form===0){
      for(let i=0;i<6;i++){
        const a=i*Math.PI/6;
        const root=new this.T.Group();root.rotation.y=a;world.add(root);
        this.tube(root,[[-20,-7,0],[-18,2,0],[-12,11,0],[-6,16,0],[0,20,0],
          [6,16,0],[12,11,0],[18,2,0],[20,-7,0]],.24,this.m.stoneDetail);
        this.tube(root,[[-20,-7,.6],[-18,2,.6],[-12,11,.6],[-6,16,.6],[0,20,.6],
          [6,16,.6],[12,11,.6],[18,2,.6],[20,-7,.6]],.055,this.m.gold);
      }
    }else if(form===1){
      for(let strand=0;strand<3;strand++){
        const points=[];
        for(let i=0;i<=140;i++){
          const u=i/140, a=u*Math.PI*4.6+strand*2*Math.PI/3;
          const r=10+u*8;
          points.push([Math.cos(a)*r,-20+u*54,Math.sin(a)*r]);
        }
        this.tube(world,points,.44,strand===1?this.m.gold:this.m.stoneDetail);
      }
      for(let i=0;i<26;i++){
        const u=i/25,a=u*Math.PI*4.6;
        const y=-20+u*54,r=10+u*8;
        this.line(world,[Math.cos(a)*r,y,Math.sin(a)*r],
          [Math.cos(a+2*Math.PI/3)*r,y,Math.sin(a+2*Math.PI/3)*r],.10,this.m.bronze);
      }
    }else if(form===2){
      // Inverted Crown: radial vault and inverted hanging chapel shards.
      for(let i=0;i<3;i++){
        const r=19+i*2.8;
        this.torus(world,0,24+i*1.5,0,r,.31,i%2?this.m.gold:this.m.stoneDetail);
      }
      for(let i=0;i<22;i++){
        const a=i*2*Math.PI/22,r=20.3;
        this.line(world,[r*Math.cos(a),24,r*Math.sin(a)],
          [(r-2.7)*Math.cos(a+.09),13-(i%3)*2.8,(r-2.7)*Math.sin(a+.09)],
          .20,this.m.bronze);
        this.spire(world,r*Math.cos(a),7-(i%2)*2,r*Math.sin(a),.36,4.5+(i%4)*1.3);
      }
    }else{
      // Orbital Cathedral: armillary spheres, circular tracery, radial ribs.
      for(let k=0;k<3;k++){
        const ring=this.torus(world,0,8,0,23+k*2,.42-k*.08,
          k===1?this.m.gold:this.m.stoneDetail,0);
        ring.rotation.set(k*.53+.11,k*.23,k*.35+.18);
      }
      for(let i=0;i<20;i++){
        const a=i*Math.PI/10,r=23.3;
        this.line(world,[Math.cos(a)*r,Math.sin(a)*r+8,0],
          [Math.cos(a)*r*.68,Math.sin(a)*r*.68+8,0],.13,this.m.gold);
        this.mesh(new this.T.OctahedronGeometry(.45,0),this.m.light,
          world,Math.cos(a)*r,Math.sin(a)*r+8,0);
      }
    }
  }
}

/** Procedural cosmic sky, subtle enough not to compete with architecture. */
export function buildAtmosphere(T,scene){
  const geometry=new T.SphereGeometry(240,40,25);
  const material=new T.ShaderMaterial({
    side:T.BackSide,depthWrite:false,fog:false,
    uniforms:{uTime:{value:0}},
    vertexShader:`varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      precision mediump float; varying vec3 vPos;uniform float uTime;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
          mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){
        v+=noise(p)*a;p=p*2.04+vec2(31.7,13.2);a*=.49;}return v;}
      void main(){vec3 d=normalize(vPos);vec2 uv=vec2(atan(d.z,d.x)*.65,d.y*2.);
        float n=fbm(uv*2.8+vec2(.2,uTime*.0004));
        float filament=smoothstep(.49,.72,n)*.56;
        float aura=exp(-length(uv-vec2(.12,.12))*1.3);
        vec3 deep=vec3(.007,.012,.028);
        vec3 indigo=vec3(.055,.039,.14);
        vec3 blue=vec3(.025,.11,.16);
        vec3 col=mix(deep,indigo,filament);
        col+=blue*pow(max(0.,1.-length(uv-vec2(.9,.3))*.64),3.)*.34;
        col+=vec3(.05,.025,.09)*aura*.12;
        gl_FragColor=vec4(col,1.);}
    `
  });
  const sky=new T.Mesh(geometry,material);
  sky.renderOrder=-50;scene.add(sky);
  return sky;
}
