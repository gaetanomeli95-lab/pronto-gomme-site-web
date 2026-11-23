import * as THREE from 'three/webgpu';
import { uniform, mix, color, sin, time, uv, float, vec3 } from 'three/tsl';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { buildWheel, studioEnv } from './wheel.js';

gsap.registerPlugin(ScrollTrigger);

const COLORS = { y: '#ffcf1b', r: '#e3241b', k: '#111111' };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ---------- parti che funzionano anche senza 3D ---------- */
const HOURS = { 1: [450, 1140], 2: [450, 1140], 3: [450, 1140], 4: [450, 1140], 5: [450, 1140], 6: [450, 810] };
function romeNow() {
  const f = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const parts = Object.fromEntries(f.formatToParts(new Date()).map(p => [p.type, p.value]));
  const days = { dom: 0, lun: 1, mar: 2, mer: 3, gio: 4, ven: 5, sab: 6 };
  return { d: days[parts.weekday.slice(0, 3).toLowerCase()], m: +parts.hour * 60 + +parts.minute };
}
const hhmm = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
function status() {
  const { d, m } = romeNow();
  const h = HOURS[d];
  let open = false, txt;
  if (h && m >= h[0] && m < h[1]) { open = true; txt = `Aperto ora · chiude alle ${hhmm(h[1])}`; }
  else {
    let nd = d, first = true;
    for (let i = 0; i < 7; i++) {
      const hh = HOURS[nd];
      if (hh && (!first || m < hh[0])) {
        const when = i === 0 ? 'oggi' : i === 1 ? 'domani' : ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'][nd];
        txt = `Chiuso ora · apre ${when} alle ${hhmm(hh[0])}`; break;
      }
      nd = (nd + 1) % 7; first = false;
    }
  }
  $$('[data-status]').forEach(el => { el.textContent = txt; el.classList.toggle('open', open); });
  $$('[data-live]').forEach(el => { el.classList.toggle('open', open); el.querySelector('b').textContent = open ? 'Aperto ora' : 'Chiuso ora'; });
  $$('#orari tr').forEach(tr => tr.classList.toggle('today', +tr.dataset.d === d));
}
status();
setInterval(status, 60000);

/* etichette tecniche attorno alla ruota */
const HUD = {
  hero: [['treadSide'], ['rim'], ['hub']],
  gomme: [['tread'], ['side'], ['rim']],
  usura: [['tread'], ['treadSide']],
  cerchi: [['rim'], ['nuts'], ['hub']],
  equil: [['weights'], ['hub']],
  conv: [['tread'], ['treadSide']]
};
const HUDTEXT = {
  hero: ['Pneumatici nuovi', 'Cerchi in lega', 'Equilibratura e convergenza'],
  gomme: ['Larghezza 205 mm', 'Spalla 55%', 'Cerchio da 16"'],
  usura: ['Battistrada 8,0 mm', 'Spia di usura a 1,6 mm'],
  cerchi: ['Diametro e canale', 'Foratura (es. 5×112)', 'Foro centrale'],
  equil: ['Contrappesi adesivi', 'Squilibrio 35 g'],
  conv: ['Angolo di convergenza', 'Usura su un lato']
};
const hudEl = $('#hud'), hudSvg = $('#hud-lines');
const hudItems = [];
Object.entries(HUD).forEach(([scene, list]) => list.forEach(([anchor], i) => {
  const el = document.createElement('div');
  el.className = 'cl'; el.dataset.s = scene;
  hudEl.appendChild(el);
  const pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  pl.setAttribute('class', 'cl'); pl.dataset.s = scene;
  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot.setAttribute('r', '4.5'); dot.setAttribute('class', 'cl dot'); dot.dataset.s = scene;
  hudSvg.append(pl, dot);
  hudItems.push({ scene, anchor, i, el, pl, dot });
}));
function hudText() { hudItems.forEach(h => { h.el.textContent = HUDTEXT[h.scene][h.i]; h.w = 0; }); }
hudText();
let activeScene = 'hero';
const NAVMAP = { gomme: 'gomme', usura: 'gomme', cerchi: 'cerchi', vetrina: 'cerchi', equil: 'equilibratura', conv: 'convergenza', servizi: 'servizi', dove: 'dove' };
function setActive(id) {
  activeScene = id;
  hudItems.forEach(h => [h.el, h.pl, h.dot].forEach(n => n.classList.toggle('on', h.scene === id)));
  hudEl.dataset.tone = (id === 'equil' || id === 'conv') ? 'light' : 'dark';
  const link = document.querySelector(`.links a[data-s="${NAVMAP[id] || ''}"]`);
  $$('.links a').forEach(a => a.classList.toggle('on', a === link));
  const ind = $('.links .ind');
  if (link) { ind.style.opacity = 1; ind.style.width = link.offsetWidth + 'px'; ind.style.transform = `translateX(${link.offsetLeft}px)`; }
  else ind.style.opacity = 0;
}
[['hero', 'hero'], ['gomme', 'gomme'], ['usura', 'usura'], ['cerchi', 'cerchi'], ['vetrina', 'vetrina'], ['equil', 'equilibratura'], ['conv', 'convergenza'], ['servizi', 'servizi'], ['dove', 'dove']].forEach(([id, el]) => {
  ScrollTrigger.create({ trigger: '#' + el, start: 'top 55%', end: 'bottom 55%', onToggle: st => st.isActive && setActive(id) });
});
setActive('hero');

