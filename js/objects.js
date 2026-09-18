import * as THREE from 'three';
import { PALETTE } from './config.js';
import { makePencilPaper, makeBookCover } from './textures.js';

const std = (opts) => new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0, ...opts });
function shadow(m) {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Build one conductive object. Returns a Group with userData {def, top, picks}. */
export function createObject(def) {
  const g = new THREE.Group();
  g.name = def.id;
  g.position.fromArray(def.pos);
  const picks = [];
  let top = new THREE.Vector3(0, 0.3, 0);

  switch (def.kind) {
    case 'banana': {
      const pts = [new THREE.Vector3(-0.55, 0.12, 0.05), new THREE.Vector3(-0.28, 0.2, -0.03), new THREE.Vector3(0, 0.22, -0.06), new THREE.Vector3(0.28, 0.2, -0.03), new THREE.Vector3(0.55, 0.12, 0.05)];
      const curve = new THREE.CatmullRomCurve3(pts);
      const m = shadow(new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.13, 14, false), std({ color: '#f2c14e', roughness: 0.5 })));
      m.scale.y = 0.85;
      const tipMat = std({ color: '#6b4a2a' });
      const t1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), tipMat);
      t1.position.copy(pts[0]);
      const t2 = t1.clone();
      t2.position.copy(pts[4]);
      g.add(m, t1, t2);
      g.rotation.y = -0.5;
      picks.push(m);
      top.set(0, 0.36, -0.06);
      break;
    }
    case 'apple': {
      const m = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 24), std({ color: '#c8402f', roughness: 0.35 })));
      m.scale.set(1, 0.9, 1);
      m.position.y = 0.3;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.16, 8), std({ color: '#5a3b1e' }));
      stem.position.set(0.02, 0.66, 0);
      stem.rotation.z = 0.2;
      const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), std({ color: '#5f9a4f', side: THREE.DoubleSide }));
      leaf.scale.set(1.6, 0.8, 1);
      leaf.position.set(0.12, 0.68, 0);
      leaf.rotation.set(-1.2, 0.3, 0.4);
      g.add(m, stem, leaf);
      picks.push(m);
      top.set(0, 0.62, 0);
      break;
    }
    case 'dough': {
      const m = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.32, 32, 24), std({ color: def.color || '#7cc47f', roughness: 0.85 })));
      m.scale.set(1, 0.72, 1);
      m.position.y = 0.23;
      g.add(m);
      picks.push(m);
      top.set(0, 0.47, 0);
      break;
    }
    case 'spoon': {
      const mat = new THREE.MeshStandardMaterial({ color: '#d8dbe0', roughness: 0.25, metalness: 0.95 });
      const bowl = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat));
      bowl.scale.set(1, 0.4, 1.35);
      bowl.rotation.x = Math.PI;
      bowl.position.set(0, 0.09, 0.3);
      bowl.material.side = THREE.DoubleSide;
      const handle = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.75), mat));
      handle.position.set(0, 0.03, -0.35);
      g.add(bowl, handle);
      g.rotation.y = 0.9;
      picks.push(bowl, handle);
      top.set(0, 0.12, 0.3);
      break;
    }
    case 'pencil': {
      const paper = shadow(new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.74), new THREE.MeshStandardMaterial({ map: makePencilPaper(), roughness: 0.9 })));
      paper.rotation.x = -Math.PI / 2;
      paper.position.y = 0.006;
      paper.castShadow = false;
      const pencil = new THREE.Group();
      const shaft = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.72, 6), std({ color: '#f0b93a', roughness: 0.5 })));
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 6), std({ color: '#e8d2a8' }));
      tip.position.y = -0.41;
      tip.rotation.x = Math.PI;
      const lead = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.04, 6), std({ color: '#333' }));
      lead.position.y = -0.48;
      lead.rotation.x = Math.PI;
      const eraser = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 6), std({ color: '#e59a8a' }));
      eraser.position.y = 0.4;
      pencil.add(shaft, tip, lead, eraser);
      pencil.rotation.z = Math.PI / 2;
      pencil.rotation.y = 0.35;
      pencil.position.set(0.15, 0.04, 0.5);
      g.add(paper, pencil);
      g.rotation.y = -0.2;
      picks.push(paper);
      top.set(0.05, 0.03, -0.05);
      break;
    }
    case 'foil': {
      const geo = new THREE.IcosahedronGeometry(0.32, 1);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const k = 0.82 + Math.random() * 0.3;
        pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k);
      }
      geo.computeVertexNormals();
      const m = shadow(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#d5d9df', roughness: 0.32, metalness: 0.95, flatShading: true })));
      m.position.y = 0.3;
      g.add(m);
      picks.push(m);
      top.set(0, 0.6, 0);
      break;
    }
    case 'coin': {
      const m = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.035, 40), new THREE.MeshStandardMaterial({ color: '#d4a84b', roughness: 0.3, metalness: 0.9 })));
      m.position.y = 0.018;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 40), new THREE.MeshStandardMaterial({ color: '#b78a2e', roughness: 0.35, metalness: 0.9 }));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.036;
      g.add(m, rim);
      picks.push(m);
      top.set(0, 0.05, 0);
      break;
    }
    case 'key': {
      const mat = new THREE.MeshStandardMaterial({ color: '#c9a25a', roughness: 0.35, metalness: 0.9 });
      const head = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 10, 32), mat));
      head.rotation.x = Math.PI / 2;
      head.position.set(-0.3, 0.05, 0);
      const shaft = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.09), mat));
      shaft.position.set(0.12, 0.05, 0);
      const teeth = [0.2, 0.3, 0.38].map((x, i) => {
        const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.08 + i * 0.03), mat);
        t.position.set(x, 0.05, 0.08);
        return t;
      });
      g.add(head, shaft, ...teeth);
      g.rotation.y = 0.6;
      picks.push(head, shaft);
      top.set(-0.3, 0.1, 0);
      break;
    }
    default:
      break;
  }
  picks.forEach((m) => (m.userData.pick = { type: 'object', id: def.id }));
  g.userData = { def, top, picks, baseScale: 1, squash: 0 };
  return g;
}

