/* Sugar Strike — конфетный CS-стайл шутер (de_mansion, T vs CT, бомба, боты).
   Powered by @Denrech. Vendored Three.js r128 (global THREE). */
(function () {
"use strict";
const THREE = window.THREE;
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const rint = (n) => Math.floor(Math.random() * n);
const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
const TAU = Math.PI * 2;
const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

/* ============================ WEAPONS (из CS 1.6) ============================ */
// dmg — базовый урон в корпус; rpm — выстрелов/мин; mag/res — магазин/запас;
// reload — сек; spread — базовый разброс(рад); mspread — добавка в движении;
// auto — авто; pellets — дробин; recoil — подброс; price — $; kb — награда за килл;
// pen — доля урона сквозь броню; zoom — оптика; speed — множитель скорости.
const W = {
  knife:   { name:"Нож",       slot:"melee",  cat:"melee",  dmg:55,  rpm:120, mag:0,  res:0,  reload:0,  spread:0,     mspread:0,   auto:false, pellets:1, recoil:0,   price:0,    kb:1500, pen:1,   speed:1.10, em:"🔪", range:3 },
  glock:   { name:"Glock-18",  slot:"pistol", cat:"pistol", dmg:26,  rpm:400, mag:20, res:120,reload:2.2,spread:0.020, mspread:0.03,auto:false, pellets:1, recoil:0.9, price:400,  kb:300,  pen:0.5, speed:1.05, em:"🔫", range:60 },
  usp:     { name:"USP",       slot:"pistol", cat:"pistol", dmg:34,  rpm:352, mag:12, res:100,reload:2.2,spread:0.016, mspread:0.03,auto:false, pellets:1, recoil:1.0, price:500,  kb:300,  pen:0.55,speed:1.05, em:"🔫", range:70 },
  p228:    { name:"P228",      slot:"pistol", cat:"pistol", dmg:40,  rpm:333, mag:13, res:52, reload:2.3,spread:0.018, mspread:0.03,auto:false, pellets:1, recoil:1.1, price:600,  kb:300,  pen:0.65,speed:1.05, em:"🔫", range:65 },
  deagle:  { name:"Desert Eagle",slot:"pistol",cat:"pistol",dmg:58,  rpm:267, mag:7,  res:35, reload:2.2,spread:0.020, mspread:0.05,auto:false, pellets:1, recoil:2.4, price:650,  kb:300,  pen:0.75,speed:1.02, em:"🦅", range:80 },
  fiveseven:{name:"Five-Seven", slot:"pistol",cat:"pistol", dmg:30,  rpm:400, mag:20, res:100,reload:2.4,spread:0.017, mspread:0.03,auto:false, pellets:1, recoil:0.9, price:750,  kb:300,  pen:0.9, speed:1.05, em:"🔫", range:70 },
  m3:      { name:"M3 Дробовик",slot:"primary",cat:"shotgun",dmg:20, rpm:80,  mag:8,  res:32, reload:0.5,spread:0.075, mspread:0.02,auto:false, pellets:9, recoil:3.5, price:1700, kb:900,  pen:0.5, speed:0.96, em:"💥", range:22, shellReload:true },
  mp5:     { name:"MP5",       slot:"primary",cat:"smg",    dmg:26,  rpm:750, mag:30, res:120,reload:2.6,spread:0.022, mspread:0.05,auto:true,  pellets:1, recoil:1.2, price:1500, kb:600,  pen:0.5, speed:1.02, em:"🧨", range:65 },
  ump45:   { name:"UMP-45",    slot:"primary",cat:"smg",    dmg:30,  rpm:600, mag:25, res:100,reload:2.7,spread:0.024, mspread:0.05,auto:true,  pellets:1, recoil:1.3, price:1700, kb:600,  pen:0.6, speed:1.00, em:"🧨", range:60 },
  p90:     { name:"P90",       slot:"primary",cat:"smg",    dmg:24,  rpm:857, mag:50, res:100,reload:3.3,spread:0.026, mspread:0.05,auto:true,  pellets:1, recoil:1.1, price:2350, kb:300,  pen:0.7, speed:1.00, em:"🧨", range:65 },
  galil:   { name:"Galil",     slot:"primary",cat:"rifle",  dmg:30,  rpm:666, mag:35, res:90, reload:3.0,spread:0.020, mspread:0.06,auto:true,  pellets:1, recoil:1.6, price:2000, kb:300,  pen:0.85,speed:0.98, em:"🔩", range:90, team:"T" },
  famas:   { name:"FAMAS",     slot:"primary",cat:"rifle",  dmg:30,  rpm:750, mag:25, res:90, reload:3.3,spread:0.019, mspread:0.06,auto:true,  pellets:1, recoil:1.5, price:2250, kb:300,  pen:0.85,speed:0.98, em:"🔩", range:90, team:"CT" },
  ak47:    { name:"AK-47",     slot:"primary",cat:"rifle",  dmg:36,  rpm:600, mag:30, res:90, reload:2.5,spread:0.018, mspread:0.07,auto:true,  pellets:1, recoil:2.1, price:2500, kb:300,  pen:0.9, speed:0.96, em:"🎸", range:100, team:"T" },
  m4a1:    { name:"M4A1",      slot:"primary",cat:"rifle",  dmg:32,  rpm:666, mag:30, res:90, reload:3.1,spread:0.017, mspread:0.06,auto:true,  pellets:1, recoil:1.7, price:3100, kb:300,  pen:0.9, speed:0.96, em:"🎸", range:100, team:"CT" },
  aug:     { name:"AUG",       slot:"primary",cat:"rifle",  dmg:32,  rpm:666, mag:30, res:90, reload:3.3,spread:0.016, mspread:0.05,auto:true,  pellets:1, recoil:1.4, price:3500, kb:300,  pen:0.9, speed:0.96, em:"🔭", range:110, team:"CT", zoom:true },
  sg552:   { name:"SG-552",    slot:"primary",cat:"rifle",  dmg:33,  rpm:666, mag:30, res:90, reload:3.0,spread:0.016, mspread:0.05,auto:true,  pellets:1, recoil:1.5, price:3500, kb:300,  pen:0.9, speed:0.96, em:"🔭", range:110, team:"T", zoom:true },
  scout:   { name:"Scout",     slot:"primary",cat:"sniper", dmg:75,  rpm:48,  mag:10, res:90, reload:3.7,spread:0.004, mspread:0.20,auto:false, pellets:1, recoil:2.0, price:2750, kb:300,  pen:0.95,speed:1.02, em:"🎯", range:200, zoom:true },
  awp:     { name:"AWP",       slot:"primary",cat:"sniper", dmg:115, rpm:41,  mag:10, res:30, reload:3.7,spread:0.003, mspread:0.25,auto:false, pellets:1, recoil:3.0, price:4750, kb:100,  pen:0.975,speed:0.90,em:"🎯", range:250, zoom:true },
  m249:    { name:"M249",      slot:"primary",cat:"mg",     dmg:32,  rpm:750, mag:100,res:200,reload:5.7,spread:0.030, mspread:0.10,auto:true,  pellets:1, recoil:1.6, price:5750, kb:300,  pen:0.9, speed:0.88, em:"🛢️", range:100 },
  he:      { name:"Граната HE",slot:"nade",  cat:"he",     dmg:0,   rpm:60,  mag:0,  res:0,  reload:0,  spread:0,     mspread:0,   auto:false, pellets:1, recoil:0,   price:300,  kb:300,  pen:1,   speed:1.05, em:"💣" },
  flash:   { name:"Флешка",    slot:"nade",  cat:"flash",  dmg:0,   rpm:60,  mag:0,  res:0,  reload:0,  spread:0,     mspread:0,   auto:false, pellets:1, recoil:0,   price:200,  kb:0,    pen:1,   speed:1.05, em:"⚡" },
  smoke:   { name:"Дымовая",   slot:"nade",  cat:"smoke",  dmg:0,   rpm:60,  mag:0,  res:0,  reload:0,  spread:0,     mspread:0,   auto:false, pellets:1, recoil:0,   price:300,  kb:0,    pen:1,   speed:1.05, em:"☁️" },
};
const BUY_CATS = {
  pistol:  ["glock","usp","p228","deagle","fiveseven"],
  smg:     ["mp5","ump45","p90"],
  rifle:   ["galil","famas","ak47","m4a1","aug","sg552"],
  heavy:   ["m3","m249"],
  sniper:  ["scout","awp"],
  gear:    ["he","flash","smoke","armor","kit"],
};

/* ============================ STATE ============================ */
const G = {
  scene:null, cam:null, renderer:null, clock:null,
  boxes:[],           // collision + LOS: {x0,x1,z0,z1,y0,y1}
  siteA:{x:10,z:-6,r:5}, siteB:{x:-17,z:9,r:5},
  agents:[], player:null,
  playerSide:"CT",
  round:0, scoreCT:0, scoreT:0, target:8,
  phase:"menu",       // menu | freeze | live | roundend | matchend
  phaseT:0,
  roundTime:115, timeLeft:0,
  bomb:{ carrier:null, planted:false, at:null, timer:0, defuse:0, defusing:false, planting:false, plantP:0, obj:null, defuser:null },
  nades:[], tracers:[], decals:[], smokes:[], particles:[],
  paused:false, running:false, flashAmt:0, now:0,
  killfeed:[],
};

/* ============================ MAP: de_mansion (конфетная) ============================ */
const COL = {
  ground:0xd8ead0, road:0xcfd6ea, wallO:0xf3e2ea, mansion:0xffe9b0, mansionRoof:0xff9fb0,
  garage:0xbfe3ff, wood:0xe7c9a0, crate:0xf6c9dd, crate2:0xbfeede, fence:0xfff6ee, plaster:0xf7edf6,
};
function addBox(cx, cy, cz, sx, sy, sz, color, opts) {
  opts = opts || {};
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  const mat = new THREE.MeshLambertMaterial({ color: color, transparent: !!opts.op, opacity: opts.op || 1 });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(cx, cy, cz);
  G.scene.add(m);
  if (!opts.noClip) {
    G.boxes.push({ x0:cx-sx/2, x1:cx+sx/2, z0:cz-sz/2, z1:cz+sz/2, y0:cy-sy/2, y1:cy+sy/2, low:(cy+sy/2)<1.3 });
  }
  return m;
}
function buildMap() {
  const S = G.scene;
  // ground
  const g = new THREE.Mesh(new THREE.PlaneGeometry(80,80), new THREE.MeshLambertMaterial({ color: COL.ground }));
  g.rotation.x = -Math.PI/2; g.position.y = 0; S.add(g);
  // pathways (decorative)
  const road = (x,z,w,d) => { const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d), new THREE.MeshLambertMaterial({color:COL.road})); m.rotation.x=-Math.PI/2; m.position.set(x,0.01,z); S.add(m); };
  road(0,18,10,36); road(0,-4,40,10); road(10,-6,14,14); road(-17,9,14,14);

  // outer boundary walls
  const H = 5;
  addBox(0,H/2,-34, 72,H,2, COL.wallO);
  addBox(0,H/2, 34, 72,H,2, COL.wallO);
  addBox(-35,H/2,0, 2,H,72, COL.wallO);
  addBox( 35,H/2,0, 2,H,72, COL.wallO);

  // ---- Central Mansion (site A inside east wing) ----
  // mansion footprint x[-16..16] z[-12..12]; walls with door gaps
  const mh=4.2, my=mh/2;
  // south wall (facing mid) with a central door gap
  addBox(-9, my, 12, 14, mh, 1, COL.mansion);
  addBox( 9, my, 12, 14, mh, 1, COL.mansion);
  // north wall (facing CT) with door gap
  addBox(-9, my, -12, 14, mh, 1, COL.mansion);
  addBox( 9, my, -12, 14, mh, 1, COL.mansion);
  // west wall with gap to B side
  addBox(-16, my, -6, 1, mh, 12, COL.mansion);
  addBox(-16, my,  7, 1, mh, 10, COL.mansion);
  // east wall
  addBox( 16, my, 0, 1, mh, 24, COL.mansion);
  // interior divider: separates hall (west) from site A room (east) with door
  addBox(2, my, -7, 1, mh, 10, COL.plaster);
  addBox(2, my,  8, 1, mh, 8,  COL.plaster);
  // mansion roof (visual, non-clip, raised)
  addBox(0, mh+0.4, 0, 34, 0.6, 26, COL.mansionRoof, {noClip:true});
  // pillars inside hall
  addBox(-8, my, 3, 1.2, mh, 1.2, COL.wood);
  addBox(-8, my,-3, 1.2, mh, 1.2, COL.wood);
  // Site A crates (cover) around (10,-6)
  addBox(10,0.9,-6, 1.8,1.8,1.8, COL.crate);
  addBox(12.4,0.7,-3.5, 1.4,1.4,1.4, COL.crate2);
  addBox(7.6,0.7,-8, 1.4,1.4,1.4, COL.crate2);
  addBox(13,0.7,-9, 1.4,1.4,1.4, COL.crate);

  // ---- Garage / Site B (west outdoor) around (-17,9) ----
  const gh=3.6, gy=gh/2;
  addBox(-24, gy, 9, 1, gh, 16, COL.garage);   // west wall
  addBox(-17, gy, 16, 15, gh, 1, COL.garage);  // north
  addBox(-17, gy, 1.5, 15, gh, 1, COL.garage); // south (with implicit gap at east opening)
  addBox(-11, gy, 12, 1, gh, 7, COL.garage);   // east partial wall -> opening near z<8.5
  addBox(-17, gh+0.3, 9, 16, 0.5, 16, 0xbfe3ff, {noClip:true}); // garage roof
  // Site B crates
  addBox(-17,0.9,9, 1.8,1.8,1.8, COL.crate2);
  addBox(-20,0.7,6, 1.4,1.4,1.4, COL.crate);
  addBox(-14.5,0.7,11.5, 1.4,1.4,1.4, COL.crate);
  addBox(-20,0.7,12.5, 1.3,1.3,1.3, COL.crate2);

  // ---- Mid courtyard cover (between spawns) ----
  addBox(0,0.8,20, 3,1.6,1.6, COL.crate);
  addBox(-5,0.7,16, 1.4,1.4,1.4, COL.crate2);
  addBox(5,0.7,16, 1.4,1.4,1.4, COL.crate2);
  addBox(0,0.7,6, 1.6,1.4,1.6, COL.crate);
  // low fences (cover) around courtyard
  fenceLine(-14,22, 14,22, 1.2);
  fenceLine(14,22, 22,10, 1.2);
  fenceLine(-14,22, -22,10, 1.2);

  // ---- CT spawn (north) props ----
  addBox(0,0.8,-26, 4,1.6,1.6, COL.crate2);
  addBox(-8,0.7,-24, 1.4,1.4,1.4, COL.crate);
  addBox(8,0.7,-24, 1.4,1.4,1.4, COL.crate);
  // a "school bus" like the screenshots near CT
  addBox(-24,1.4,-22, 8,2.8,3, COL.mansion); addBox(-24,3.0,-22, 8,0.6,3, COL.mansionRoof,{noClip:true});
  // ---- T spawn (south) props ----
  addBox(0,0.8,30, 4,1.6,1.6, COL.crate);
  addBox(24,1.4,26, 8,2.8,3, COL.garage); addBox(24,3.0,26, 8,0.6,3, 0xbfe3ff,{noClip:true});

  // scattered fence pickets (visual only) — candy town vibe
  for (let i=0;i<26;i++){ const a=rand(0,TAU), r=rand(26,33); addBox(Math.cos(a)*r,0.9,Math.sin(a)*r,0.5,1.8,0.5,COL.fence,{noClip:true}); }
  // clouds
  for (let i=0;i<10;i++){ cloud(rand(-30,30), rand(9,15), rand(-30,30)); }
}
function fenceLine(x0,z0,x1,z1,h){
  // decorative pickets only — noClip so they never trap bot navigation (crates are the real cover)
  const n=Math.max(2,Math.round(Math.hypot(x1-x0,z1-z0)/2));
  for(let i=0;i<=n;i++){ const t=i/n; addBox(lerp(x0,x1,t),h/2,lerp(z0,z1,t),0.5,h,0.5,COL.fence,{noClip:true}); }
}
function cloud(x,y,z){
  const g=new THREE.Group();
  for(let i=0;i<4;i++){ const s=rand(1.6,3); const m=new THREE.Mesh(new THREE.SphereGeometry(s,7,6), new THREE.MeshLambertMaterial({color:0xffffff})); m.position.set(rand(-2.5,2.5),rand(-.6,.6),rand(-2,2)); g.add(m); }
  g.position.set(x,y,z); G.scene.add(g);
}