/* decodifica misura + messaggio WhatsApp */
const LOAD = { 75: 387, 76: 400, 77: 412, 78: 425, 79: 437, 80: 450, 81: 462, 82: 475, 83: 487, 84: 500, 85: 515, 86: 530, 87: 545, 88: 560, 89: 580, 90: 600, 91: 615, 92: 630, 93: 650, 94: 670, 95: 690, 96: 710, 97: 730, 98: 750, 99: 775, 100: 800, 101: 825, 102: 850, 103: 875, 104: 900, 105: 925, 106: 950, 107: 975, 108: 1000, 109: 1030, 110: 1060 };
const SPEED = { Q: 160, R: 170, S: 180, T: 190, U: 200, H: 210, V: 240, W: 270, Y: 300 };
function decode(v) {
  const s = v.toUpperCase().replace(/\s+/g, ' ').trim();
  const mm = s.match(/(\d{3})\s*\/\s*(\d{2})\s*Z?R?\s*(\d{2})(?:\s*(\d{2,3})\s*([A-Z]))?/);
  if (!mm) return null;
  const rows = [
    [mm[1], `larghezza della gomma: ${mm[1]} mm`],
    [mm[2], `altezza della spalla: il ${mm[2]}% della larghezza, circa ${Math.round(mm[1] * mm[2] / 100)} mm`],
    [`R${mm[3]}`, `costruzione radiale, per cerchi da ${mm[3]} pollici`]
  ];
  if (mm[4] && LOAD[mm[4]]) rows.push([mm[4], `indice di carico: fino a ${LOAD[mm[4]]} kg per gomma`]);
  if (mm[5] && SPEED[mm[5]]) rows.push([mm[5], `codice di velocità: fino a ${SPEED[mm[5]]} km/h`]);
  return rows;
}
function refreshQuote() {
  const size = $('#q-size').value.trim(), car = $('#q-car').value.trim(), n = $('#q-n').value;
  const rows = decode(size || '205/55 R16 91V');
  $('#decode').innerHTML = rows
    ? rows.map(([k, t], i) => `<li data-i="${i}"><b>${k}</b><span>${t}</span></li>`).join('')
    : '<li class="warn"><span>Scrivi la misura come sul fianco della gomma, per esempio 205/55 R16 91V.</span></li>';
  const parts = rows ? rows.map(r => r[0]) : ['205', '55', 'R16', '91', 'V'];
  const seps = ['/', ' ', ' ', ''];
  $('#sidewall').innerHTML = parts.map((p, i) => `<span data-i="${i}">${p}</span>${i < parts.length - 1 ? seps[i] : ''}`).join('') + '<small>così è scritta sul fianco della gomma</small>';
  $('#decode-of').textContent = size ? size.toUpperCase() : '205/55 R16 91V (esempio)';
  const mm = (size || '205/55 R16').toUpperCase().match(/(\d{3})\s*\/\s*(\d{2})\s*Z?R?\s*(\d{2})/);
  if (mm) { HUDTEXT.gomme = [`Larghezza ${mm[1]} mm`, `Spalla ${mm[2]}%`, `Cerchio da ${mm[3]}"`]; hudText(); }
  const msg = `Ciao Pronto Gomme, vorrei un preventivo per ${n} gomme` + (size ? ` ${size.toUpperCase()}` : '') + (car ? ` per ${car}` : '') + '. Grazie!';
  $('#q-msg').textContent = msg;
  $('#q-wa').href = 'https://wa.me/393270107728?text=' + encodeURIComponent(msg);
}
['#q-size', '#q-car', '#q-n'].forEach(id => $(id).addEventListener('input', refreshQuote));
$('#quote').addEventListener('submit', e => { e.preventDefault(); window.open($('#q-wa').href, '_blank', 'noopener'); });
$('#q-copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#q-msg').textContent); $('#q-copy').textContent = 'Copiato'; }
  catch (e) { $('#q-copy').textContent = 'Seleziona e copia il testo'; }
  setTimeout(() => { $('#q-copy').textContent = 'Copia il messaggio'; }, 2200);
});
refreshQuote();
let hiIdx = 0, hiUser = false;
function highlight(i) {
  $$('#sidewall span, #decode li').forEach(el => el.classList.toggle('hi', +el.dataset.i === i));
}
$('#decode').addEventListener('pointerover', e => { const li = e.target.closest('li[data-i]'); if (li) { hiUser = true; highlight(+li.dataset.i); } });
$('#decode').addEventListener('pointerleave', () => { hiUser = false; });
setInterval(() => {
  if (hiUser || activeScene !== 'gomme' || reduce) return;
  const n = $$('#sidewall span').length || 1;
  hiIdx = (hiIdx + 1) % n; highlight(hiIdx);
}, 1600);