/** Alligator-clip lead: a sagging tube between two points with clips on both ends. */
export function createWire(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const clipMat = new THREE.MeshStandardMaterial({ color: '#8f97a3', roughness: 0.35, metalness: 0.9 });
  let tube = null;
  const clipA = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.16), clipMat);
  const clipB = clipA.clone();
  clipA.castShadow = clipB.castShadow = true;
  const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), new THREE.MeshBasicMaterial({ color: PALETTE.led }));
  pulse.visible = false;
  g.add(clipA, clipB, pulse);
  const state = { curve: null, from: new THREE.Vector3(), to: new THREE.Vector3(), t: 0, active: false };

  function setEnds(from, to, { sag = 0.5 } = {}) {
    state.from.copy(from);
    state.to.copy(to);
    const mid = from.clone().lerp(to, 0.5);
    const len = from.distanceTo(to);
    mid.y = Math.max(from.y, to.y) + sag * Math.min(1, len / 2.5);
    const q1 = from.clone().lerp(mid, 0.5);
    q1.y = mid.y * 0.85;
    const q2 = mid.clone().lerp(to, 0.5);
    q2.y = mid.y * 0.85;
    state.curve = new THREE.CatmullRomCurve3([from, q1, mid, q2, to]);
    if (tube) {
      tube.geometry.dispose();
      g.remove(tube);
    }
    tube = new THREE.Mesh(new THREE.TubeGeometry(state.curve, 48, 0.017, 8, false), mat);
    tube.castShadow = true;
    g.add(tube);
    const dirA = state.curve.getTangentAt(0).negate();
    clipA.position.copy(from).add(dirA.clone().multiplyScalar(-0.05));
    clipA.lookAt(clipA.position.clone().add(dirA));
    const dirB = state.curve.getTangentAt(1);
    clipB.position.copy(to).add(dirB.clone().multiplyScalar(-0.05));
    clipB.lookAt(clipB.position.clone().add(dirB));
  }
  function firePulse() {
    if (!state.curve) return;
    state.active = true;
    state.t = 0;
    pulse.visible = true;
  }
  function update(dt) {
    if (!state.active) return;
    state.t += dt * 2.6;
    if (state.t >= 1) {
      state.active = false;
      pulse.visible = false;
      return;
    }
    // travels from the object (end) to the pad (start)
    pulse.position.copy(state.curve.getPointAt(1 - state.t));
  }
  return { group: g, setEnds, firePulse, update, state, setColor: (c) => mat.color.set(c) };
}

