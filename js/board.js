import * as THREE from 'three';
import { PALETTE, KEYS, PADS_LEFT, PADS_RIGHT, LED } from './config.js';
import { ART, armPads, FEET, HEAD, USB, SHELL, makeFrontTexture, makeBackTexture, makeOutlineShape } from './artwork.js';
import { makePadLabel } from './textures.js';

/** PCB thickness: the top surface of the board. */
export const BOARD_TOP = 0.05;
export const PLATE_TOP = BOARD_TOP;

const toWorld = (u, v, y = BOARD_TOP) => new THREE.Vector3(u, y, -v);

/** Local foot coordinates (canvas-style, y down) → board units. */
function footPoint(f, lx, ly) {
  return { u: f.u + lx * Math.cos(f.rot) + ly * Math.sin(f.rot), v: f.v + lx * Math.sin(f.rot) - ly * Math.cos(f.rot) };
}

export function createBoard() {
  const group = new THREE.Group();
  group.name = 'board';
  const parts = {};
  const pickables = [];

  // --- the PCB itself ----------------------------------------------------
  const front = makeFrontTexture(1024);
  front.repeat.set(1 / ART.W, 1 / ART.H);
  front.offset.set(-ART.uMin / ART.W, -ART.vMin / ART.H);
  const back = makeBackTexture(512);
  back.repeat.copy(front.repeat);
  back.offset.copy(front.offset);
  const shape = makeOutlineShape(560);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: BOARD_TOP, bevelEnabled: false, curveSegments: 4 });
  geo.rotateX(-Math.PI / 2); // (u, v, d) → (u, d, -v)
  const faceMat = new THREE.MeshStandardMaterial({ map: front, roughness: 0.55, metalness: 0.05 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: '#2e7a2a', roughness: 0.7 });
  const pcb = new THREE.Mesh(geo, [faceMat, edgeMat]);
  pcb.castShadow = true;
  pcb.receiveShadow = true;
  group.add(pcb);
  const backGeo = new THREE.ShapeGeometry(shape, 4);
  backGeo.rotateX(Math.PI / 2); // faces down
  const backMesh = new THREE.Mesh(backGeo, new THREE.MeshStandardMaterial({ map: back, roughness: 0.7 }));
  backMesh.position.y = -0.001;
  group.add(backMesh);

  const goldMat = new THREE.MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.3, metalness: 0.9 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#1b1b1b', roughness: 0.6 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: '#fbfaf6', roughness: 0.45 });
  const metalMat = new THREE.MeshStandardMaterial({ color: PALETTE.metal, roughness: 0.3, metalness: 0.9 });
  const labelMat = (tex) => new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const flat = (mesh, y) => {
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y;
    return mesh;
  };

  // --- gold pads on the arms (real, slightly raised, with the clip hole) -----
  const pads = {};
  const padMeshes = [];
  const makePads = (side, keys) => {
    armPads(side).forEach((p, i) => {
      const key = keys[i];
      const g = new THREE.Group();
      g.position.copy(toWorld(p.u, p.v));
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 40), goldMat.clone());
      core.position.y = 0.006;
      core.castShadow = true;
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 20), darkMat);
      hole.position.y = 0.006;
      const glow = flat(new THREE.Mesh(new THREE.RingGeometry(0.17, 0.27, 40), new THREE.MeshBasicMaterial({ color: PALETTE.led, transparent: true, opacity: 0, depthWrite: false })), 0.014);
      g.add(core, hole, glow);
      core.userData.pick = { type: 'pad', key };
      pickables.push(core);
      group.add(g);
      padMeshes.push(core);
      pads[key] = { group: g, core, glow, heat: 0, top: () => toWorld(p.u, p.v, BOARD_TOP + 0.015) };
    });
  };
  makePads(-1, PADS_LEFT);
  makePads(1, PADS_RIGHT);
  parts.arms = new THREE.Group();
  parts.arms.userData.meshes = padMeshes;
  parts.arms.userData.pads = pads;

  // --- LED matrix ---------------------------------------------------------
  const matrixG = new THREE.Group();
  const leds = [];
  const ledGeo = new THREE.BoxGeometry(0.075, 0.03, 0.075);
  for (let r = 0; r < 5; r++) {
    leds[r] = [];
    for (let c = 0; c < 5; c++) {
      const m = new THREE.Mesh(ledGeo, new THREE.MeshStandardMaterial({ color: PALETTE.ledOff, roughness: 0.4, emissive: PALETTE.led, emissiveIntensity: 0 }));
      m.position.copy(toWorld(-0.28 + c * 0.14, 0.62 - r * 0.14, BOARD_TOP + 0.015));
      m.userData.on = false;
      matrixG.add(m);
      leds[r][c] = m;
    }
  }
  group.add(matrixG);
  parts.matrix = matrixG;
  parts.matrix.userData.meshes = [];

  // --- d-pad and X / Y: thin white discs over the print -------------------
  const funcG = new THREE.Group();
  const dpad = {};
  const disc = (u, v, r, glyph, pick) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.014, 32), whiteMat.clone());
    m.position.copy(toWorld(u, v, BOARD_TOP + 0.007));
    m.castShadow = true;
    m.add(flat(new THREE.Mesh(new THREE.PlaneGeometry(r * 1.5, r * 1.5), labelMat(makePadLabel(glyph, { fg: '#111111' }))), 0.008));
    m.userData.pick = pick;
    pickables.push(m);
    funcG.add(m);
    return m;
  };
  dpad.up = disc(-0.74, 0.55, 0.1, '▲', { type: 'dpad', key: 'up' });
  dpad.down = disc(-0.74, 0.11, 0.1, '▼', { type: 'dpad', key: 'down' });
  dpad.left = disc(-0.96, 0.33, 0.1, '◀', { type: 'dpad', key: 'left' });
  dpad.right = disc(-0.52, 0.33, 0.1, '▶', { type: 'dpad', key: 'right' });
  const btnX = disc(0.74, 0.55, 0.12, 'X', { type: 'fn', key: 'X' });
  const btnY = disc(0.98, 0.14, 0.12, 'Y', { type: 'fn', key: 'Y' });
  group.add(funcG);
  parts.func = funcG;
  parts.func.userData.meshes = [...Object.values(dpad), btnX, btnY];

  // --- piano: thin keys that follow the shell curve -------------------------
  const pianoG = new THREE.Group();
  const pianoKeys = [];
  const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];
  const NOTE_TR = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do'];
  const NOTE_FREQ = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
  const KW = 0.33, u0 = -1.32, vTop = -0.36;
  const shellBottom = (u) => SHELL.v - (SHELL.ry - 0.15) * Math.sqrt(Math.max(0, 1 - (u / (SHELL.rx - 0.15)) ** 2));
  for (let i = 0; i < 8; i++) {
    const uc = u0 + (i + 0.5) * KW;
    const vBottom = Math.max(shellBottom(uc) + 0.08, -1.78);
    const len = vTop - vBottom;
    const k = new THREE.Mesh(new THREE.BoxGeometry(KW - 0.03, 0.014, len), whiteMat.clone());
    k.position.copy(toWorld(uc, (vTop + vBottom) / 2, BOARD_TOP + 0.007));
    k.castShadow = true;
    const l = flat(new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), labelMat(makePadLabel(NOTE_NAMES[i], { fg: '#111111' }))), 0.008);
    l.position.z = len / 2 - 0.16;
    k.add(l);
    k.userData.pick = { type: 'piano', index: i, note: `${NOTE_NAMES[i]} · ${NOTE_TR[i]}`, freq: NOTE_FREQ[i] };
    pickables.push(k);
    pianoG.add(k);
    pianoKeys.push(k);
  }
  [1, 2, 4, 5, 6].forEach((i) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.022, 0.64), darkMat);
    b.position.copy(toWorld(u0 + i * KW, vTop - 0.32, BOARD_TOP + 0.011));
    b.castShadow = true;
    pianoG.add(b);
  });
  group.add(pianoG);
  parts.piano = pianoG;
  parts.piano.userData.meshes = pianoKeys;

  // --- feet: through-hole pins -------------------------------------------------
  const pinsG = new THREE.Group();
  const pinLabels = [];
  const headers = [];
  FEET.forEach((f) => {
    const hp = footPoint(f, -f.side * 0.26, 0);
    const header = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.46), darkMat.clone());
    header.position.copy(toWorld(hp.u, hp.v, BOARD_TOP + 0.025));
    header.rotation.y = f.rot;
    header.castShadow = true;
    pinsG.add(header);
    headers.push(header);
    for (let i = 0; i < 4; i++) {
      const pp = footPoint(f, -f.side * 0.26, -0.2 + i * 0.13);
      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.09, 0.024), goldMat);
      pin.position.copy(toWorld(pp.u, pp.v, BOARD_TOP + 0.06));
      pinsG.add(pin);
    }
    header.userData.pick = { type: 'foot', key: f.side < 0 ? 'mouse' : 'keyboard' };
    pickables.push(header);
    pinLabels.push({ label: f.side < 0 ? 'Fare pinleri' : 'W A S D pinleri', pos: toWorld(f.u, f.v, BOARD_TOP + 0.12) });
  });
  group.add(pinsG);
  parts.pins = pinsG;
  parts.pins.userData.meshes = headers;
  parts.pins.userData.labels = pinLabels;

  // --- USB-C at the top of the hat --------------------------------------------
  const usbG = new THREE.Group();
  const socket = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.11, 0.3), metalMat);
  socket.position.copy(toWorld(USB.u, USB.v, BOARD_TOP + 0.02));
  socket.castShadow = true;
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.05), new THREE.MeshStandardMaterial({ color: '#2a2f3a' }));
  slot.position.copy(toWorld(USB.u, USB.v + 0.14, BOARD_TOP + 0.02));
  usbG.add(socket, slot);
  const plug = new THREE.Group();
  const plugHead = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.3), metalMat);
  plugHead.castShadow = true;
  const plugBody = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.13, 0.42), new THREE.MeshStandardMaterial({ color: '#2b211b', roughness: 0.55 }));
  plugBody.position.z = -0.34;
  plugBody.castShadow = true;
  plug.add(plugHead, plugBody);
  const PLUG_IN = -(USB.v + 0.28), PLUG_OUT = -(USB.v + 1.05);
  plug.position.set(USB.u, BOARD_TOP + 0.02, PLUG_IN);
  usbG.add(plug);
  const cableCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, -0.55), new THREE.Vector3(-0.05, -0.05, -1.2), new THREE.Vector3(-0.4, -0.06, -2.4), new THREE.Vector3(-0.9, -0.06, -4.2)]);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 40, 0.028, 10, false), new THREE.MeshStandardMaterial({ color: '#2b211b', roughness: 0.6 }));
  cable.castShadow = true;
  plug.add(cable);
  group.add(usbG);
  parts.usb = usbG;
  parts.usb.userData.meshes = [socket];

  // --- API ---------------------------------------------------------------
  const api = {
    group, parts, pads, leds, pianoKeys, dpad, btnX, btnY, pickables, plug, PLUG_IN, PLUG_OUT,
    positions: {
      dpad: toWorld(-0.74, 0.33, BOARD_TOP + 0.1),
      xy: toWorld(0.86, 0.35, BOARD_TOP + 0.1),
      matrix: toWorld(0, 0.34, BOARD_TOP + 0.1),
      piano: toWorld(0, -1.0, BOARD_TOP + 0.1),
      head: toWorld(HEAD.u, HEAD.v, 0.4),
    },
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
      pianoKeys.forEach((k) => {
        const base = k.userData.baseY ?? (k.userData.baseY = k.position.y);
        const target = k.userData.pressed ? base - 0.006 : base;
        k.position.y += (target - k.position.y) * Math.min(1, dt * 18);
        k.material.color.lerp(new THREE.Color(k.userData.pressed ? '#9fe0c0' : '#fbfaf6'), Math.min(1, dt * 10));
      });
      [...Object.values(dpad), btnX, btnY].forEach((b) => {
        const base = b.userData.baseY ?? (b.userData.baseY = b.position.y);
        const target = b.userData.pressed ? base - 0.006 : base;
        b.position.y += (target - b.position.y) * Math.min(1, dt * 18);
        b.material.color.lerp(new THREE.Color(b.userData.pressed ? '#ffd8c2' : '#fbfaf6'), Math.min(1, dt * 10));
      });
      for (const part in parts) {
        const g = parts[part];
        const want = g.userData.hl ? 1 : 0;
        g.userData.hlv = (g.userData.hlv ?? 0) + (want - (g.userData.hlv ?? 0)) * Math.min(1, dt * 6);
        (g.userData.meshes || []).forEach((m) => {
          if (part === 'arms') return; // pads use their own glow
          m.material.emissive = m.material.emissive || new THREE.Color();
          m.material.emissive.set(PALETTE.terracotta);
          m.material.emissiveIntensity = g.userData.hlv * 0.3;
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