/* vetrina: frecce, trascinamento, cerchi che girano mentre scorri */
{
  const rail = $('#rail');
  const step = () => (rail.querySelector('.rimcard')?.offsetWidth || 320) + 18;
  $('#v-prev').addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
  $('#v-next').addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
  let down = false, sx = 0, sl = 0, moved = false;
  rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; });
  addEventListener('pointermove', e => { if (!down) return; const d = e.clientX - sx; if (Math.abs(d) > 4) { moved = true; rail.classList.add('drag'); } rail.scrollLeft = sl - d; });
  addEventListener('pointerup', () => { if (!down) return; down = false; rail.classList.remove('drag'); });
  rail.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  let raf = 0;
  rail.addEventListener('scroll', () => {
    if (raf || reduce) return;
    raf = requestAnimationFrame(() => { raf = 0; rail.style.setProperty('--rot', (rail.scrollLeft * 0.35).toFixed(1) + 'deg'); });
  }, { passive: true });
}

/* ---------- scroll morbido ---------- */
let lenis = null, scrollVel = 0;
if (!reduce) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.stop();
  lenis.on('scroll', e => { scrollVel = e.velocity; ScrollTrigger.update(); });
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -64 }); }
  }));
}

/* ---------- stati della ruota per sezione ---------- */
const HP = -Math.PI / 2;
const SCENES = {
  hero:   { x: 0.56, y: 0.04, s: 0.98, yaw: HP + 0.48, pitch: 0.16, explode: 0, wearMix: 0, balMix: 0, toeMix: 0, laser: 0 },
  gomme:  { x: -0.46, y: 0, s: 1.12, yaw: HP + 1.05, pitch: 0.3, explode: 0, wearMix: 0, balMix: 0, toeMix: 0, laser: 0 },
  usura:  { x: 0.5, y: -0.04, s: 1.35, yaw: HP + 1.45, pitch: 0.62, explode: 0, wearMix: 1, balMix: 0, toeMix: 0, laser: 0 },
  cerchi: { x: -0.42, y: 0.02, s: 0.98, yaw: HP + 0.62, pitch: 0.22, explode: 1, wearMix: 0, balMix: 0, toeMix: 0, laser: 0 },
  vetrina:{ x: -1.9, y: 0.02, s: 0.98, yaw: HP + 0.3, pitch: 0.1, explode: 0, wearMix: 0, balMix: 0, toeMix: 0, laser: 0 },
  equil:  { x: 0.46, y: 0, s: 1.04, yaw: HP + 0.22, pitch: 0.06, explode: 0, wearMix: 0, balMix: 1, toeMix: 0, laser: 0 },
  conv:   { x: -0.42, y: 0.02, s: 0.95, yaw: 0, pitch: 1.18, explode: 0, wearMix: 0, balMix: 0, toeMix: 1, laser: 1 },
  servizi:{ x: 1.9, y: 0, s: 0.9, yaw: 0, pitch: 0.2, explode: 0, wearMix: 0, balMix: 0, toeMix: 0, laser: 0 }
};
const order = ['hero', 'gomme', 'usura', 'cerchi', 'vetrina', 'equil', 'conv', 'servizi'];
const state = { ...SCENES.hero, intro: reduce ? 0 : 1 };
const inner = { wear: 0, bal: 0, toe: 0, wearUser: null };

