import * as THREE from 'three';
import { PALETTE, KEYS, PADS_LEFT, PADS_RIGHT, LED } from './config.js';
import { makePadLabel, makeTitleText, makeFootLabel } from './textures.js';

/** Top surface of the shell (yellow disc). */
export const BOARD_TOP = 0.14;
/** Top surface of the raised plate that carries the matrix and buttons. */
export const PLATE_TOP = 0.165;

const GREEN = '#3fa535';
const GREEN_DARK = '#2f7d2a';
const BROWN = '#6a4416';
const YELLOW = '#f4b52e';
const MUSTARD = '#e59d1c';

function shadow(m) {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Rounded rectangle slab lying flat, bottom at y=0. */
export function roundedSlab(w, d, r, thickness, material, { bevel = 0.012 } = {}) {
  const s = new THREE.Shape();
  const hw = w / 2, hd = d / 2;
  s.moveTo(-hw + r, -hd);
  s.lineTo(hw - r, -hd);
  s.quadraticCurveTo(hw, -hd, hw, -hd + r);
  s.lineTo(hw, hd - r);
  s.quadraticCurveTo(hw, hd, hw - r, hd);
  s.lineTo(-hw + r, hd);
  s.quadraticCurveTo(-hw, hd, -hw, hd - r);
  s.lineTo(-hw, -hd + r);
  s.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.002, thickness - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 10 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  return shadow(new THREE.Mesh(g, material));
}

export function createBoard() {
  const group = new THREE.Group();
  group.name = 'board';
  const parts = {};
  const pickables = [];

  const greenMat = new THREE.MeshStandardMaterial({ color: GREEN, roughness: 0.62 });
  const greenDarkMat = new THREE.MeshStandardMaterial({ color: GREEN_DARK, roughness: 0.62 });
  const brownMat = new THREE.MeshStandardMaterial({ color: BROWN, roughness: 0.7 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: YELLOW, roughness: 0.6 });
  const mustardMat = new THREE.MeshStandardMaterial({ color: MUSTARD, roughness: 0.6 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: '#fbfaf6', roughness: 0.45 });
  const blackMat = new THREE.MeshStandardMaterial({ color: '#1e1b18', roughness: 0.5 });
  const goldMat = new THREE.MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.32, metalness: 0.85 });
  const metalMat = new THREE.MeshStandardMaterial({ color: PALETTE.metal, roughness: 0.3, metalness: 0.9 });
  const labelMat = (tex) => new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const flat = (mesh, y) => {
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y;
    return mesh;
  };

  // --- shell -------------------------------------------------------------
  const rim = shadow(new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.66, 0.09, 72), brownMat));
  rim.position.y = 0.045;
  const top = shadow(new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.05, 72), yellowMat));
  top.position.y = 0.115;
  group.add(rim, top);
  // segment lines on the shell
  const seg = new THREE.Mesh(new THREE.TorusGeometry(1.34, 0.012, 6, 90), brownMat);
  flat(seg, BOARD_TOP + 0.002);
  group.add(seg);

  // raised plate carrying the matrix, d-pad and X/Y
  const plateEdge = roundedSlab(2.42, 1.62, 0.34, 0.012, brownMat, { bevel: 0.004 });
  plateEdge.position.set(0, BOARD_TOP, -0.36);
  const plate = roundedSlab(2.3, 1.5, 0.3, 0.014, mustardMat, { bevel: 0.004 });
  plate.position.set(0, BOARD_TOP + 0.011, -0.36);
  group.add(plateEdge, plate);

  const title = flat(new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), labelMat(makeTitleText())), PLATE_TOP + 0.003);
  title.position.set(0, PLATE_TOP + 0.003, -0.86);
  group.add(title);

  // --- head, neck, hat ---------------------------------------------------
  const headG = new THREE.Group();
  const neck = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.14, 24), greenMat));
  neck.position.set(0, 0.07, -1.5);
  const head = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.62, 40, 28), greenMat));
  head.scale.set(1, 0.5, 0.88);
  head.position.set(0, 0.14, -1.98);
  headG.add(neck, head);
  [-1, 1].forEach((s) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), whiteMat);
    eye.scale.set(1, 0.5, 1);
    eye.position.set(s * 0.23, 0.4, -1.95);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), blackMat);
    pupil.scale.set(1, 0.5, 1);
    pupil.position.set(s * 0.21, 0.475, -1.9);
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), whiteMat);
    spark.position.set(s * 0.19, 0.505, -1.92);
    const cheek = flat(new THREE.Mesh(new THREE.CircleGeometry(0.09, 20), new THREE.MeshStandardMaterial({ color: '#f07b7b', roughness: 0.8 })), 0.36);
    cheek.position.set(s * 0.46, 0.33, -1.84);
    headG.add(eye, pupil, spark, cheek);
  });
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 8, 24, Math.PI), blackMat);
  smile.rotation.set(-Math.PI / 2, 0, Math.PI);
  smile.position.set(0, 0.415, -1.7);
  headG.add(smile);
  const hatMat = new THREE.MeshStandardMaterial({ color: '#e6cfa3', roughness: 0.85 });
  const brim = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.62, 0.05, 40), hatMat));
  brim.position.set(0, 0.52, -2.1);
  brim.rotation.x = -0.55;
  const crown = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.32, 32), hatMat));
  crown.position.set(0, 0.68, -2.2);
  crown.rotation.x = -0.55;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 8, 40), brownMat);
  band.rotation.x = Math.PI / 2 - 0.55;
  band.position.set(0, 0.58, -2.15);
  headG.add(brim, crown, band);
  group.add(headG);

  // --- arms with pads ----------------------------------------------------
  const pads = {};
  const armMeshes = [];
  const makeArm = (side, keysBaseToTip) => {
    const s = side; // -1 left, +1 right
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 1.25, 0, 0.35),
      new THREE.Vector3(s * 1.8, 0, -0.15),
      new THREE.Vector3(s * 2.1, 0, -0.85),
      new THREE.Vector3(s * 2.2, 0, -1.6),
    ]);
    const tube = shadow(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.3, 18, false), greenMat));
    tube.scale.y = 0.3;
    tube.position.y = 0.09;
    const capA = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 12), greenMat);
    capA.scale.y = 0.3;
    capA.position.copy(curve.getPointAt(1)).setY(0.09);
    capA.castShadow = true;
    group.add(tube, capA);
    armMeshes.push(tube);
    keysBaseToTip.forEach((key, i) => {
      const t = 0.12 + i * 0.2;
      const p = curve.getPointAt(t);
      const isGnd = key.startsWith('gnd');
      const g = new THREE.Group();
      g.position.set(p.x, 0.18, p.z);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.02, 32), isGnd ? greenDarkMat.clone() : whiteMat.clone());
      core.position.y = 0.01;
      core.castShadow = true;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.012, 8, 40), isGnd ? whiteMat : greenDarkMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.02;
      const label = flat(new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), labelMat(makePadLabel(KEYS[key].short, { fg: isGnd ? '#ffffff' : GREEN_DARK }))), 0.022);
      const glow = flat(new THREE.Mesh(new THREE.RingGeometry(0.15, 0.25, 40), new THREE.MeshBasicMaterial({ color: PALETTE.led, transparent: true, opacity: 0, depthWrite: false })), 0.004);
      g.add(core, ring, label, glow);
      core.userData.pick = { type: 'pad', key };
      ring.userData.pick = core.userData.pick;
      pickables.push(core, ring);
      group.add(g);
      pads[key] = { group: g, core, ring, glow, heat: 0, top: () => new THREE.Vector3(p.x, 0.21, p.z) };
    });
  };
  makeArm(-1, PADS_LEFT);
  makeArm(1, PADS_RIGHT);
  parts.arms = new THREE.Group();
  parts.arms.userData.meshes = armMeshes;
  parts.arms.userData.pads = pads;

  // --- LED matrix (on the plate) -----------------------------------------
  const matrixG = new THREE.Group();
  const leds = [];
  const ledGeo = new THREE.BoxGeometry(0.085, 0.03, 0.085);
  for (let r = 0; r < 5; r++) {
    leds[r] = [];
    for (let c = 0; c < 5; c++) {
      const m = new THREE.Mesh(ledGeo, new THREE.MeshStandardMaterial({ color: PALETTE.ledOff, roughness: 0.4, emissive: PALETTE.led, emissiveIntensity: 0 }));
      m.position.set(-0.28 + c * 0.14, PLATE_TOP + 0.015, -0.68 + r * 0.14);
      m.userData.on = false;
      matrixG.add(m);
      leds[r][c] = m;
    }
  }
  group.add(matrixG);
  parts.matrix = matrixG;
  parts.matrix.userData.meshes = [plate];

  // --- d-pad and X / Y (white discs) --------------------------------------
  const funcG = new THREE.Group();
  const dpad = {};
  const disc = (x, z, r, text, fg, pick) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.03, 32), whiteMat.clone());
    m.position.set(x, PLATE_TOP + 0.015, z);
    m.castShadow = true;
    const l = flat(new THREE.Mesh(new THREE.PlaneGeometry(r * 1.5, r * 1.5), labelMat(makePadLabel(text, { fg }))), 0.017);
    m.add(l);
    if (pick) {
      m.userData.pick = pick;
      pickables.push(m);
    }
    funcG.add(m);
    return m;
  };
  [['up', 0, -1, '▲'], ['down', 0, 1, '▼'], ['left', -1, 0, '◀'], ['right', 1, 0, '▶']].forEach(([k, dx, dz, glyph]) => {
    dpad[k] = disc(-0.78 + dx * 0.21, -0.42 + dz * 0.21, 0.09, glyph, '#1e1b18', { type: 'dpad', key: k });
  });
  const btnX = disc(0.72, -0.58, 0.11, 'X', '#1e1b18', { type: 'fn', key: 'X' });
  const btnY = disc(0.98, -0.22, 0.11, 'Y', '#1e1b18', { type: 'fn', key: 'Y' });
  group.add(funcG);
  parts.func = funcG;
  parts.func.userData.meshes = [];

  // --- piano (lower shell) ------------------------------------------------
  const pianoG = new THREE.Group();
  const pianoKeys = [];
  const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];
  const NOTE_TR = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do'];
  const NOTE_FREQ = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
  const KW = 0.31, KD = 0.92, KZ = 0.86;
  for (let i = 0; i < 8; i++) {
    const x = -1.085 + i * KW;
    const k = new THREE.Mesh(new THREE.BoxGeometry(KW - 0.025, 0.05, KD), whiteMat.clone());
    k.position.set(x, BOARD_TOP + 0.025, KZ);
    k.castShadow = true;
    const l = flat(new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), labelMat(makePadLabel(NOTE_NAMES[i], { fg: '#1e1b18' }))), 0.026);
    l.position.z = 0.34;
    k.add(l);
    k.userData.pick = { type: 'piano', index: i, note: `${NOTE_NAMES[i]} · ${NOTE_TR[i]}`, freq: NOTE_FREQ[i] };
    pickables.push(k);
    pianoG.add(k);
    pianoKeys.push(k);
  }
  [0, 1, 3, 4, 5].forEach((i) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.5), blackMat);
    b.position.set(-1.085 + i * KW + KW / 2, BOARD_TOP + 0.035, KZ - 0.21);
    b.castShadow = true;
    pianoG.add(b);
  });
  group.add(pianoG);
  parts.piano = pianoG;
  parts.piano.userData.meshes = [];

  // --- feet with pin headers ------------------------------------------------
  const pinsG = new THREE.Group();
  const pinLabels = [];
  const makeFoot = (side, kind, label) => {
    const foot = roundedSlab(0.62, 0.56, 0.2, 0.1, greenMat);
    foot.position.set(side * 1.32, 0, 1.3);
    foot.rotation.y = -side * 0.35;
    const icon = flat(new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), labelMat(makeFootLabel(kind))), 0.104);
    icon.position.x = side * 0.1;
    icon.position.z = 0.02;
    foot.add(icon);
    const header = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.4), blackMat);
    header.position.set(-side * 0.2, 0.125, 0);
    foot.add(header);
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.08, 0.025), goldMat);
      p.position.set(-side * 0.2, 0.17, -0.14 + i * 0.093);
      foot.add(p);
    }
    pinsG.add(foot);
    foot.userData.pick = { type: 'foot', key: kind };
    pickables.push(foot);
    pinLabels.push({ label, pos: new THREE.Vector3(side * 1.32, 0.22, 1.3) });
    return foot;
  };
  const footL = makeFoot(-1, 'mouse', 'Fare pinleri');
  const footR = makeFoot(1, 'keyboard', 'W A S D pinleri');
  group.add(pinsG);
  parts.pins = pinsG;
  parts.pins.userData.meshes = [footL, footR];
  parts.pins.userData.labels = pinLabels;

  // --- USB socket + plug + cable (back-left of the shell) -------------------
  const usbG = new THREE.Group();
  const socket = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.2), metalMat);
  socket.position.set(-0.9, BOARD_TOP + 0.06, -1.15);
  socket.castShadow = true;
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.05), new THREE.MeshStandardMaterial({ color: '#2a2f3a' }));
  slot.position.set(-0.9, BOARD_TOP + 0.06, -1.25);
  usbG.add(socket, slot);
  const plug = new THREE.Group();
  const plugHead = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.3), metalMat);
  plugHead.castShadow = true;
  const plugBody = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.13, 0.42), new THREE.MeshStandardMaterial({ color: '#2b211b', roughness: 0.55 }));
  plugBody.position.z = -0.34;
  plugBody.castShadow = true;
  plug.add(plugHead, plugBody);
  const PLUG_IN = -1.43, PLUG_OUT = -2.2;
  plug.position.set(-0.9, BOARD_TOP + 0.065, PLUG_IN);
  usbG.add(plug);
  const cableCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, -0.55), new THREE.Vector3(-0.1, -0.1, -1.3), new THREE.Vector3(-0.5, -0.145, -2.6), new THREE.Vector3(-1.0, -0.145, -4.4)]);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 40, 0.028, 10, false), new THREE.MeshStandardMaterial({ color: '#2b211b', roughness: 0.6 }));
  cable.castShadow = true;
  plug.add(cable);
  group.add(usbG);
  parts.usb = usbG;
  parts.usb.userData.meshes = [socket];

  // --- API ---------------------------------------------------------------
  const api = {
    group, parts, pads, leds, pianoKeys, dpad, btnX, btnY, pickables, plug, PLUG_IN, PLUG_OUT, head: headG,
    positions: { dpad: new THREE.Vector3(-0.78, PLATE_TOP + 0.1, -0.42), xy: new THREE.Vector3(0.85, PLATE_TOP + 0.1, -0.4), matrix: new THREE.Vector3(0, PLATE_TOP + 0.1, -0.4), piano: new THREE.Vector3(0, BOARD_TOP + 0.1, 0.86), head: new THREE.Vector3(0, 1.0, -2.3) },
    ledMode: 'off',
    setLed(name, warm = false) {
      const p = typeof name === 'string' ? LED[name] || LED.off : name;
      this.ledMode = name;
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
        const m = leds[r][c];
        m.userData.on = p[r][c] === '#';
        m.userData.warm = warm;
      }
    },
    update(dt) {
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
        const m = leds[r][c];
        const target = m.userData.on ? 1 : 0;
        const cur = m.userData.v ?? 0;
        const next = cur + (target - cur) * Math.min(1, dt * 14);
        m.userData.v = next;
        const col = m.userData.warm ? PALETTE.ledWarm : PALETTE.led;
        m.material.emissive.set(col);
        m.material.emissiveIntensity = next * 1.4;
        m.material.color.set(col).lerp(new THREE.Color(PALETTE.ledOff), 1 - next);
      }
      for (const key in pads) {
        const p = pads[key];
        p.heat = Math.max(0, p.heat - dt * 1.8);
        p.glow.material.opacity = p.heat * 0.85;
        const s = 1 + p.heat * 0.35;
        p.glow.scale.set(s, s, 1);
        p.core.material.emissive.set(PALETTE.led);
        p.core.material.emissiveIntensity = p.heat * 0.6;
      }
      pianoKeys.forEach((k) => {
        const target = k.userData.pressed ? BOARD_TOP + 0.01 : BOARD_TOP + 0.025;
        k.position.y += (target - k.position.y) * Math.min(1, dt * 18);
        k.material.color.lerp(new THREE.Color(k.userData.pressed ? '#9fe0c0' : '#fbfaf6'), Math.min(1, dt * 10));
      });
      [...Object.values(dpad), btnX, btnY].forEach((b) => {
        const base = b.userData.baseY ?? (b.userData.baseY = b.position.y);
        const target = b.userData.pressed ? base - 0.015 : base;
        b.position.y += (target - b.position.y) * Math.min(1, dt * 18);
        b.material.color.lerp(new THREE.Color(b.userData.pressed ? '#ffd8c2' : '#fbfaf6'), Math.min(1, dt * 10));
      });
      for (const part in parts) {
        const g = parts[part];
        const want = g.userData.hl ? 1 : 0;
        g.userData.hlv = (g.userData.hlv ?? 0) + (want - (g.userData.hlv ?? 0)) * Math.min(1, dt * 6);
        (g.userData.meshes || []).forEach((m) => {
          m.material.emissive = m.material.emissive || new THREE.Color();
          m.material.emissive.set('#ffffff');
          m.material.emissiveIntensity = g.userData.hlv * 0.16;
        });
      }
    },
    pressPad(key) {
      const p = pads[key];
      if (p) p.heat = 1;
    },
    pressKey(i, ms = 260) {
      const k = pianoKeys[i];
      if (!k) return;
      k.userData.pressed = true;
      clearTimeout(k.userData.t);
      k.userData.t = setTimeout(() => (k.userData.pressed = false), ms);
    },
    pressButton(mesh, ms = 220) {
      mesh.userData.pressed = true;
      clearTimeout(mesh.userData.t);
      mesh.userData.t = setTimeout(() => (mesh.userData.pressed = false), ms);
    },
    highlight(part) {
      for (const p in parts) parts[p].userData.hl = p === part;
    },
  };
  api.setLed('off');
  return api;
}