/* ============================ AGENTS (player + bots) ============================ */
const CANDY_NAMES = ["LILAC","SHERBET","BUTTER","TAFFY","SKY","BUBBLE","MINT","COCOA","BERRY","PEACH","GRAPE","VANILLA","CANDY","MOCHI","JELLY","SODA","CARAMEL","LEMON"];
function makeAgentMesh(team){
  const g=new THREE.Group();
  const bodyC = team==="T" ? 0xff8fb0 : 0x8fc7ff;
  const legC = team==="T" ? 0xd45c86 : 0x4b90d0;
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.9,0.45), new THREE.MeshLambertMaterial({color:bodyC})); body.position.y=1.15; g.add(body);
  const legs=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.7,0.4), new THREE.MeshLambertMaterial({color:legC})); legs.position.y=0.5; g.add(legs);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.42,0.42), new THREE.MeshLambertMaterial({color:0xffe9d6})); head.position.y=1.8; g.add(head);
  const hat=new THREE.Mesh(new THREE.BoxGeometry(0.48,0.18,0.48), new THREE.MeshLambertMaterial({color:bodyC})); hat.position.y=2.05; g.add(hat);
  const gun=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.16,0.9), new THREE.MeshLambertMaterial({color:0x555a6a})); gun.position.set(0.28,1.2,0.3); g.add(gun);
  // team marker sprite
  const spr=makeMarker(team);
  spr.position.y=2.6; g.add(spr);
  g.userData.marker=spr;
  G.scene.add(g);
  return g;
}
const _markerTex={};
function makeMarker(team){
  const key=team;
  if(!_markerTex[key]){
    const c=document.createElement("canvas"); c.width=c.height=64; const x=c.getContext("2d");
    x.fillStyle = team==="T" ? "#ff5c86" : "#4bb6f5";
    x.strokeStyle="#3a2f4a"; x.lineWidth=6;
    x.beginPath(); x.moveTo(32,8); x.lineTo(56,52); x.lineTo(8,52); x.closePath(); x.fill(); x.stroke();
    _markerTex[key]=new THREE.CanvasTexture(c);
  }
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:_markerTex[key], depthTest:false, transparent:true}));
  s.scale.set(0.7,0.7,0.7);
  return s;
}
function newAgent(team, isPlayer, name){
  const a={
    team, isPlayer, name: name||CANDY_NAMES[rint(CANDY_NAMES.length)],
    x:0,y:0,z:0, vy:0, yaw:0, pitch:0, onGround:true, crouch:false,
    hp:100, armor:0, alive:true, money:800, hasKit:false, hasBomb:false,
    height:1.7, eye:1.55,
    loadout:{ primary:null, pistol:"glock", nade:[], },
    cur:"pistol", mag:{}, res:{}, reloadT:0, fireT:0, switchT:0, deploy:0,
    kills:0, deaths:0,
    // bot
    skill: 0.5, target:null, route:[], routeI:0, goal:null, reactT:0, strafe:0, strafeT:0, stuck:0, lastx:0, lastz:0, planting:0, defusing:0, holdT:0,
    mesh: isPlayer?null:null, recoil:0, muzzle:0,
  };
  if(!isPlayer){ a.mesh=makeAgentMesh(team); }
  return a;
}

function giveLoadout(a, buy){
  // pistols
  a.loadout.pistol = a.team==="T" ? "glock" : "usp";
  // primary based on money/skill/round (bots) unless player set via buy
  if(!a.isPlayer){
    const m=a.money;
    let prim=null;
    const rifleT = a.team==="T" ? ["ak47","galil","sg552"] : ["m4a1","famas","aug"];
    if(m>=5000 && Math.random()<0.12) prim="m249";
    else if(m>=4750 && Math.random()<0.18) prim="awp";
    else if(m>=2500 && Math.random()<0.7) prim=rifleT[rint(rifleT.length)];
    else if(m>=1500 && Math.random()<0.7) prim=["mp5","ump45","p90"][rint(3)];
    else if(m>=1700 && Math.random()<0.25) prim="m3";
    a.loadout.primary = prim;
    a.armor = m>=1000 && Math.random()<0.75 ? 100 : 0;
    a.hasKit = a.team==="CT" && Math.random()<0.5;
    a.loadout.nade = Math.random()<0.6 ? ["he"] : [];
    if(a.loadout.nade.length && Math.random()<0.4) a.loadout.nade.push("flash");
    // attackers (T) get a small edge to offset the CT defender/site-hold advantage → balanced matches
    const atkBonus = a.team==="T" ? 0.10 : 0;
    a.skill = clamp(0.44 + atkBonus + G.round*0.012 + rand(-0.12,0.14), 0.3, 0.92);
  }
  // ammo reset
  a.mag={}; a.res={};
  const keys=[a.loadout.primary, a.loadout.pistol, "knife"].filter(Boolean).concat(a.loadout.nade);
  keys.forEach(k=>{ const w=W[k]; if(!w)return; a.mag[k]=w.mag; a.res[k]=w.res; });
  // current weapon = primary if exists else pistol
  a.cur = a.loadout.primary ? a.loadout.primary : a.loadout.pistol;
  a.reloadT=0; a.deploy=0.2;
}