order.forEach((id, i) => {
  if (!i) return;
  const sec = document.getElementById(id === 'equil' ? 'equilibratura' : id === 'conv' ? 'convergenza' : id);
  gsap.fromTo(state, { ...SCENES[order[i - 1]] }, {
    ...SCENES[id], ease: 'none', immediateRender: false,
    scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 25%', scrub: reduce ? true : 0.8 }
  });
});
const prog = (id, key) => ScrollTrigger.create({
  trigger: '#' + id, start: 'top 45%', end: 'bottom 75%',
  onUpdate: s => { inner[key] = s.progress; }
});
prog('usura', 'wear'); prog('equilibratura', 'bal'); prog('convergenza', 'toe');

$('#wear').addEventListener('input', e => { inner.wearUser = +e.target.value / 100; });

/* letture dei numeri (scrive nel DOM solo quando un valore cambia) */
const out = { mm: $('#mm'), mmNote: $('#mm-note'), g: $('#grams'), toe: $('#toe-state'), toeBar: $('#toe-bar'), blocks: $$('#cut-blocks rect'), dial: $('#dial'), dialV: $('#dial-v'), car: $('#car'), wfl: $('#wfl'), wfr: $('#wfr'), wear: $('#wear') };
const last = {};
const put = (k, v, fn) => { if (last[k] !== v) { last[k] = v; fn(v); } };
function readouts(wear, bal, toeAmt) {
  const mm = Math.round((8 - 6.4 * wear) * 10) / 10;
  put('mm', mm, v => {
    const t = v.toFixed(1).replace('.', ',');
    out.mm.textContent = t;
    const lvl = v <= 1.65 ? 2 : v < 3 ? 1 : 0;
    out.mm.parentElement.dataset.lvl = lvl;
    out.mmNote.textContent = ['Gomma in buono stato', 'Meglio cambiarle presto', 'Limite di legge: vanno cambiate'][lvl];
    const h = v * 10;
    out.blocks.forEach(r => { r.setAttribute('y', 112 - h); r.setAttribute('height', h + 2); });
    if (document.activeElement !== out.wear) out.wear.value = Math.round(wear * 100);
    const txt = `Battistrada ${t} mm`;
    hudItems.forEach(hh => { if (hh.scene === 'usura' && hh.i === 0) { hh.el.textContent = txt; hh.w = 0; } });
  });
  const g = Math.round(35 * (1 - bal));
  put('g', g, v => {
    out.g.textContent = v;
    out.dialV.setAttribute('stroke-dashoffset', (100 - v / 35 * 100).toFixed(1));
    out.dial.dataset.ok = v === 0 ? 1 : 0;
    hudItems.forEach(hh => { if (hh.scene === 'equil' && hh.i === 1) { hh.el.textContent = `Squilibrio ${v} g`; hh.w = 0; } });
  });
  const toe = Math.round(toeAmt / 0.2 * 1000) / 1000;
  put('toe', toe, v => {
    const ok = v < 0.04;
    out.toe.textContent = ok ? 'In asse' : 'Fuori asse';
    out.toe.parentElement.dataset.ok = ok ? 1 : 0;
    out.car.dataset.ok = ok ? 1 : 0;
    out.toeBar.style.width = `${Math.max(0, 100 - v * 100)}%`;
    const deg = (v * 9).toFixed(2);
    out.wfl.setAttribute('transform', `rotate(${deg} 44 91)`);
    out.wfr.setAttribute('transform', `rotate(${-deg} 156 91)`);
  });
}