/** GND wristband: a soft fabric ring. */
export function createWristband() {
  const g = new THREE.Group();
  const band = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.05, 12, 40), std({ color: PALETTE.terracotta, roughness: 0.9 })));
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.05;
  const snap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 12), new THREE.MeshStandardMaterial({ color: '#8f97a3', metalness: 0.9, roughness: 0.3 }));
  snap.position.set(0.19, 0.105, 0);
  g.add(band, snap);
  band.userData.pick = { type: 'gnd' };
  g.userData = { picks: [band], top: new THREE.Vector3(0.19, 0.12, 0) };
  return g;
}

/** The activity book lying on the table. */
export function createBook() {
  const g = new THREE.Group();
  const pages = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.09, 1.02), std({ color: '#fbf5ea', roughness: 0.95 })));
  pages.position.y = 0.045;
  const cover = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 1.06), new THREE.MeshStandardMaterial({ map: makeBookCover(), roughness: 0.6 })));
  cover.position.y = 0.1;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 1.06), std({ color: PALETTE.terracottaDeep }));
  back.position.y = 0.01;
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 1.06), std({ color: PALETTE.terracottaDeep }));
  spine.position.set(-0.4, 0.06, 0);
  g.add(pages, cover, back, spine);
  g.rotation.y = 0.35;
  cover.userData.pick = { type: 'book' };
  pages.userData.pick = cover.userData.pick;
  g.userData = { picks: [cover, pages] };
  return g;
}

/** A friendly cartoon hand: index finger pointing along -z, fingertip at the origin. */
export function createHand() {
  const g = new THREE.Group();
  g.name = 'hand';
  const skin = std({ color: '#e9b88e', roughness: 0.75 });
  const finger = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.34, 6, 14), skin));
  finger.rotation.x = Math.PI / 2;
  finger.position.set(0, 0.035, 0.22);
  const palm = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.23, 26, 18), skin));
  palm.scale.set(1.15, 0.5, 1.15);
  palm.position.set(0.14, 0.07, 0.62);
  const knuckles = [0.16, 0.29, 0.4].map((x, i) => {
    const k = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.08 - i * 0.008, 14, 10), skin));
    k.position.set(x, 0.035, 0.44 + i * 0.03);
    return k;
  });
  const thumb = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.2, 6, 12), skin));
  thumb.position.set(-0.2, 0.06, 0.6);
  thumb.rotation.set(0.6, 0, 0.9);
  const arm = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.16, 0.8, 22), skin));
  arm.rotation.x = Math.PI / 2;
  arm.position.set(0.14, 0.085, 1.28);
  g.add(finger, palm, ...knuckles, thumb, arm);
  const wristLocal = new THREE.Vector3(0.14, 0.085, 0.95);
  const pathLocal = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.04, 0.3), new THREE.Vector3(0.1, 0.09, 0.65), wristLocal.clone()];
  return {
    group: g,
    wristLocal,
    moving: false,
    wristWorld() {
      g.updateMatrixWorld(true);
      return g.localToWorld(wristLocal.clone());
    },
    /** Fingertip → wrist, in world space (the current's path through the hand). */
    pathWorld() {
      g.updateMatrixWorld(true);
      return new THREE.CatmullRomCurve3(pathLocal.map((p) => g.localToWorld(p.clone())));
    },
  };
}

/** A glowing pulse that travels along a list of curves, with a short trail. */
export function createPulse() {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 14), new THREE.MeshBasicMaterial({ color: PALETTE.led }));
  const trail = [0.045, 0.034, 0.024, 0.016].map((r) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 10), new THREE.MeshBasicMaterial({ color: PALETTE.led, transparent: true, opacity: 0.6 }));
    g.add(m);
    return m;
  });
  g.add(head);
  g.visible = false;
  const history = [];
  return {
    group: g,
    /** segments: [{ curve, dur, reverse }] — resolves when the pulse reaches the end. */
    async run(tweens, ctx, segments, ease) {
      g.visible = true;
      history.length = 0;
      for (const seg of segments) {
        await tweens.run(ctx, seg.dur, (t) => {
          const tt = seg.reverse ? 1 - t : t;
          head.position.copy(seg.curve.getPointAt(Math.min(1, Math.max(0, tt))));
          history.unshift(head.position.clone());
          if (history.length > 12) history.pop();
          trail.forEach((m, i) => m.position.copy(history[Math.min(history.length - 1, (i + 1) * 3)] || head.position));
        }, ease);
      }
      g.visible = false;
    },
    hide() {
      g.visible = false;
    },
  };
}