/* ============================ PHYSICS / COLLISION ============================ */
function agentRadius(){ return 0.34; }
function moveAgent(a, dx, dz){
  const r=agentRadius(); const h=a.crouch?1.05:a.height;
  a.x += dx;
  for(const b of G.boxes){ if(!vOverlap(a.y,h,b)) continue; resolveAxis(a,b,r,'x',dx); }
  a.z += dz;
  for(const b of G.boxes){ if(!vOverlap(a.y,h,b)) continue; resolveAxis(a,b,r,'z',dz); }
}
function vOverlap(y,h,b){ return (y+h) > b.y0+0.12 && y < b.y1-0.12; }
function resolveAxis(a,b,r,axis,dir){
  const nx=clamp(a.x,b.x0,b.x1), nz=clamp(a.z,b.z0,b.z1);
  const ddx=a.x-nx, ddz=a.z-nz;
  if(ddx*ddx+ddz*ddz >= r*r) return;
  if(axis==='x'){ if(dir>0) a.x=b.x0-r; else if(dir<0) a.x=b.x1+r; else a.x = (a.x<(b.x0+b.x1)/2)?b.x0-r:b.x1+r; }
  else { if(dir>0) a.z=b.z0-r; else if(dir<0) a.z=b.z1+r; else a.z=(a.z<(b.z0+b.z1)/2)?b.z0-r:b.z1+r; }
}
function supportHeight(a){
  const r=agentRadius(); let top=0;
  for(const b of G.boxes){
    if(a.x+r<=b.x0||a.x-r>=b.x1||a.z+r<=b.z0||a.z-r>=b.z1) continue;
    if(b.y1<=a.y+0.36 && b.y1>top) top=b.y1;
  }
  return top;
}
function applyGravity(a,dt){
  a.vy -= 22*dt; a.y += a.vy*dt;
  const gnd=supportHeight(a);
  if(a.y<=gnd){ a.y=gnd; a.vy=0; a.onGround=true; } else a.onGround=false;
  // ceiling
  const h=a.crouch?1.05:a.height;
  for(const b of G.boxes){
    if(a.x+0.3<=b.x0||a.x-0.3>=b.x1||a.z+0.3<=b.z0||a.z-0.3>=b.z1) continue;
    if(a.y<b.y0 && a.y+h>b.y0 && a.vy>0){ a.y=b.y0-h; a.vy=0; }
  }
}

/* ============================ RAYCAST ============================ */
function segBox(ox,oy,oz, dx,dy,dz, len, b){
  // returns t in [0,len] of entry, or -1
  let tmin=0, tmax=len;
  const slab=(o,d,mn,mx)=>{ if(Math.abs(d)<1e-8){ if(o<mn||o>mx) return false; return true; }
    let t1=(mn-o)/d, t2=(mx-o)/d; if(t1>t2){const tt=t1;t1=t2;t2=tt;} if(t1>tmin)tmin=t1; if(t2<tmax)tmax=t2; return tmax>=tmin; };
  if(!slab(ox,dx,b.x0,b.x1))return -1;
  if(!slab(oy,dy,b.y0,b.y1))return -1;
  if(!slab(oz,dz,b.z0,b.z1))return -1;
  return tmin>=0?tmin:-1;
}
function rayWall(ox,oy,oz,dx,dy,dz,maxd){
  let best=maxd;
  for(const b of G.boxes){ const t=segBox(ox,oy,oz,dx,dy,dz,best,b); if(t>=0&&t<best) best=t; }
  return best;
}
function losClear(ax,ay,az,bx,by,bz){
  const dx=bx-ax,dy=by-ay,dz=bz-az; const len=Math.hypot(dx,dy,dz); if(len<1e-4)return true;
  const t=rayWall(ax,ay,az,dx/len,dy/len,dz/len,len-0.15);
  if(t<len-0.15) return false;
  // smoke blocks LOS
  for(const s of G.smokes){ if(s.t<=0) continue; if(segSphere(ax,ay,az,dx/len,dy/len,dz/len,len,s.x,s.y,s.z,s.r)) return false; }
  return true;
}
function segSphere(ox,oy,oz,dx,dy,dz,len,cx,cy,cz,R){
  const ex=cx-ox,ey=cy-oy,ez=cz-oz; const b=ex*dx+ey*dy+ez*dz;
  if(b<0||b>len+R) return false; const d2=ex*ex+ey*ey+ez*ez-b*b; return d2<=R*R;
}
// enemy AABB for hit
function agentBox(a){ const h=a.crouch?1.05:a.height; const r=0.36; return {x0:a.x-r,x1:a.x+r,z0:a.z-r,z1:a.z+r,y0:a.y+0.05,y1:a.y+h+0.12, head:a.y+h*0.82}; }

/* ============================ SHOOTING ============================ */
function fireWeapon(a){
  const w=W[a.cur]; if(!w) return;
  const now=G.now;
  if(a.deploy>0||a.reloadT>0) return;
  if(w.cat!=="melee" && (a.mag[a.cur]||0)<=0){ if(a.isPlayer) tryAutoReload(a); return; }
  const interval=60/w.rpm;
  if(now-a.fireT < interval) return;
  a.fireT=now;
  if(w.cat!=="melee") a.mag[a.cur]--;
  a.recoil = Math.min(a.recoil + w.recoil*0.6, 8);
  a.muzzle=0.05;
  // spread
  const moving = a._moving?1:0;
  const airborne = a.onGround?0:1;
  let spread=w.spread + moving*w.mspread + airborne*0.08 + a.recoil*0.006;
  if(a.crouch) spread*=0.6;
  if(w.zoom && a.zoomOn) spread*=0.25;
  const ex=a.x, ey=a.y+(a.crouch?1.05:a.eye), ez=a.z;
  const pellets = w.pellets||1;
  for(let p=0;p<pellets;p++){
    const yaw=a.yaw + rand(-spread,spread);
    const pit=a.pitch + rand(-spread,spread);
    const dx=Math.sin(yaw)*Math.cos(pit), dy=Math.sin(pit), dz=Math.cos(yaw)*Math.cos(pit);
    // for our coord: forward = (sin(yaw)*cos(pit), sin(pit), -cos(yaw)*cos(pit))? define consistent below
    shootRay(a,w,ex,ey,ez,Math.sin(yaw)*Math.cos(pit),Math.sin(pit),-Math.cos(yaw)*Math.cos(pit));
  }
  if(a.isPlayer){ hudAmmo(); doRecoilKick(w); playShot(w); }
}
function shootRay(a,w,ox,oy,oz,dx,dy,dz){
  const maxd=w.range;
  let wall=rayWall(ox,oy,oz,dx,dy,dz,maxd);
  let hitA=null, hitT=wall, head=false;
  for(const t of G.agents){
    if(!t.alive||t.team===a.team) continue;
    const bb=agentBox(t);
    const tt=segBox(ox,oy,oz,dx,dy,dz,hitT,bb);
    if(tt>=0&&tt<hitT){ hitT=tt; hitA=t; const hy=oy+dy*tt; head=hy>=bb.head; }
  }
  const hx=ox+dx*hitT, hy=oy+dy*hitT, hz=oz+dz*hitT;
  addTracer(ox,oy-0.08,oz,hx,hy,hz, a.isPlayer);
  if(hitA){
    // damage w/ falloff
    let dmg=w.dmg;
    const falloff = clamp(1 - (hitT/maxd)*0.35, 0.55, 1);
    dmg*=falloff;
    if(head) dmg*=4; else if(hy < hitA.y+0.85) dmg*=0.8; // legs
    damageAgent(hitA, dmg, a, head, w);
    addHitSpark(hx,hy,hz, true);
    if(a.isPlayer) showHit(head);
  } else {
    addHitSpark(hx,hy,hz, false);
  }
}
function damageAgent(t, dmg, by, head, w){
  if(!t.alive) return;
  if(t.armor>0 && w.cat!=="melee"){
    // armor fully absorbs the "non-penetrating" fraction; pen fraction always lands
    const pen=w.pen;
    const blocked=dmg*(1-pen);
    t.armor=Math.max(0, t.armor - blocked*0.5);
    dmg=Math.max(1, dmg*pen);
  }
  t.hp -= dmg;
  if(t.isPlayer){ hudHealth(); doDamageFlash(); }
  if(t.hp<=0){ killAgent(t, by, head, w); }
  else if(!t.isPlayer){ t.reactT=Math.min(t.reactT,0.06); if(!t.target&&by&&by.alive) t.target=by; }
}
function killAgent(t, by, head, w){
  if(!t.alive) return;
  t.alive=false; t.hp=0; t.deaths++;
  if(by&&by!==t){ by.kills++; by.money=Math.min(16000, by.money + (w&&w.kb?w.kb:300)); }
  addKill(by, t, w, head);
  if(t.mesh){ t.mesh.visible=false; }
  // drop bomb
  if(t.hasBomb){ t.hasBomb=false; dropBomb(t); }
  if(t.isPlayer){ onPlayerDown(by, w); }
  checkRoundEnd();
}
function keyOf(w){ for(const k in W){ if(W[k]===w) return k; } return "knife"; }
function tryAutoReload(a){ const w=W[a.cur]; if(w.cat==="melee"||w.slot==="nade")return; if(a.reloadT>0)return; if((a.mag[a.cur]||0)>=w.mag)return; if((a.res[a.cur]||0)<=0)return; a.reloadT=w.reload; if(a.isPlayer){ hudAmmo(); } }
function updateReload(a,dt){
  if(a.reloadT>0){ a.reloadT-=dt; if(a.reloadT<=0){ const w=W[a.cur]; const need=w.mag-(a.mag[a.cur]||0); const take=Math.min(need, a.res[a.cur]||0); a.mag[a.cur]=(a.mag[a.cur]||0)+take; a.res[a.cur]-=take; if(a.isPlayer)hudAmmo(); } }
  if(a.deploy>0) a.deploy-=dt;
  a.recoil=Math.max(0, a.recoil - dt*10);
  if(a.muzzle>0) a.muzzle-=dt;
}