// i numeri e le grafiche delle sezioni seguono lo scroll, con o senza 3D
gsap.ticker.add(() => readouts(inner.wearUser ?? inner.wear, inner.bal, 0.2 * (1 - inner.toe)));

/* ---------- 3D ---------- */
let gpuFailed = false;
addEventListener('unhandledrejection', e => { if (gpuFailed && /popErrorScope|Device|GPU/i.test(String(e.reason && e.reason.message || e.reason))) e.preventDefault(); });
async function start3D(forceWebGL = false) {
  const ac = new AbortController();
  try { await Promise.race([document.fonts.load('900 64px Archivo'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  const canvas = $('#scene');
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, alpha: true, forceWebGL });
  await renderer.init();
  // se la scheda video cede con WebGPU, si riparte da sola con WebGL2
  function fallback(why) {
    if (gpuFailed || forceWebGL) return;
    gpuFailed = true;
    console.warn('WebGPU non stabile, passo a WebGL2:', why);
    ac.abort();
    renderer.setAnimationLoop(null);
    try { renderer.dispose(); } catch (e) {}
    const fresh = canvas.cloneNode(false);
    canvas.replaceWith(fresh);
    let tries = 0;
    const retry = () => start3D(true).catch(err => (++tries < 4 ? setTimeout(retry, 700 * tries) : no3D(err)));
    setTimeout(retry, 300);
  }
  if (renderer.backend.isWebGPUBackend && renderer.backend.device) {
    const dev = renderer.backend.device;
    dev.lost.then(info => fallback(info && info.message));
    dev.addEventListener('uncapturederror', e => fallback(e.error && e.error.message));
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  document.documentElement.dataset.gpu = renderer.backend.isWebGPUBackend ? 'webgpu' : 'webgl2';

  const scene = new THREE.Scene();
  scene.environment = studioEnv(COLORS);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 6);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-3, 4, 5); scene.add(key);
  const rimL = new THREE.DirectionalLight(0xfff2d0, 3.2); rimL.position.set(4, 3, -4); scene.add(rimL);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6); fill.position.set(3, -2, 4); scene.add(fill);

  const W = buildWheel(COLORS);
  scene.add(W.pivot);

  // linee laser della convergenza (TSL: trattini che scorrono, rosso -> giallo quando è in asse)
  const align = uniform(0);
  const dash = sin(uv().x.mul(90).sub(time.mul(9))).mul(0.5).add(0.5);
  const laserMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  laserMat.colorNode = mix(color(COLORS.r), color(COLORS.y), align);
  laserMat.opacityNode = dash.mul(0.55).add(0.45);
  const laser = new THREE.Mesh(new THREE.BoxGeometry(5, 0.018, 0.018), laserMat);
  laser.geometry.rotateY(Math.PI / 2);
  laser.position.set(-1.07, 0, 0);
  W.pivot.add(laser);
  const refMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  refMat.colorNode = vec3(1, 1, 1);
  refMat.opacityNode = float(0.35);
  const ref = new THREE.Mesh(new THREE.BoxGeometry(6, 0.008, 0.008), refMat);
  ref.geometry.rotateY(Math.PI / 2);
  const refPivot = new THREE.Group();
  ref.position.set(-1.07, 0, 0);
  refPivot.add(ref);
  scene.add(refPivot);

  // ombra morbida sotto la ruota
  const sc = document.createElement('canvas'); sc.width = sc.height = 256;
  const sg = sc.getContext('2d');
  const rg = sg.createRadialGradient(128, 128, 0, 128, 128, 128);
  rg.addColorStop(0, 'rgba(0,0,0,0.55)'); rg.addColorStop(0.55, 'rgba(0,0,0,0.18)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  sg.fillStyle = rg; sg.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.renderOrder = -1;
  scene.add(shadow);

  const pv = new THREE.Vector3(), pc = new THREE.Vector3();
  function placeHud() {
    if (mobile) return;
    W.pivot.updateMatrixWorld(true);
    pc.copy(W.pivot.position).project(camera);
    const cx = (pc.x + 1) / 2 * vw, cy = (1 - pc.y) / 2 * vh;
    hudItems.forEach(h => {
      if (h.scene !== activeScene && !h.el.classList.contains('was')) return;
      pv.copy(W.anchors[h.anchor]);
      if (h.anchor === 'tread' || h.anchor === 'treadSide' || h.anchor === 'side') pv.y -= state.explode * 0.95;
      else pv.y += state.explode * 0.32;
      pv.applyMatrix4(W.pivot.matrixWorld).project(camera);
      const px = (pv.x + 1) / 2 * vw, py = (1 - pv.y) / 2 * vh;
      let dx = px - cx, dy = py - cy;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const sx = dx >= 0 ? 1 : -1;
      const ex = px + dx * 56, ey = Math.max(104, Math.min(vh - 60, py + dy * 56));
      const tx = ex + sx * 22;
      h.pl.setAttribute('points', `${px.toFixed(1)},${py.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)} ${tx.toFixed(1)},${ey.toFixed(1)}`);
      h.dot.setAttribute('cx', px.toFixed(1)); h.dot.setAttribute('cy', py.toFixed(1));
      const w = h.w || (h.w = h.el.offsetWidth);
      let lx = sx > 0 ? tx + 8 : tx - 8 - w;
      lx = Math.max(12, Math.min(vw - 12 - w, lx));
      h.el.style.transform = `translate(${lx.toFixed(1)}px, ${(ey - 15).toFixed(1)}px)`;
    });
  }

  let vw = 1, vh = 1, mobile = false, onScreen = true;
  new IntersectionObserver(es => { onScreen = es[0].isIntersecting; }).observe(canvas);
  function resize() {
    vw = canvas.clientWidth || innerWidth; vh = canvas.clientHeight || innerHeight; mobile = vw < 900;
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.35 : 2));
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize, { signal: ac.signal });

  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', e => { mouse.x = e.clientX / vw * 2 - 1; mouse.y = e.clientY / vh * 2 - 1; }, { passive: true, signal: ac.signal });


  const qx = new THREE.Quaternion(), qy = new THREE.Quaternion(), qz = new THREE.Quaternion();
  const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
  let spin = 0, prevX = null, wasHidden = false, lastWear = -1, clock = performance.now();

  // prepara tutto prima di mostrare la pagina: niente scatti al primo movimento
  laser.visible = ref.visible = true;
  W.weights.scale.setScalar(1);
  W.pivot.position.set(0, 0, 0); W.pivot.scale.setScalar(1);
  try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); } catch (e) {}
  renderer.render(scene, camera);
  await new Promise(r => requestAnimationFrame(r));
  renderer.render(scene, camera);
  W.weights.scale.setScalar(0.001);
  clock = performance.now();

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - clock) / 1000); clock = now;
    const H = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const HW = H * camera.aspect;

    mouse.sx += (mouse.x - mouse.sx) * 0.05; mouse.sy += (mouse.y - mouse.sy) * 0.05;

    let x, y, s;
    const off = Math.abs(state.x) > 1;
    if (mobile) {
      x = 0; y = -H * 0.02;
      s = Math.min(HW, H) * 0.86 * (state.s / SCENES.hero.s) ** 0.5;
    } else {
      x = state.x * HW; y = state.y * H; s = state.s * Math.min(1, H * 0.62);
    }
    x -= state.intro * HW * 1.9;
    const hidden = !onScreen || (!mobile && Math.abs(x) - s * 1.2 > HW);
    if (hidden && wasHidden) { prevX = x; return; }
    wasHidden = hidden;

    // rotolamento: la ruota gira davvero quando si sposta, più la velocità dello scroll
    if (prevX !== null) spin -= (x - prevX) / (s * 1.04);
    prevX = x;
    const balMix = state.balMix;
    if (!reduce) spin += dt * (0.25 * (1 - balMix) + 16 * balMix * (1 - inner.bal * 0.35)) + scrollVel * 0.0025 * (1 - balMix);

    const wear = inner.wearUser !== null ? inner.wearUser : inner.wear;
    const wearEff = state.wearMix * wear;
    if (Math.abs(wearEff - lastWear) > 0.004) { W.setWear(1 - wearEff * 0.8); lastWear = wearEff; }

    const wob = reduce ? 0 : balMix * (1 - inner.bal);
    const toeAmt = state.toeMix * 0.2 * (1 - inner.toe);

    const yaw = state.yaw + mouse.sx * 0.22 * (1 - state.toeMix) + toeAmt;
    const pitch = state.pitch + mouse.sy * 0.12;
    qx.setFromAxisAngle(X, pitch); qy.setFromAxisAngle(Y, yaw); qz.setFromAxisAngle(Z, HP);
    W.pivot.quaternion.copy(qx).multiply(qy).multiply(qz);
    W.pivot.position.set(x, y + Math.sin(now / 900) * 0.025 * (1 - balMix), 0);
    W.pivot.scale.setScalar(s);

    W.spinner.rotation.y = spin;
    W.spinner.position.set(Math.cos(spin) * 0.035 * wob, 0, Math.sin(spin) * 0.035 * wob);
    W.pivot.rotation.z += Math.sin(spin) * 0.03 * wob;

    W.tyre.position.y = -state.explode * 0.95;
    W.rim.position.y = state.explode * 0.32;
    W.rim.rotation.y = state.explode * 0.4;
    W.caliper.visible = state.explode < 0.5;
    W.weights.scale.setScalar(Math.max(0.001, balMix * inner.bal));

    laser.visible = ref.visible = state.laser > 0.02;
    laser.scale.set(1, state.laser, state.laser);
    align.value = Math.max(0, 1 - toeAmt / 0.03);
    qy.setFromAxisAngle(Y, state.yaw);
    refPivot.quaternion.copy(qx).multiply(qy).multiply(qz);
    refPivot.position.copy(W.pivot.position);
    refPivot.scale.setScalar(s * state.laser);

    const sh = Math.max(0, 1 - state.laser) * (1 - state.balMix * 0.6) * (1 - state.wearMix);
    shadow.visible = sh > 0.02;
    shadow.material.opacity = sh * 0.9;
    shadow.position.set(x, y - s * 1.06, -0.4);
    shadow.scale.set(s * 2.6, s * 0.5, 1);

    scrollVel *= 0.9;
    renderer.render(scene, camera);
    placeHud();
  });
  document.documentElement.classList.add('has3d');
}

