import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { N8AOPass } from './vendor/N8AO.js';
import { T, ROOMS } from './i18n.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
let LANG = 'et';   // Estonian by default; ?lang=en|ru overrides
const qs = new URLSearchParams(location.search); if (T[qs.get('lang')]) LANG = qs.get('lang');

// ---------- renderer / scene ----------
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfcbd1, 400, 1500);
const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.08, 9000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.07;
controls.maxPolarAngle = Math.PI*0.48; controls.minDistance = 6; controls.maxDistance = 220;

const sky = new Sky(); sky.scale.setScalar(4000); scene.add(sky);
const su = sky.material.uniforms;
su.turbidity.value = 3.5; su.rayleigh.value = 1.2; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.85;
const hemi = new THREE.HemisphereLight(0xe9eef2, 0x8a826f, 0.9); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3e2, 3.2);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
const sc = sun.shadow.camera; sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 1; sc.far = 260;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun); scene.add(sun.target);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.85;

// ---------- textures ----------
const TL = new THREE.TextureLoader();
const aniso = renderer.capabilities.getMaxAnisotropy();
function canvasTex(w, h, draw, rep = [1,1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t;
}
const rnd = (a=>()=>((a=Math.sin(a)*10000)-Math.floor(a)))(7.1);
// textures are 1 unit = 1 metre via shape UVs; repeat = 1/tile size
const oakCanvas = (() => { const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); const bc = document.createElement('canvas'); bc.width = bc.height = S; const bg = bc.getContext('2d'); bg.fillStyle = '#808080'; bg.fillRect(0, 0, S, S);
  const n = 13, pw = S / n; // 2.4 m tile, ~185 mm boards
  for (let i = 0; i < n; i++) { let y = -rnd() * S * 0.5; while (y < S) { const L = S * (0.45 + rnd() * 0.5); const tone = rnd();
      const r = 168 + tone * 38, gg = r * (0.74 + rnd() * 0.04), bb = r * (0.52 + rnd() * 0.05);
      g.fillStyle = `rgb(${r | 0},${gg | 0},${bb | 0})`; g.fillRect(i * pw, y, pw, L);
      // grain: long slightly wavy fibres
      for (let k = 0; k < 46; k++) { const x0 = i * pw + rnd() * pw, amp = 0.6 + rnd() * 2.2, fr = 0.004 + rnd() * 0.01, ph = rnd() * 6; g.strokeStyle = `rgba(${rnd() < 0.5 ? '96,62,32' : '214,180,130'},${0.05 + rnd() * 0.12})`; g.lineWidth = 0.5 + rnd() * 1.6; g.beginPath(); for (let yy = 0; yy <= L; yy += 8) { const xx = x0 + Math.sin((y + yy) * fr + ph) * amp; yy ? g.lineTo(xx, y + yy) : g.moveTo(xx, y); } g.stroke(); }
      // cathedral flame on some boards
      if (rnd() < 0.35) { const cx = i * pw + pw * (0.3 + rnd() * 0.4); for (let q = 0; q < 7; q++) { g.strokeStyle = `rgba(110,72,38,${0.08 + rnd() * 0.08})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(cx, y + L * (0.3 + rnd() * 0.4), 3 + q * 4, 40 + q * 26, 0, 0, Math.PI * 2); g.stroke(); } }
      if (rnd() < 0.2) { const kx = i * pw + pw * (0.2 + rnd() * 0.6), ky = y + rnd() * L; const gr = g.createRadialGradient(kx, ky, 0, kx, ky, 7); gr.addColorStop(0, 'rgba(70,42,20,.75)'); gr.addColorStop(1, 'rgba(70,42,20,0)'); g.fillStyle = gr; g.fillRect(kx - 8, ky - 10, 16, 20); }
      // bevelled joints
      g.fillStyle = 'rgba(55,35,20,.55)'; g.fillRect(i * pw, y, pw, 2); g.fillRect(i * pw, y, 2, L);
      bg.fillStyle = '#2a2a2a'; bg.fillRect(i * pw, y, pw, 3); bg.fillRect(i * pw, y, 3, L);
      y += L; } }
  return [c, bc]; })();
const texOak = (() => { const t = new THREE.CanvasTexture(oakCanvas[0]); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 2.4, 1 / 2.4); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; })();
const bumpOak = (() => { const t = new THREE.CanvasTexture(oakCanvas[1]); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 2.4, 1 / 2.4); return t; })();
const texDeck = canvasTex(512, 512, (g,w,h)=>{ const n=14, pw=w/n; for(let i=0;i<n;i++){ const c=70+rnd()*22; g.fillStyle=`rgb(${c},${c*0.7|0},${c*0.52|0})`; g.fillRect(0,i*pw,w,pw-2); for(let k=0;k<10;k++){g.fillStyle=`rgba(30,18,10,${0.08+rnd()*0.08})`; g.fillRect(0,i*pw+rnd()*pw,w,1);} g.fillStyle='#1d140e'; g.fillRect(0,i*pw+pw-2,w,2);} }, [1/2,1/2]);
const texPaver = canvasTex(512, 512, (g,w,h)=>{ g.fillStyle='#8f8d88'; g.fillRect(0,0,w,h); const bw=w/10, bh=h/20; for(let r=0;r<20;r++) for(let c=-1;c<11;c++){ const x=c*bw+(r%2)*bw/2; const v=150+rnd()*30; g.fillStyle=`rgb(${v},${v-2},${v-6})`; g.fillRect(x+1.5,r*bh+1.5,bw-3,bh-3);} }, [1/2,1/2]);
const texSlab = canvasTex(256, 256, (g,w,h)=>{ g.fillStyle='#7d7b77'; g.fillRect(0,0,w,h); for(let r=0;r<2;r++)for(let c=0;c<2;c++){const v=176+rnd()*16; g.fillStyle=`rgb(${v},${v},${v-4})`; g.fillRect(c*w/2+2,r*h/2+2,w/2-4,h/2-4);} }, [1/1.2,1/1.2]);
const texStone = canvasTex(512, 512, (g,w,h)=>{ g.fillStyle='#55534f'; g.fillRect(0,0,w,h); let y=0; while(y<h){ const rh=18+rnd()*26; let x=-rnd()*60; while(x<w){ const bw=40+rnd()*90; const v=120+rnd()*70; g.fillStyle=`rgb(${v},${v-2},${v-5})`; g.fillRect(x+2,y+2,bw-4,rh-4); x+=bw;} y+=rh;} }, [1/2,1/2]);
const texPanel = canvasTex(256, 512, (g,w,h)=>{ g.fillStyle='#0f1622'; g.fillRect(0,0,w,h); g.strokeStyle='rgba(150,170,200,.35)'; g.lineWidth=2; for(let i=1;i<6;i++){g.beginPath();g.moveTo(i*w/6,0);g.lineTo(i*w/6,h);g.stroke();} for(let j=1;j<10;j++){g.beginPath();g.moveTo(0,j*h/10);g.lineTo(w,j*h/10);g.stroke();} g.strokeStyle='#c9ccd0'; g.lineWidth=6; g.strokeRect(0,0,w,h); });
const texWoodV = canvasTex(256, 256, (g,w,h)=>{ const n=7, pw=w/n; for(let i=0;i<n;i++){ const c=70+rnd()*24; g.fillStyle=`rgb(${c},${c*0.69|0},${c*0.5|0})`; g.fillRect(i*pw,0,pw-2,h); g.fillStyle='#1b120c'; g.fillRect(i*pw+pw-2,0,2,h);} }, [1,1]);

const M = {
  white: new THREE.MeshStandardMaterial({ color: 0xf1f0ec, roughness: 0.55 }),
  interior: new THREE.MeshStandardMaterial({ color: 0xf2f0eb, roughness: 0.92 }),
  ceiling: new THREE.MeshStandardMaterial({ color: 0xf6f5f2, roughness: 0.95 }),
  oak: new THREE.MeshStandardMaterial({ map: texOak, bumpMap: bumpOak, bumpScale: 1.2, roughness: 0.42, envMapIntensity: 0.7 }),
  deck: new THREE.MeshStandardMaterial({ map: texDeck, bumpMap: texDeck, bumpScale: 1.6, roughness: 0.82 }),
  paver: new THREE.MeshStandardMaterial({ map: texPaver, bumpMap: texPaver, bumpScale: 1.4, roughness: 0.9 }),
  slab: new THREE.MeshStandardMaterial({ map: texSlab, bumpMap: texSlab, bumpScale: 1.2, roughness: 0.92 }),
  stone: new THREE.MeshStandardMaterial({ map: texStone, bumpMap: texStone, bumpScale: 2.0, roughness: 0.95 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x5b5e61, roughness: 0.85 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.5, metalness: 0.3 }),
  panel: new THREE.MeshStandardMaterial({ map: texPanel, roughness: 0.25, metalness: 0.5 }),
  woodV: new THREE.MeshStandardMaterial({ map: texWoodV, bumpMap: texWoodV, bumpScale: 1.5, roughness: 0.75 }),
  fence: new THREE.MeshStandardMaterial({ color: 0x3a3c3e, roughness: 0.6, metalness: 0.4 }),
  mesh: new THREE.MeshStandardMaterial({ color: 0x3a3c3e, roughness: 0.7, transparent: true, opacity: 0.28, depthWrite: false }),
  glassBal: new THREE.MeshPhysicalMaterial({ color: 0xcfe3e6, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
  soft: new THREE.MeshStandardMaterial({ color: 0xd8d2c8, roughness: 0.95 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x5a554f, roughness: 0.8 }),
};

// ---------- data ----------
const model = await (await fetch('assets/model.json')).json();
const house = new THREE.Group(); house.rotation.y = model.frame.rot; scene.add(house);
const P = (u, v, z) => new THREE.Vector3(u, z, -v);          // local → group space
const toWorld = (u, v, z) => house.localToWorld(P(u, v, z));
house.updateMatrixWorld(true);
const groups = { roof: new THREE.Group(), up: new THREE.Group(), ground: new THREE.Group(), site: new THREE.Group(), furn: new THREE.Group() };
Object.values(groups).forEach(g => house.add(g));

function shapeFrom(poly, holes = []) {
  const s = new THREE.Shape(poly.map(([u, v]) => new THREE.Vector2(u, v)));
  holes.forEach(h => s.holes.push(new THREE.Path(h.map(([u, v]) => new THREE.Vector2(u, v)))));
  return s;
}
// horizontal slab: shape in (u,v); extrude between z0..z1
function slab(poly, z0, z1, mat, holes = [], sideMat = null) {
  const g = new THREE.ExtrudeGeometry(shapeFrom(poly, holes), { depth: z1 - z0, bevelEnabled: false });
  g.rotateX(-Math.PI / 2); g.translate(0, z0, 0);
  const m = new THREE.Mesh(g, sideMat ? [mat, sideMat] : mat); m.castShadow = m.receiveShadow = true; return m;
}
function flat(poly, z, mat, holes = []) {
  const g = new THREE.ShapeGeometry(shapeFrom(poly, holes)); g.rotateX(-Math.PI / 2); g.translate(0, z, 0);
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; return m;
}
function box(u0, v0, u1, v1, z0, z1, mat) {
  const g = new THREE.BoxGeometry(Math.abs(u1 - u0), z1 - z0, Math.abs(v1 - v0));
  g.translate((u0 + u1) / 2, (z0 + z1) / 2, -(v0 + v1) / 2);
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
}
function boxGeo(u0, v0, u1, v1, z0, z1) { const g = new THREE.BoxGeometry(Math.abs(u1-u0), z1-z0, Math.abs(v1-v0)); g.translate((u0+u1)/2,(z0+z1)/2,-(v0+v1)/2); return g; }
function quad(a, b, c, d, nWanted, uv = [0,0, 1,0, 1,1, 0,1]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a.toArray(), ...b.toArray(), ...c.toArray(), ...d.toArray()], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a));
  g.setIndex(n.dot(nWanted) >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
  g.computeVertexNormals(); return g;
}

// ---------- loading progress ----------
let toLoad = 0, loaded = 0;
const mgr = THREE.DefaultLoadingManager;
mgr.onProgress = (u, l, t) => { $('#lbar').style.width = (100 * l / t) + '%'; };
function tex(url, color = true) { const t = TL.load(url); if (color) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; }

const interiorMats = [];
// ---------- facades ----------
const collide = { 1: [], 2: [] };   // segments [u0,v0,u1,v1]
for (const f of model.faces) {
  const [u0, v0] = f.p0, [u1, v1] = f.p1, n = f.n, t = f.t;
  const nW = new THREE.Vector3(n[0], 0, -n[1]);
  const grp = f.floor === 1 ? groups.ground : groups.up;
  const map = tex(`assets/f_${f.name}.jpg`); const am = tex(`assets/m_${f.name}.png`, false);
  am.minFilter = THREE.LinearFilter; am.generateMipmaps = false;
  const nm = tex(`assets/n_${f.name}.jpg`, false), rm = tex(`assets/r_${f.name}.jpg`, false);
  const outer = new THREE.MeshStandardMaterial({ map, alphaMap: am, alphaTest: 0.5, roughness: 1.0, roughnessMap: rm, normalMap: nm, normalScale: new THREE.Vector2(1, 1), envMapIntensity: 0.9 });
  const ox = n[0] * 0.012, oy = n[1] * 0.012;
  const g = quad(P(u0 + ox, v0 + oy, f.z0), P(u1 + ox, v1 + oy, f.z0), P(u1 + ox, v1 + oy, f.z1), P(u0 + ox, v0 + oy, f.z1), nW);
  const mo = new THREE.Mesh(g, outer); mo.castShadow = mo.receiveShadow = true; grp.add(mo);
  // windows: the outer skin is cut along the whole opening; frames are drawn once, as their own plane in the glass line
  if (f.wins && f.wins.length) {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1d2024, roughness: 0.45, metalness: 0.2, alphaTest: 0.5, side: THREE.DoubleSide });
    frameMat.alphaMap = am;   // replaced below once the mask image is in
    const fo = -0.04, fx = n[0] * fo, fy = n[1] * fo;
    const gf = quad(P(u0 + fx, v0 + fy, f.z0), P(u1 + fx, v1 + fy, f.z0), P(u1 + fx, v1 + fy, f.z1), P(u0 + fx, v0 + fy, f.z1), nW);
    const mf = new THREE.Mesh(gf, frameMat); mf.name = 'winframe'; mf.castShadow = true; mf.visible = false; grp.add(mf);
    new THREE.ImageLoader(mgr).load(`assets/m_${f.name}.png`, img => {
      const W = img.width, H = img.height, Lf = Math.hypot(u1 - u0, v1 - v0), sx = W / Lf, sz = H / (f.z1 - f.z0);
      const rect = ([a, b, za, zb]) => [a * sx, (f.z1 - zb) * sz, (b - a) * sx, (zb - za) * sz];
      const cut = document.createElement('canvas'); cut.width = W; cut.height = H; const g1 = cut.getContext('2d');
      g1.drawImage(img, 0, 0); g1.fillStyle = '#000'; for (const w of f.wins) g1.fillRect(...rect(w));
      const fr = document.createElement('canvas'); fr.width = W; fr.height = H; const g2 = fr.getContext('2d');
      g2.fillStyle = '#000'; g2.fillRect(0, 0, W, H);
      const fh = Math.max(2, 0.055 * sz), zCeil = f.floor === 1 ? 2.985 : 6.48;
      for (const w0 of f.wins) {   // frame = the drawing's own frame; add only a head where the opening runs into the ceiling
        const r = rect(w0); g2.drawImage(img, r[0], r[1], r[2], r[3], r[0], r[1], r[2], r[3]);
        { const rc = rect([w0[0], w0[1], w0[2], Math.min(w0[3], zCeil)]); g2.fillStyle = '#fff'; g2.fillRect(rc[0], rc[1], rc[2], fh); }   // every opening gets a visible head (kept only where glass is below it)
      }
      const mk = c => { const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t; };
      outer.alphaMap = mk(cut); outer.needsUpdate = true;
      // keep frame pixels only where they border real glass (no stray bars beside the glazing)
      new THREE.ImageLoader(mgr).load(`assets/g_${f.name}.png`, gimg => {
        const gc = document.createElement('canvas'); gc.width = W; gc.height = H; const gx = gc.getContext('2d'); gx.drawImage(gimg, 0, 0, W, H);
        const gd = gx.getImageData(0, 0, W, H).data, fd = g2.getImageData(0, 0, W, H);
        const R = Math.max(2, Math.round(0.07 * sx)), glass = new Uint8Array(W * H);
        for (let i = 0; i < W * H; i++) glass[i] = gd[i * 4 + 1] > 127 ? 1 : 0;
        const rowMax = new Uint8Array(W * H);
        for (let y = 0; y < H; y++) { let last = -1e9; for (let x = 0; x < W; x++) { if (glass[y * W + x]) last = x; rowMax[y * W + x] = x - last <= R ? 1 : 0; }
          last = 1e9; for (let x = W - 1; x >= 0; x--) { if (glass[y * W + x]) last = x; if (last - x <= R) rowMax[y * W + x] = 1; } }
        const near = new Uint8Array(W * H);
        for (let x = 0; x < W; x++) { let last = -1e9; for (let y = 0; y < H; y++) { if (rowMax[y * W + x]) last = y; near[y * W + x] = y - last <= R ? 1 : 0; }
          last = 1e9; for (let y = H - 1; y >= 0; y--) { if (rowMax[y * W + x]) last = y; if (last - y <= R) near[y * W + x] = 1; } }
        for (let i = 0; i < W * H; i++) if (!near[i]) { fd.data[i * 4] = fd.data[i * 4 + 1] = fd.data[i * 4 + 2] = 0; }
        g2.putImageData(fd, 0, 0);
        frameMat.alphaMap = mk(fr); frameMat.needsUpdate = true; mf.visible = true;
      });
    });
  }
  const iu0 = u0 - n[0] * t, iv0 = v0 - n[1] * t, iu1 = u1 - n[0] * t, iv1 = v1 - n[1] * t;
  const zi0 = f.floor === 1 ? 0 : 3.5, zi1 = f.floor === 1 ? 3.0 : 6.5;
  const fz = z => (z - f.z0) / (f.z1 - f.z0);
  const imap = tex(`assets/i_${f.name}.png`);
  // inner wall face: cut the whole opening (glass + frame) so the frame is seen once, on the outer plane — not doubled on the inside
  let iam = am;
  if (f.wins && f.wins.length) {
    const PX = 40, Lf = Math.hypot(u1 - u0, v1 - v0), c = document.createElement('canvas');
    c.width = Math.max(8, Math.ceil(Lf * PX)); c.height = Math.max(8, Math.ceil((f.z1 - f.z0) * PX));
    const g2 = c.getContext('2d'); g2.fillStyle = '#fff'; g2.fillRect(0, 0, c.width, c.height); g2.fillStyle = '#000';
    const e = 0;
    for (const [a, b, za, zb] of f.wins) g2.fillRect(a * PX + e, (f.z1 - zb) * PX + e, (b - a) * PX - 2 * e, (zb - za) * PX - 2 * e);
    iam = new THREE.CanvasTexture(c); iam.minFilter = THREE.LinearFilter; iam.generateMipmaps = false;
  }
  const inner = new THREE.MeshStandardMaterial({ color: 0xf3f0eb, roughness: 0.9, alphaMap: iam, alphaTest: 0.5 });   // plain plaster: frames live only in the frame plane interiorMats.push(inner);
  const gi = quad(P(iu0, iv0, zi0), P(iu1, iv1, zi0), P(iu1, iv1, zi1), P(iu0, iv0, zi1), nW.clone().negate(), [0, fz(zi0), 1, fz(zi0), 1, fz(zi1), 0, fz(zi1)]);
  const mi = new THREE.Mesh(gi, inner); mi.receiveShadow = true; mi.castShadow = true; grp.add(mi);
  // reveal caps (top and sides of the wall body) — thin dark frames read as window depth
  if (f.glass) {
    const gm = tex(`assets/g_${f.name}.png`, false); gm.minFilter = THREE.LinearFilter; gm.generateMipmaps = false;
    const gu0 = u0 - n[0] * 0.045, gv0 = v0 - n[1] * 0.045, gu1 = u1 - n[0] * 0.045, gv1 = v1 - n[1] * 0.045;   // glass sits in the frame plane
    const gl = new THREE.MeshPhysicalMaterial({ color: 0xa9bcc2, roughness: 0.02, metalness: 0.05, transparent: true, opacity: 0.2, alphaMap: gm, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 0.55 });
    const gg = quad(P(gu0, gv0, f.z0), P(gu1, gv1, f.z0), P(gu1, gv1, f.z1), P(gu0, gv0, f.z1), nW);
    const mg = new THREE.Mesh(gg, gl); mg.renderOrder = 2; grp.add(mg);
  }
  // collision: wall minus passable intervals (door / floor-to-ceiling glass)
  const L = Math.hypot(u1 - u0, v1 - v0), tu = (u1 - u0) / L, tv = (v1 - v0) / L;
  let s = 0; const cuts = [...f.pass, [L, L]];
  for (const [a, b] of cuts) { if (a - s > 0.02) collide[f.floor].push([u0 + tu * s, v0 + tv * s, u0 + tu * a, v0 + tv * a]); s = b; }
}

// ---------- reveals: openings get real depth instead of paper-thin cut-outs ----------
{ const gs = [];
  for (const f of model.faces) { if (!f.wins || !f.wins.length) continue;
    const [u0, v0] = f.p0, [u1, v1] = f.p1, n = f.n, t = f.t; const L = Math.hypot(u1 - u0, v1 - v0), tu = (u1 - u0) / L, tv = (v1 - v0) / L;
    const ws = [...f.wins].sort((a, b) => a[0] - b[0]); const ops = [];
    for (const w of ws) { const o = ops[ops.length - 1]; if (o && w[0] - o[1] < 0.15 && Math.abs(w[2] - o[2]) < 0.3 && Math.abs(w[3] - o[3]) < 0.3) { o[1] = Math.max(o[1], w[1]); o[2] = Math.min(o[2], w[2]); o[3] = Math.max(o[3], w[3]); } else ops.push([...w]); }
    const zf = f.floor === 1 ? 0 : 3.5, zc = f.floor === 1 ? 3.0 : 6.5;
    const at = (s, d) => [u0 + tu * s - n[0] * d, v0 + tv * s - n[1] * d];
    for (let [a, b, z0, z1] of ops) { a = Math.max(0, a); b = Math.min(L, b); z0 = Math.max(zf, z0); z1 = Math.min(zc, z1);
      const A0 = at(a, 0), A1 = at(a, t), B0 = at(b, 0), B1 = at(b, t);
      const nw = (x, y) => new THREE.Vector3(x, 0, -y);
      gs.push(quad(P(...A0, z0), P(...A1, z0), P(...A1, z1), P(...A0, z1), nw(tu, tv)));
      gs.push(quad(P(...B0, z0), P(...B1, z0), P(...B1, z1), P(...B0, z1), nw(-tu, -tv)));
      if (z1 < zc - 0.03) gs.push(quad(P(...A0, z1), P(...B0, z1), P(...B1, z1), P(...A1, z1), new THREE.Vector3(0, -1, 0)));
      if (z0 > zf + 0.05) gs.push(quad(P(...A0, z0), P(...B0, z0), P(...B1, z0), P(...A1, z0), new THREE.Vector3(0, 1, 0))); } }
  if (gs.length) { const m = new THREE.Mesh(mergeGeometries(gs), new THREE.MeshStandardMaterial({ color: 0xeceae5, roughness: 0.8, side: THREE.DoubleSide })); m.castShadow = m.receiveShadow = true; groups.ground.add(m); }
}
// ---------- slabs, floors, roof ----------
const EF1 = model.ef1, EF2 = model.ef2, FP = model.footprint, st = model.stair;
const stairHole = [[st.u0, st.v0], [st.u1, st.v0], [st.u1, st.vt], [st.u0, st.vt]];
groups.ground.add(slab(EF1, -0.3, 0.0, M.white));
groups.ground.add(flat(EF1, 0.012, M.oak));
// intermediate slab (floor 2 + balconies + carport roof)
const midSlab = slab(FP, 3.0, 3.5, M.white, [stairHole.slice().reverse()]);
groups.up.add(midSlab);
for (const d of (model.deck2 || [])) groups.up.add(flat(d.map(([u, v]) => [u, v]), 3.512, M.deck));   // footprint minus upper floor, precomputed (FP-with-hole triangulated a wedge over the terrace)
groups.up.add(flat(EF2, 3.515, M.oak, [stairHole.slice().reverse()]));
// ground-floor ceiling (visible when upper floor hidden? no — only from inside)
const ceil1 = flat(EF1, 2.985, M.ceiling); ceil1.rotation.x = 0; ceil1.geometry.scale(1, 1, 1); ceil1.material = M.ceiling; ceil1.material.side = THREE.BackSide; groups.up.add(ceil1);
// roof
const roof = slab(model.roof, 6.5, 7.05, M.roof, [], M.white); groups.roof.add(roof);
{ const c2 = flat(EF2, 6.485, M.ceiling); groups.roof.add(c2); }
const ch = model.chimney; groups.roof.add(box(ch[0], ch[1], ch[2], ch[3], 6.5, 8.0, M.stone));
groups.roof.add(box(ch[0] - 0.02, ch[1] - 0.02, ch[2] + 0.02, ch[3] + 0.02, 7.98, 8.04, M.black));
for (const p of model.panels) {
  const g = new THREE.BoxGeometry(p[2] - p[0], 0.04, p[3] - p[1]);
  const m = new THREE.Mesh(g, [M.black, M.black, M.panel, M.black, M.black, M.black]);
  m.position.copy(P((p[0] + p[2]) / 2, (p[1] + p[3]) / 2, 7.35)); m.rotation.x = -0.26; m.castShadow = true; groups.roof.add(m);
  const leg = box(p[0] + 0.4, p[3] - 0.25, p[2] - 0.4, p[3] - 0.2, 7.05, 7.55, M.black); groups.roof.add(leg);
}
// roof fascia line (black coping)
// balustrades
for (const b of model.balu) {
  const [a0, b0, a1, b1] = b; const L = Math.hypot(a1 - a0, b1 - b0);
  const g = new THREE.BoxGeometry(L, 1.0, 0.02); const m = new THREE.Mesh(g, M.glassBal);
  m.position.copy(P((a0 + a1) / 2, (b0 + b1) / 2, 4.0)); m.rotation.y = Math.atan2(b1 - b0, a1 - a0); m.renderOrder = 3; groups.up.add(m);
  collide[2].push([a0, b0, a1, b1]);
}
const pp = model.parapet; groups.up.add(box(pp[0], pp[1], pp[2], pp[3], pp[4], pp[5], M.woodV));
collide[2].push([pp[0], pp[3], pp[2], pp[3]]);
// carport: posts + slat screens (wood ribs 50×200)
groups.ground.add(box(20.93, 19.26, 21.13, 19.46, -0.3, 3.0, M.white));
groups.ground.add(box(20.93, 13.76, 21.13, 13.96, -0.3, 3.0, M.white));
{ const c = document.createElement('canvas'); c.width = 96; c.height = 16; const g = c.getContext('2d'); g.fillStyle = '#5a3c29'; g.fillRect(0, 0, 32, 16); g.fillStyle = '#3e2a1d'; g.fillRect(28, 0, 4, 16);
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; t.repeat.set(4.25 / 0.15, 1);
  const mat = new THREE.MeshStandardMaterial({ map: t, transparent: true, side: THREE.DoubleSide, roughness: 0.8, depthWrite: false });
  for (const vv of [19.36, 13.86]) for (const dv of [-0.09, 0.09]) { const pg = new THREE.PlaneGeometry(4.25, 3.3); const m = new THREE.Mesh(pg, mat); m.position.copy(P(16.65 + 4.25 / 2, vv + dv, -0.3 + 1.65)); m.renderOrder = 2; groups.ground.add(m); } }
// interior walls
function interiorWalls(rects, z0, z1, grp, lvl) {
  if (!rects.length) return; const gs = rects.map(r => boxGeo(r[0], r[1], r[2], r[3], z0, z1));
  const m = new THREE.Mesh(mergeGeometries(gs), M.interior); m.castShadow = m.receiveShadow = true; grp.add(m);
  for (const r of rects) { collide[lvl].push([r[0], r[1], r[2], r[1]], [r[2], r[1], r[2], r[3]], [r[2], r[3], r[0], r[3]], [r[0], r[3], r[0], r[1]]); }
}
interiorWalls(model.iw1, 0, 3.0, groups.ground, 1);
interiorWalls(model.iw2, 3.5, 6.5, groups.up, 2);
// stairs — AR-5-01: U-stair, 21 risers × 167 mm, going 285 mm. Flight 1 (steps 1–10) starts at the
// corridor side (north) along the wall, landing (11) at the outer wall, flight 2 (12–21) returns north to floor 2.
const SR = 3.5 / 21;
{ const gs = [], g = st.g;
  for (let k = 1; k <= 10; k++) { const v1 = st.v1 - (k - 1) * g, v0 = v1 - g; gs.push(boxGeo(st.u0 + 0.02, v0, st.um - 0.02, v1, k * SR - 0.05, k * SR)); }
  gs.push(boxGeo(st.u0 + 0.02, st.v0 + 0.02, st.u1 - 0.02, st.vl, 11 * SR - 0.2, 11 * SR));
  for (let k = 12; k <= 20; k++) { const v0 = st.vl + (k - 12) * g; gs.push(boxGeo(st.um + 0.02, v0, st.u1 - 0.02, v0 + g, k * SR - 0.05, k * SR)); }
  const m = new THREE.Mesh(mergeGeometries(gs), M.oak); m.castShadow = m.receiveShadow = true; groups.ground.add(m);
  // dark steel stringers under the treads
  const str = [];
  const beam = (A, B, w, h, dy) => { const L = A.distanceTo(B); const g2 = new THREE.BoxGeometry(w, h, L); const m4 = new THREE.Matrix4().lookAt(A, B, new THREE.Vector3(0, 1, 0)); g2.applyMatrix4(m4); const c = A.clone().add(B).multiplyScalar(0.5); g2.translate(c.x, c.y + dy, c.z); return g2; };
  const sl = (u, va, za, vb, zb) => str.push(beam(P(u, va, za), P(u, vb, zb), 0.03, 0.22, -0.13));
  sl(st.um - 0.03, st.v1, SR, st.vl, 10 * SR); sl(st.um + 0.03, st.vl, 12 * SR, st.vt, 20 * SR); sl(st.u1 - 0.04, st.vl, 12 * SR, st.vt, 20 * SR);
  const ms = new THREE.Mesh(mergeGeometries(str), M.black); ms.castShadow = true; groups.ground.add(ms);
  // glass guards: along the open side of flight 2 and the landing, between the flights, and round the stairwell upstairs
  const glass = [], caps = [];
  const pane = (ua, va, za, ub, vb, zb, h) => { const n = new THREE.Vector3(vb - va, 0, ub - ua).normalize();
    glass.push(quad(P(ua, va, za), P(ub, vb, zb), P(ub, vb, zb + h), P(ua, va, za + h), n));
    caps.push(beam(P(ua, va, za + h), P(ub, vb, zb + h), 0.035, 0.04, 0)); };
  pane(st.u1, st.v0, 11 * SR, st.u1, st.vl, 11 * SR, 0.95);
  pane(st.u1, st.vl, 11 * SR, st.u1, st.vt, 20 * SR, 0.95);
  pane(st.um, st.vl, 11 * SR, st.um, st.vt, 20 * SR, 0.95);
  pane(st.um - 0.035, st.v1, 1 * SR, st.um - 0.035, st.vl, 10 * SR, 0.95);   // open edge of flight 1
  pane(st.u0, st.v0, 3.5, st.u0, st.vt, 3.5, 1.0);
  pane(st.u0, st.vt, 3.5, st.um, st.vt, 3.5, 1.0);
  const mg = new THREE.Mesh(mergeGeometries(glass), M.glassBal); mg.renderOrder = 3; groups.ground.add(mg);
  const mc = new THREE.Mesh(mergeGeometries(caps), M.black); groups.ground.add(mc);
  for (const lv of [1, 2]) collide[lv].push([st.u1, st.v0, st.u1, st.vt], [st.um, st.vl, st.um, st.vt]);
  collide[2].push([st.u0, st.v0, st.u0, st.vt], [st.u0, st.vt, st.um, st.vt]);
}

// ---------- site ----------
const gm = model.ground;
{ const gt = tex('assets/ground.jpg'); const S = gm.S;
  const ge = new THREE.PlaneGeometry(S, S); ge.rotateX(-Math.PI / 2);
  const gmat = new THREE.MeshStandardMaterial({ map: gt, roughness: 1 });
  const dtex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const x = Math.random() * w, y = Math.random() * h, l = 3 + Math.random() * 7, v = 150 + Math.random() * 105; g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 1 + Math.random(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 3, y - l); g.stroke(); } });
  dtex.colorSpace = THREE.NoColorSpace;
  gmat.onBeforeCompile = sh => { sh.uniforms.detailMap = { value: dtex };
    sh.fragmentShader = 'uniform sampler2D detailMap;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb *= mix(vec3(1.0), texture2D(detailMap, vMapUv * 140.0).rgb * 1.06, 0.35);'); };
  const m = new THREE.Mesh(ge, gmat);
  m.position.set(gm.E0 + S / 2 - model.frame.E0, -0.3, -((gm.N0 - S / 2) - model.frame.N0)); m.receiveShadow = true; scene.add(m);
  const fm = model.far, ft = tex('assets/ground_far.jpg');
  const fge = new THREE.PlaneGeometry(fm.S, fm.S); fge.rotateX(-Math.PI / 2);
  const far = new THREE.Mesh(fge, new THREE.MeshStandardMaterial({ map: ft, roughness: 1, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4 }));
  far.position.set(fm.E0 + fm.S / 2 - model.frame.E0, -0.32, -((fm.N0 - fm.S / 2) - model.frame.N0)); far.receiveShadow = false; scene.add(far);
  const rim = new THREE.Mesh(new THREE.CircleGeometry(9000, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xb9c6cc }));
  rim.position.set(far.position.x, -2, far.position.z); scene.add(rim); }
for (const p of model.terr) groups.site.add(slab(p, -0.3, p[0][1] < -3.5 && p.length === 4 ? -0.15 : -0.02, M.deck));
for (const p of model.band) groups.site.add(slab(p, -0.3, -0.25, M.slab));
for (const p of model.paving) groups.site.add(slab(p, -0.3, -0.272, M.paver));
for (const p of (model.covered || [])) groups.site.add(slab(p, -0.3, -0.274, M.paver));   // porch + carport floor under the upper storey
// fence: street sides (NE, SE) vertical metal ribs h=1.5; other sides mesh fence
{ const pl = model.plot, gs = [], ms = [];
  const ribTex = (rib, col) => { const c = document.createElement('canvas'); c.width = 64; c.height = 8; const g = c.getContext('2d'); g.clearRect(0, 0, 64, 8); g.fillStyle = col; g.fillRect(0, 0, Math.round(64 * rib), 8); const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.anisotropy = aniso; t.colorSpace = THREE.SRGBColorSpace; return t; };
  for (let i = 0; i < pl.length; i++) { const a = pl[i], b = pl[(i + 1) % pl.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const tu = (b[0] - a[0]) / L, tv = (b[1] - a[1]) / L;
    if (i <= 1) { const t = ribTex(0.34, '#2e3032'); t.repeat.set(L / 0.12, 1);
      const g = new THREE.PlaneGeometry(L, 1.5); g.rotateY(Math.atan2(tv, tu)); g.translate((a[0] + b[0]) / 2, -0.3 + 0.75, -(a[1] + b[1]) / 2);
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: t, transparent: true, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.3, depthWrite: false })); m.renderOrder = 2; groups.site.add(m);
      for (const y of [0.08, 1.42]) { const r = new THREE.BoxGeometry(L, 0.04, 0.04); r.rotateY(Math.atan2(tv, tu)); r.translate((a[0] + b[0]) / 2, -0.3 + y, -(a[1] + b[1]) / 2); gs.push(r); }
      for (let s2 = 0; s2 <= L; s2 += 2.5) { const g2 = new THREE.BoxGeometry(0.06, 1.55, 0.06); g2.translate(a[0] + tu * s2, -0.3 + 0.775, -(a[1] + tv * s2)); gs.push(g2); } }
    else { const g = new THREE.PlaneGeometry(L, 1.5); g.rotateY(Math.atan2(tv, tu)); g.translate((a[0] + b[0]) / 2, -0.3 + 0.75, -(a[1] + b[1]) / 2); ms.push(g);
      for (let s2 = 0; s2 <= L; s2 += 2.5) { const g2 = new THREE.BoxGeometry(0.05, 1.55, 0.05); g2.translate(a[0] + tu * s2, -0.3 + 0.775, -(a[1] + tv * s2)); gs.push(g2); } } }
  const f = new THREE.Mesh(mergeGeometries(gs), M.fence); f.castShadow = true; groups.site.add(f);
  groups.site.add(new THREE.Mesh(mergeGeometries(ms), M.mesh)); }

// simple furniture blocks (illustrative, positions from plan furniture)
function furn(u0, v0, u1, v1, z0, h, mat = M.soft) { groups.furn.add(box(u0, v0, u1, v1, z0, z0 + h, mat)); }
// living room sofa + coffee table, kitchen island + dining
furn(10.35, 6.2, 13.9, 7.15, 0, 0.42); furn(10.35, 5.2, 11.3, 7.15, 0, 0.42); furn(10.4, 7.05, 13.9, 7.25, 0, 0.75);
furn(12.6, 5.6, 13.6, 6.4, 0, 0.38, M.dark);
furn(11.6, 9.4, 12.4, 11.95, 0, 0.92, M.dark); furn(14.35, 9.75, 15.55, 12.25, 0, 0.75, M.oak);
furn(9.78, 10.0, 10.36, 11.8, 0, 2.3, M.white);
// beds
furn(0.6, 10.4, 2.6, 12.5, 0, 0.5); furn(14.4, 9.0, 16.2, 11.0, 3.5, 0.5); furn(1.2, 8.6, 3.2, 10.6, 3.5, 0.5);
// sauna lounge sofa
furn(3.2, 0.3, 4.2, 2.4, 0, 0.42);
groups.furn.children.forEach(m => { m.castShadow = true; });

// ---------- surroundings: sea, trees (nDSM), neighbour buildings ----------
const env = await (await fetch('assets/env.json')).json();
{ // sea: water plane over the sea mask (mask derived from the orthophoto)
  const fm = model.far;
  const nc = document.createElement('canvas'); nc.width = nc.height = 256; const ng = nc.getContext('2d'); const id = ng.createImageData(256, 256);
  const hgt = (x, y) => { let h = 0; const W = [[1, 0, 3], [0, 1, 4], [1, 1, 5], [2, -1, 7], [-1, 2, 9], [3, 1, 11], [1, -3, 13]]; for (const [a, b, f] of W) h += Math.sin((a * x + b * y) * 2 * Math.PI / 256 * (f / 3 | 0 || 1) + f) / f; return h; };
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const dx = hgt(x + 1, y) - hgt(x - 1, y), dy = hgt(x, y + 1) - hgt(x, y - 1); const n = new THREE.Vector3(-dx * 6, -dy * 6, 1).normalize(); const i = (y * 256 + x) * 4; id.data[i] = (n.x * .5 + .5) * 255; id.data[i + 1] = (n.y * .5 + .5) * 255; id.data[i + 2] = (n.z * .5 + .5) * 255; id.data[i + 3] = 255; }
  ng.putImageData(id, 0, 0);
  const nt = new THREE.CanvasTexture(nc); nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(fm.S / 13.7, fm.S / 13.7); nt.rotation = 0.37;
  const nt2 = nt.clone(); nt2.repeat.set(fm.S / 23, fm.S / 23); nt2.needsUpdate = true;
  const am = tex('assets/sea_mask.png', false);
  const wm = new THREE.MeshPhysicalMaterial({ color: 0x2b5560, roughness: 0.16, metalness: 0.0, normalMap: nt, normalScale: new THREE.Vector2(0.22, 0.22), alphaMap: am, transparent: true, opacity: 1.0, depthWrite: false, envMapIntensity: 0.55, specularIntensity: 0.8, ior: 1.33 }); window.__waterMat = wm;
  const wg = new THREE.PlaneGeometry(fm.S, fm.S); wg.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(wg, wm); water.position.set(fm.E0 + fm.S / 2 - model.frame.E0, -0.24, -((fm.N0 - fm.S / 2) - model.frame.N0)); water.renderOrder = 1; water.receiveShadow = true; scene.add(water);
  let tt = 0; window.__water = dt => { tt += dt; nt.offset.set(tt * 0.012, tt * 0.007); };
}
{ // trees from the national canopy-height model (nDSM, 1 m) — positions and heights are real.
  // Each tree is an impostor: 8 azimuths × 2 elevations rendered in Blender Cycles from photo-scanned models.
  const TM = await (await fetch('assets/trees/trees.json')).json();
  const R = n => Math.abs((Math.sin(n * 12.9898) * 43758.5453) % 1);
  const pick = (t, i) => { const q = R(t[0] * 0.37 + t[1] * 1.13); return q < 0.35 ? 'spruce' : q < 0.6 ? 'decA' : 'decB'; };
  const byVar = {}; env.trees.forEach((t, i) => { const v = pick(t, i); (byVar[v] ||= []).push(t); });
  // Billboard pinned at the trunk base (never floats); azimuth and elevation views are cross-faded per pixel.
  const VERT = `
    vec4 o4 = modelMatrix * instanceMatrix * vec4(0., 0., 0., 1.); vec3 O = o4.xyz;
    float sx = length(instanceMatrix[0].xyz), sy = length(instanceMatrix[1].xyz);
    vec3 toC = cameraPosition - (O + vec3(0., uCz * sy, 0.));
    vImpEl = atan(toC.y, length(toC.xz));
    float yaw = fract(sin(dot(O.xz, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831853;
    vImpAz = atan(-toC.z, toC.x) + yaw;
    vImpS = vec2(sx, sy);
    vec3 rgt = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 upv = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    float qw = max(uF.x, uF.z) * sx, y0 = -0.08 * uCz * 2. * sy, y1 = max(uC.x + uF.y * .5, uC.y + uF.w * .5) * sy;
    vImpP = vec2(position.x * qw, mix(y0, y1, position.y + .5));
    vec3 wp = O + rgt * vImpP.x + upv * vImpP.y;
    vec4 mvPosition = viewMatrix * vec4(wp, 1.);
    gl_Position = projectionMatrix * mvPosition;`;
  const FRAG_FN = `
    vec4 impFrame(float k, float r) {
      k = mod(k, 8.);
      float fw = (r < .5 ? uF.x : uF.z) * vImpS.x, fh = (r < .5 ? uF.y : uF.w) * vImpS.y, c = (r < .5 ? uC.x : uC.y) * vImpS.y;
      vec2 uv = vec2(vImpP.x / fw + .5, (vImpP.y - c) / fh + .5);
      if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) return vec4(0.);
      vec4 t = texture2D(map, vec2((k + uv.x) / 8., (r + clamp(uv.y, .002, .998)) / 2.)); return vec4(t.rgb * t.a, t.a);
    }
    vec4 impSample() {
      float a = vImpAz / 6.2831853 * 8.; float k0 = floor(a), t = smoothstep(.15, .85, a - k0);
      float e = smoothstep(0.17, 0.62, vImpEl);
      vec4 lo = mix(impFrame(k0, 0.), impFrame(k0 + 1., 0.), t);
      vec4 hi = mix(impFrame(k0, 1.), impFrame(k0 + 1., 1.), t);
      vec4 c = mix(lo, hi, e);
      c.rgb /= max(c.a, 1e-3); return c;
    }`;
  const DECL = 'uniform vec4 uF; uniform vec2 uC; uniform float uCz; varying vec2 vImpP; varying vec2 vImpS; varying float vImpAz; varying float vImpEl;\n';
  const inject = (mat, m) => { mat.onBeforeCompile = sh => {
      const e0 = 6 * Math.PI / 180, e1 = 42 * Math.PI / 180;
      sh.uniforms.uF = { value: new THREE.Vector4(m.frames[0].w, m.frames[0].h, m.frames[1].w, m.frames[1].h) };
      sh.uniforms.uC = { value: new THREE.Vector2(m.cz * Math.cos(e0), m.cz * Math.cos(e1)) }; sh.uniforms.uCz = { value: m.cz };
      sh.vertexShader = DECL + sh.vertexShader.replace('#include <project_vertex>', VERT);
      sh.fragmentShader = DECL + sh.fragmentShader.replace('#include <map_pars_fragment>', '#include <map_pars_fragment>\n' + FRAG_FN)
        .replace('#include <map_fragment>', 'vec4 sampledDiffuseColor = impSample(); diffuseColor *= sampledDiffuseColor;'); };
    mat.customProgramCacheKey = () => 'imp2' + m.cz.toFixed(3); };
  const quadG = new THREE.PlaneGeometry(1, 1);
  const meshes = [], lists = [];
  window.__treeMats = [];
  for (const [v, list] of Object.entries(byVar)) { const m = TM[v]; if (!m) continue;
    const atlas = tex(`assets/trees/${v}.webp`); atlas.anisotropy = 4;
    const mat = new THREE.MeshBasicMaterial({ map: atlas, alphaTest: 0.42, side: THREE.DoubleSide, toneMapped: false }); inject(mat, m); window.__treeMats.push(mat);
    const dm = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: atlas, alphaTest: 0.42 }); inject(dm, m);
    const im = new THREE.InstancedMesh(quadG, mat, list.length); im.customDepthMaterial = dm; im.frustumCulled = false;
    const d = new THREE.Object3D();
    list.forEach((t, i) => { const [x, z, h, r] = t; const sy = h / m.H; const sx = THREE.MathUtils.clamp((Math.max(r * 2, h * 0.45)) / m.W, sy * 0.8, sy * 1.25);
      d.position.set(x, -0.3, z); d.scale.set(sx, sy, sx); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
    im.castShadow = true; im.receiveShadow = false; scene.add(im); meshes.push(im); lists.push(list);
  }
  window.__trees = meshes;
  // hide trees the camera flies into (tour / aerial), restore when it leaves
  const orig = meshes.map(im => { const a = []; const t = new THREE.Matrix4(); for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, t); a.push(t.clone()); } return a; });
  const zero = new THREE.Matrix4().makeScale(0, 0, 0), hidden = new Set();
  window.__treeCull = (cam, on) => {
    const p = cam.position;
    meshes.forEach((im, mi) => { let ch = false; lists[mi].forEach((t, i) => { const [x, z, h, r] = t; const cy = -0.3 + h * 0.62; const d = Math.hypot(p.x - x, p.z - z, (p.y - cy) * 0.8);
      const near = on && d < Math.max(r, h * 0.26) * 2.0 + 5; const kk = mi * 100000 + i;
      if (near && !hidden.has(kk)) { hidden.add(kk); im.setMatrixAt(i, zero); ch = true; } else if (!near && hidden.has(kk)) { hidden.delete(kk); im.setMatrixAt(i, orig[mi][i]); ch = true; } });
      if (ch) im.instanceMatrix.needsUpdate = true; });
  };
  const tintBase = (qs.has('hq') ? qs.get('hq') !== '0' : !matchMedia('(pointer:coarse)').matches) ? 1.3 : 1.0; // post chain tone-maps the sprites
  window.__treeTint = k => window.__treeMats.forEach(m => m.color.setScalar(k * tintBase));
}
{ // neighbour buildings: footprints from the national building register map, roof colour from the orthophoto
  const wallCols = [0xeeebe4, 0xe2ddd2, 0xd5cfc3, 0xf4f2ec, 0xb9b6ae, 0x8e8a82, 0x6f5c4b];
  const wallG = [], roofG = [], roofCol = [];
  const R = n => Math.abs((Math.sin(n * 78.233) * 43758.5453) % 1);
  env.buildings.forEach((b, i) => {
    const sh = new THREE.Shape(b.p.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: b.h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, -0.3, 0);
    const c = new THREE.Color(wallCols[Math.floor(R(i) * wallCols.length)]); const n = g.attributes.position.count; const ca = new Float32Array(n * 3); for (let j = 0; j < n; j++) { ca[j * 3] = c.r; ca[j * 3 + 1] = c.g; ca[j * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(ca, 3)); wallG.push(g);
    const rc = new THREE.Color().setRGB(b.roof[0] / 255, b.roof[1] / 255, b.roof[2] / 255, THREE.SRGBColorSpace);
    let rg;
    if (b.gable) { // ridge along the long side of the min-area rectangle
      const B = b.box.map(([x, z]) => new THREE.Vector2(x, z)); const e01 = B[0].distanceTo(B[1]), e12 = B[1].distanceTo(B[2]);
      const [a, bb, cc, d] = e01 >= e12 ? [B[0], B[1], B[2], B[3]] : [B[1], B[2], B[3], B[0]];
      const ov = 0.45, ctr = a.clone().add(cc).multiplyScalar(0.5);
      const grow = p => p.clone().sub(ctr).multiplyScalar(1 + ov / Math.max(1, p.distanceTo(ctr))).add(ctr);
      const A = grow(a), Bq = grow(bb), C = grow(cc), D = grow(d); const m1 = A.clone().add(D).multiplyScalar(.5), m2 = Bq.clone().add(C).multiplyScalar(.5);
      const y0 = -0.3 + b.h - 0.15, y1 = y0 + b.rh; const v = (p, y) => [p.x, y, p.y];
      const pos = [...v(A, y0), ...v(Bq, y0), ...v(m2, y1), ...v(A, y0), ...v(m2, y1), ...v(m1, y1), ...v(C, y0), ...v(D, y0), ...v(m1, y1), ...v(C, y0), ...v(m1, y1), ...v(m2, y1), ...v(Bq, y0), ...v(C, y0), ...v(m2, y1), ...v(D, y0), ...v(A, y0), ...v(m1, y1)];
      rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.computeVertexNormals();
      const gableWall = new THREE.BufferGeometry(); const gp = [...v(Bq, y0), ...v(C, y0), ...v(m2, y1), ...v(D, y0), ...v(A, y0), ...v(m1, y1)]; gableWall.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
      const gc = new Float32Array(18); for (let j = 0; j < 6; j++) { gc[j * 3] = c.r; gc[j * 3 + 1] = c.g; gc[j * 3 + 2] = c.b; } gableWall.setAttribute('color', new THREE.BufferAttribute(gc, 3)); gableWall.computeVertexNormals();
      wallG.push(gableWall.toNonIndexed ? gableWall : gableWall);
    } else { rg = new THREE.ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: false }); rg.rotateX(-Math.PI / 2); rg.translate(0, -0.3 + b.h, 0); rg = rg.toNonIndexed(); }
    const rn = rg.attributes.position.count, rca = new Float32Array(rn * 3); for (let j = 0; j < rn; j++) { rca[j * 3] = rc.r; rca[j * 3 + 1] = rc.g; rca[j * 3 + 2] = rc.b; } rg.setAttribute('color', new THREE.BufferAttribute(rca, 3)); if (rg.index) rg = rg.toNonIndexed(); rg.deleteAttribute('uv'); roofG.push(rg);
  });
  const clean = gs => gs.map(g => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); if (!g.attributes.normal) g.computeVertexNormals(); return g; });
  const wm = new THREE.Mesh(mergeGeometries(clean(wallG)), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }));
  const rm = new THREE.Mesh(mergeGeometries(clean(roofG)), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }));
  for (const m of [wm, rm]) { m.castShadow = m.receiveShadow = true; scene.add(m); }
}
{ // terrace life: loungers, lounge sofa set, dining table with parasol, kamado grill (illustrative)
  const alu = new THREE.MeshStandardMaterial({ color: 0x2c2c2e, roughness: 0.45, metalness: 0.6 });
  const cush = new THREE.MeshStandardMaterial({ color: 0xe6dfd2, roughness: 0.95 });
  const teak = new THREE.MeshStandardMaterial({ color: 0x8c6644, roughness: 0.7 });
  // synthetic rattan (polyrattan) weave — same colours as before
  const weave = (() => { const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); g.fillStyle = '#2a2a2a'; g.fillRect(0, 0, S, S); const N = 8, cs = S / N;
    for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) { const hor = (r + q) % 2 === 0; for (let k = 0; k < 3; k++) { const o = (k + 0.5) * cs / 3; const gr = hor ? g.createLinearGradient(0, q * cs + o - cs / 7, 0, q * cs + o + cs / 7) : g.createLinearGradient(r * cs + o - cs / 7, 0, r * cs + o + cs / 7, 0);
        gr.addColorStop(0, '#6a6a6a'); gr.addColorStop(0.5, '#f2f2f2'); gr.addColorStop(1, '#6a6a6a'); g.fillStyle = gr;
        if (hor) g.fillRect(r * cs + 1, q * cs + o - cs / 7, cs - 2, cs / 3.5); else g.fillRect(r * cs + o - cs / 7, q * cs + 1, cs / 3.5, cs - 2); } }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; })();
  const weaveB = weave.clone(); weaveB.colorSpace = THREE.NoColorSpace; weaveB.needsUpdate = true;
  const wickerDark = new THREE.MeshStandardMaterial({ color: 0x3a3a3c, map: weave, bumpMap: weaveB, bumpScale: 2.5, roughness: 0.55 });
  const wickerBrown = new THREE.MeshStandardMaterial({ color: 0xa47b55, map: weave, bumpMap: weaveB, bumpScale: 2.5, roughness: 0.6 });
  const wUV = (geo, tile = 0.16) => { geo = geo.index ? geo.toNonIndexed() : geo; const p = geo.attributes.position, nn = geo.attributes.normal, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { const ax = Math.abs(nn.getX(i)), ay = Math.abs(nn.getY(i)), az = Math.abs(nn.getZ(i)); let a, b; if (ay >= ax && ay >= az) { a = p.getX(i); b = p.getZ(i); } else if (ax >= az) { a = p.getZ(i); b = p.getY(i); } else { a = p.getX(i); b = p.getY(i); } uv[i * 2] = a / tile; uv[i * 2 + 1] = b / tile; }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo; };
  const wick = (m, mat) => { m.geometry = wUV(m.geometry); m.material = mat; return m; };
  const canvasM = new THREE.MeshStandardMaterial({ color: 0xe9e3d6, roughness: 0.9, side: THREE.DoubleSide });
  const eggM = new THREE.MeshStandardMaterial({ color: 0x2b5a39, roughness: 0.35, metalness: 0.1 });
  const T = groups.furn, z0 = -0.02;
  const add = (m) => { m.castShadow = m.receiveShadow = true; T.add(m); return m; };
  // two sun loungers facing the garden (south-west)
  for (const u of [9.4, 10.5]) {
    add(wick(box(u, -2.75, u + 0.7, -0.95, z0, z0 + 0.3, alu), wickerDark));
    add(box(u + 0.04, -2.72, u + 0.66, -1.45, z0 + 0.3, z0 + 0.4, cush));
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.75), cush); back.position.copy(P(u + 0.35, -1.12, z0 + 0.62)); back.rotation.x = -0.75; add(back);
  }
  add(box(11.45, -1.6, 11.85, -1.2, z0, z0 + 0.42, teak)); // side table
  // lounge sofa set
  add(wick(box(13.0, -1.0, 15.7, -0.2, z0, z0 + 0.42, alu), wickerDark)); add(box(13.05, -0.95, 15.65, -0.25, z0 + 0.42, z0 + 0.58, cush)); add(box(13.05, -0.4, 15.65, -0.2, z0 + 0.58, z0 + 0.85, cush));
  add(wick(box(15.0, -2.9, 15.7, -1.0, z0, z0 + 0.42, alu), wickerDark)); add(box(15.05, -2.85, 15.65, -1.0, z0 + 0.42, z0 + 0.58, cush)); add(box(15.45, -2.85, 15.65, -1.0, z0 + 0.58, z0 + 0.85, cush));
  add(box(13.5, -2.2, 14.6, -1.4, z0, z0 + 0.35, teak));
  // lower deck: round dining table, 6 chairs, parasol
  const dz = -0.15, tc = [4.0, -6.0];
  const tab = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.05, 40), teak); tab.position.copy(P(tc[0], tc[1], dz + 0.74)); add(tab);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.25, 0.72, 16), alu); leg.position.copy(P(tc[0], tc[1], dz + 0.36)); add(leg);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, cu = tc[0] + Math.cos(a) * 1.05, cv = tc[1] + Math.sin(a) * 1.05;
    const ch = new THREE.Group(); const seat = wick(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.48).translate(0, -0.21, 0), teak), wickerBrown); seat.position.y = 0.45; const bk = wick(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.06), teak), wickerBrown); bk.position.set(0, 0.68, 0.22);
    const lg = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), alu); lg.position.y = 0.22; lg.scale.set(1, 1, 1); ch.add(seat, bk); [seat, bk].forEach(m => m.castShadow = true);
    ch.position.copy(P(cu, cv, dz)); ch.rotation.y = Math.atan2(Math.cos(a), -Math.sin(a)); T.add(ch);
    const lg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6), alu); lg2.position.copy(P(cu, cv, dz + 0.22)); add(lg2); }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.5, 8), alu); pole.position.copy(P(tc[0], tc[1], dz + 1.25)); add(pole);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.45, 8, 1, true), canvasM); shade.position.copy(P(tc[0], tc[1], dz + 2.35)); add(shade);
  // kamado "egg" grill (Big-Green-Egg-like): glazed ceramic with dimpled finish, steel bands, cast-iron top vent,
  // stainless draft door, thermometer, wooden handle, steel nest on casters, acacia side shelves
  const eg = new THREE.Group();
  const dimples = (() => { const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S);
    const step = 16; for (let r = 0, y = 0; y < S + step; r++, y += step * 0.866) for (let x = (r % 2) * step / 2; x < S + step; x += step) { const jx = x + (Math.random() - .5) * 2, jy = y + (Math.random() - .5) * 2, rr = 4.6 + Math.random() * 1.2;
      const gr = g.createRadialGradient(jx - 1, jy - 1, 0, jx, jy, rr); gr.addColorStop(0, '#5a5a5a'); gr.addColorStop(0.7, '#9a9a9a'); gr.addColorStop(1, '#ffffff'); g.fillStyle = gr; g.beginPath(); g.arc(jx, jy, rr, 0, Math.PI * 2); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 7); t.anisotropy = aniso; return t; })();
  const dimCol = dimples.clone(); dimCol.colorSpace = THREE.SRGBColorSpace; dimCol.needsUpdate = true;
  const ceramic = new THREE.MeshPhysicalMaterial({ color: 0x24563a, map: dimCol, bumpMap: dimples, bumpScale: 4.5, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.25 });
  const steelBlk = new THREE.MeshStandardMaterial({ color: 0x1b1b1c, roughness: 0.45, metalness: 0.75 });
  const inox = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.25, metalness: 1.0 });
  const castIron = new THREE.MeshStandardMaterial({ color: 0x232222, roughness: 0.75, metalness: 0.4 });
  const acacia = new THREE.MeshStandardMaterial({ color: 0x9a6a42, roughness: 0.55 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  // egg profile (Large size ≈ 0.53 m wide): base up to the band at 0.42 m, dome lid above
  const R = 0.27, prof = z => { const zc = 0.33, a = z < zc ? 0.35 : 0.50, p = 2.3; const q = Math.min(1, Math.abs(z - zc) / a); return R * Math.pow(1 - Math.pow(q, p), 1 / p); };
  const pts = (z0, z1, n) => { const a = []; for (let i = 0; i <= n; i++) { const z = z0 + (z1 - z0) * i / n; a.push(new THREE.Vector2(Math.max(0.004, prof(z)), z)); } return a; };
  const base = new THREE.Mesh(new THREE.LatheGeometry(pts(0.02, 0.415, 28), 64), ceramic);
  const lid = new THREE.Mesh(new THREE.LatheGeometry(pts(0.425, 0.80, 28), 64), ceramic);
  const yB = 0.36; base.position.y = yB; lid.position.y = yB; eg.add(base, lid);
  const rz = prof(0.42) + 0.012;
  for (const dz of [0.395, 0.45]) { const band = new THREE.Mesh(new THREE.CylinderGeometry(rz + 0.004, rz + 0.004, 0.045, 64, 1, true), steelBlk); band.position.y = yB + dz; eg.add(band); }
  const gasket = new THREE.Mesh(new THREE.TorusGeometry(rz - 0.008, 0.007, 8, 64), rubber); gasket.rotation.x = Math.PI / 2; gasket.position.y = yB + 0.42; eg.add(gasket);
  // hinge + spring at the back
  const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.05), steelBlk); hinge.position.set(0, yB + 0.42, -rz - 0.03); eg.add(hinge);
  const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 12), steelBlk); spring.rotation.x = 1.1; spring.position.set(0, yB + 0.36, -rz - 0.07); eg.add(spring);
  // cast-iron top vent ("daisy wheel")
  const capR = 0.085;
  const vent1 = new THREE.Mesh(new THREE.CylinderGeometry(capR, capR + 0.012, 0.05, 32), castIron); vent1.position.y = yB + 0.79; eg.add(vent1);
  const vent2 = new THREE.Mesh(new THREE.CylinderGeometry(capR * 0.72, capR * 0.8, 0.03, 32), castIron); vent2.position.y = yB + 0.83; eg.add(vent2);
  for (let i = 0; i < 6; i++) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.032, 10), new THREE.MeshStandardMaterial({ color: 0x0a0a0a })); const a2 = i / 6 * Math.PI * 2; h.position.set(Math.cos(a2) * capR * 0.45, yB + 0.835, Math.sin(a2) * capR * 0.45); eg.add(h); }
  // front: thermometer dial, wooden handle, stainless draft door
  const zf = z => prof(z) + 0.004;
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.012, 32), inox); dial.rotation.x = Math.PI / 2 - 0.55; dial.position.set(0, yB + 0.66, zf(0.66) - 0.01); eg.add(dial);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.031, 32), new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.4 })); face.rotation.x = -0.55; face.position.set(0, yB + 0.663, zf(0.66) - 0.003); eg.add(face);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 12), acacia); handle.rotation.z = Math.PI / 2; handle.position.set(0, yB + 0.53, zf(0.53) + 0.075); eg.add(handle);
  for (const sx of [-0.085, 0.085]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.08), steelBlk); post.position.set(sx, yB + 0.53, zf(0.53) + 0.036); eg.add(post); }
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.085, 0.012), inox); door.position.set(0, yB + 0.11, zf(0.11) - 0.005); door.rotation.x = -0.35; eg.add(door);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.014), new THREE.MeshStandardMaterial({ color: 0x0b0b0b })); slot.position.set(0, yB + 0.115, zf(0.11) - 0.002); slot.rotation.x = -0.35; eg.add(slot);
  // steel nest: ring under the belly, four legs, cross braces, casters
  const ringY = yB + 0.13, ringR = prof(0.13) + 0.012;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(ringR, 0.012, 8, 48), steelBlk); ring.rotation.x = Math.PI / 2; ring.position.y = ringY; eg.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(ringR * 0.9, 0.01, 8, 48), steelBlk); ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.16; eg.add(ring2);
  for (let i = 0; i < 4; i++) { const a2 = Math.PI / 4 + i * Math.PI / 2; const top = new THREE.Vector3(Math.cos(a2) * ringR, ringY, Math.sin(a2) * ringR), bot = new THREE.Vector3(Math.cos(a2) * (ringR + 0.06), 0.07, Math.sin(a2) * (ringR + 0.06));
    const L = top.distanceTo(bot); const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, L, 10), steelBlk); leg.position.copy(top).add(bot).multiplyScalar(0.5); leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bot).normalize()); eg.add(leg);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.025, 20), rubber); wheel.rotation.z = Math.PI / 2; wheel.position.set(bot.x, 0.035, bot.z); eg.add(wheel); }
  // acacia side shelves on folding brackets at band height
  for (const sx of [-1, 1]) { const sh = new THREE.Group(); for (let k = 0; k < 4; k++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.025, 0.07), acacia); sl.position.set(0, 0, -0.12 + k * 0.08); sh.add(sl); }
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.02, 0.02), steelBlk); br.position.set(0, -0.02, 0); sh.add(br);
    sh.position.set(sx * (rz + 0.17), yB + 0.37, 0); eg.add(sh); }
  eg.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  eg.position.copy(P(1.3, -2.15, z0)); eg.rotation.y = 0.2; T.add(eg);
}

// ---------- sun ----------
function sunPos(month, hour) { // Tammneeme 59.527N 24.896E, 21st of month, local clock (EET/EEST)
  const lat = 59.527 * Math.PI / 180, lon = 24.896;
  const doy = [0, 21, 52, 80, 111, 141, 172, 202, 233, 264, 294, 325, 355][month];
  const tz = (month >= 4 && month <= 10) ? 3 : 2;
  const g = 2 * Math.PI / 365 * (doy - 1 + (hour - 12) / 24);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const tst = hour * 60 + eq + 4 * lon - 60 * tz; const ha = (tst / 4 - 180) * Math.PI / 180;
  const cz = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha); const zen = Math.acos(cz);
  let az = Math.acos(((Math.sin(lat) * cz) - Math.sin(dec)) / (Math.cos(lat) * Math.sin(zen))); az = ha > 0 ? az + Math.PI : Math.PI - az; // from north, clockwise
  return { el: Math.PI / 2 - zen, az: az % (2 * Math.PI) };
}
let envRT = null;
function setSun(month, hour) {
  const { el, az } = sunPos(month, hour);
  const d = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
  su.sunPosition.value.copy(d);
  const c = toWorld(8, 8, 0);
  sun.target.position.copy(c); sun.position.copy(c).addScaledVector(d, 150);
  const k = THREE.MathUtils.clamp(el / 0.35, 0, 1);
  sun.intensity = 3.4 * k; hemi.intensity = 0.45 + 0.85 * THREE.MathUtils.clamp((el + 0.1) / 0.4, 0, 1);
  sun.color.setHSL(0.09, 0.6, 0.62 + 0.3 * k);
  renderer.toneMappingExposure = el > 0 ? 0.6 : 0.85;
  if (window.__treeTint) window.__treeTint(0.5 + 0.5 * k);
  clearTimeout(window.__envT); window.__envT = setTimeout(() => { if (!window.__waterMat || (typeof night !== 'undefined' && night.on)) return; if (envRT) envRT.dispose(); envRT = pmrem.fromScene(skyScene(d), 0.02); window.__waterMat.envMap = envRT.texture; window.__waterMat.needsUpdate = true; scene.environment = envRT.texture; }, 120);
  $('#sunLbl').textContent = `${Math.floor(hour)}:${String(Math.round((hour % 1) * 60)).padStart(2, '0')}`;
}
function skyScene(d) { const s = new THREE.Scene(); const k = new Sky(); k.scale.setScalar(100); Object.keys(su).forEach(n => k.material.uniforms[n].value = su[n].value); k.material.uniforms.sunPosition.value = d.clone(); s.add(k); return s; }
setSun(6, 17.5);
$('#sunTime').oninput = $('#sunMonth').onchange = () => { if (night.on) setNight(false); setSun(+$('#sunMonth').value, +$('#sunTime').value); };
// ---------- night mode: bollards along paths, LED wash under the soffits, warm interiors ----------
const night = { on: false, group: new THREE.Group(), lights: [], warm: [] };
scene.add(night.group); night.group.visible = false;
night.hg = new THREE.Group(); house.add(night.hg); night.hg.visible = false;
{
  const W = 0xffc98a;
  const glowTex = (inner, mid) => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(0.35, mid); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); };
  const poolM = new THREE.MeshBasicMaterial({ map: glowTex('rgba(255,205,150,0.9)', 'rgba(255,180,110,0.35)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 });
  const postM = new THREE.MeshStandardMaterial({ color: 0x232325, roughness: 0.5, metalness: 0.5 });
  const lensM = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: W, emissiveIntensity: 0, toneMapped: false });
  night.warm.push([lensM, 3.0]);
  const pts = [];
  const nearHouse = (u, v) => model.faces.some(f => { const [a, b] = f.p0, [c, d] = f.p1; const dx = c - a, dy = d - b, L2 = dx * dx + dy * dy; let t = ((u - a) * dx + (v - b) * dy) / L2; t = Math.max(0, Math.min(1, t)); return Math.hypot(a + t * dx - u, b + t * dy - v) < 0.9; });
  const walk = (poly, step, off) => { let acc = step / 2; for (let i = 0; i < poly.length; i++) { const [a, b] = poly[i], [c, d] = poly[(i + 1) % poly.length]; const L = Math.hypot(c - a, d - b); if (L < 1.2) { acc += L; continue; } const tu = (c - a) / L, tv = (d - b) / L;
      while (acc < L) { const u = a + tu * acc - tv * off, v = b + tv * acc + tu * off; if (!inPoly([u, v], EF1) && !nearHouse(u, v) && !pts.some(p => Math.hypot(p[0] - u, p[1] - v) < 3.2)) pts.push([u, v]); acc += step; } acc -= L; } };
  model.band.forEach(p => walk(p, 5.0, -0.25));
  model.paving.forEach(p => walk(p, 5.5, -0.25));
  window.__bollards = pts.slice(0, 18); for (const [u, v] of pts.slice(0, 18)) {
    night.hg.add(box(u - 0.07, v - 0.07, u + 0.07, v + 0.07, -0.3, 0.42, postM));
    night.hg.add(box(u - 0.075, v - 0.075, u + 0.075, v + 0.075, 0.3, 0.38, lensM));
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2).rotateX(-Math.PI / 2), poolM); pool.position.copy(toWorld(u, v, -0.2)); pool.renderOrder = 4; night.group.add(pool);
  }
  // LED line under each slab edge + soft wash fading down the facade
  const ledM = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd6a0, emissiveIntensity: 0, toneMapped: false }); night.warm.push([ledM, 2.4]);
  const washT = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,200,140,0.75)'); gr.addColorStop(0.25, 'rgba(255,190,130,0.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 128); const h = g.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.08, 'rgba(0,0,0,0)'); h.addColorStop(0.92, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = h; g.fillRect(0, 0, 64, 128); return new THREE.CanvasTexture(c); })();
  const washM = new THREE.MeshBasicMaterial({ map: washT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const f of model.faces) { const [u0, v0] = f.p0, [u1, v1] = f.p1; const L = Math.hypot(u1 - u0, v1 - v0); if (L < 1.4 || f.name === 'g7' || f.name === 'g9') continue;
    const zt = f.floor === 1 ? 2.97 : 6.47, n = f.n, mu = (u0 + u1) / 2 + n[0] * 0.04, mv = (v0 + v1) / 2 + n[1] * 0.04, ang = Math.atan2(v1 - v0, u1 - u0);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(L - 0.2, 0.02, 0.03), ledM); strip.position.copy(P(mu, mv, zt)); strip.rotation.y = ang; night.hg.add(strip);   // night only: by day it read as a floating black rod
    const hh = f.floor === 1 ? 3.25 : 2.95; const w = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.1, hh), washM); w.position.copy(P((u0 + u1) / 2 + n[0] * 0.03, (v0 + v1) / 2 + n[1] * 0.03, zt - hh / 2)); w.rotation.y = ang; w.renderOrder = 5; night.hg.add(w); }
  // warm room light spilling onto the terrace (3 real lights only — cheap enough for phones)
  for (const [u, v, z, i] of [[12.5, 4.5, 2.2, 7], [3.0, 1.0, 2.2, 5], [9.0, 2.5, 5.6, 5]]) {
    const L = new THREE.PointLight(0xffc285, 0, 14, 1.6); L.position.copy(toWorld(u, v, z)); night.group.add(L); night.lights.push([L, i]); }
}
const nightSkyTex = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#04070f'); gr.addColorStop(0.55, '#0c1a33'); gr.addColorStop(0.75, '#1d3352'); gr.addColorStop(1, '#0b1220'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping; return t; })();
const dayFog = scene.fog.color.clone();
function setNight(on) {
  night.on = on; night.group.visible = on; night.hg.visible = on; document.body.classList.toggle('night', on);
  for (const [l, i] of night.lights) l.intensity = on ? i : 0;
  for (const [m, i] of night.warm) m.emissiveIntensity = on ? i : 0;
  for (const m of interiorMats) { m.emissive.setHex(on ? 0xffb066 : 0x000000); m.emissiveIntensity = on ? 0.22 : 0; }
  M.oak.emissive.setHex(on ? 0x6a4020 : 0); M.oak.emissiveIntensity = on ? 0.35 : 0;
  sky.visible = !on; scene.background = on ? nightSkyTex : null;
  if (window.__waterMat) { window.__waterMat.color.setHex(on ? 0x0d1a24 : 0x2b5560); if (on) { window.__waterMat.envMap = null; window.__waterMat.needsUpdate = true; } }
  scene.fog.color.copy(on ? new THREE.Color(0x0a1424) : dayFog);
  if (on) {
    const d = new THREE.Vector3(-0.35, 0.8, 0.45).normalize(); const c = toWorld(8, 8, 0);
    sun.target.position.copy(c); sun.position.copy(c).addScaledVector(d, 150);
    sun.color.setHex(0x9db4e0); sun.intensity = 0.32; hemi.color.setHex(0x30466e); hemi.groundColor.setHex(0x0b0d10); hemi.intensity = 0.45;
    scene.environmentIntensity = 0.1; renderer.toneMappingExposure = 0.95; if (window.__treeTint) window.__treeTint(0.1);
  } else { hemi.color.setHex(0xe9eef2); hemi.groundColor.setHex(0x8a826f); scene.environmentIntensity = 0.85; setSun(+$('#sunMonth').value, +$('#sunTime').value); }
  $('#nightBtn').classList.toggle('on', on); $('#nightBtn').innerHTML = on ? '☀︎' : '☾'; $('#nightBtn').title = T[LANG][on ? 'day' : 'night'];
}
$('#nightBtn').onclick = () => setNight(!night.on);

interiorMats.push(M.interior, M.ceiling);

// ---------- cut views ----------
function setCut(c) {
  groups.roof.visible = c === 0; groups.up.visible = c < 2;
  $$('#g-cut button').forEach(b => b.classList.toggle('on', +b.dataset.cut === c));
}
$$('#g-cut button').forEach(b => b.onclick = () => setCut(+b.dataset.cut));

// ---------- i18n ----------
function applyLang(l) {
  LANG = l; document.documentElement.lang = l;
  $$('[data-i18n]').forEach(e => { const v = T[l][e.dataset.i18n]; if (v !== undefined) e.innerHTML = v; });
  $$('#langs button').forEach(b => b.classList.toggle('on', b.dataset.lang === l));
  buildPlan(planFloor); if (mode === 'walk') updateRoom(true);
  if (window.__galleryLang) window.__galleryLang();
}
$$('#langs button').forEach(b => b.onclick = () => applyLang(b.dataset.lang));

// ---------- modes ----------
let mode = 'tour';
const center = toWorld(8.5, 8, 2.5);
function setMode(m) {
  mode = m; $$('#modes button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
  { const ab = $(`#modes button[data-mode="${m}"]`), bar = $('#modes'); if (ab && bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: ab.offsetLeft - bar.clientWidth / 2 + ab.clientWidth / 2, behavior: 'smooth' }); }
  $('#hero').classList.toggle('hidden', m !== 'tour' || touring);
  $('#tools').classList.toggle('hidden', !(m === 'aerial' || m === 'walk'));
  $('#g-cut').classList.toggle('hidden', m !== 'aerial');
  $('#g-floor').classList.toggle('hidden', m !== 'walk');
  $('#walkhud').classList.toggle('hidden', m !== 'walk'); $('#minimap').classList.toggle('hidden', m !== 'walk'); if (m === 'walk') miniFloor = 0;
  $('#joy').classList.toggle('hidden', !(m === 'walk' && matchMedia('(pointer:coarse)').matches));
  $('#planview').classList.toggle('hidden', m !== 'plan');
  $('#photoview').classList.toggle('hidden', m !== 'photo');
  if (m !== 'aerial') $('#panel').classList.add('hidden');
  controls.enabled = m === 'aerial' || m === 'tour';
  if (m !== 'tour') stopTour();
  if (m === 'aerial') { setCut(0); fly(toWorld(-22, -26, 26), center); controls.target.copy(center); }
  if (m === 'tour') { setCut(0); fly(toWorld(-30, -34, 22), toWorld(10, 12, 2)); controls.target.copy(toWorld(10,12,2)); }
  if (m === 'walk') { setCut(0); if (!walker.placed) placeWalker(11.5, -6.5, -0.02, 1, 270); }
  camera.fov = m === 'walk' ? 66 : 50; camera.updateProjectionMatrix();
  if (m === 'plan') buildPlan(planFloor);
  if (m === 'photo') openPhotos(); else $('#phimg') && null;
}
$$('#modes button').forEach(b => b.onclick = () => setMode(b.dataset.mode));
$('#skip').onclick = () => setMode('aerial');
const syncPanel = () => document.body.classList.toggle('panel-open', !$('#panel').classList.contains('hidden'));
new MutationObserver(syncPanel).observe($('#panel'), { attributes: true, attributeFilter: ['class'] });
$('#infoBtn').onclick = e => { e.stopPropagation(); $('#panel').classList.toggle('hidden'); };
$('#panelClose').onclick = () => $('#panel').classList.add('hidden');
document.addEventListener('pointerdown', e => { const p = $('#panel'); if (p.classList.contains('hidden')) return; if (p.contains(e.target) || $('#infoBtn').contains(e.target)) return; p.classList.add('hidden'); });

let flyAnim = null;
function fly(pos, look, dur = 1.6) { flyAnim = { p0: camera.position.clone(), p1: pos.clone(), l0: controls.target.clone(), l1: look.clone(), t: 0, dur }; }
function stepFly(dt) {
  if (!flyAnim) return; flyAnim.t += dt / flyAnim.dur; const k = Math.min(1, flyAnim.t), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  camera.position.lerpVectors(flyAnim.p0, flyAnim.p1, e); controls.target.lerpVectors(flyAnim.l0, flyAnim.l1, e); camera.lookAt(controls.target);
  if (k >= 1) flyAnim = null;
}

// ---------- cinematic tour ----------
const KF = [ // [t, pos(u,v,z), look(u,v,z), caption index, cut]
  [0, [-60, -70, 46], [12, 18, 0], 0],
  [7, [-30, -34, 20], [10, 12, 2], 0],
  [14, [30, -30, 12], [9, 7, 3], 1],
  [21, [44, 10, 9], [10, 10, 3], 2],
  [28, [26, 36, 7], [9, 10, 3], 5],
  [35, [-2, 40, 11], [9, 9, 3], 5],
  [42, [-22, 6, 5], [8, 4, 2.5], 3],
  [48, [8, -16, 2.0], [11, 2, 1.8], 4],
  [54, [14.3, -1.6, 1.7], [14.0, 6, 1.6], 4],
  [60, [14.0, 5.6, 1.65], [13.0, 11.5, 1.4], 4],
  [64, [13.8, -5.5, 2.4], [12, 6, 3.0], 3],
  [68, [10, -11, 13], [8.5, 7, 6.5], 6],
  [74, [8.5, -12, 24], [8.5, 7, 6.5], 7, 1],
  [80, [8.5, 4.0, 30], [8.5, 8.0, 3.5], 0],
  [87, [-26, -30, 26], [10, 10, 1], 0],
];
let touring = false, tourT = 0, curve, lookCurve, lastCap = -1;
function startTour() {
  touring = true; tourT = 0; setCut(0); $('#hero').classList.add('hidden'); $('#stoptour').classList.remove('hidden');
  curve = new THREE.CatmullRomCurve3(KF.map(k => toWorld(...k[1])), false, 'centripetal');
  lookCurve = new THREE.CatmullRomCurve3(KF.map(k => toWorld(...k[2])), false, 'centripetal');
  controls.enabled = false;
}
function stopTour() {
  if (!touring) return; touring = false; $('#stoptour').classList.add('hidden'); $('#captext').style.opacity = 0; lastCap = -1;
  setCut(0); controls.enabled = mode === 'aerial' || mode === 'tour';
  if (mode === 'tour') { controls.target.copy(toWorld(10, 12, 2)); $('#hero').classList.remove('hidden'); }
}
function tourParam(t) { // map time to curve param piecewise linear between keyframes
  const n = KF.length - 1; for (let i = 0; i < n; i++) if (t <= KF[i + 1][0]) { const f = (t - KF[i][0]) / (KF[i + 1][0] - KF[i][0]); const s = f * f * (3 - 2 * f); return (i + (0.25 * f + 0.75 * s)) / n; } return 1;
}
function stepTour(dt) {
  if (!touring) return; tourT += dt; const end = KF[KF.length - 1][0];
  if (tourT >= end) { stopTour(); setMode('aerial'); return; }
  const u = tourParam(tourT); camera.position.copy(curve.getPoint(u)); const lk = lookCurve.getPoint(u); camera.lookAt(lk); controls.target.copy(lk);
  let ki = 0; for (let i = 0; i < KF.length; i++) if (tourT >= KF[i][0]) ki = i;
  const cap = KF[ki][3]; const cut = KF[ki][4] ?? 0; if (groups.roof.visible !== (cut === 0)) setCut(cut);
  if (cap !== lastCap) { lastCap = cap; const el = $('#captext'); el.style.opacity = 0; setTimeout(() => { if (!touring) return; const c = T[LANG].cap[cap]; el.innerHTML = `<small>${c[0]}</small>${c[1]}`; el.style.opacity = 1; }, 450); }
}
$('#play').onclick = () => { setMode('tour'); startTour(); };
$('#stoptour').onclick = () => stopTour();

// ---------- walk ----------
const walker = { u: 0, v: 0, z: 0, yaw: 0, pitch: 0, placed: false, lvl: 1 };
const keys = {};
addEventListener('keydown', e => { keys[e.code] = true; });
addEventListener('keyup', e => { keys[e.code] = false; });
function placeWalker(u, v, z, lvl, yawDeg) { Object.assign(walker, { u, v, z, lvl, yaw: yawDeg * Math.PI / 180, pitch: 0, placed: true }); $$('#g-floor button').forEach(b => b.classList.toggle('on', +b.dataset.floor === lvl)); updateRoom(true); }
$$('#g-floor button').forEach(b => b.onclick = () => { const l = +b.dataset.floor; if (l === 1) placeWalker(9.2, 6.3, 0, 1, 270); else placeWalker(8.0, 8.6, 3.5, 2, 90); });
function inPoly(pt, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) c = !c; } return c; }
const um = st.um, vLand = st.vl;
function stairH(u, v, lvl) {
  if (u < st.u0 || u > st.u1 || v < st.v0 || v > 7.6) return null;
  if (v < st.vl) return 11 * SR;                                                   // landing at the outer wall
  if (u < st.um) { if (v > st.v1) return lvl === 2 ? 3.5 : 0; return THREE.MathUtils.clamp((st.v1 - v) / st.g, 0, 10) * SR; }   // flight 1, goes up southwards
  if (v > st.vt) return lvl === 2 ? 3.5 : 0;                                       // top of flight 2 = floor 2
  return 11 * SR + THREE.MathUtils.clamp((v - st.vl) / st.g, 0, 9) * SR;           // flight 2, goes up northwards
}
function floorAt(u, v, lvl) {
  const sh = stairH(u, v, lvl); if (sh !== null) return sh;
  if (lvl === 2) return inPoly([u, v], FP) ? 3.5 : null;
  if (inPoly([u, v], EF1)) return 0;
  for (const p of model.terr) if (inPoly([u, v], p)) return p[0][1] < -3.5 && p.length === 4 ? -0.15 : -0.02;
  return -0.3;
}
function blocked(u, v, lvl) {
  const r = 0.22;
  for (const s of collide[lvl]) { const [a, b, c, d] = s; const dx = c - a, dy = d - b, L2 = dx * dx + dy * dy || 1e-9; let k = ((u - a) * dx + (v - b) * dy) / L2; k = Math.max(0, Math.min(1, k)); const px = a + k * dx - u, py = b + k * dy - v; if (px * px + py * py < r * r) return true; }
  return false;
}
function stepWalk(dt) {
  if (mode !== 'walk') return;
  let f = 0, s = 0; if (keys.KeyW || keys.ArrowUp) f += 1; if (keys.KeyS || keys.ArrowDown) f -= 1; if (keys.KeyA) s -= 1; if (keys.KeyD) s += 1;
  if (keys.ArrowLeft) walker.yaw -= dt * 1.6; if (keys.ArrowRight) walker.yaw += dt * 1.6;
  f += joy.y; s += joy.x;
  const sp = (keys.ShiftLeft ? 3.2 : 1.6) * dt;
  // local frame: yaw 0 = looking along +u
  const du = (Math.cos(walker.yaw) * f - Math.sin(walker.yaw) * s) * sp, dv = (-Math.sin(walker.yaw) * f - Math.cos(walker.yaw) * s) * sp;
  for (const [mu, mv] of [[du, dv], [du, 0], [0, dv]]) {
    if (!mu && !mv) continue; const nu = walker.u + mu, nv = walker.v + mv;
    const lvl = walker.z > 1.75 ? 2 : 1; const fz = floorAt(nu, nv, lvl);
    if (fz === null || Math.abs(fz - walker.z) > 0.6 || blocked(nu, nv, lvl)) continue;
    walker.u = nu; walker.v = nv; walker.z = fz; break;
  }
  const lvl = walker.z > 1.75 ? 2 : 1; if (lvl !== walker.lvl) { walker.lvl = lvl; $$('#g-floor button').forEach(b => b.classList.toggle('on', +b.dataset.floor === lvl)); }
  const eye = toWorld(walker.u, walker.v, walker.z + 1.62);
  camera.position.copy(eye);
  const dir = new THREE.Vector3(Math.cos(walker.yaw) * Math.cos(walker.pitch), Math.sin(walker.pitch), -(-Math.sin(walker.yaw)) * Math.cos(walker.pitch));
  // dir is in local (u, z, -v) → rotate to world
  const look = house.localToWorld(P(walker.u + Math.cos(walker.yaw) * Math.cos(walker.pitch), walker.v - Math.sin(walker.yaw) * Math.cos(walker.pitch), walker.z + 1.62 + Math.sin(walker.pitch)));
  camera.lookAt(look);
  updateRoom();
}
let dragging = null;
canvas.addEventListener('pointerdown', e => { if (mode === 'walk') { dragging = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); } if (touring) stopTour(); });
canvas.addEventListener('pointermove', e => { if (mode !== 'walk' || !dragging) return; walker.yaw += (e.clientX - dragging.x) * 0.0042; walker.pitch = THREE.MathUtils.clamp(walker.pitch - (e.clientY - dragging.y) * 0.0035, -1.1, 1.1); dragging = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', () => dragging = null);
canvas.addEventListener('wheel', () => { if (touring) stopTour(); }, { passive: true });
const joy = { x: 0, y: 0 };
{ const j = $('#joy'), k = j.querySelector('i'); let id = null, c = null;
  j.addEventListener('pointerdown', e => { id = e.pointerId; j.setPointerCapture(id); const r = j.getBoundingClientRect(); c = [r.left + r.width / 2, r.top + r.height / 2]; mv(e); });
  const mv = e => { if (e.pointerId !== id) return; let dx = e.clientX - c[0], dy = e.clientY - c[1]; const L = Math.hypot(dx, dy), m = 40; if (L > m) { dx *= m / L; dy *= m / L; } k.style.transform = `translate(${dx}px,${dy}px)`; joy.x = dx / m; joy.y = -dy / m; };
  j.addEventListener('pointermove', mv);
  j.addEventListener('pointerup', () => { id = null; joy.x = joy.y = 0; k.style.transform = ''; }); }
let lastRoom = '';
function roomAt(u, v, lvl) {
  const list = model.rooms[lvl === 1 ? '5-01' : '5-02'];
  const ef = lvl === 1 ? EF1 : EF2;
  if (!inPoly([u, v], ef)) { if (lvl === 2) return T[LANG].balcony; return T[LANG][(v < 3.3 && v > -3) || (u < 16 && v < -0.4 && v > -8.2) ? 'terrace' : 'outside']; }
  let best = null, bd = 1e9; for (const r of list) { const d = Math.hypot(r.u - u, r.v - v); if (d < bd) { bd = d; best = r; } }
  const R = ROOMS[best.id]; return `${R[LANG]}<small>${String(R.a).replace('.', LANG === 'en' ? '.' : ',')} m²</small>`;
}
function updateRoom(force) { const r = roomAt(walker.u, walker.v, walker.z > 1.75 ? 2 : 1); if (r !== lastRoom || force) { lastRoom = r; $('#roomname').innerHTML = r; } }

// ---------- plans (SVG) ----------
let planFloor = 1;
function planMarkup(fl, mini) {
  let h = '';
  const pts = p => p.map(([u, v]) => `${u},${-v}`).join(' ');
  // context: balconies / terraces / paving
  if (fl === 1) { model.paving.forEach(p => h += `<polygon points="${pts(p)}" fill="#dedad2"/>`); model.terr.forEach(p => h += `<polygon points="${pts(p)}" fill="#c9b49a"/>`); model.band.forEach(p => h += `<polygon points="${pts(p)}" fill="#e2dfd8"/>`); }
  else h += `<polygon points="${pts(FP)}" fill="#cdbba3"/>`;
  const ef = fl === 1 ? EF1 : EF2; h += `<polygon points="${pts(ef)}" fill="#fbfaf7"/>`;
  // exterior walls with windows
  for (const f of model.faces.filter(f => f.floor === fl)) {
    const [u0, v0] = f.p0, [u1, v1] = f.p1, [nu, nv] = f.n, t = f.t; const L = Math.hypot(u1 - u0, v1 - v0), tu = (u1 - u0) / L, tv = (v1 - v0) / L;
    let s = 0; const segs = [...f.win, [L, L]];
    const q = (a, b, fill) => { const A = [u0 + tu * a, v0 + tv * a], B = [u0 + tu * b, v0 + tv * b]; return `<polygon points="${pts([A, B, [B[0] - nu * t, B[1] - nv * t], [A[0] - nu * t, A[1] - nv * t]])}" fill="${fill}"/>`; };
    for (const [a, b] of segs) { if (a - s > 0.01) h += q(s, a, '#1d1d1d'); if (b > a) { h += q(a, b, '#bfd6de'); const A = [u0 + tu * a - nu * t / 2, v0 + tv * a - nv * t / 2], B = [u0 + tu * b - nu * t / 2, v0 + tv * b - nv * t / 2]; h += `<line x1="${A[0]}" y1="${-A[1]}" x2="${B[0]}" y2="${-B[1]}" stroke="#4d6a75" stroke-width="0.04"/>`; } s = b; }
  }
  (fl === 1 ? model.iw1 : model.iw2).forEach(r => h += `<rect x="${r[0]}" y="${-r[3]}" width="${r[2] - r[0]}" height="${r[3] - r[1]}" fill="#1d1d1d"/>`);
  // stairs (as drawn in AR-5-01/02)
  for (let k = 0; k <= 10; k++) h += `<line x1="${st.u0}" y1="${-(st.v1 - k * st.g)}" x2="${st.um}" y2="${-(st.v1 - k * st.g)}" stroke="#9a948c" stroke-width="0.025"/>`;
  for (let k = 0; k <= 9; k++) h += `<line x1="${st.um}" y1="${-(st.vl + k * st.g)}" x2="${st.u1}" y2="${-(st.vl + k * st.g)}" stroke="#9a948c" stroke-width="0.025"/>`;
  h += `<line x1="${st.um}" y1="${-st.vl}" x2="${st.um}" y2="${-st.vt}" stroke="#555" stroke-width="0.03"/>`;
  h += `<path d="M${(st.u0 + st.um) / 2},${-st.v1 + 0.1} L${(st.u0 + st.um) / 2},${-st.vl - 0.3} L${(st.um + st.u1) / 2},${-st.vl - 0.3} L${(st.um + st.u1) / 2},${-st.vt + 0.15}" fill="none" stroke="#6b645c" stroke-width="0.04"/><path d="M${(st.um + st.u1) / 2 - 0.15},${-st.vt + 0.4} L${(st.um + st.u1) / 2},${-st.vt + 0.15} L${(st.um + st.u1) / 2 + 0.15},${-st.vt + 0.4}" fill="none" stroke="#6b645c" stroke-width="0.04"/>`;
  // room hotspots — labels drawn last, with a white halo so walls never hide them
  const list = model.rooms[fl === 1 ? '5-01' : '5-02'];
  const efU = ef.map(p => p[0]), uMin = Math.min(...efU) + 0.25, uMax = Math.max(...efU) - 0.25;
  let labels = '';
  for (const r of list) { const R = ROOMS[r.id]; const big = R.a > 9; const fs = big ? 0.46 : 0.32;
    const name = R[LANG], area = `${String(R.a).replace('.', LANG === 'en' ? '.' : ',')} m²`;
    const w = Math.max(name.length, area.length) * fs * 0.56; let u = Math.min(Math.max(r.u, uMin + w / 2), uMax - w / 2);
    if (mini) { if (big) labels += `<text class="mlbl" x="${u}" y="${-r.v}" text-anchor="middle" font-size="0.55">${name}</text>`; continue; }
    h += `<g class="rh" data-id="${r.id}" style="cursor:pointer"><circle class="room" cx="${u}" cy="${-r.v}" r="${big ? 1.6 : 0.9}"/></g>`;
    labels += `<g class="lbl" data-id="${r.id}"><text x="${u}" y="${-r.v}" text-anchor="middle" font-size="${fs}" font-weight="500">${name}</text>`;
    labels += `<text x="${u}" y="${-r.v + fs * 1.15}" text-anchor="middle" font-size="${fs * 0.82}" fill="#7a7068">${area}</text></g>`; }
  h += labels;
  return { h, list };
}
function buildPlan(fl) {
  planFloor = fl; $$('.tabs button').forEach(b => b.classList.toggle('on', +b.dataset.pf === fl));
  const svg = $('#plansvg');
  const minU = -2.5, maxU = 22.5, minV = -9, maxV = 21;
  let { h, list } = planMarkup(fl, false);
  // north arrow (true north in local frame)
  const nr = model.frame.rot; const na = [Math.sin(nr), Math.cos(nr)];
  h += `<g transform="translate(20.5,-19.2)"><circle r="0.9" fill="none" stroke="#222" stroke-width="0.04"/><line x1="0" y1="0" x2="${na[0] * 0.8}" y2="${-na[1] * 0.8}" stroke="#222" stroke-width="0.12"/><text x="${na[0] * 1.35}" y="${-na[1] * 1.35 + 0.17}" font-size="0.5" text-anchor="middle">N</text></g>`;
  h += `<text x="${minU + 0.4}" y="${-minV - 0.4}" font-size="0.34" fill="#8a837b">0 — 5 m</text><line x1="${minU + 0.4}" y1="${-minV - 0.9}" x2="${minU + 5.4}" y2="${-minV - 0.9}" stroke="#222" stroke-width="0.08"/>`;
  svg.innerHTML = h;
  planVB = { x: minU, y: -maxV, w: maxU - minU, h: maxV - minV }; planVB0 = { ...planVB }; applyVB();
  svg.querySelectorAll('.rh, .lbl').forEach(g => g.addEventListener('click', e => { if (planDragged) return; enterRoom(g.dataset.id); }));
  // list
  let tot = 0; let l = '';
  for (const r of [...list].sort((a, b) => a.id.localeCompare(b.id))) { const R = ROOMS[r.id]; tot += R.a; l += `<button data-id="${r.id}"><span>${r.id} · ${R[LANG]}</span><span>${String(R.a).replace('.', LANG === 'en' ? '.' : ',')} m²</span></button>`; }
  l += `<div class="tot"><span>${T[LANG].total}</span><span>${tot.toFixed(1).replace('.', LANG === 'en' ? '.' : ',')} m²</span></div>`;
  $('#roomlist').innerHTML = l; $$('#roomlist button').forEach(b => b.onclick = () => enterRoom(b.dataset.id));
}
$$('.tabs button').forEach(b => b.onclick = () => buildPlan(+b.dataset.pf));
// zoom & pan for the plan
let planVB = null, planVB0 = null, planDragged = false;
function applyVB() { $('#plansvg').setAttribute('viewBox', `${planVB.x} ${planVB.y} ${planVB.w} ${planVB.h}`); }
function svgPt(e) { const svg = $('#plansvg'), r = svg.getBoundingClientRect(); const s = Math.max(planVB.w / r.width, planVB.h / r.height); const ox = (r.width * s - planVB.w) / 2, oy = (r.height * s - planVB.h) / 2; return { x: planVB.x - ox + (e.clientX - r.left) * s, y: planVB.y - oy + (e.clientY - r.top) * s, s }; }
function zoomAt(e, k) { const p = svgPt(e); const nw = THREE.MathUtils.clamp(planVB.w * k, planVB0.w / 8, planVB0.w * 1.2); const kk = nw / planVB.w;
  planVB = { x: p.x - (p.x - planVB.x) * kk, y: p.y - (p.y - planVB.y) * kk, w: planVB.w * kk, h: planVB.h * kk }; applyVB(); }
{ const svg = $('#plansvg'); const pts = new Map(); let last = null, pinch0 = null;
  svg.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e, Math.exp(e.deltaY * 0.0015)); }, { passive: false });
  svg.addEventListener('dblclick', e => zoomAt(e, 0.5));
  svg.addEventListener('pointerdown', e => { pts.set(e.pointerId, e); planDragged = false; last = { x: e.clientX, y: e.clientY }; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), w: planVB.w }; } });
  svg.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, e);
    if (pts.size === 2 && pinch0) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); const mid = { clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 }; zoomAt(mid, (pinch0.w * pinch0.d / d) / planVB.w); planDragged = true; return; }
    const dx = e.clientX - last.x, dy = e.clientY - last.y; if (Math.abs(dx) + Math.abs(dy) > 9) { if (!planDragged) svg.setPointerCapture(e.pointerId); planDragged = true; }
    if (planDragged) { const s = svgPt(e).s; planVB.x -= dx * s; planVB.y -= dy * s; applyVB(); } last = { x: e.clientX, y: e.clientY }; });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = null; };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  $('#zin').onclick = () => { const r = svg.getBoundingClientRect(); zoomAt({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }, 0.7); };
  $('#zout').onclick = () => { const r = svg.getBoundingClientRect(); zoomAt({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }, 1 / 0.7); };
  $('#zfit').onclick = () => { planVB = { ...planVB0 }; applyVB(); }; }
