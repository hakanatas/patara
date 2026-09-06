import * as THREE from 'three';
import { PALETTE, KEYS, PADS_LEFT, PADS_RIGHT, LED } from './config.js';
import { makePadLabel, makeSilkText, makePcbTexture } from './textures.js';

export const BOARD_TOP = 0.11;

/** Rounded rectangle extruded along +Y, bottom at y=0, centred at (cx, cz). */
export function roundedSlab(w, d, r, thickness, material, { bevel = 0.015 } = {}) {
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
  const g = new THREE.ExtrudeGeometry(s, { depth: thickness - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  const m = new THREE.Mesh(g, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function createBoard() {
  const group = new THREE.Group();
  group.name = 'board';
  const parts = {};
  const pickables = [];

  const pcbTex = makePcbTexture(PALETTE.moss);
  const pcbMat = new THREE.MeshStandardMaterial({ map: pcbTex, color: '#ffffff', roughness: 0.62, metalness: 0.05 });
  const armMat = new THREE.MeshStandardMaterial({ color: PALETTE.mossDeep, roughness: 0.66, metalness: 0.05 });
  const goldMat = new THREE.MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.32, metalness: 0.85 });
  const goldDim = new THREE.MeshStandardMaterial({ color: PALETTE.goldDeep, roughness: 0.4, metalness: 0.8 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#232a36', roughness: 0.5, metalness: 0.2 });
  const metalMat = new THREE.MeshStandardMaterial({ color: PALETTE.metal, roughness: 0.3, metalness: 0.9 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: PALETTE.white, roughness: 0.4 });

  // --- body & arms -------------------------------------------------------
  const body = roundedSlab(1.75, 2.15, 0.22, BOARD_TOP, pcbMat);
  body.name = 'body';
  group.add(body);
  const armL = roundedSlab(0.74, 1.62, 0.2, BOARD_TOP - 0.01, armMat);
  armL.position.set(-1.22, 0, 0.06);
  const armR = armL.clone();
  armR.position.set(1.22, 0, 0.06);
  group.add(armL, armR);
  parts.arms = new THREE.Group();
  parts.arms.userData.meshes = [armL, armR];

  // corner holes
  [[-0.72, -0.98], [0.72, -0.98], [-0.72, 0.98], [0.72, 0.98]].forEach(([x, z]) => {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16), goldDim);
    h.position.set(x, BOARD_TOP + 0.005, z);
    group.add(h);
  });

  // silkscreen logo
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.17), new THREE.MeshBasicMaterial({ map: makeSilkText('PATARA', { size: 60 }), transparent: true }));
  logo.rotation.x = -Math.PI / 2;
  logo.position.set(0, BOARD_TOP + 0.003, -0.98);
  group.add(logo);

  // --- pads --------------------------------------------------------------
  const pads = {};
  const padZ = [-0.5, -0.2, 0.1, 0.4, 0.7];
  const makePad = (key, x, z) => {
    const isGnd = key.startsWith('gnd');
    const g = new THREE.Group();
    g.position.set(x, BOARD_TOP, z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.02, 10, 40), goldMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.012;
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.022, 32), isGnd ? darkMat.clone() : goldMat.clone());
    core.position.y = 0.011;
    core.castShadow = true;
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.2, 0.2),
      new THREE.MeshBasicMaterial({ map: makePadLabel(KEYS[key].label, { fg: isGnd ? '#e5c869' : '#1c1a10' }), transparent: true, depthWrite: false })
    );
    label.rotation.x = -Math.PI / 2;
    label.position.y = 0.024;
    const glow = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.24, 40), new THREE.MeshBasicMaterial({ color: PALETTE.led, transparent: true, opacity: 0, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.004;
    g.add(ring, core, label, glow);
    core.userData.pick = { type: 'pad', key };
    ring.userData.pick = core.userData.pick;
    pickables.push(core, ring);
    group.add(g);
    pads[key] = { group: g, core, ring, glow, baseColor: core.material.color.clone(), heat: 0, top: () => new THREE.Vector3(x, BOARD_TOP + 0.03, z) };
  };
  PADS_LEFT.forEach((k, i) => makePad(k, -1.22, padZ[i]));
  PADS_RIGHT.forEach((k, i) => makePad(k, 1.22, padZ[i]));
  parts.arms.userData.pads = pads;

  // --- LED matrix --------------------------------------------------------
  const matrixG = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.03, 0.95), new THREE.MeshStandardMaterial({ color: PALETTE.matrixBg, roughness: 0.6 }));
  plate.position.set(0, BOARD_TOP + 0.015, -0.42);
  plate.castShadow = true;
  matrixG.add(plate);
  const leds = [];
  const ledGeo = new THREE.BoxGeometry(0.1, 0.045, 0.1);
  for (let r = 0; r < 5; r++) {
    leds[r] = [];
    for (let c = 0; c < 5; c++) {
      const m = new THREE.Mesh(ledGeo, new THREE.MeshStandardMaterial({ color: PALETTE.ledOff, roughness: 0.4, emissive: PALETTE.led, emissiveIntensity: 0 }));
      m.position.set(-0.34 + c * 0.17, BOARD_TOP + 0.045, -0.76 + r * 0.17);
      m.userData.on = false;
      matrixG.add(m);
      leds[r][c] = m;
    }
  }
  group.add(matrixG);
  parts.matrix = matrixG;
  parts.matrix.userData.meshes = [plate];

  // --- piano -------------------------------------------------------------
  const pianoG = new THREE.Group();
  const pianoBg = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.44), new THREE.MeshStandardMaterial({ color: '#0f2a22', roughness: 0.7 }));
  pianoBg.position.set(0, BOARD_TOP + 0.01, 0.22);
  pianoG.add(pianoBg);
  const pianoKeys = [];
  const NOTE_NAMES = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do'];
  const NOTE_FREQ = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
  for (let i = 0; i < 8; i++) {
    const k = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.36), whiteMat.clone());
    k.position.set(-0.595 + i * 0.17, BOARD_TOP + 0.04, 0.22);
    k.castShadow = true;
    k.userData.pick = { type: 'piano', index: i, note: NOTE_NAMES[i], freq: NOTE_FREQ[i] };
    pickables.push(k);
    pianoG.add(k);
    pianoKeys.push(k);
  }
  group.add(pianoG);
  parts.piano = pianoG;
  parts.piano.userData.meshes = [pianoBg];

  // --- on-board buttons --------------------------------------------------
  const funcG = new THREE.Group();
  const dpad = {};
  [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]].forEach(([k, dx, dz]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.1), darkMat.clone());
    b.position.set(-0.5 + dx * 0.12, BOARD_TOP + 0.03, 0.7 + dz * 0.12);
    b.castShadow = true;
    b.userData.pick = { type: 'dpad', key: k };
    pickables.push(b);
    funcG.add(b);
    dpad[k] = b;
  });
  const dcenter = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 0.1), new THREE.MeshStandardMaterial({ color: '#171c26', roughness: 0.6 }));
  dcenter.position.set(-0.5, BOARD_TOP + 0.02, 0.7);
  funcG.add(dcenter);
  const btnX = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.06, 32), new THREE.MeshStandardMaterial({ color: PALETTE.terracotta, roughness: 0.45 }));
  btnX.position.set(0.32, BOARD_TOP + 0.03, 0.7);
  btnX.castShadow = true;
  btnX.userData.pick = { type: 'fn', key: 'X' };
  const btnY = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.06, 32), new THREE.MeshStandardMaterial({ color: '#5b7c99', roughness: 0.45 }));
  btnY.position.set(0.6, BOARD_TOP + 0.03, 0.7);
  btnY.castShadow = true;
  btnY.userData.pick = { type: 'fn', key: 'Y' };
  [btnX, btnY].forEach((b, i) => {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.11), new THREE.MeshBasicMaterial({ map: makePadLabel(i ? 'Y' : 'X', { fg: '#ffffff' }), transparent: true, depthWrite: false }));
    l.rotation.x = -Math.PI / 2;
    l.position.y = 0.031;
    b.add(l);
  });
  pickables.push(btnX, btnY);
  funcG.add(btnX, btnY);
  group.add(funcG);
  parts.func = funcG;
  parts.func.userData.meshes = [dcenter];

  // --- bottom pin header -------------------------------------------------
  const pinsG = new THREE.Group();
  const header = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.07, 0.12), darkMat);
  header.position.set(0, BOARD_TOP + 0.035, 0.94);
  header.castShadow = true;
  pinsG.add(header);
  const pinGroups = [['MOUSE', 4], ['GND', 4], ['W A S D', 4]];
  let px = -0.6;
  const pinLabels = [];
  pinGroups.forEach(([label, n]) => {
    const start = px;
    for (let i = 0; i < n; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.03), goldMat);
      p.position.set(px, BOARD_TOP + 0.1, 0.94);
      pinsG.add(p);
      px += 0.075;
    }
    const cx = (start + px - 0.075) / 2;
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.06), new THREE.MeshBasicMaterial({ map: makeSilkText(label, { size: 40, spacing: 0.12, w: 512, h: 90 }), transparent: true, depthWrite: false }));
    t.rotation.x = -Math.PI / 2;
    t.position.set(cx, BOARD_TOP + 0.003, 0.83);
    pinsG.add(t);
    pinLabels.push({ label, pos: new THREE.Vector3(cx, BOARD_TOP + 0.12, 0.94) });
    px += 0.12;
  });
  group.add(pinsG);
  parts.pins = pinsG;
  parts.pins.userData.meshes = [header];
  parts.pins.userData.labels = pinLabels;

  // --- USB socket + plug + cable ----------------------------------------
  const usbG = new THREE.Group();
  const socket = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.2), metalMat);
  socket.position.set(0, BOARD_TOP + 0.06, -1.0);
  socket.castShadow = true;
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.05), new THREE.MeshStandardMaterial({ color: '#2a2f3a' }));
  slot.position.set(0, BOARD_TOP + 0.06, -1.1);
  usbG.add(socket, slot);
  const plug = new THREE.Group();
  const plugHead = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.3), metalMat);
  plugHead.castShadow = true;
  const plugBody = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.13, 0.42), new THREE.MeshStandardMaterial({ color: '#2b211b', roughness: 0.55 }));
  plugBody.position.z = -0.34;
  plugBody.castShadow = true;
  plug.add(plugHead, plugBody);
  plug.position.set(0, BOARD_TOP + 0.065, -1.28);
  usbG.add(plug);
  const cableCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, -0.55), new THREE.Vector3(0.05, -0.1, -1.3), new THREE.Vector3(-0.25, -0.145, -2.6), new THREE.Vector3(-0.7, -0.145, -4.4)]);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 40, 0.028, 10, false), new THREE.MeshStandardMaterial({ color: '#2b211b', roughness: 0.6 }));
  cable.castShadow = true;
  plug.add(cable);
  group.add(usbG);
  parts.usb = usbG;
  parts.usb.userData.meshes = [socket];
  parts.usb.userData.plug = plug;
  const PLUG_IN = -1.28, PLUG_OUT = -2.0;

  // --- API ---------------------------------------------------------------
  const api = {
    group, parts, pads, leds, pianoKeys, dpad, btnX, btnY, pickables, plug, PLUG_IN, PLUG_OUT,
    ledMode: 'off',
    setLed(name, warm = false) {
      const p = typeof name === 'string' ? LED[name] || LED.off : name;
      this.ledMode = name;
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
        const on = p[r][c] === '#';
        const m = leds[r][c];
        m.userData.on = on;
        m.userData.warm = warm;
      }
    },
    /** Called every frame: LEDs fade, pads cool down, keys spring back. */
    update(dt) {
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
        const m = leds[r][c];
        const target = m.userData.on ? 1 : 0;
        const cur = m.material.emissiveIntensity;
        const next = cur + (target - cur) * Math.min(1, dt * 14);
        m.material.emissiveIntensity = next * 1.3;
        m.material.emissive.set(m.userData.warm ? PALETTE.ledWarm : PALETTE.led);
        m.material.color.set(m.userData.warm ? PALETTE.ledWarm : PALETTE.led).lerp(new THREE.Color(PALETTE.ledOff), 1 - next);
      }
      for (const key in pads) {
        const p = pads[key];
        p.heat = Math.max(0, p.heat - dt * 1.8);
        p.glow.material.opacity = p.heat * 0.85;
        const s = 1 + p.heat * 0.35;
        p.glow.scale.set(s, s, 1);
        p.core.material.emissive.set(PALETTE.led);
        p.core.material.emissiveIntensity = p.heat * 0.8;
      }
      pianoKeys.forEach((k) => {
        const target = k.userData.pressed ? BOARD_TOP + 0.02 : BOARD_TOP + 0.04;
        k.position.y += (target - k.position.y) * Math.min(1, dt * 18);
        k.material.color.lerp(new THREE.Color(k.userData.pressed ? '#9fe0c0' : PALETTE.white), Math.min(1, dt * 10));
      });
      [...Object.values(dpad), btnX, btnY].forEach((b) => {
        const base = b.userData.baseY ?? (b.userData.baseY = b.position.y);
        const target = b.userData.pressed ? base - 0.02 : base;
        b.position.y += (target - b.position.y) * Math.min(1, dt * 18);
      });
      for (const part in parts) {
        const g = parts[part];
        const want = g.userData.hl ? 1 : 0;
        g.userData.hlv = (g.userData.hlv ?? 0) + (want - (g.userData.hlv ?? 0)) * Math.min(1, dt * 6);
        (g.userData.meshes || []).forEach((m) => {
          m.material.emissive = m.material.emissive || new THREE.Color();
          m.material.emissive.set(PALETTE.gold);
          m.material.emissiveIntensity = g.userData.hlv * 0.22;
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
