import * as THREE from 'three';
import { PALETTE, PADS_LEFT, PADS_RIGHT, LED } from './config.js';
import { P, BOARD_W } from './artwork.js';

/** PCB thickness: the top surface of the board (above the lift). */
const THICK = 0.05;
/** The board rests on the pin headers soldered to its back, so it sits slightly above the table. */
export const LIFT = 0.1;
export const BOARD_TOP = THICK + LIFT;

const toWorld = (u, v, y = BOARD_TOP) => new THREE.Vector3(u, y, -v);
const W = (fx, fy, y) => {
  const p = P(fx, fy);
  return toWorld(p.u, p.v, y);
};

/* Feature positions as fractions of the front print (x/width, y/height). */
const PAD_POS = {
  up: [0.268, 0.352], left: [0.205, 0.39], right: [0.152, 0.447], down: [0.137, 0.515], gnd: [0.142, 0.585],
  space: [0.732, 0.352], click: [0.795, 0.39], rclick: [0.848, 0.447], enter: [0.863, 0.515], gnd2: [0.858, 0.585],
};
const DPAD_POS = { up: [0.347, 0.5425], left: [0.3, 0.5825], right: [0.393, 0.5825], down: [0.347, 0.6225] };
const XY_POS = { X: [0.631, 0.54], Y: [0.751, 0.6075] };
const MATRIX = { fx: 0.52, fy: 0.608, step: 0.16, size: 0.09 };
const PIANO = { fx0: 0.2, fx1: 0.803, fyTop: 0.7075, fyBottom: 0.995 };
/* Through-holes of the three pin headers soldered to the back of the board (as on the back print):
   MOUSE under the left foot, DSAW under the right foot and GROUND under the bottom of the shell. */
const HEADERS = {
  mouse: { holes: [[0.166, 0.884], [0.184, 0.903], [0.202, 0.922], [0.22, 0.941]], label: 'Fare pinleri' },
  keyboard: { holes: [[0.752, 0.904], [0.767, 0.89], [0.782, 0.876], [0.797, 0.862]], label: 'W A S D pinleri' },
  ground: { holes: [[0.545, 0.878], [0.545, 0.9], [0.545, 0.922], [0.545, 0.944]], label: 'GND pinleri' },
};
const USB_POS = [0.493, 0.03];