// ---------- minimap in walk mode: shows where you are, click to jump there ----------
let miniFloor = 0;
function buildMini(fl) {
  miniFloor = fl; const svg = $('#minisvg'); const { h } = planMarkup(fl, true);
  svg.setAttribute('viewBox', `-1.2 ${-14.6} 18.4 16.0`);
  svg.innerHTML = h + `<g id="miniMe"><path d="M0,0 L2.6,-1.1 A2.8,2.8 0 0 1 2.6,1.1 Z" fill="rgba(217,150,60,.45)"/><circle r="0.42" fill="#d9963c" stroke="#fff" stroke-width="0.14"/></g>`;
}
{ const svg = $('#minisvg');
  svg.addEventListener('click', e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); const u = q.x, v = -q.y;
    const lvl = miniFloor, z = lvl === 1 ? 0 : 3.5; const ef = lvl === 1 ? EF1 : EF2;
    if (!inPoly([u, v], ef) && lvl === 2 && !inPoly([u, v], FP)) return;
    let tu = u, tv = v; if (blocked(tu, tv, lvl)) { let ok = false; for (let r = 0.15; r < 0.9 && !ok; r += 0.15) for (let a = 0; a < 6.28 && !ok; a += 0.5) { const uu = u + Math.cos(a) * r, vv = v + Math.sin(a) * r; if (!blocked(uu, vv, lvl)) { tu = uu; tv = vv; ok = true; } } }
    walker.u = tu; walker.v = tv; walker.z = lvl === 1 ? (inPoly([tu, tv], EF1) ? 0 : floorAt(tu, tv, 1)) : 3.5; walker.lvl = lvl; updateRoom(true); }); }