/* ============================ GRENADES / NADES ============================ */
function throwNade(a, kind){
  const ey=a.y+(a.crouch?1.05:a.eye);
  const dx=Math.sin(a.yaw)*Math.cos(a.pitch), dy=Math.sin(a.pitch)+0.25, dz=-Math.cos(a.yaw)*Math.cos(a.pitch);
  const sp=16;
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(0.18,8,7), new THREE.MeshLambertMaterial({color: kind==="he"?0x8fd08f:kind==="flash"?0xfff2a0:0xcfd6ea}));
  G.scene.add(mesh);
  G.nades.push({kind, x:a.x, y:ey, z:a.z, vx:dx*sp, vy:dy*sp, vz:dz*sp, t: kind==="smoke"?1.6:1.8, by:a, mesh, bounced:0});
}
function updateNades(dt){
  for(let i=G.nades.length-1;i>=0;i--){
    const n=G.nades[i];
    n.vy-=20*dt; n.x+=n.vx*dt; n.y+=n.vy*dt; n.z+=n.vz*dt; n.t-=dt;
    if(n.y<0.18){ n.y=0.18; n.vy*=-0.4; n.vx*=0.6; n.vz*=0.6; n.bounced++; }
    // wall bounce (approx): if inside a box, push back
    for(const b of G.boxes){ if(n.x>b.x0&&n.x<b.x1&&n.z>b.z0&&n.z<b.z1&&n.y<b.y1){ n.vx*=-0.5; n.vz*=-0.5; n.x=clamp(n.x,b.x0-0.2,b.x1+0.2); break; } }
    n.mesh.position.set(n.x,n.y,n.z);
    if(n.t<=0){ detonate(n); n.mesh.parent&&G.scene.remove(n.mesh); G.nades.splice(i,1); }
  }
}
function detonate(n){
  if(n.kind==="he"){
    boom(n.x,n.y,n.z, 0xffb0c8, 6);
    for(const t of G.agents){ if(!t.alive)continue; const d=Math.hypot(t.x-n.x,(t.y+0.9)-n.y,t.z-n.z); if(d<6){ const dmg=(1-d/6)*68; damageAgent(t, dmg, n.by, false, W.he); } }
    playBoom();
  } else if(n.kind==="flash"){
    boom(n.x,n.y,n.z, 0xffffff, 4);
    // flash player if LOS & near-ish facing
    const p=G.player; if(p&&p.alive){ const d=Math.hypot(p.x-n.x,p.z-n.z);
      if(d<16 && losClear(n.x,n.y,n.z,p.x,p.y+p.eye,p.z)){
        const toN=Math.atan2(n.x-p.x, -(n.z-p.z)); let da=Math.abs(((toN-p.yaw+Math.PI)%TAU)-Math.PI);
        const face=clamp(1-da/2.2,0,1); G.flashAmt=Math.max(G.flashAmt, clamp((1-d/16)*face*1.4,0,1)*1.2);
      }
    }
    // blind nearby bots
    for(const t of G.agents){ if(!t.alive||t.isPlayer)continue; const d=Math.hypot(t.x-n.x,t.z-n.z); if(d<14&&losClear(n.x,n.y,n.z,t.x,t.y+t.eye,t.z)) t.blind=Math.max(t.blind||0,(1-d/14)*2.2); }
  } else if(n.kind==="smoke"){
    const s={x:n.x,y:1.2,z:n.z,r:3.2,t:14, mesh:null};
    const grp=new THREE.Group();
    for(let i=0;i<10;i++){ const m=new THREE.Mesh(new THREE.SphereGeometry(rand(1.4,2.2),7,6), new THREE.MeshLambertMaterial({color:0xeef0f6,transparent:true,opacity:0.9})); m.position.set(rand(-1.6,1.6),rand(0,2),rand(-1.6,1.6)); grp.add(m); }
    grp.position.set(s.x,s.y,s.z); G.scene.add(grp); s.mesh=grp; G.smokes.push(s);
  }
}
function updateSmokes(dt){ for(let i=G.smokes.length-1;i>=0;i--){ const s=G.smokes[i]; s.t-=dt; if(s.t<2){ s.mesh.children.forEach(c=>c.material.opacity=0.9*(s.t/2)); } if(s.t<=0){ G.scene.remove(s.mesh); G.smokes.splice(i,1); } } }

/* ============================ TRACERS / SPARKS ============================ */
function addTracer(ax,ay,az,bx,by,bz, mine){
  const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ax,ay,az), new THREE.Vector3(bx,by,bz)]);
  const l=new THREE.Line(g, new THREE.LineBasicMaterial({color:mine?0xfff0a0:0xffd0e0, transparent:true, opacity:0.9}));
  G.scene.add(l); G.tracers.push({l,t:0.06});
}
function addHitSpark(x,y,z,flesh){ const m=new THREE.Mesh(new THREE.SphereGeometry(flesh?0.14:0.09,6,5), new THREE.MeshBasicMaterial({color:flesh?0xff5c86:0xffffff})); m.position.set(x,y,z); G.scene.add(m); G.particles.push({m,t:0.16,vy:0}); }
function boom(x,y,z,color,r){ const m=new THREE.Mesh(new THREE.SphereGeometry(0.4,10,8), new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.9})); m.position.set(x,y,z); G.scene.add(m); G.particles.push({m,t:0.4,grow:r}); }
function updateFX(dt){
  for(let i=G.tracers.length-1;i>=0;i--){ const tr=G.tracers[i]; tr.t-=dt; tr.l.material.opacity=Math.max(0,tr.t/0.06)*0.9; if(tr.t<=0){ G.scene.remove(tr.l); G.tracers.splice(i,1); } }
  for(let i=G.particles.length-1;i>=0;i--){ const p=G.particles[i]; p.t-=dt; if(p.grow){ const s=1+(1-p.t/0.4)*p.grow; p.m.scale.set(s,s,s); p.m.material.opacity=Math.max(0,p.t/0.4)*0.9; } else { p.vy-=8*dt; p.m.position.y+=p.vy*dt; p.m.material.opacity&&(p.m.material.transparent=true); } if(p.t<=0){ G.scene.remove(p.m); G.particles.splice(i,1); } }
}

/* ============================ BOMB / ROUND ============================ */
function inSite(x,z,site){ return dist2(x,z,site.x,site.z) < site.r*site.r; }
function whichSite(x,z){ if(inSite(x,z,G.siteA))return "A"; if(inSite(x,z,G.siteB))return "B"; return null; }
function dropBomb(t){ G.bomb.carrier=null; /* bomb becomes pickuppable at pos - simplify: nearest live T gets it next check */
  G.bomb.dropX=t.x; G.bomb.dropZ=t.z; G.bomb.dropped=true; }
function ensureBombCarrier(){
  if(G.bomb.planted) return;
  if(G.bomb.carrier&&G.bomb.carrier.alive) return;
  const ts=G.agents.filter(a=>a.team==="T"&&a.alive);
  if(!ts.length){ G.bomb.carrier=null; return; }
  // give to closest to drop, else random
  let pick=ts[0];
  if(G.bomb.dropped){ let bd=1e9; for(const a of ts){ const d=dist2(a.x,a.z,G.bomb.dropX,G.bomb.dropZ); if(d<bd){bd=d;pick=a;} } }
  ts.forEach(a=>a.hasBomb=false); pick.hasBomb=true; G.bomb.carrier=pick; G.bomb.dropped=false;
}
function plantBomb(a){
  G.bomb.planted=true; G.bomb.at={x:a.x,z:a.z,y:0.4, site:whichSite(a.x,a.z)}; G.bomb.timer=40; a.hasBomb=false; G.bomb.carrier=null;
  if(a.team==="T"&&a.isPlayer===false){}
  a.money=Math.min(16000,a.money+300);
  const m=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.3,0.7), new THREE.MeshLambertMaterial({color:0xff5c86})); m.position.set(a.x,0.25,a.z); G.scene.add(m);
  const led=new THREE.Mesh(new THREE.SphereGeometry(0.07,6,5), new THREE.MeshBasicMaterial({color:0xff0000})); led.position.set(a.x,0.45,a.z); G.scene.add(led);
  G.bomb.obj=m; G.bomb.led=led;
  banner("БОМБА ЗАЛОЖЕНА", "точка "+G.bomb.at.site, "");
  setTimeout(()=>hideBanner(), 1400);
  hudBombRow();
}
function defuseDone(a){
  G.bomb.planted=false;
  endRound("CT", a.isPlayer?"Ты обезвредил бомбу!":a.name+" обезвредил бомбу");
}
function explodeBomb(){
  const at=G.bomb.at; boom(at.x,0.6,at.z,0xffb0c8,10); playBoom();
  for(const t of G.agents){ if(!t.alive)continue; const d=Math.hypot(t.x-at.x,t.z-at.z); if(d<9){ damageAgent(t, (1-d/9)*400, G.bomb.carrier||{team:"T",alive:false}, false, W.he); } }
  G.bomb.planted=false;
  endRound("T","Бомба взорвалась 💥");
}
function cleanupBomb(){ if(G.bomb.obj){G.scene.remove(G.bomb.obj);G.bomb.obj=null;} if(G.bomb.led){G.scene.remove(G.bomb.led);G.bomb.led=null;} G.bomb.planted=false; G.bomb.at=null; G.bomb.defusing=false; G.bomb.defuse=0; G.bomb.dropped=false; }