function no3D(err) {
  console.warn('3D non disponibile:', err);
  document.documentElement.classList.remove('has3d');
  document.documentElement.classList.add('no3d');
}
/* ---------- ingresso: il manometro gonfia la gomma, poi si apre la pagina ---------- */
const intro = $('#intro');
const mano = { p: 0 };
const needle = $('#mano-needle'), fillArc = $('#mano-fill'), psi = $('#psi');
function drawMano() {
  needle.setAttribute('transform', `rotate(${(-120 + 240 * mano.p).toFixed(2)} 120 120)`);
  fillArc.setAttribute('stroke-dashoffset', (100 - mano.p * 100).toFixed(2));
  psi.textContent = (mano.p * 4).toFixed(1).replace('.', ',');
}
const t0 = performance.now();
let seen = false;
try { seen = sessionStorage.getItem('pg-intro') === '1'; sessionStorage.setItem('pg-intro', '1'); } catch (e) {}
if (seen && intro) { intro.remove(); lenis && lenis.start(); }
const pre = reduce || seen || !intro ? null : gsap.to(mano, { p: 0.45, duration: 0.6, ease: 'power2.out', onUpdate: drawMano });
let revealed = false;
function startShow() {
  document.documentElement.classList.add('go');
  if (reduce) { state.intro = 0; return; }
  gsap.to(state, { intro: 0, duration: 1.3, ease: 'power3.out' });
  if (seen) return;
  gsap.to('.hero .copy > *', { y: 0, opacity: 1, duration: 0.7, stagger: 0.05, ease: 'power3.out', clearProps: 'transform,opacity' });
  gsap.to('.strip > *', { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, delay: 0.2, ease: 'power3.out', clearProps: 'transform,opacity' });
  gsap.to('.navbar', { y: 0, opacity: 1, duration: 0.6, delay: 0.1, ease: 'power3.out', clearProps: 'transform,opacity' });
  gsap.fromTo('#hud', { opacity: 0 }, { opacity: 1, duration: 0.5, delay: 1 });
}
function reveal() {
  if (revealed) return;
  revealed = true;
  if (reduce || seen || !intro) { if (!seen && intro) intro.remove(); lenis && lenis.start(); startShow(); return; }
  const wait = Math.max(0, 450 - (performance.now() - t0)) / 1000;
  const maxR = Math.hypot(innerWidth, innerHeight);
  gsap.set('.hero .copy > *', { y: 34, opacity: 0 });
  gsap.set('.strip > *', { y: 24, opacity: 0 });
  gsap.set('.navbar', { y: -30, opacity: 0 });
  gsap.timeline({ delay: wait })
    .add(() => pre && pre.kill())
    .to(mano, { p: 0.575, duration: 0.4, ease: 'back.out(1.7)', onUpdate: drawMano })
    .add(() => { intro.classList.add('ok'); $('#mano-txt').textContent = 'Pressione giusta, partiamo!'; })
    .to(intro, { '--r': maxR + 'px', duration: 0.7, ease: 'power3.inOut' }, '+=0.12')
    .add(startShow, '-=0.5')
    .add(() => { intro.remove(); lenis && lenis.start(); ScrollTrigger.refresh(); });
}
history.scrollRestoration = 'manual';
scrollTo(0, 0);
setTimeout(reveal, 3500);
start3D().then(reveal).catch(err => { no3D(err); reveal(); });