function updateMini() {
  if (mode !== 'walk') return; const lvl = walker.z > 1.75 ? 2 : 1; if (lvl !== miniFloor) buildMini(lvl);
  const g = document.getElementById('miniMe'); if (g) g.setAttribute('transform', `translate(${walker.u},${-walker.v}) rotate(${walker.yaw * 180 / Math.PI})`);
}
function enterRoom(id) {
  const fl = id[0] === '1' ? 1 : 2; const r = model.rooms[fl === 1 ? '5-01' : '5-02'].find(x => x.id === id);
  setMode('walk'); placeWalker(r.u, r.v - 0.6, fl === 1 ? 0 : 3.5, fl, 90 + 180);
  // face towards the brightest direction: toward the nearest exterior face with windows
  let best = null, bd = 1e9; for (const f of model.faces.filter(f => f.floor === fl && f.win.length)) { for (const [a, b] of f.win) { const L = Math.hypot(f.p1[0] - f.p0[0], f.p1[1] - f.p0[1]); const m = (a + b) / 2 / L; const pu = f.p0[0] + (f.p1[0] - f.p0[0]) * m, pv = f.p0[1] + (f.p1[1] - f.p0[1]) * m; const d = Math.hypot(pu - r.u, pv - r.v); if (d < bd) { bd = d; best = [pu, pv]; } } }
  if (best) { walker.yaw = Math.atan2(-(best[1] - r.v), best[0] - r.u); walker.u = r.u - Math.cos(walker.yaw) * 0.8; walker.v = r.v + Math.sin(walker.yaw) * 0.8; if (blocked(walker.u, walker.v, fl)) { walker.u = r.u; walker.v = r.v; } }
}

