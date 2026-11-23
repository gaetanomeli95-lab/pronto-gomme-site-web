// Ruota procedurale: pneumatico + cerchio in lega + disco + pinza. Nessun modello esterno.
import * as THREE from 'three/webgpu';

const R = 1.0;          // raggio esterno battistrada (fondo scanalature)
const TREAD = 0.03;     // profondità battistrada nuovo

function arcText(ctx, text, cx, cy, r, center, size, upright) {
  ctx.font = `900 ${size}px Archivo, Arial Black, sans-serif`;
  try { ctx.fontStretch = 'expanded'; } catch (e) {}
  const chars = [...text];
  const widths = chars.map(c => ctx.measureText(c).width + size * 0.06);
  const total = widths.reduce((a, b) => a + b, 0);
  const span = total / r;
  let a = upright ? center + span / 2 : center - span / 2;
  chars.forEach((c, i) => {
    const step = widths[i] / r;
    const mid = upright ? a - step / 2 : a + step / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(mid) * r, cy + Math.sin(mid) * r);
    ctx.rotate(upright ? mid - Math.PI / 2 : mid + Math.PI / 2);
    ctx.fillText(c, 0, 0);
    ctx.restore();
    a += upright ? -step : step;
  });
}

function sidewallTexture(colors) {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const ctx = c.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const k = 512 / 0.965; // px per unità
  ctx.fillStyle = colors.y;
  arcText(ctx, 'PRONTO GOMME', 512, 512, 0.875 * k, -Math.PI / 2, 56, false);
  ctx.fillStyle = '#d9d9d9';
  arcText(ctx, 'CONVERGENZA · EQUILIBRATURA', 512, 512, 0.875 * k, Math.PI / 2, 28, true);
  ctx.fillStyle = '#bdbdbd';
  arcText(ctx, '245/35 R19 93Y', 512, 512, 0.875 * k, 0.02, 26, false);
  arcText(ctx, 'PALERMO', 512, 512, 0.875 * k, Math.PI + 0.02, 26, false);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function capTexture(colors) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#121212';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = colors.y;
  ctx.beginPath(); ctx.arc(128, 128, 112, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.font = '900 104px Archivo, Arial Black, sans-serif';
  try { ctx.fontStretch = 'expanded'; } catch (e) {}
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('PG', 128, 136);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildWheel(colors) {
  const rubber = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.8, metalness: 0, side: THREE.DoubleSide });
  const rubberBlock = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.72, metalness: 0 });
  // cerchio bicolore: facce "diamantate" lucide + fianchi nero lucido
  const machined = new THREE.MeshPhysicalMaterial({ color: 0xd6d9de, metalness: 1, roughness: 0.16, clearcoat: 0.5, clearcoatRoughness: 0.1 });
  const gloss = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0c, metalness: 0.35, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06 });
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x1d1e21, metalness: 0.8, roughness: 0.42, side: THREE.DoubleSide });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9a9da3, metalness: 1, roughness: 0.34 });
  const discMat = new THREE.MeshStandardMaterial({ color: 0x7d8086, metalness: 1, roughness: 0.48 });
  const caliperMat = new THREE.MeshPhysicalMaterial({ color: colors.r, roughness: 0.28, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.06 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: colors.r, roughness: 0.35, metalness: 0.2, emissive: colors.r, emissiveIntensity: 0.25 });

  const tyre = new THREE.Group();
  const rim = new THREE.Group();
  const spinner = new THREE.Group();
  spinner.add(tyre, rim);

  // --- pneumatico ribassato (profilo raggio/asse) ---
  const half = [
    [0.742, 0.255], [0.77, 0.293], [0.83, 0.312], [0.9, 0.314], [0.948, 0.302],
    [0.978, 0.276], [0.995, 0.244], [1.0, 0.212]
  ];
  const ctrl = [];
  half.forEach(([r, y]) => ctrl.push(new THREE.Vector2(r, -y)));
  [...half].reverse().forEach(([r, y]) => ctrl.push(new THREE.Vector2(r, y)));
  const prof = new THREE.SplineCurve(ctrl).getPoints(90);
  tyre.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 180), rubber));
  tyre.add(new THREE.Mesh(new THREE.CylinderGeometry(0.743, 0.743, 0.51, 96, 1, true), rubber));

  // --- battistrada a blocchi (instanced) ---
  const N = 72;
  const ribs = [
    { y0: -0.212, y1: -0.15, slant: 0.1, len: 0.8, off: 0 },
    { y0: -0.125, y1: -0.062, slant: 0.38, len: 0.86, off: 0.33 },
    { y0: -0.036, y1: 0.036, slant: 0, len: 0.985, off: 0 },
    { y0: 0.062, y1: 0.125, slant: -0.38, len: 0.86, off: 0.66 },
    { y0: 0.15, y1: 0.212, slant: -0.1, len: 0.8, off: 0.5 }
  ];
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), rubberBlock, N * ribs.length);
  const pitch = (Math.PI * 2 * R) / N;
  const m = new THREE.Matrix4(), basis = new THREE.Matrix4(), rot = new THREE.Matrix4(), sc = new THREE.Matrix4(), tr = new THREE.Matrix4();
  const t = new THREE.Vector3(), rr = new THREE.Vector3(), ax = new THREE.Vector3(0, 1, 0);
  function setWear(depthFactor) {
    const h = Math.max(0.005, TREAD * depthFactor);
    let i = 0;
    ribs.forEach(rb => {
      for (let k = 0; k < N; k++) {
        const th = ((k + rb.off) / N) * Math.PI * 2;
        t.set(-Math.sin(th), 0, Math.cos(th));
        rr.set(Math.cos(th), 0, Math.sin(th));
        basis.makeBasis(t, rr, ax);
        rot.makeRotationY(rb.slant);
        sc.makeScale(pitch * rb.len, h, rb.y1 - rb.y0);
        tr.makeTranslation(rr.x * (R + h / 2 - 0.002), (rb.y0 + rb.y1) / 2, rr.z * (R + h / 2 - 0.002));
        m.copy(tr).multiply(basis).multiply(rot).multiply(sc);
        blocks.setMatrixAt(i++, m);
      }
    });
    blocks.instanceMatrix.needsUpdate = true;
  }
  setWear(1);
  tyre.add(blocks);

  // scritte sul fianco
  const sideTex = sidewallTexture(colors);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.785, 0.965, 160, 1),
    new THREE.MeshStandardMaterial({ map: sideTex, transparent: true, roughness: 0.6, metalness: 0, depthWrite: false })
  );
  ring.geometry.rotateX(-Math.PI / 2);
  ring.position.y = 0.318;
  tyre.add(ring);

  // --- cerchio 5 razze a Y, concavo, bicolore ---
  const RR = 0.745;
  rim.add(new THREE.Mesh(new THREE.CylinderGeometry(RR - 0.012, RR - 0.012, 0.5, 96, 1, true), barrelMat));

  const shapes = [];
  const spoke = [[0.17, -0.085], [0.4, -0.052], [0.6, -0.205], [0.635, -0.118], [0.455, 0], [0.635, 0.118], [0.6, 0.205], [0.4, 0.052], [0.17, 0.085]];
  const twist = 0.32;
  for (let i = 0; i < 5; i++) {
    const a0 = (i / 5) * Math.PI * 2;
    const sh = new THREE.Shape();
    spoke.forEach(([x, y], j) => {
      const r = Math.hypot(x, y);
      const a = Math.atan2(y, x) + a0 + twist * Math.max(0, r - 0.17) / 0.5;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      j ? sh.lineTo(px, py) : sh.moveTo(px, py);
    });
    sh.closePath();
    shapes.push(sh);
  }
  const flange = new THREE.Shape();
  flange.absarc(0, 0, RR, 0, Math.PI * 2, false);
  const fh = new THREE.Path(); fh.absarc(0, 0, 0.632, 0, Math.PI * 2, true); flange.holes.push(fh);

  const spokeGeo = new THREE.ExtrudeGeometry(shapes, { depth: 0.055, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 8 });
  spokeGeo.rotateX(-Math.PI / 2);
  const p = spokeGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getZ(i));
    p.setY(i, p.getY(i) - 0.2 * Math.max(0, 1 - r / 0.64) ** 1.2);
  }
  spokeGeo.computeVertexNormals();
  const spokes = new THREE.Mesh(spokeGeo, [machined, gloss]);
  spokes.position.y = 0.19;
  rim.add(spokes);

  const flangeGeo = new THREE.ExtrudeGeometry(flange, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.008, bevelSegments: 2, curveSegments: 120 });
  flangeGeo.rotateX(-Math.PI / 2);
  const flangeMesh = new THREE.Mesh(flangeGeo, [gloss, gloss]);
  flangeMesh.position.y = 0.195;
  rim.add(flangeMesh);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(RR - 0.004, 0.014, 10, 140), machined);
  lip.rotation.x = Math.PI / 2; lip.position.y = 0.262;
  rim.add(lip);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.69, 0.0055, 6, 140), stripeMat);
  stripe.rotation.x = Math.PI / 2; stripe.position.y = 0.26;
  rim.add(stripe);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.215, 0.1, 48), gloss);
  hub.position.y = 0.1;
  rim.add(hub);
  const capTex = capTexture(colors);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.098, 48), new THREE.MeshStandardMaterial({ map: capTex, emissiveMap: capTex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0 }));
  cap.rotation.x = -Math.PI / 2; cap.position.y = 0.153;
  rim.add(cap);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 5;
    const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.04, 6), steel);
    nut.position.set(Math.cos(a) * 0.145, 0.16, Math.sin(a) * 0.145);
    rim.add(nut);
  }

  // contrappesi per l'equilibratura
  const weights = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.028, 0.045), steel);
    const a = 2.2 + i * 0.1;
    w.position.set(Math.cos(a) * (RR - 0.04), 0.05, Math.sin(a) * (RR - 0.04));
    w.rotation.y = -a;
    weights.add(w);
  }
  weights.scale.setScalar(0.001);
  rim.add(weights);

  // --- freno: disco forato + pinza rossa ---
  const ds = new THREE.Shape();
  ds.absarc(0, 0, 0.6, 0, Math.PI * 2, false);
  const dh = new THREE.Path(); dh.absarc(0, 0, 0.3, 0, Math.PI * 2, true); ds.holes.push(dh);
  [0.4, 0.465, 0.53].forEach((r, ri) => {
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2 + ri * 0.09;
      const h = new THREE.Path(); h.absarc(Math.cos(a) * r, Math.sin(a) * r, 0.012, 0, Math.PI * 2, true);
      ds.holes.push(h);
    }
  });
  const discGeo = new THREE.ExtrudeGeometry(ds, { depth: 0.03, bevelEnabled: false, curveSegments: 6 });
  discGeo.rotateX(-Math.PI / 2);
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.position.y = -0.09;
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 48), new THREE.MeshStandardMaterial({ color: 0x2a2b2e, metalness: 0.7, roughness: 0.5 }));
  hat.position.y = -0.05;
  spinner.add(disc, hat);
  const caliper = new THREE.Mesh(new THREE.TorusGeometry(0.565, 0.075, 16, 40, 1.05), caliperMat);
  caliper.rotation.x = Math.PI / 2;
  caliper.rotation.z = -Math.PI * 0.64;
  caliper.scale.z = 1.5;
  caliper.position.y = -0.02;

  const pivot = new THREE.Group();
  pivot.add(spinner, caliper);

  // punti di riferimento (coordinate della ruota, non girano) per le etichette
  const anchors = {
    tread: new THREE.Vector3(-1.02, 0, 0),
    treadSide: new THREE.Vector3(-0.72, 0.21, 0.72),
    side: new THREE.Vector3(0.62, 0.33, -0.62),
    rim: new THREE.Vector3(0.49, 0.27, 0.49),
    hub: new THREE.Vector3(0, 0.16, 0),
    nuts: new THREE.Vector3(-0.1, 0.17, 0.1),
    caliper: new THREE.Vector3(Math.cos(-Math.PI * 0.64 + 0.5) * 0.56, 0.02, Math.sin(-Math.PI * 0.64 + 0.5) * 0.56),
    weights: new THREE.Vector3(Math.cos(2.35) * 0.7, 0.05, Math.sin(2.35) * 0.7)
  };

  return { pivot, spinner, tyre, rim, weights, caliper, disc, setWear, sideTex, anchors };
}

// ambiente da studio disegnato a mano: due softbox, strisce laterali e un riflesso giallo
export function studioEnv(colors) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#7a7a7a'); grd.addColorStop(0.45, '#3a3a3a'); grd.addColorStop(0.62, '#1c1c1c'); grd.addColorStop(1, '#0c0c0c');
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 512);
  g.filter = 'blur(10px)';
  g.fillStyle = '#ffffff';
  g.fillRect(330, 40, 360, 70);
  g.fillRect(90, 120, 46, 260);
  g.fillRect(880, 140, 36, 220);
  g.fillStyle = '#bfbfbf';
  g.fillRect(560, 170, 200, 40);
  g.globalAlpha = 0.55;
  g.fillStyle = colors.y;
  g.fillRect(0, 340, 1024, 16);
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