/* ============================ ROUND FLOW ============================ */
function startMatch(side){
  G.playerSide=side; G.scoreCT=0; G.scoreT=0; G.round=0;
  // build agents 5v5
  G.agents=[];
  G.player=newAgent(side, true, "YOU"); G.player.money=800; G.agents.push(G.player);
  const teams={CT:[],T:[]}; teams[side].push(G.player);
  const other = side==="CT"?"T":"CT";
  for(let i=0;i<4;i++){ const a=newAgent(side,false); a.money=800; G.agents.push(a); teams[side].push(a); }
  for(let i=0;i<5;i++){ const a=newAgent(other,false); a.money=800; G.agents.push(a); teams[other].push(a); }
  G.running=true; postRun(true);
  startRound();
}
function startRound(){
  G.round++;
  cleanupBomb();
  // reset agents
  G.agents.forEach((a,i)=>{
    a.alive=true; a.hp=100; a.crouch=false; a.vy=0; a.blind=0; a.target=null; a.hasBomb=false; a.zoomOn=false;
    if(a.mesh){ a.mesh.visible=true; }
    giveLoadout(a);
    spawnAgent(a, a===G.player? -1 : i);
  });
  // give T the bomb
  const ts=G.agents.filter(a=>a.team==="T");
  if(ts.length){ ts.forEach(a=>a.hasBomb=false); ts[rint(ts.length)].hasBomb=true; G.bomb.carrier=ts.find(a=>a.hasBomb); }
  G.bomb.planted=false; G.bomb.dropped=false;
  // assign bot routes
  assignRoutes();
  G.phase="freeze"; G.phaseT=IS_TOUCH?5.5:4.5; G.timeLeft=G.roundTime;
  hudBombRow();
  banner("РАУНД "+G.round, sideName(G.playerSide)+" — приготовься", "");
  hudScores();
  // auto-open buy for player
  if(G.player.alive){ openBuy(); }
}
function spawnAgent(a, idx){
  const spread=(i,base)=>({x:base.x+rand(-4,4), z:base.z+rand(-2,2)});
  let base;
  if(a.team==="T") base={x:0,z:29}; else base={x:0,z:-29};
  // T spawns south (+Z) → look toward map (-Z, yaw 0); CT spawns north (-Z) → look +Z (yaw PI)
  const p=spread(idx,base); a.x=p.x; a.z=p.z; a.y=0; a.yaw=a.team==="T"?0:Math.PI; a.pitch=0; a.vy=0;
  a.routeI=0;
}
function sideName(s){ return s==="CT"?"SUGAR (полиция)":"SOUR (террористы)"; }

function assignRoutes(){
  // waypoints
  const A=[{x:0,z:20},{x:6,z:2},{x:10,z:-6}];      // to site A (through mansion south door / east)
  const A2=[{x:0,z:8},{x:0,z:-4},{x:10,z:-6}];      // CT hall to A
  const B=[{x:-8,z:18},{x:-16,z:9},{x:-17,z:9}];    // to site B
  const B2=[{x:-16,z:-4},{x:-16,z:8},{x:-17,z:9}];  // CT to B
  const HOLDA=[{x:12,z:-8},{x:8,z:-3},{x:14,z:-4}];
  const HOLDB=[{x:-14,z:11},{x:-20,z:7},{x:-17,z:12}];
  G.agents.forEach((a)=>{
    if(a.isPlayer){ a.route=[]; return; }
    if(a.team==="T"){
      const toB=Math.random()<0.45;
      a.route=(toB?B:A).map(p=>({...p})); a.goal=toB?"B":"A";
    } else {
      // CT split defense
      const holdB=Math.random()<0.45;
      a.route=(holdB?B2:A2).map(p=>({...p})); a.goal=holdB?"B":"A";
    }
    a.routeI=0; a.holdT=rand(0,1.5);
  });
}
function endRound(winner, reason){
  if(G.phase==="roundend"||G.phase==="matchend") return;
  if(winner==="CT") G.scoreCT++; else G.scoreT++;
  // economy
  G.agents.forEach(a=>{
    const won = a.team===winner;
    a.money=Math.min(16000, a.money + (won?3000:1400+Math.random()*200));
    if(won) a.money+=a.alive?0:0;
  });
  hudScores();
  G.phase="roundend"; G.phaseT=4;
  banner(winner===G.playerSide?"РАУНД ВЗЯТ!":"РАУНД ПРОИГРАН", reason||"", "");
  if(G.scoreCT>=G.target||G.scoreT>=G.target){ setTimeout(()=>matchEnd(), 1400); }
}
function checkRoundEnd(){
  if(G.phase!=="live") return;
  const ctAlive=G.agents.some(a=>a.team==="CT"&&a.alive);
  const tAlive=G.agents.some(a=>a.team==="T"&&a.alive);
  if(!tAlive && !G.bomb.planted){ endRound("CT","Все SOUR обезврежены"); return; }
  if(!ctAlive){ endRound("T","Все SUGAR устранены"); return; }
}
function matchEnd(){
  G.phase="matchend"; G.running=false; postRun(false);
  const win = (G.playerSide==="CT" && G.scoreCT>G.scoreT) || (G.playerSide==="T" && G.scoreT>G.scoreCT);
  $("endTitle").textContent = win?"ПОБЕДА! 🍬":"Поражение 🍭";
  $("endScore").textContent = "SUGAR "+G.scoreCT+" : "+G.scoreT+" SOUR";
  const p=G.player;
  $("endStats").innerHTML = `<b>Твоя статистика</b><br>Убийства: ${p.kills} · Смерти: ${p.deaths}<br>K/D: ${(p.kills/Math.max(1,p.deaths)).toFixed(2)}<br>Раундов сыграно: ${G.round}`;
  show("endMenu"); hide2("hud");
}

/* ============================ PLAYER DOWN / SPECTATE ============================ */
let specTarget=null;
function onPlayerDown(by, w){
  banner("DOWN!", "выбил "+(by?by.name:"???"), "");
  $("bCnt").textContent="";
  // spectate a living teammate
  specTarget=G.agents.find(a=>a.alive&&a.team===G.playerSide&&!a.isPlayer)||null;
}

/* ============================ INPUT ============================ */
const keys={};
const input={ mx:0, mz:0, look:{dx:0,dy:0}, firing:false, jump:false };
function setupInput(){
  const cv=G.renderer.domElement;
  // desktop
  window.addEventListener("keydown",e=>{ keys[e.code]=true; onKey(e.code,true); if(["Space","KeyW","KeyA","KeyS","KeyD"].includes(e.code))e.preventDefault(); });
  window.addEventListener("keyup",e=>{ keys[e.code]=false; });
  if(!IS_TOUCH){
    cv.addEventListener("click",()=>{ if(G.phase!=="menu"&&!G.paused&&!buyOpen) cv.requestPointerLock&&cv.requestPointerLock(); });
    document.addEventListener("mousemove",e=>{ if(document.pointerLockElement===cv){ input.look.dx+=e.movementX; input.look.dy+=e.movementY; } });
    document.addEventListener("mousedown",e=>{ if(document.pointerLockElement===cv&&e.button===0) input.firing=true; if(e.button===2&&document.pointerLockElement===cv){ toggleZoom(); } });
    document.addEventListener("mouseup",e=>{ if(e.button===0) input.firing=false; });
    document.addEventListener("contextmenu",e=>e.preventDefault());
  }
  // touch look
  setupTouch();
  // buttons
  $("pauseBtn").onclick=()=>togglePause(true);
  $("menuBtn").onclick=()=>togglePause(true);
  bindHold($("fireBtn"), v=>input.firing=v);
  $("reloadBtn").onclick=()=>{ if(G.player.alive) startReload(G.player); };
  $("jumpBtn").onclick=()=>{ input.jump=true; };
  $("nadeBtn").onclick=()=>quickNade();
  bindPress($("crouchBtn"), ()=>{ G.player.crouch=!G.player.crouch; $("crouchBtn").classList.toggle("on",G.player.crouch); });
  bindHold($("useBtn"), v=>{ input.use=v; });
}
function bindHold(el, fn){
  const on=e=>{e.preventDefault();fn(true);}; const off=e=>{e.preventDefault();fn(false);};
  el.addEventListener("touchstart",on,{passive:false}); el.addEventListener("touchend",off); el.addEventListener("touchcancel",off);
  el.addEventListener("mousedown",on); el.addEventListener("mouseup",off); el.addEventListener("mouseleave",off);
}
function bindPress(el, fn){ el.addEventListener("touchstart",e=>{e.preventDefault();fn();},{passive:false}); el.addEventListener("click",fn); }
function onKey(code,down){
  if(!down) return;
  if(code==="KeyR") startReload(G.player);
  else if(code==="Digit1") switchTo("primary");
  else if(code==="Digit2") switchTo("pistol");
  else if(code==="Digit3") switchTo("knife");
  else if(code==="KeyG") quickNade();
  else if(code==="KeyE") input.use=true; // held handled in loop via keys
  else if(code==="KeyB"){ if(G.phase==="freeze"||G.paused) openBuy(); }
  else if(code==="Escape"){ if(buyOpen) closeBuy(); else togglePause(); }
  else if(code==="Space") input.jump=true;
}
let zoomState=false;
function toggleZoom(){ const w=W[G.player.cur]; if(!w||!w.zoom)return; zoomState=!zoomState; G.player.zoomOn=zoomState; }
function switchTo(slot){ const p=G.player; let k=null;
  if(slot==="primary") k=p.loadout.primary; else if(slot==="pistol") k=p.loadout.pistol; else if(slot==="knife") k="knife";
  if(!k) return; if(p.cur===k) return; p.cur=k; p.deploy=0.25; p.zoomOn=false; zoomState=false; p.reloadT=0; hudAmmo(); hudSlots();
}
function quickNade(){ const p=G.player; if(!p.alive)return; const n=p.loadout.nade&&p.loadout.nade[0]; if(!n)return; throwNade(p,W[n].cat); p.loadout.nade.shift(); hudSlots(); }
function startReload(a){ if(!a.alive)return; tryAutoReload(a); }

// touch look + joystick
let joyId=null, joyStart={x:0,y:0}, lookId=null, lookLast={x:0,y:0};
function setupTouch(){
  const jz=$("joyZone"), joy=$("joy"), nub=$("joyNub"), lz=$("lookZone");
  jz.addEventListener("touchstart",e=>{ const t=e.changedTouches[0]; joyId=t.identifier; joyStart={x:t.clientX,y:t.clientY};
    joy.style.display="block"; joy.style.left=(t.clientX-60)+"px"; joy.style.top=(t.clientY-60)+"px"; nub.style.left="32px"; nub.style.top="32px"; e.preventDefault(); },{passive:false});
  const jmove=e=>{ for(const t of e.changedTouches){ if(t.identifier===joyId){ let dx=t.clientX-joyStart.x, dy=t.clientY-joyStart.y; const m=Math.hypot(dx,dy)||1; const cl=Math.min(m,50); dx=dx/m*cl; dy=dy/m*cl; nub.style.left=(32+dx)+"px"; nub.style.top=(32+dy)+"px"; input.mx=dx/50; input.mz=dy/50; } } e.preventDefault(); };
  jz.addEventListener("touchmove",jmove,{passive:false});
  const jend=e=>{ for(const t of e.changedTouches){ if(t.identifier===joyId){ joyId=null; joy.style.display="none"; input.mx=0; input.mz=0; } } };
  jz.addEventListener("touchend",jend); jz.addEventListener("touchcancel",jend);
  lz.addEventListener("touchstart",e=>{ const t=e.changedTouches[0]; lookId=t.identifier; lookLast={x:t.clientX,y:t.clientY}; e.preventDefault(); },{passive:false});
  lz.addEventListener("touchmove",e=>{ for(const t of e.changedTouches){ if(t.identifier===lookId){ input.look.dx+=(t.clientX-lookLast.x); input.look.dy+=(t.clientY-lookLast.y); lookLast={x:t.clientX,y:t.clientY}; } } e.preventDefault(); },{passive:false});
  const lend=e=>{ for(const t of e.changedTouches){ if(t.identifier===lookId) lookId=null; } };
  lz.addEventListener("touchend",lend); lz.addEventListener("touchcancel",lend);
}