// ---------- photos ----------
let photosReady = null;
async function openPhotos() { const mod = await import('./photo.js'); if (!photosReady) photosReady = mod.initPhotos({ THREE, scene, house, model, renderer, groups, toWorld, M, setSun, LANG: () => LANG }); }

// ---------- loop ----------
// ---------- post-processing: ambient occlusion + SMAA (desktop; phones render directly) ----------
const HQ = qs.has('hq') ? qs.get('hq') !== '0' : !matchMedia('(pointer:coarse)').matches;
let composer = null, aoPass = null;
if (HQ) {
  composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType }));
  aoPass = new N8AOPass(scene, camera, innerWidth, innerHeight);
  Object.assign(aoPass.configuration, { aoRadius: 1.6, distanceFalloff: 1.0, intensity: 2.6, gammaCorrection: false, transparencyAware: true });
  aoPass.setQualityMode('Medium');
  composer.addPass(aoPass);
  composer.addPass(new SMAAPass(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio()));
  composer.addPass(new OutputPass());
  composer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); if (composer) composer.setSize(innerWidth, innerHeight); });
const clock = new THREE.Clock();
camera.position.copy(toWorld(-60, -70, 46)); controls.target.copy(toWorld(10, 12, 2)); camera.lookAt(controls.target);
fly(toWorld(-30, -34, 22), toWorld(10, 12, 2), 4);
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  stepFly(dt); stepTour(dt); stepWalk(dt); updateMini(); if (window.__water) window.__water(dt);
  if (!touring && !flyAnim && controls.enabled) controls.update();
  if (window.__treeCull) window.__treeCull(camera, mode !== 'walk');
  if (composer) composer.render(dt); else renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
mgr.onLoad = () => { $('#loader').style.opacity = 0; setTimeout(() => $('#loader').remove(), 900); };
applyLang(LANG);
loop();
window.__app = { blocked: (u, v, l) => blocked(u, v, l), floorAt: (u, v, l) => floorAt(u, v, l), collide, setNight, tourAt: t => { flyAnim = null; if (!touring) startTour(); tourT = t; stepTour(0.0001); }, stopFly: () => { flyAnim = null; }, view: (p, l) => { flyAnim = null; camera.position.copy(toWorld(...p)); controls.target.copy(toWorld(...l)); camera.lookAt(controls.target); }, camera, scene, setMode, startTour, toWorld, walker, placeWalker, setCut, setSun, controls, renderer };
