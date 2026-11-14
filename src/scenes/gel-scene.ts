import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { bands, bandPosition, bandWidth, fluorescence, dyeOpacity, LANES, stainColor } from './gel-model.ts';
import type { GelState } from './gel-model.ts';

export type SceneTheme = 'dark' | 'light';
export type SceneMotion = 'full' | 'gentle' | 'off';
export interface GelSceneOptions {
  canvas: HTMLCanvasElement; host: HTMLElement; slot: () => DOMRect | null; labels: HTMLElement;
  theme: SceneTheme; motion: SceneMotion; text: { lanes: string[]; cathode: string; anode: string };
}
export interface GelScene {
  setState(state: GelState): void; setTheme(theme: SceneTheme): void; setMotion(motion: SceneMotion): void;
  setActive(active: boolean): void; resize(): void; dispose(): void;
}

const LANE_X = (i: number) => (i - (LANES - 1) / 2) * 2.15;
const WELL_Z = -4.55, END_Z = 4.85, GEL_Y = 3.32, BUFFER_Y = 4.62;

function haloTexture(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(.25, 'rgba(255,255,255,.55)'); grad.addColorStop(.6, 'rgba(255,255,255,.12)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function softRectTexture(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d')!;
  g.filter = 'blur(26px)'; g.fillStyle = '#fff'; g.fillRect(48, 48, 160, 160);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const surfaceVertex = `varying vec2 vPos; void main(){ vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const surfaceFragment = `
uniform float uTime; uniform vec4 uRipples[8]; uniform vec3 uTint; uniform float uOpacity; uniform vec3 uGlow; uniform float uGlowAmt; uniform float uShimmer;
varying vec2 vPos;
void main(){
  float h = 0.0;
  for (int i = 0; i < 8; i++) {
    vec4 r = uRipples[i]; float age = uTime - r.z;
    if (age < 0.0 || age > 3.5) continue;
    float d = distance(vPos, r.xy); float front = age * 3.6;
    h += sin(d * 5.5 - age * 10.0) * exp(-abs(d - front) * 1.3) * exp(-age * 1.1) * r.w;
  }
  h += uShimmer * 0.22 * sin(vPos.x * 1.3 + uTime * 0.7) * sin(vPos.y * 1.9 - uTime * 0.55);
  float spec = smoothstep(0.18, 0.9, h);
  vec3 col = uTint + uGlow * uGlowAmt * 0.35 + spec * vec3(1.0);
  gl_FragColor = vec4(col, clamp(uOpacity + spec * 0.4, 0.0, 1.0));
}`;

export function createGelScene(options: GelSceneOptions): GelScene | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: options.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch { return null; }
  if (!renderer.getContext()) return null;
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  const camera = new THREE.PerspectiveCamera(28, 1, 1, 400);
  const target = new THREE.Vector3(0, 3.2, 0.4);

  /* Lights */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x3a2f6b, 0.6); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-18, 30, 16); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff6fb0, 0.5); rim.position.set(20, 8, -20); scene.add(rim);
  const uvLight = new THREE.PointLight(0x7b4dff, 0, 70, 1.4); uvLight.position.set(0, 10, -2); scene.add(uvLight);

  const device = new THREE.Group(); scene.add(device);
  const halo = haloTexture(), soft = softRectTexture();

  /* Base housing */
  const baseMat = new THREE.MeshPhysicalMaterial({ color: 0x1a1830, roughness: 0.42, metalness: 0.12, clearcoat: 0.6, clearcoatRoughness: 0.28 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(27, 3, 18.6, 6, 0.95), baseMat); base.position.y = 1.5; device.add(base);
  const trimMat = new THREE.MeshPhysicalMaterial({ color: 0x0c0a18, roughness: 0.3, metalness: 0.4, clearcoat: 1 });
  const panel = new THREE.Mesh(new RoundedBoxGeometry(9, 1.1, 0.3, 2, 0.12), trimMat); panel.position.set(-6.5, 1.45, 9.25); device.add(panel);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x2cf5a0, toneMapped: false });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), ledMat); led.position.set(9.6, 1.5, 9.3); device.add(led);
  const ledUvMat = new THREE.MeshBasicMaterial({ color: 0x8b5cff, toneMapped: false });
  const ledUv = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), ledUvMat); ledUv.position.set(8.6, 1.5, 9.3); device.add(ledUv);
  const footMat = new THREE.MeshStandardMaterial({ color: 0x08070f, roughness: 0.9 });
  for (const [x, z] of [[-11.5, -7.8], [11.5, -7.8], [-11.5, 7.8], [11.5, 7.8]]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.35, 20), footMat); f.position.set(x!, -0.15, z!); device.add(f); }

  /* Illuminator window */
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x0a0818, emissive: new THREE.Color(0x6a3cff), emissiveIntensity: 0, roughness: 0.25, metalness: 0.1 });
  const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(20.5, 13.2), windowMat); windowMesh.rotation.x = -Math.PI / 2; windowMesh.position.y = 3.02; device.add(windowMesh);
  const windowGlowMat = new THREE.MeshBasicMaterial({ map: soft, color: 0x7b4dff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const windowGlow = new THREE.Mesh(new THREE.PlaneGeometry(34, 26), windowGlowMat); windowGlow.rotation.x = -Math.PI / 2; windowGlow.position.y = 3.06; device.add(windowGlow);
  const spillMat = new THREE.MeshBasicMaterial({ map: halo, color: 0x7b4dff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(70, 46), spillMat); spill.rotation.x = -Math.PI / 2; spill.position.y = -0.2; scene.add(spill);
  const shadowMat = new THREE.MeshBasicMaterial({ map: halo, color: 0x1a1240, transparent: true, opacity: 0.0, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(46, 32), shadowMat); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.31; scene.add(shadow);

  /* Buffer tank (acrylic) */
  const acrylicMat = new THREE.MeshPhysicalMaterial({ color: 0xc9c4ff, transparent: true, opacity: 0.14, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const wallH = 2.7, wallY = 3 + wallH / 2;
  for (const z of [-7.45, 7.45]) { const w = new THREE.Mesh(new THREE.BoxGeometry(22.9, wallH, 0.3), acrylicMat); w.position.set(0, wallY, z); device.add(w); }
  for (const x of [-11.3, 11.3]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.3, wallH, 14.6), acrylicMat); w.position.set(x, wallY, 0); device.add(w); }
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xbfb6ff, transparent: true, opacity: 0.35 });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(22.9, wallH, 15.2)), edgeMat); edges.position.y = wallY; device.add(edges);

  /* Buffer liquid + rippling surface */
  const bufferMat = new THREE.MeshPhysicalMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0.08, roughness: 0.1, depthWrite: false });
  const buffer = new THREE.Mesh(new THREE.BoxGeometry(22.2, BUFFER_Y - 3.05, 14.5), bufferMat); buffer.position.y = 3.05 + (BUFFER_Y - 3.05) / 2; device.add(buffer);
  const ripples = Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, -99, 0));
  const surfaceMat = new THREE.ShaderMaterial({ vertexShader: surfaceVertex, fragmentShader: surfaceFragment, transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uRipples: { value: ripples }, uTint: { value: new THREE.Color(0x3a3470) }, uOpacity: { value: 0.07 }, uGlow: { value: new THREE.Color(0x7b4dff) }, uGlowAmt: { value: 0 }, uShimmer: { value: 1 } } });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(22.2, 14.5, 1, 1), surfaceMat); surface.rotation.x = -Math.PI / 2; surface.position.y = BUFFER_Y; device.add(surface);

  /* Gel slab, wells, electrodes */
  const gelMat = new THREE.MeshPhysicalMaterial({ color: 0xd9e0ff, transparent: true, opacity: 0.22, roughness: 0.6, emissive: new THREE.Color(0x5b3cff), emissiveIntensity: 0, depthWrite: false });
  const gel = new THREE.Mesh(new RoundedBoxGeometry(14.2, 0.62, 10.8, 2, 0.12), gelMat); gel.position.set(0, GEL_Y, 0.15); device.add(gel);
  const wellMat = new THREE.MeshStandardMaterial({ color: 0x241f4d, transparent: true, opacity: 0.55, roughness: 0.6, depthWrite: false });
  for (let i = 0; i < LANES; i++) { const w = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.28), wellMat); w.position.set(LANE_X(i), GEL_Y + 0.08, WELL_Z); device.add(w); }
  const wireMat = new THREE.MeshStandardMaterial({ color: 0xe8e8f0, metalness: 1, roughness: 0.22 });
  for (const z of [-6.9, 6.9]) { const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 20.8, 8), wireMat); wire.rotation.z = Math.PI / 2; wire.position.set(0, 3.35, z); device.add(wire); }

  /* Terminals + leads */
  const red = new THREE.MeshPhysicalMaterial({ color: 0xe23744, roughness: 0.35, clearcoat: 0.8 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x16151d, roughness: 0.35, clearcoat: 0.8 });
  const terminals: [number, THREE.Material][] = [[6.9, red], [-6.9, black]];
  for (const [z, material] of terminals) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 20), material); post.position.set(11.9, 5.95, z); device.add(post);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(11.9, 6.3, z), new THREE.Vector3(13.5, 7.8, z * 1.05), new THREE.Vector3(18, 5, z * 1.25), new THREE.Vector3(24, 0.4, z * 1.5), new THREE.Vector3(36, 0.2, z * 1.7)]);
    const lead = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.2, 10, false), material); device.add(lead);
  }
  const mountMat = new THREE.MeshStandardMaterial({ color: 0x2a2648, roughness: 0.5 });
  for (const z of [-6.9, 6.9]) { const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.4), mountMat); m.position.set(11.9, 5.62, z); device.add(m); }

  /* Amber UV shield, hinged at the back */
  const amberMat = new THREE.MeshPhysicalMaterial({ color: 0xffa23a, transparent: true, opacity: 0.3, roughness: 0.06, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide, emissive: new THREE.Color(0xff8a1a), emissiveIntensity: 0.05 });
  const hinge = new THREE.Group(); hinge.position.set(0, 5.75, -7.7); device.add(hinge);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(23.4, 0.24, 15.6, 2, 0.1), amberMat); lid.position.z = 7.8; hinge.add(lid);
  const lidEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(23.4, 0.24, 15.6)), new THREE.LineBasicMaterial({ color: 0xffb35c, transparent: true, opacity: 0.5 })); lidEdges.position.z = 7.8; hinge.add(lidEdges);
  hinge.rotation.x = -1.08;

  /* Bands: core + additive halo per band */
  const bandGeo = new THREE.BoxGeometry(1.5, 0.1, 1);
  const haloGeo = new THREE.PlaneGeometry(3.2, 1);
  const bandMeshes = bands.map(band => {
    const material = band.kind === 'dna'
      ? new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, toneMapped: false, depthWrite: false })
      : new THREE.MeshBasicMaterial({ color: band.dye === 'bromophenol' ? 0x3d45ff : 0x2a8cff, transparent: true, opacity: 0, depthWrite: false });
    const core = new THREE.Mesh(bandGeo, material); core.position.set(LANE_X(band.lane), GEL_Y + 0.05, WELL_Z);
    device.add(core);
    let glow: THREE.Mesh | null = null;
    if (band.kind === 'dna') {
      glow = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ map: halo, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      glow.rotation.x = -Math.PI / 2; glow.position.set(LANE_X(band.lane), GEL_Y + 0.4, WELL_Z); device.add(glow);
    }
    return { band, core, glow };
  });

  /* Electrolysis bubbles: twice as many at the cathode (H₂) as at the anode (O₂) */
  const BUBBLES = 90;
  const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
  const bubbleMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), bubbleMat, BUBBLES); device.add(bubbleMesh);
  const bubbleData = Array.from({ length: BUBBLES }, (_, i) => ({ z: i % 3 === 2 ? 6.9 : -6.9, x: (Math.random() - .5) * 20, y: 3.3 + Math.random() * 1.3, s: 0.03 + Math.random() * 0.06, v: 0.6 + Math.random() * 0.9, ph: Math.random() * 6 }));
  const dummy = new THREE.Object3D();

  /* State */
  let state: GelState | null = null;
  let theme = options.theme, motion = options.motion;
  let active = true, raf = 0, last = performance.now(), time = 0, bubbleAmt = 0, uvShown = 0, flicker = 0, prevUv = true;
  let az = -0.3, pol = 0.86, radius = 60;
  const look = { az: -0.3, pol: 0.86, tx: 0, ty: 0, drag: false, dx: 0, dy: 0, px: 0, py: 0 };
  let view: '3d' | 'top' = '3d';
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
  const frameTimes: number[] = [];

  /* Labels projected from 3D */
  const tags: { el: HTMLElement; pos: THREE.Vector3; half: number; pole: boolean }[] = [];
  const addTag = (text: string, pos: THREE.Vector3, cls: string) => { const el = document.createElement('span'); el.className = `gel-tag ${cls}`; el.textContent = text; options.labels.append(el); tags.push({ el, pos, half: 0, pole: cls !== 'gel-tag--lane' }); };
  options.text.lanes.forEach((text, i) => addTag(text, new THREE.Vector3(LANE_X(i), GEL_Y + 0.5, WELL_Z - 1.05), 'gel-tag--lane'));
  addTag(options.text.cathode, new THREE.Vector3(14.6, 6.9, -6.9), 'gel-tag--neg');
  addTag(options.text.anode, new THREE.Vector3(14.6, 6.9, 6.9), 'gel-tag--pos');
  void document.fonts?.ready.then(() => { for (const tag of tags) tag.half = 0; });

  function applyTheme() {
    const dark = theme === 'dark';
    baseMat.color.set(dark ? 0x1b1932 : 0xf3f3f9); baseMat.roughness = dark ? 0.42 : 0.34;
    trimMat.color.set(dark ? 0x0c0a18 : 0x24213f);
    mountMat.color.set(dark ? 0x2a2648 : 0xdcdcea);
    acrylicMat.opacity = dark ? 0.13 : 0.2; acrylicMat.color.set(dark ? 0xc9c4ff : 0xffffff);
    edgeMat.color.set(dark ? 0xbfb6ff : 0x8f87c9); edgeMat.opacity = dark ? 0.35 : 0.45;
    gelMat.color.set(dark ? 0xd9e0ff : 0xe6ecff); gelMat.opacity = dark ? 0.2 : 0.42;
    wellMat.color.set(dark ? 0x241f4d : 0x8d88b8);
    hemi.intensity = dark ? 0.45 : 1.25; hemi.groundColor.set(dark ? 0x2a2150 : 0xb7b0de);
    key.intensity = dark ? 1.1 : 2.2;
    rim.intensity = dark ? 0.7 : 0.25;
    scene.environmentIntensity = dark ? 0.55 : 1.05;
    (surfaceMat.uniforms.uTint!.value as THREE.Color).set(dark ? 0x2e2860 : 0xb9c2f5);
    surfaceMat.uniforms.uOpacity!.value = dark ? 0.06 : 0.12;
    shadowMat.opacity = dark ? 0.55 : 0.32; shadowMat.color.set(dark ? 0x000000 : 0x2a2060);
    for (const { glow } of bandMeshes) {
      if (!glow) continue;
      const material = glow.material as THREE.MeshBasicMaterial;
      material.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; material.needsUpdate = true;
    }
  }

  let stacked = false;
  function layout() {
    const rect = options.host.getBoundingClientRect();
    const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    const slot = options.slot();
    const sx = slot ? slot.left - rect.left + slot.width / 2 : w * 0.7;
    const narrow = w < 900;
    stacked = narrow;
    const size = slot ? (narrow ? Math.min(slot.width * 0.95, slot.height * 1.09) : Math.min(slot.width * 0.62, slot.height)) : Math.min(w * 0.45, h * 0.6);
    // Stacked layouts: the open amber shield rises ~0.56·size above the tray centre and the tray ends ~0.36·size below it,
    // so centre the whole silhouette in the slot (keeps the shield clear of the buttons above).
    const lift = slot && narrow ? size * 0.1 : 0;
    const sy = slot ? slot.top - rect.top + slot.height / 2 + lift : h * 0.52;
    camera.aspect = w / h;
    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    radius = (14.5 * h) / (Math.max(size, 160) * Math.tan(fovRad / 2));
    camera.setViewOffset(w, h, -(sx - w / 2), -(sy - h / 2), w, h);
    camera.updateProjectionMatrix();
  }

  function addRipple(x: number, z: number, strength = 1) {
    let oldest = 0;
    for (let i = 1; i < ripples.length; i++) if (ripples[i]!.z < ripples[oldest]!.z) oldest = i;
    // Plane is rotated −90° about x: local y = −world z.
    ripples[oldest]!.set(x, -z, time, strength);
  }

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let lastRipple = 0;
  function onPointerMove(event: PointerEvent) {
    const rect = options.canvas.getBoundingClientRect();
    look.px = (event.clientX - rect.left) / rect.width - 0.5;
    look.py = (event.clientY - rect.top) / rect.height - 0.5;
    if (look.drag) {
      look.az += (event.movementX || 0) * -0.006;
      look.pol = THREE.MathUtils.clamp(look.pol + (event.movementY || 0) * -0.004, 0.55, 1.25);
      look.az = THREE.MathUtils.clamp(look.az, -1.2, 0.5);
      render();
    }
    if (motion === 'off' || time - lastRipple < 0.09) return;
    ndc.set(look.px * 2, -look.py * 2);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(surface)[0];
    if (hit) { const local = device.worldToLocal(hit.point.clone()); addRipple(local.x, local.z, motion === 'gentle' ? 0.5 : 1); lastRipple = time; }
  }
  function onPointerDown(event: PointerEvent) { if (view !== '3d' || event.button !== 0) return; look.drag = true; options.canvas.setPointerCapture(event.pointerId); options.host.classList.add('is-dragging'); }
  function onPointerUp(event: PointerEvent) { look.drag = false; options.canvas.releasePointerCapture?.(event.pointerId); options.host.classList.remove('is-dragging'); }
  options.canvas.addEventListener('pointermove', onPointerMove);
  options.canvas.addEventListener('pointerdown', onPointerDown);
  options.canvas.addEventListener('pointerup', onPointerUp);
  options.canvas.addEventListener('pointercancel', onPointerUp);

  const projected = new THREE.Vector3();
  function updateTags() {
    const rect = options.host.getBoundingClientRect();
    for (const tag of tags) {
      projected.copy(tag.pos); device.localToWorld(projected); projected.project(camera);
      const x = (projected.x * 0.5 + 0.5) * rect.width, y = (-projected.y * 0.5 + 0.5) * rect.height;
      // Keep a label fully on stage by nudging it inward; if its anchor is too far off-stage, hide it rather than cut it.
      if (!tag.half) tag.half = tag.el.offsetWidth / 2;
      const cx = Math.min(Math.max(x, tag.half + 4), rect.width - tag.half - 4);
      // Stacked (phone/tablet) layouts hang the badge over the electrode end, so the pole labels would sit behind it;
      // the power supply still says which way DNA moves.
      const inside = !(stacked && tag.pole) && Math.abs(cx - x) <= 48 && y >= 8 && y <= rect.height - 8;
      tag.el.style.transform = `translate(${cx.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      tag.el.style.opacity = projected.z < 1 && inside ? '1' : '0';
    }
  }

  function updateBands(dt: number) {
    if (!state) return;
    const color = new THREE.Color(stainColor[state.stain]);
    // Fluorescent tube start-up: a brief flicker whenever the lamp is switched on.
    if (state.uvOn && !prevUv) flicker = 0.55;
    prevUv = state.uvOn;
    flicker = Math.max(0, flicker - dt);
    const flick = flicker > 0 && motion !== 'off' ? (Math.sin(flicker * 70) > 0.1 ? 1 : 0.15) : 1;
    const targetUv = (state.uvOn ? state.intensity : 0) * flick;
    uvShown += (targetUv - uvShown) * Math.min(1, dt * (flicker > 0 ? 30 : 9));
    const dark = theme === 'dark';
    windowMat.emissiveIntensity = uvShown * (dark ? 2.2 : 1.6);
    windowGlowMat.opacity = uvShown * (dark ? 0.42 : 0.22);
    spillMat.opacity = uvShown * (dark ? 0.32 : 0.12);
    uvLight.intensity = uvShown * (dark ? 120 : 50);
    gelMat.emissiveIntensity = uvShown * (dark ? 0.22 : 0.08);
    surfaceMat.uniforms.uGlowAmt!.value = uvShown;
    amberMat.emissiveIntensity = 0.05 + uvShown * (dark ? 0.3 : 0.1);
    ledUvMat.color.set(state.uvOn ? 0x8b5cff : 0x221f35);
    ledMat.color.set(state.running ? 0x2cf5a0 : 0x1d3a2e);
    for (const { band, core, glow } of bandMeshes) {
      const pos = bandPosition(band, state.progress);
      const z = WELL_Z + Math.min(pos, 1.08) * (END_Z - WELL_Z);
      const depth = bandWidth(band, state.progress) * 2.1;
      core.position.z = z; core.scale.z = depth;
      const material = core.material as THREE.MeshBasicMaterial;
      if (band.kind === 'dna') {
        const f = fluorescence(band, state) * (uvShown / Math.max(0.001, state.uvOn ? state.intensity : 1));
        material.color.copy(color).multiplyScalar(0.6 + f * 1.6);
        material.opacity = Math.min(1, f * 1.4);
        if (glow) { glow.position.z = z; glow.scale.set(1, depth * 2.6, 1); const gm = glow.material as THREE.MeshBasicMaterial; gm.color.copy(color); gm.opacity = Math.min(1, f * (dark ? 1.25 : 0.5)); }
      } else {
        material.opacity = dyeOpacity(band, state) * (dark ? 0.55 : 0.5) * (pos > 1.02 ? 0 : 1);
      }
    }
  }

  function updateBubbles(dt: number) {
    const target = state?.running ? 1 : 0;
    bubbleAmt += (target - bubbleAmt) * Math.min(1, dt * 2);
    bubbleMesh.visible = bubbleAmt > 0.01;
    if (!bubbleMesh.visible) return;
    const speed = (state?.voltage ?? 110) / 110;
    bubbleData.forEach((b, i) => {
      b.y += dt * b.v * speed * 0.9;
      if (b.y > BUFFER_Y - 0.05) { b.y = 3.3; b.x = (Math.random() - .5) * 20; }
      dummy.position.set(b.x + Math.sin(time * 3 + b.ph) * 0.05, b.y, b.z + Math.cos(time * 2 + b.ph) * 0.08);
      dummy.scale.setScalar(b.s * bubbleAmt);
      dummy.updateMatrix(); bubbleMesh.setMatrixAt(i, dummy.matrix);
    });
    bubbleMesh.instanceMatrix.needsUpdate = true;
  }

  function updateCamera(dt: number) {
    const wantTop = view === 'top';
    const parallax = motion === 'full' ? 1 : motion === 'gentle' ? 0.4 : 0;
    const tAz = wantTop ? 0 : look.az + look.px * 0.22 * parallax + Math.sin(time * 0.18) * 0.04 * parallax;
    const tPol = wantTop ? 0.02 : look.pol + look.py * 0.12 * parallax;
    const k = motion === 'off' ? 1 : Math.min(1, dt * 3.2);
    az += (tAz - az) * k; pol += (tPol - pol) * k;
    const r = wantTop ? radius * 0.92 : radius;
    camera.position.set(target.x + r * Math.sin(pol) * Math.sin(az), target.y + r * Math.cos(pol), target.z + r * Math.sin(pol) * Math.cos(az));
    camera.up.set(0, 1, 0);
    if (pol < 0.2) camera.up.set(Math.sin(az) * -1, 0, -Math.cos(az)).lerp(new THREE.Vector3(0, 1, 0), pol / 0.2).normalize();
    camera.lookAt(target);
  }

  function render() { renderer.render(scene, camera); updateTags(); }

  function frame(now: number) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    time += dt;
    surfaceMat.uniforms.uTime!.value = time;
    surfaceMat.uniforms.uShimmer!.value = motion === 'full' ? 1 : motion === 'gentle' ? 0.4 : 0;
    updateCamera(dt); updateBands(dt); updateBubbles(dt);
    render();
    // Adaptive quality: drop resolution on slow devices (independent of the user's motion setting).
    frameTimes.push(dt); if (frameTimes.length > 90) frameTimes.shift();
    if (frameTimes.length === 90 && pixelRatio > 1 && frameTimes.reduce((a, b) => a + b, 0) / 90 > 0.03) { pixelRatio = Math.max(1, pixelRatio - 0.3); frameTimes.length = 0; layout(); }
    const settling = Math.abs(az - (view === 'top' ? 0 : look.az)) > 0.002 || flicker > 0 || Math.abs(uvShown - ((state?.uvOn ? state.intensity : 0))) > 0.002;
    if (active && (motion !== 'off' || state?.running || settling || look.drag)) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && active) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  applyTheme(); layout();
  const ro = new ResizeObserver(() => { layout(); kick(); });
  ro.observe(options.host);

  return {
    setState(next) { const viewChanged = next.view !== view; view = next.view; state = next; if (viewChanged) options.host.classList.toggle('is-top', view === 'top'); kick(); },
    setTheme(next) { theme = next; applyTheme(); kick(); },
    setMotion(next) { motion = next; kick(); },
    setActive(next) { active = next; if (active) kick(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } },
    resize() { for (const tag of tags) tag.half = 0; layout(); kick(); },
    dispose() {
      active = false; cancelAnimationFrame(raf); ro.disconnect();
      options.canvas.removeEventListener('pointermove', onPointerMove); options.canvas.removeEventListener('pointerdown', onPointerDown);
      options.canvas.removeEventListener('pointerup', onPointerUp); options.canvas.removeEventListener('pointercancel', onPointerUp);
      scene.traverse(object => { const mesh = object as THREE.Mesh; mesh.geometry?.dispose?.(); const m = mesh.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(m) ? m : m ? [m] : []).forEach(x => x.dispose()); });
      halo.dispose(); soft.dispose(); envTexture.dispose(); pmrem.dispose(); renderer.dispose();
      for (const tag of tags) tag.el.remove();
    },
  };
}