/* ============================ PLAYER UPDATE ============================ */
function updatePlayer(dt){
  const p=G.player;
  // look
  const sens = IS_TOUCH?0.0045:0.0022;
  const zf = p.zoomOn?0.4:1;
  p.yaw += input.look.dx*sens*zf;
  p.pitch -= input.look.dy*sens*zf;
  p.pitch=clamp(p.pitch,-1.3,1.3);
  input.look.dx=0; input.look.dy=0;
  if(!p.alive){ // spectate
    if(specTarget&&specTarget.alive){ G.cam.position.set(specTarget.x, specTarget.y+2.4, specTarget.z+4); G.cam.lookAt(specTarget.x, specTarget.y+1.4, specTarget.z); }
    return;
  }
  if(G.phase==="freeze"){ // frozen but can look/buy
    setCam(p); return;
  }
  // movement input
  let ix=0, iz=0;
  if(IS_TOUCH){ ix=input.mx; iz=input.mz; }
  else { if(keys["KeyW"])iz-=1; if(keys["KeyS"])iz+=1; if(keys["KeyA"])ix-=1; if(keys["KeyD"])ix+=1; }
  const mag=Math.hypot(ix,iz);
  const w=W[p.cur];
  let speed=5.3*(w?w.speed:1);
  if(p.crouch) speed*=0.5; else if(!IS_TOUCH&&keys["ShiftLeft"]) speed*=0.5;
  if(p.zoomOn) speed*=0.5;
  p._moving = mag>0.08;
  if(mag>0.08){
    const nx=ix/mag, nz=iz/mag;
    // forward = -Z in local; convert by yaw
    const sinY=Math.sin(p.yaw), cosY=Math.cos(p.yaw);
    const wx=(nx*cosY + nz*sinY);
    const wz=(-nx*sinY + nz*cosY);
    moveAgent(p, wx*speed*dt, wz*speed*dt);
  }
  // jump
  if(input.jump){ if(p.onGround){ p.vy=7.4; p.onGround=false; } input.jump=false; }
  applyGravity(p,dt);
  // firing
  if(input.firing){ if(W[p.cur].cat==="melee"||W[p.cur].auto){ fireWeapon(p); } else { if(!p._firedOnce) { fireWeapon(p); p._firedOnce=true; } } }
  else p._firedOnce=false;
  updateReload(p,dt);
  // bomb interactions
  handlePlayerUse(dt);
  setCam(p);
  // out of ammo auto reload
  if(W[p.cur].slot!=="nade"&&W[p.cur].cat!=="melee"&&(p.mag[p.cur]||0)===0&&p.reloadT<=0&&(p.res[p.cur]||0)>0) tryAutoReload(p);
}
function setCam(p){
  const eh=p.crouch?1.05:p.eye;
  G.cam.position.set(p.x, p.y+eh, p.z);
  const rec=p.recoil*0.01;
  G.cam.rotation.order="YXZ";
  G.cam.rotation.y=p.yaw; G.cam.rotation.x=p.pitch+rec;
  const fovT = (W[p.cur]&&W[p.cur].zoom&&p.zoomOn)?35:75;
  if(Math.abs(G.cam.fov-fovT)>0.5){ G.cam.fov=lerp(G.cam.fov,fovT,0.4); G.cam.updateProjectionMatrix(); }
}
function doRecoilKick(w){ /* handled by recoil accumulation in setCam */ }
function handlePlayerUse(dt){
  const p=G.player; const useHeld = input.use || keys["KeyE"];
  $("useBtn").style.display="none";
  if(G.bomb.planted){
    if(p.team==="CT"){ const d=Math.hypot(p.x-G.bomb.at.x,p.z-G.bomb.at.z);
      if(d<2.2){ $("useBtn").style.display="flex"; $("useBtn").textContent=(G.bomb.defuse>0?"DEFUSING":"DEFUSE");
        if(useHeld && p._moving===false){ G.bomb.defuse+=dt*(p.hasKit?1/5:1/10); G.bomb.defuser=p; if(G.bomb.defuse>=1){ defuseDone(p); } hudBombRow(); }
        else if(G.bomb.defuser===p){ G.bomb.defuse=Math.max(0,G.bomb.defuse-dt*0.5); }
      }
    }
    return;
  }
  if(p.team==="T"&&p.hasBomb){
    const site=whichSite(p.x,p.z);
    if(site){ $("useBtn").style.display="flex"; $("useBtn").textContent=(p.planting>0?"PLANTING":"PLANT "+site);
      if(useHeld && p._moving===false && p.onGround){ p.planting+=dt/3.2; if(p.planting>=1){ plantBomb(p); p.planting=0; } }
      else p.planting=Math.max(0,p.planting-dt);
      // reflect plant progress on bomb bar
      if(p.planting>0){ $("bombRow").style.display="flex"; $("bombFill").style.width=(p.planting*100)+"%"; $("bombFill").style.background="#7fe0aa"; $("bombTxt").textContent="Закладка "+site; }
    } else p.planting=0;
  }
}