export function createBoard(art) {
  const group = new THREE.Group();
  group.name = 'board';
  const parts = {};
  const pickables = [];

  // --- the PCB itself: the real print on a thin extruded silhouette ------------
  const geo = new THREE.ExtrudeGeometry(art.shape, { depth: THICK, bevelEnabled: false, curveSegments: 4 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, LIFT, 0);
  const faceMat = new THREE.MeshStandardMaterial({ map: art.frontTex, roughness: 0.6, metalness: 0.02 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: '#2e7a2a', roughness: 0.7 });
  const pcb = new THREE.Mesh(geo, [faceMat, edgeMat]);
  pcb.castShadow = true;
  pcb.receiveShadow = true;
  group.add(pcb);
  const backGeo = new THREE.ShapeGeometry(art.shape, 4);
  backGeo.rotateX(Math.PI / 2);
  const backMesh = new THREE.Mesh(backGeo, new THREE.MeshStandardMaterial({ map: art.backTex, roughness: 0.7 }));
  backMesh.position.y = LIFT - 0.001;
  group.add(backMesh);

  const goldMat = new THREE.MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.3, metalness: 0.9 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#1b1b1b', roughness: 0.6 });
  const metalMat = new THREE.MeshStandardMaterial({ color: PALETTE.metal, roughness: 0.3, metalness: 0.9 });
  /** Invisible pick target that lights up while pressed. */
  const overlayMat = () => new THREE.MeshBasicMaterial({ color: '#9fe0c0', transparent: true, opacity: 0, depthWrite: false });
  const flat = (mesh, y) => {
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y;
    return mesh;
  };

  // --- gold pads on the arms (copper rings with the clip hole) -----------------
  const pads = {};
  const padMeshes = [];
  [...PADS_LEFT, ...PADS_RIGHT].forEach((key) => {
    const [fx, fy] = PAD_POS[key];
    const g = new THREE.Group();
    g.position.copy(W(fx, fy));
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.012, 40), goldMat.clone());
    core.position.y = 0.006;
    core.castShadow = true;
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 20), darkMat);
    hole.position.y = 0.006;
    const glow = flat(new THREE.Mesh(new THREE.RingGeometry(0.18, 0.28, 40), new THREE.MeshBasicMaterial({ color: PALETTE.led, transparent: true, opacity: 0, depthWrite: false })), 0.014);
    g.add(core, hole, glow);
    core.userData.pick = { type: 'pad', key };
    pickables.push(core);
    group.add(g);
    padMeshes.push(core);
    pads[key] = { group: g, core, glow, heat: 0, top: () => W(fx, fy, BOARD_TOP + 0.015) };
  });
  parts.arms = new THREE.Group();
  parts.arms.userData.meshes = padMeshes;
  parts.arms.userData.pads = pads;

  // --- LED matrix ---------------------------------------------------------------
  const matrixG = new THREE.Group();
  const leds = [];
  const ledGeo = new THREE.BoxGeometry(MATRIX.size, 0.03, MATRIX.size);
  const mc = P(MATRIX.fx, MATRIX.fy);
  for (let r = 0; r < 5; r++) {
    leds[r] = [];
    for (let c = 0; c < 5; c++) {
      const m = new THREE.Mesh(ledGeo, new THREE.MeshStandardMaterial({ color: PALETTE.ledOff, roughness: 0.4, emissive: PALETTE.led, emissiveIntensity: 0 }));
      m.position.copy(toWorld(mc.u + (c - 2) * MATRIX.step, mc.v - (r - 2) * MATRIX.step, BOARD_TOP + 0.015));
      m.userData.on = false;
      matrixG.add(m);
      leds[r][c] = m;
    }
  }
  group.add(matrixG);
  parts.matrix = matrixG;
  parts.matrix.userData.meshes = [];

  // --- d-pad and X / Y: invisible discs over the printed buttons ---------------
  const funcG = new THREE.Group();
  const dpad = {};
  const disc = (fx, fy, r, pick) => {
    const m = flat(new THREE.Mesh(new THREE.CircleGeometry(r, 32), overlayMat()), 0);
    m.position.copy(W(fx, fy, BOARD_TOP + 0.003));
    m.userData.pick = pick;
    pickables.push(m);
    funcG.add(m);
    return m;
  };
  for (const k in DPAD_POS) dpad[k] = disc(DPAD_POS[k][0], DPAD_POS[k][1], 0.13, { type: 'dpad', key: k });
  const btnX = disc(XY_POS.X[0], XY_POS.X[1], 0.14, { type: 'fn', key: 'X' });
  const btnY = disc(XY_POS.Y[0], XY_POS.Y[1], 0.14, { type: 'fn', key: 'Y' });
  group.add(funcG);
  parts.func = funcG;
  parts.func.userData.meshes = [];
  parts.func.userData.overlays = [...Object.values(dpad), btnX, btnY];

  // --- piano: invisible keys over the printed ones -------------------------------
  const pianoG = new THREE.Group();
  const pianoKeys = [];
  const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];
  const NOTE_TR = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do'];
  const NOTE_FREQ = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
  const p0 = P(PIANO.fx0, PIANO.fyTop), p1 = P(PIANO.fx1, PIANO.fyBottom);
  const KW = (p1.u - p0.u) / 8;
  const shellBottom = (u) => -0.15 - 1.72 * Math.sqrt(Math.max(0, 1 - (u / 1.68) ** 2));
  for (let i = 0; i < 8; i++) {
    const uc = p0.u + (i + 0.5) * KW;
    const vBottom = Math.max(shellBottom(uc) + 0.12, p1.v);
    const len = p0.v - vBottom;
    const k = new THREE.Mesh(new THREE.PlaneGeometry(KW - 0.02, len), overlayMat());
    k.rotation.x = -Math.PI / 2;
    k.position.copy(toWorld(uc, (p0.v + vBottom) / 2, BOARD_TOP + 0.003));
    k.userData.pick = { type: 'piano', index: i, note: `${NOTE_NAMES[i]} · ${NOTE_TR[i]}`, freq: NOTE_FREQ[i] };
    pickables.push(k);
    pianoG.add(k);
    pianoKeys.push(k);
  }
  group.add(pianoG);
  parts.piano = pianoG;
  parts.piano.userData.meshes = [];
  parts.piano.userData.overlays = pianoKeys;

  // --- pin headers: plated holes on the front, black headers with pins underneath ----
  const pinsG = new THREE.Group();
  const pinLabels = [];
  const holeRings = [];
  const footPicks = [];
  for (const kind in HEADERS) {
    const { holes, label } = HEADERS[kind];
    const pts = holes.map(([fx, fy]) => W(fx, fy));
    const mid = pts[0].clone().add(pts[3]).multiplyScalar(0.5);
    const dir = pts[3].clone().sub(pts[0]);
    pts.forEach((p) => {
      if (kind === 'ground') return; // the GROUND header shows only on the back
      // plated through-hole seen from the front
      const ring = flat(new THREE.Mesh(new THREE.RingGeometry(0.02, 0.042, 24), new THREE.MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.35, metalness: 0.85 })), 0);
      ring.position.copy(p).setY(BOARD_TOP + 0.002);
      pinsG.add(ring);
      holeRings.push(ring);
      // the pin itself hangs below the board
      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.024, LIFT - 0.02, 0.024), goldMat);
      pin.position.copy(p).setY(LIFT / 2 + 0.01);
      pinsG.add(pin);
    });
    const header = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, dir.length() + 0.12), darkMat.clone());
    header.position.copy(mid).setY(LIFT - 0.03);
    header.rotation.y = Math.atan2(dir.x, dir.z);
    header.castShadow = true;
    pinsG.add(header);
    // invisible pick area over the holes
    const pick = flat(new THREE.Mesh(new THREE.PlaneGeometry(0.22, dir.length() + 0.2), overlayMat()), 0);
    pick.position.copy(mid).setY(BOARD_TOP + 0.004);
    pick.rotation.z = -Math.atan2(dir.x, dir.z);
    pick.userData.pick = { type: 'foot', key: kind };
    if (kind !== 'ground') pickables.push(pick);
    if (kind !== 'ground') {
      pinsG.add(pick);
      footPicks.push(pick);
      pinLabels.push({ label, pos: mid.clone().setY(BOARD_TOP + 0.12) });
    }
  }
  group.add(pinsG);
  parts.pins = pinsG;
  parts.pins.userData.meshes = holeRings;
  parts.pins.userData.overlays = footPicks;
  parts.pins.userData.labels = pinLabels;

  // --- USB-C at the top of the hat --------------------------------------------------
  const usbG = new THREE.Group();
  const up = P(USB_POS[0], USB_POS[1]);
  const socket = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.11, 0.3), metalMat);
  socket.position.copy(toWorld(up.u, up.v - 0.02, BOARD_TOP + 0.02));
  socket.castShadow = true;
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.05), new THREE.MeshStandardMaterial({ color: '#2a2f3a' }));
  slot.position.copy(toWorld(up.u, up.v + 0.12, BOARD_TOP + 0.02));
  usbG.add(socket, slot);
  const plug = new THREE.Group();
  const plugHead = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.3), metalMat);
  plugHead.castShadow = true;
  const plugBody = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.13, 0.42), new THREE.MeshStandardMaterial({ color: '#2b211b', roughness: 0.55 }));
  plugBody.position.z = -0.34;
  plugBody.castShadow = true;
  plug.add(plugHead, plugBody);
  const PLUG_IN = -(up.v + 0.26), PLUG_OUT = -(up.v + 1.05);
  plug.position.set(up.u, BOARD_TOP + 0.02, PLUG_IN);
  usbG.add(plug);
  const cableCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, -0.55), new THREE.Vector3(-0.05, -0.08, -1.2), new THREE.Vector3(-0.4, -0.16, -2.4), new THREE.Vector3(-0.9, -0.16, -4.2)]);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 40, 0.028, 10, false), new THREE.MeshStandardMaterial({ color: '#2b211b', roughness: 0.6 }));
  cable.castShadow = true;
  plug.add(cable);
  group.add(usbG);
  parts.usb = usbG;
  parts.usb.userData.meshes = [socket];

  const head = P(0.5, 0.25);
  const api = {
    group, parts, pads, leds, pianoKeys, dpad, btnX, btnY, pickables, plug, PLUG_IN, PLUG_OUT,
    positions: {
      dpad: W(DPAD_POS.up[0], DPAD_POS.up[1], BOARD_TOP + 0.1),
      xy: W(XY_POS.X[0], XY_POS.X[1], BOARD_TOP + 0.1),
      matrix: toWorld(mc.u, mc.v, BOARD_TOP + 0.1),
      piano: W(0.5, 0.85, BOARD_TOP + 0.1),
      head: toWorld(head.u, head.v, 0.4),
    },
    width: BOARD_W,
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
        p.core.material.emissiveIntensity = p.heat * 0.5;
      }
      [...pianoKeys, ...Object.values(dpad), btnX, btnY, ...footPicks].forEach((k) => {
        const target = k.userData.pressed ? 0.75 : 0;
        k.material.opacity += (target - k.material.opacity) * Math.min(1, dt * 16);
      });
      for (const part in parts) {
        const g = parts[part];
        const want = g.userData.hl ? 1 : 0;
        g.userData.hlv = (g.userData.hlv ?? 0) + (want - (g.userData.hlv ?? 0)) * Math.min(1, dt * 6);
        (g.userData.meshes || []).forEach((m) => {
          m.material.emissive = m.material.emissive || new THREE.Color();
          m.material.emissive.set(PALETTE.terracotta);
          m.material.emissiveIntensity = g.userData.hlv * 0.3;
        });
        // printed controls: a soft tint while their chapter is active
        (g.userData.overlays || []).forEach((m) => {
          if (!m.userData.pressed) m.material.opacity = Math.max(m.material.opacity, g.userData.hlv * 0.28);
        });
        if (part === 'arms') for (const key in pads) pads[key].heat = Math.max(pads[key].heat, g.userData.hlv * 0.22);
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