/* ============================ BOT AI ============================ */
function updateBot(a,dt){
  if(!a.alive) return;
  if(a.blind>0) a.blind-=dt;
  updateReload(a,dt);
  applyGravity(a,dt);
  if(G.phase==="freeze"){ return; }
  // find target (with short memory so flickering LOS doesn't reset reaction every frame)
  a.reactT-=dt;
  const enemy=findVisibleEnemy(a);
  if(enemy){
    if(!a.target) a.reactT=Math.max(a.reactT, (1-a.skill)*0.22+0.05); // reaction delay only on fresh acquire
    a.target=enemy; a.seeT=0.5;
  } else {
    if(a.seeT>0) a.seeT-=dt;
    if(a.target && (!a.target.alive || a.seeT<=0)) a.target=null;
  }

  const closeThreat = !!(a.target && a.target.alive && dist2(a.x,a.z,a.target.x,a.target.z) < 11*11);
  // objective actions (plant / defuse) take priority and hold the bot in place when reasonably safe
  if(objectiveAct(a,dt,closeThreat)) return;
  if(a.target && a.target.alive){ botCombat(a,dt); return; }
  // no visible enemy — advance toward the objective
  botMoveToObjective(a,dt);
}
function nearestSite(a){ return dist2(a.x,a.z,G.siteA.x,G.siteA.z) < dist2(a.x,a.z,G.siteB.x,G.siteB.z) ? G.siteA : G.siteB; }
function objectiveAct(a,dt,closeThreat){
  if(G.phase!=="live") return false;
  if(a.team==="T" && a.hasBomb && !G.bomb.planted){
    if(whichSite(a.x,a.z) && !closeThreat){ a._moving=false; a.planting+=dt/3.2; if(a.planting>=1){ plantBomb(a); a.planting=0; } return true; }
    a.planting=Math.max(0,a.planting-dt);
  }
  if(a.team==="CT" && G.bomb.planted && G.bomb.at){
    if(dist2(a.x,a.z,G.bomb.at.x,G.bomb.at.z) < 2.0*2.0 && !closeThreat){ a._moving=false; a.defusing+=dt*(a.hasKit?1/5:1/10); if(a.defusing>=1){ defuseDone(a); a.defusing=0; } return true; }
  }
  return false;
}
function botMoveToObjective(a,dt){
  if(G.phase!=="live"){ botNavigate(a,dt); return; }
  // T bomb carrier heads to a site (via its route, then straight to site center)
  if(a.team==="T" && a.hasBomb && !G.bomb.planted && !whichSite(a.x,a.z)){
    const tgt=a.route[a.routeI];
    if(tgt){ if(dist2(a.x,a.z,tgt.x,tgt.z) < 2.2*2.2) a.routeI++; else { steerTo(a,tgt.x,tgt.z,dt,1); return; } }
    const s=nearestSite(a); steerTo(a,s.x,s.z,dt,1); return;
  }
  // CT retakes / holds the planted bomb
  if(a.team==="CT" && G.bomb.planted && G.bomb.at){
    if(dist2(a.x,a.z,G.bomb.at.x,G.bomb.at.z) > 2.0*2.0){ steerTo(a,G.bomb.at.x,G.bomb.at.z,dt,1); } else botHold(a,dt);
    return;
  }
  botNavigate(a,dt);
  if(a.team==="T" && G.bomb.dropped && !G.bomb.planted) ensureBombCarrier();
}
function findVisibleEnemy(a){
  let best=null,bd=1e9; const range=a.blind>0?6:46;
  for(const t of G.agents){ if(!t.alive||t.team===a.team) continue; const d=dist2(a.x,a.z,t.x,t.z); if(d>range*range) continue;
    if(losClear(a.x,a.y+a.eye,a.z,t.x,t.y+t.eye,t.z)){ if(d<bd){bd=d;best=t;} } }
  return best;
}
function faceToward(a,tx,tz,dt,rate){
  const want=Math.atan2(tx-a.x, -(tz-a.z));
  let d=((want-a.yaw+Math.PI)%TAU)-Math.PI;
  a.yaw += clamp(d, -rate*dt, rate*dt);
}
function botCombat(a,dt){
  const t=a.target; const tx=t.x, tz=t.z, ty=t.y+t.eye;
  // aim
  faceToward(a,tx,tz,dt, 5+a.skill*6);
  const dxz=Math.hypot(tx-a.x,tz-a.z);
  a.pitch = Math.atan2((ty-(a.y+a.eye)), dxz);
  // strafe / position
  a.strafeT-=dt; if(a.strafeT<=0){ a.strafe=rand(-1,1); a.strafeT=rand(0.5,1.3); }
  const want= a.loadout.primary&&W[a.loadout.primary].cat==="sniper"?18: (W[a.cur].cat==="shotgun"?4:9);
  let mvF = (dxz>want?0.7: dxz<want*0.6?-0.6:0);
  const sinY=Math.sin(a.yaw), cosY=Math.cos(a.yaw);
  const sx=a.strafe*0.7;
  const spd=5.0*(W[a.cur]?W[a.cur].speed:1)*(a.blind>0?0.3:1);
  const wx=(sx*cosY + (-mvF)*sinY), wz=(-sx*sinY + (-mvF)*cosY);
  moveAgent(a, wx*spd*dt, wz*spd*dt);
  // shoot
  const w=W[a.cur];
  const aimErr=Math.abs(((Math.atan2(tx-a.x,-(tz-a.z))-a.yaw+Math.PI)%TAU)-Math.PI);
  if(a.reactT<=0 && a.blind<0.4 && a.deploy<=0 && a.reloadT<=0){
    if((a.mag[a.cur]||0)<=0 && w.cat!=="melee"){ tryAutoReload(a); }
    else if(aimErr<0.22 && dxz<w.range){
      const now=G.now; if(now-a.fireT >= 60/w.rpm){ botShoot(a,t,w); }
    }
  }
}
function botShoot(a,t,w){
  a.fireT=G.now; if(w.cat!=="melee") a.mag[a.cur]--; a.muzzle=0.05; a.recoil=Math.min(a.recoil+w.recoil*0.5,6);
  const dxz=Math.hypot(t.x-a.x,t.z-a.z);
  // accuracy
  const base=(1-a.skill)*0.07 + w.spread*0.6 + (a.blind>0?0.3:0) + dxz*0.0011;
  const ox=a.x, oy=a.y+a.eye, oz=a.z;
  const tx=t.x+rand(-1,1)*base*dxz, ty=(t.y+t.height*0.6)+rand(-1,1)*base*dxz*0.6, tz=t.z+rand(-1,1)*base*dxz;
  let dx=tx-ox,dy=ty-oy,dz=tz-oz; const L=Math.hypot(dx,dy,dz); dx/=L;dy/=L;dz/=L;
  // muzzle flash tracer
  shootRayBot(a,w,ox,oy,oz,dx,dy,dz);
  if((a.mag[a.cur]||0)<=0) tryAutoReload(a);
}
function shootRayBot(a,w,ox,oy,oz,dx,dy,dz){
  const maxd=w.range; let wall=rayWall(ox,oy,oz,dx,dy,dz,maxd); let hitA=null,hitT=wall,head=false;
  for(const t of G.agents){ if(!t.alive||t.team===a.team)continue; const bb=agentBox(t); const tt=segBox(ox,oy,oz,dx,dy,dz,hitT,bb); if(tt>=0&&tt<hitT){hitT=tt;hitA=t;const hy=oy+dy*tt;head=hy>=bb.head;} }
  const hx=ox+dx*hitT,hy=oy+dy*hitT,hz=oz+dz*hitT; addTracer(ox,oy-0.05,oz,hx,hy,hz,false);
  if(hitA){ let dmg=w.dmg*clamp(1-(hitT/maxd)*0.35,0.55,1); if(head)dmg*=4; damageAgent(hitA,dmg,a,head,w); addHitSpark(hx,hy,hz,true); }
  else addHitSpark(hx,hy,hz,false);
}
function botNavigate(a,dt){
  // follow route toward objective
  let tgt=a.route[a.routeI];
  if(!tgt){ // reached end -> hold near objective
    botHold(a,dt); return;
  }
  const d=Math.hypot(tgt.x-a.x,tgt.z-a.z);
  if(d<2.2){ a.routeI++; return; }
  steerTo(a,tgt.x,tgt.z,dt, a.blind>0?0.4:1);
}
function botHold(a,dt){
  // small idle wander / face likely enemy direction
  a.holdT-=dt; if(a.holdT<=0){ a.holdT=rand(1.5,3.5); a.yaw += rand(-0.8,0.8); }
  // slight reposition
  if(Math.random()<0.01){ steerTo(a, a.x+rand(-3,3), a.z+rand(-3,3), dt, 0.5); }
}
function steerTo(a,tx,tz,dt,scale){
  faceToward(a,tx,tz,dt,7);
  // wall avoidance: probe forward
  const fx=Math.sin(a.yaw), fz=-Math.cos(a.yaw);
  const probe=rayWall(a.x,a.y+0.6,a.z,fx,0,fz,1.6);
  let mvYaw=a.yaw;
  if(probe<1.5){ // steer aside
    const left=rayWall(a.x,a.y+0.6,a.z,Math.sin(a.yaw-0.9),0,-Math.cos(a.yaw-0.9),2.2);
    const right=rayWall(a.x,a.y+0.6,a.z,Math.sin(a.yaw+0.9),0,-Math.cos(a.yaw+0.9),2.2);
    mvYaw=a.yaw+(left>right?-0.9:0.9);
  }
  const spd=4.8*(W[a.cur]?W[a.cur].speed:1)*scale;
  const wx=Math.sin(mvYaw)*spd*dt, wz=-Math.cos(mvYaw)*spd*dt;
  const px=a.x,pz=a.z; moveAgent(a,wx,wz);
  // stuck detection
  if(Math.hypot(a.x-px,a.z-pz) < spd*dt*0.3){ a.stuck+=dt; if(a.stuck>0.6){ a.yaw+=rand(1.2,2.0)*(Math.random()<.5?-1:1); a.stuck=0; } } else a.stuck=0;
}
/* update mesh transforms for bots */
function syncMeshes(){
  for(const a of G.agents){ if(!a.mesh)continue; if(!a.alive){ a.mesh.visible=false; continue; } a.mesh.visible=true;
    a.mesh.position.set(a.x, a.y, a.z); a.mesh.rotation.y=a.yaw;
    // marker color: enemy vs ally relative to player side handled by team texture already
    const m=a.mesh.userData.marker; if(m){ m.visible = (a.team!==G.playerSide); }
  }
  // bomb led blink
  if(G.bomb.led){ G.bomb.led.visible = (Math.floor(performance.now()/300)%2===0); }
}

/* ============================ HUD ============================ */
function hudHealth(){ const p=G.player; const v=Math.max(0,Math.round(p.hp)); $("vitNum").textContent=v; $("vitBar").style.width=clamp(p.hp,0,100)+"%"; $("vitBar").classList.toggle("low",p.hp<35); }
function hudAmmo(){ const p=G.player; const w=W[p.cur]; $("wname").textContent=w.name.toUpperCase();
  if(w.cat==="melee"){ $("magNum").textContent="∞"; $("resNum").textContent="∞"; }
  else if(w.slot==="nade"){ $("magNum").textContent=(p.loadout.nade.length); $("resNum").textContent="0"; }
  else { $("magNum").textContent=(p.mag[p.cur]||0); $("resNum").textContent=(p.res[p.cur]||0); }
  $("ammoNum").classList.toggle("reload", p.reloadT>0);
  if(p.reloadT>0) $("wname").textContent=w.name.toUpperCase()+" · RELOAD";
  $("moneyNum").textContent=p.money|0;
}
function hudSlots(){ const p=G.player; const s=$("slots"); s.innerHTML="";
  const items=[["1","primary",p.loadout.primary],["2","pistol",p.loadout.pistol],["3","knife","knife"]];
  if(p.loadout.nade.length) items.push(["G","nade",p.loadout.nade[0]]);
  items.forEach(([label,slot,key])=>{ const d=document.createElement("div"); d.className="slot"+((slot==="knife"&&p.cur==="knife")||(slot==="primary"&&p.cur===p.loadout.primary)||(slot==="pistol"&&p.cur===p.loadout.pistol)?" active":"");
    if(!key){ d.style.opacity=.3; d.innerHTML=`<span>${label}</span>`; }
    else { d.innerHTML=`<span class="em">${W[key].em}</span><span>${label}</span>`; d.onclick=()=>{ if(slot==="nade")quickNade(); else switchTo(slot); }; }
    s.appendChild(d); });
}
function hudScores(){ $("scoreCT").textContent=G.scoreCT; $("scoreT").textContent=G.scoreT; $("pauseScore").textContent="SUGAR "+G.scoreCT+" : "+G.scoreT+" SOUR"; }
function hudTime(){ let t=Math.max(0,Math.ceil(G.phase==="freeze"?G.phaseT:G.timeLeft)); if(G.bomb.planted) t=Math.max(0,Math.ceil(G.bomb.timer)); const m=Math.floor(t/60), s=t%60; $("timeNum").textContent=m+":"+(s<10?"0":"")+s; $("timeNum").style.color=G.bomb.planted?"#ff5c86":""; }
function hudBombRow(){ const r=$("bombRow"); if(G.bomb.planted){ r.style.display="flex"; if(G.bomb.defuse>0){ $("bombFill").style.width=(G.bomb.defuse*100)+"%"; $("bombFill").style.background="#4bb6f5"; $("bombTxt").textContent="Обезвреживание"; } else { $("bombFill").style.width="100%"; $("bombFill").style.background="#ff5c86"; $("bombTxt").textContent="БОМБА · "+G.bomb.at.site; } } else r.style.display="none"; }
function banner(t,s,c){ $("banner").classList.remove("hidden"); $("bTitle").textContent=t; $("bSub").textContent=s||""; $("bCnt").textContent=c||""; }
function hideBanner(){ $("banner").classList.add("hidden"); }
function showHit(head){ const h=$("hitmark"); h.textContent="✕"; h.style.color=head?"#ff3b5c":"#fff"; h.style.opacity="1"; setTimeout(()=>h.style.opacity="0",90); }
function doDamageFlash(){ $("dmgFlash").style.boxShadow="inset 0 0 120px rgba(255,60,90,.55)"; setTimeout(()=>$("dmgFlash").style.boxShadow="inset 0 0 120px rgba(255,60,90,0)",120); }
function addKill(by,victim,w,head){ const el=document.createElement("div"); el.className="kf";
  const bn=by?`<span class="att ${by.team==='CT'?'ct':'t'}">${by.name}</span>`:`<span class="att">💣</span>`;
  const vn=`<span class="${victim.team==='CT'?'ct':'t'}">${victim.name}</span>`;
  const wem = w&&w.em?w.em:(w&&w.cat?W[keyOf(w)]?.em:"💥");
  el.innerHTML=`${bn} <span>${head?'🎯':(w&&w.em?w.em:'💥')}</span> ${vn}`;
  $("killFeed").prepend(el); setTimeout(()=>{ el.style.opacity="0"; setTimeout(()=>el.remove(),400); }, 4200);
}

/* ============================ MENUS ============================ */
let buyOpen=false, buyTab="rifle";
function show(id){ $(id).classList.remove("hidden"); }
function hide2(id){ $(id).classList.add("hidden"); }
function hideOverlays(){ ["mainMenu","howMenu","newsMenu","pauseMenu","buyMenu","endMenu"].forEach(hide2); }
function openBuy(){ if(G.phase!=="freeze"&&!G.paused) return; buyOpen=true; buyTab=(G.player.team==="T"?"rifle":"rifle"); renderBuy(); show("buyMenu"); document.exitPointerLock&&document.exitPointerLock(); }
function closeBuy(){ buyOpen=false; hide2("buyMenu"); }
function renderBuy(){
  $("buyMoney").textContent=G.player.money|0;
  const tabs=$("buyTabs"); tabs.innerHTML="";
  const order=["pistol","smg","rifle","heavy","sniper","gear"];
  const labels={pistol:"Пистолеты",smg:"ПП",rifle:"Винтовки",heavy:"Тяжёлое",sniper:"Снайперки",gear:"Броня/Гранаты"};
  order.forEach(c=>{ const b=document.createElement("div"); b.className="buyTab"+(c===buyTab?" on":""); b.textContent=labels[c]; b.onclick=()=>{buyTab=c;renderBuy();}; tabs.appendChild(b); });
  const grid=$("buyGrid"); grid.innerHTML="";
  const p=G.player;
  const items=BUY_CATS[buyTab];
  items.forEach(key=>{
    let name,price,sub;
    if(key==="armor"){ name="Броня (кевлар)"; price=650; sub="100 брони"; }
    else if(key==="kit"){ name="Набор сапёра"; price=200; sub="быстрое обезвреживание"; if(p.team!=="CT")return; }
    else { const w=W[key]; if(w.team&&w.team!==p.team) return; name=w.name; price=w.price; sub=`урон ${w.dmg} · ${w.mag?w.mag+' патр.':'граната'}`; }
    const can=p.money>=price;
    const d=document.createElement("div"); d.className="buyItem"+(can?"":" cant");
    const em=(key==="armor")?"🛡️":(key==="kit")?"🧰":W[key].em;
    d.innerHTML=`<div class="bn"><span>${em} ${name}</span><span class="bp">$${price}</span></div><div class="bs">${sub}</div>`;
    d.onclick=()=>{ if(!can)return; buyItem(key,price); };
    grid.appendChild(d);
  });
}
function buyItem(key,price){ const p=G.player; if(p.money<price)return; p.money-=price;
  if(key==="armor"){ p.armor=100; }
  else if(key==="kit"){ p.hasKit=true; }
  else { const w=W[key]; if(w.slot==="primary"){ p.loadout.primary=key; p.mag[key]=w.mag; p.res[key]=w.res; p.cur=key; }
    else if(w.slot==="pistol"){ p.loadout.pistol=key; p.mag[key]=w.mag; p.res[key]=w.res; }
    else if(w.slot==="nade"){ if(p.loadout.nade.length<3){ p.loadout.nade.push(key); p.mag[key]=0; } } }
  hudAmmo(); hudSlots(); renderBuy();
}
function togglePause(force){ if(G.phase==="menu"||G.phase==="matchend")return; if(force!==undefined){ G.paused=force; } else G.paused=!G.paused;
  if(G.paused){ hudScores(); show("pauseMenu"); document.exitPointerLock&&document.exitPointerLock(); } else hide2("pauseMenu"); }

/* ============================ MAIN LOOP ============================ */
function loop(){
  requestAnimationFrame(loop);
  const dt=Math.min(0.05, G.clock.getDelta());
  if(G.running && !G.paused && !buyOpen && G.phase!=="menu" && G.phase!=="matchend"){
    G.now+=dt;
    stepPhase(dt);
    if(G.phase!=="freeze"){ for(const a of G.agents){ if(a.isPlayer)continue; updateBot(a,dt); } }
    else { for(const a of G.agents){ if(a.isPlayer)continue; applyGravity(a,dt); } }
    updatePlayer(dt);
    updateNades(dt); updateSmokes(dt); updateFX(dt);
    ensureBombCarrier();
    syncMeshes();
    hudTime();
    // flash decay
    if(G.flashAmt>0){ G.flashAmt=Math.max(0,G.flashAmt-dt*0.7); }
  }
  // flash overlay
  document.getElementById("dmgFlash").style.background = G.flashAmt>0? `rgba(255,255,255,${clamp(G.flashAmt,0,1)})` : "transparent";
  G.renderer.render(G.scene,G.cam);
}
function stepPhase(dt){
  if(G.phase==="freeze"){ G.phaseT-=dt; if(G.phaseT<=0){ G.phase="live"; hideBanner(); if(buyOpen)closeBuy();
      // bots re-plan
    } $("bCnt").textContent=Math.ceil(G.phaseT); return; }
  if(G.phase==="live"){
    if(G.bomb.planted){ G.bomb.timer-=dt; if(G.bomb.defuser && (!G.bomb.defuser.alive)) { /* keep */ } if(G.bomb.timer<=0){ explodeBomb(); } }
    else { G.timeLeft-=dt; if(G.timeLeft<=0){ endRound("CT","Время вышло — бомба не заложена"); } }
    return;
  }
  if(G.phase==="roundend"){ G.phaseT-=dt; $("bCnt").textContent=Math.ceil(G.phaseT); if(G.phaseT<=0){ hideBanner(); specTarget=null; if(G.scoreCT<G.target&&G.scoreT<G.target) startRound(); } return; }
}

/* ============================ INIT ============================ */
function init(){
  const app=$("app");
  G.scene=new THREE.Scene();
  G.scene.background=new THREE.Color(0xbfe3ff);
  G.scene.fog=new THREE.Fog(0xdcefff, 34, 72);
  G.cam=new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.05, 220);
  G.renderer=new THREE.WebGLRenderer({antialias:true});
  G.renderer.setSize(innerWidth,innerHeight); G.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  app.appendChild(G.renderer.domElement);
  // lights (soft candy)
  G.scene.add(new THREE.HemisphereLight(0xffffff,0xffd6e6,0.95));
  const sun=new THREE.DirectionalLight(0xfff2e0,0.55); sun.position.set(20,40,10); G.scene.add(sun);
  G.scene.add(new THREE.AmbientLight(0xffffff,0.35));
  buildMap();
  G.clock=new THREE.Clock();
  setupInput();
  window.addEventListener("resize",()=>{ G.cam.aspect=innerWidth/innerHeight; G.cam.updateProjectionMatrix(); G.renderer.setSize(innerWidth,innerHeight); });
  // safe area
  const st=getComputedStyle(document.documentElement).getPropertyValue("--safe-top");
  document.documentElement.style.setProperty("--safe-top","env(safe-area-inset-top, 0px)");
  // touch UI visibility
  if(!IS_TOUCH){ ["joyZone","joy","fireBtn","jumpBtn","reloadBtn","nadeBtn","crouchBtn"].forEach(id=>{ const e=$(id); if(e&&id!=="fireBtn")e.style.display="none"; }); $("fireBtn").style.display="none"; }
  loop();
  $("loading").style.display="none";
  wireMenus();
  // news date
  fillNews();
}
function wireMenus(){
  // side pick
  document.querySelectorAll(".sidePick").forEach(el=>el.onclick=()=>{ document.querySelectorAll(".sidePick").forEach(e=>e.classList.remove("sel")); el.classList.add("sel"); G.playerSide=el.dataset.side; });
  $("startBtn").onclick=()=>{ hideOverlays(); show2("hud"); startMatch(G.playerSide); hudHealth(); hudAmmo(); hudSlots(); };
  $("howBtn").onclick=()=>{ hide2("mainMenu"); show("howMenu"); };
  $("howBack").onclick=()=>{ hide2("howMenu"); show("mainMenu"); };
  $("newsBtn").onclick=()=>{ hide2("mainMenu"); show("newsMenu"); };
  $("newsBack").onclick=()=>{ hide2("newsMenu"); show("mainMenu"); };
  $("resumeBtn").onclick=()=>togglePause(false);
  $("buyFromPause").onclick=()=>{ openBuy(); };
  $("restartBtn").onclick=()=>{ hideOverlays(); G.paused=false; show2("hud"); startMatch(G.playerSide); };
  $("quitBtn").onclick=()=>{ backToMenu(); };
  $("buyClose").onclick=()=>closeBuy();
  $("endAgain").onclick=()=>{ hideOverlays(); show2("hud"); startMatch(G.playerSide); };
  $("endQuit").onclick=()=>backToMenu();
}
function show2(id){ $(id).classList.remove("hidden"); }
function backToMenu(){ G.running=false; G.paused=false; G.phase="menu"; postRun(false); hideOverlays(); hide2("hud"); show("mainMenu"); }
function fillNews(){
  const d=new Date();
  const pad=n=>(n<10?"0":"")+n;
  $("newsDate").textContent="Обновление — "+pad(d.getDate())+"."+pad(d.getMonth()+1)+"."+d.getFullYear()+" "+pad(d.getHours())+":"+pad(d.getMinutes());
  $("newsBody").innerHTML=`<b>v1.0 — премьера Sugar Strike 🍬🔫</b><br>
   • 3D-шутер в стиле CS 1.6 на конфетной карте <b>de_mansion</b>.<br>
   • Режим с бомбой: SOUR (T) закладывают, SUGAR (CT) обезвреживают.<br>
   • Боты в обеих командах, экономика и магазин закупки ($).<br>
   • 18 стволов из CS 1.6 + броня, набор сапёра и 3 вида гранат.<br>
   • Управление с телефона (джойстик + FIRE/↑/↻/💣) и с ПК (WASD+мышь).`;
}
/* postMessage to GamePass wrapper so "Back" can guard an active match */
function postRun(active){ try{ parent&&parent.postMessage({type:"sugar:run",active:!!active},"*"); }catch(e){} }

/* ---- sound (tiny WebAudio blips, optional) ---- */
let AC=null; function ac(){ if(!AC){ try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){AC=null;} } return AC; }
function blip(freq,dur,type,vol){ const c=ac(); if(!c)return; const o=c.createOscillator(),g=c.createGain(); o.type=type||"square"; o.frequency.value=freq; g.gain.value=vol||0.03; o.connect(g).connect(c.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+(dur||0.06)); o.stop(c.currentTime+(dur||0.06)); }
function playShot(w){ if(!G._sound)return; blip(w.cat==="sniper"?180:w.cat==="pistol"?420:300,0.05,"square",0.02); }
function playBoom(){ if(!G._sound)return; blip(90,0.3,"sawtooth",0.05); }
G._sound=false; // muted by default (kept quiet; user watches films)

// prevent gameplay-surface selection/context menu
["selectstart","dragstart","contextmenu"].forEach(ev=>document.addEventListener(ev,e=>{ const t=e.target; if(t&&(t.tagName==="A"||t.tagName==="INPUT"||t.tagName==="TEXTAREA"))return; e.preventDefault(); }));

window.addEventListener("load", init);
})();
