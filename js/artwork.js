/**
 * Front and back artwork of the Patara PCB, drawn on canvas in "board units"
 * (u to the right, v up, origin at the shell centre), plus the silhouette
 * outline traced from the same drawing so the 3D board is cut exactly like
 * the print.
 */
import * as THREE from 'three';

export const ART = { uMin: -2.5, uMax: 2.5, vMin: -2.4, vMax: 3.25 };
ART.W = ART.uMax - ART.uMin;
ART.H = ART.vMax - ART.vMin;

const GREEN = '#46ab3a';
const GREEN_DARK = '#2f7d2a';
const GREEN_DOT = '#2c6b25';
const BROWN = '#4a2c10';
const YELLOW = '#f6b92d';
const MUSTARD = '#f0a41c';
const GOLD = '#d9b25a';
const KHAKI = '#dcc08a';
const KHAKI_DARK = '#b8985c';
const ORANGE = '#f26b21';

export const SHELL = { u: 0, v: -0.15, rx: 1.6, ry: 1.7 };
export const HEAD = { u: 0, v: 1.9, r: 0.74 };
export const USB = { u: 0, v: 3.05 };
export const ARM_HALF_WIDTH = 0.34;
export const FEET = [
  { side: -1, u: -1.42, v: -1.62, rot: 0.6 },
  { side: 1, u: 1.42, v: -1.62, rot: -0.6 },
];

/** Centreline of an arm from the shoulder to the tip; side = -1 left, +1 right. */
export function armCurve(side) {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 1.15, 0.55, 0),
    new THREE.Vector3(side * 1.72, 0.85, 0),
    new THREE.Vector3(side * 2.02, 1.3, 0),
    new THREE.Vector3(side * 2.08, 1.8, 0),
  ]);
}
/** Pad positions along an arm, from the shell outwards (5 pads). */
export function armPads(side) {
  const c = armCurve(side);
  return [0.13, 0.32, 0.51, 0.7, 0.9].map((t) => {
    const p = c.getPointAt(t);
    const tan = c.getTangentAt(t);
    return { u: p.x, v: p.y, angle: Math.atan2(tan.y, tan.x), t };
  });
}

/** Mapping between board units and canvas pixels. */
export function scaler(k) {
  return { k, x: (u) => (u - ART.uMin) * k, y: (v) => (ART.vMax - v) * k, l: (len) => len * k };
}

function armPolygon(side) {
  const c = armCurve(side);
  const w = ARM_HALF_WIDTH;
  const outer = [], inner = [];
  const N = 28;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = c.getPointAt(t);
    const tan = c.getTangentAt(t);
    const nx = -tan.y, ny = tan.x;
    const ww = w * (1 + 0.12 * Math.sin(t * Math.PI)); // slightly fuller in the middle, like a flipper
    outer.push([p.x + nx * ww, p.y + ny * ww]);
    inner.push([p.x - nx * ww, p.y - ny * ww]);
  }
  const tip = c.getPointAt(1);
  const tan = c.getTangentAt(1);
  const a0 = Math.atan2(tan.x, -tan.y);
  const cap = [];
  for (let i = 0; i <= 14; i++) {
    const a = a0 - (i / 14) * Math.PI;
    cap.push([tip.x + Math.cos(a) * w, tip.y + Math.sin(a) * w]);
  }
  return [...outer, ...cap, ...inner.reverse()];
}

function crownPath(ctx, S) {
  ctx.beginPath();
  ctx.moveTo(S.x(-0.66), S.y(2.18));
  ctx.lineTo(S.x(-0.6), S.y(2.72));
  ctx.bezierCurveTo(S.x(-0.55), S.y(3.2), S.x(0.55), S.y(3.2), S.x(0.6), S.y(2.72));
  ctx.lineTo(S.x(0.66), S.y(2.18));
  ctx.closePath();
}
function footPath(ctx, S, f) {
  ctx.save();
  ctx.translate(S.x(f.u), S.y(f.v));
  ctx.rotate(-f.rot);
  ctx.beginPath();
  ctx.roundRect(-S.l(0.4), -S.l(0.34), S.l(0.8), S.l(0.68), S.l(0.26));
  ctx.restore();
}

/** Fill every piece of the silhouette in the current fillStyle. */
export function paintSilhouette(ctx, S) {
  const ellipse = (u, v, rx, ry) => {
    ctx.beginPath();
    ctx.ellipse(S.x(u), S.y(v), S.l(rx), S.l(ry), 0, 0, Math.PI * 2);
    ctx.fill();
  };
  const poly = (pts) => {
    ctx.beginPath();
    pts.forEach(([u, v], i) => (i ? ctx.lineTo(S.x(u), S.y(v)) : ctx.moveTo(S.x(u), S.y(v))));
    ctx.closePath();
    ctx.fill();
  };
  ellipse(SHELL.u, SHELL.v, SHELL.rx, SHELL.ry);
  ctx.fillRect(S.x(-0.5), S.y(1.9), S.l(1.0), S.l(0.9)); // neck
  ellipse(HEAD.u, HEAD.v, HEAD.r, HEAD.r);
  ellipse(0, 2.32, 1.08, 0.33); // brim
  crownPath(ctx, S);
  ctx.fill();
  poly(armPolygon(-1));
  poly(armPolygon(1));
  FEET.forEach((f) => {
    footPath(ctx, S, f);
    ctx.fill();
  });
}

function fontSans(px, weight = 700) {
  return `${weight} ${px}px "Instrument Sans", "Helvetica Neue", Arial, sans-serif`;
}
function fontSerif(px, weight = 800) {
  return `${weight} ${px}px "Fraunces", Georgia, serif`;
}

/** Tiny turtle face used as the "O" of BOARD. */
function tinyFace(ctx, x, y, r) {
  ctx.save();
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = r * 0.18;
  ctx.strokeStyle = BROWN;
  ctx.stroke();
  ctx.fillStyle = KHAKI;
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.75, r * 1.25, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x - r * 0.6, y - r * 1.45, r * 1.2, r * 0.75, r * 0.3);
  ctx.fill();
  ctx.fillStyle = '#fff';
  [-0.38, 0.38].forEach((dx) => {
    ctx.beginPath();
    ctx.ellipse(x + dx * r, y - r * 0.1, r * 0.28, r * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#111';
  [-0.36, 0.4].forEach((dx) => {
    ctx.beginPath();
    ctx.arc(x + dx * r, y - r * 0.05, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.strokeStyle = '#111';
  ctx.lineWidth = r * 0.12;
  ctx.beginPath();
  ctx.arc(x, y + r * 0.2, r * 0.38, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
  ctx.restore();
}

/** Front artwork. */
export function makeFrontTexture(size = 1024) {
  const k = size / ART.W;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = Math.round(ART.H * k);
  const ctx = c.getContext('2d');
  const S = scaler(k);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // ---- base PCB green ---------------------------------------------------
  ctx.fillStyle = GREEN;
  paintSilhouette(ctx, S);

  // dotted white outline along the arms and feet (silkscreen)
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  [-1, 1].forEach((side) => {
    const cur = armCurve(side);
    for (let i = 1; i <= 12; i++) {
      const t = i / 12;
      const p = cur.getPointAt(t);
      const tan = cur.getTangentAt(t);
      const nx = -tan.y, ny = tan.x;
      const ww = ARM_HALF_WIDTH * (1 + 0.12 * Math.sin(t * Math.PI)) - 0.07;
      [[1], [-1]].forEach(([s]) => {
        ctx.beginPath();
        ctx.arc(S.x(p.x + nx * ww * s), S.y(p.y + ny * ww * s), S.l(0.022), 0, Math.PI * 2);
        ctx.fill();
      });
    }
  });
  FEET.forEach((f) => {
    ctx.save();
    ctx.translate(S.x(f.u), S.y(f.v));
    ctx.rotate(-f.rot);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * S.l(0.32), Math.sin(a) * S.l(0.26), S.l(0.02), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  // ---- shell ------------------------------------------------------------
  const shell = (inset = 0) => {
    ctx.beginPath();
    ctx.ellipse(S.x(SHELL.u), S.y(SHELL.v), S.l(SHELL.rx - 0.06 - inset), S.l(SHELL.ry - 0.06 - inset), 0, 0, Math.PI * 2);
  };
  ctx.fillStyle = YELLOW;
  shell();
  ctx.fill();

  // piano (clipped by the shell)
  ctx.save();
  shell(0.09);
  ctx.clip();
  const keysTop = -0.32, keysBottom = -2.0, KW = 0.33, u0 = -1.32;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(S.x(u0), S.y(keysTop), S.l(KW * 8), S.l(keysTop - keysBottom));
  ctx.strokeStyle = '#111';
  ctx.lineWidth = S.l(0.028);
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(S.x(u0 + i * KW), S.y(keysTop));
    ctx.lineTo(S.x(u0 + i * KW), S.y(keysBottom));
    ctx.stroke();
  }
  ctx.fillStyle = '#111';
  [1, 2, 4, 5, 6].forEach((i) => {
    ctx.beginPath();
    ctx.roundRect(S.x(u0 + i * KW - 0.085), S.y(keysTop), S.l(0.17), S.l(0.64), [0, 0, S.l(0.03), S.l(0.03)]);
    ctx.fill();
  });
  ctx.restore();
  ctx.lineWidth = S.l(0.05);
  ctx.strokeStyle = '#111';
  ctx.beginPath();
  ctx.moveTo(S.x(-1.6), S.y(keysTop));
  ctx.lineTo(S.x(1.6), S.y(keysTop));
  ctx.stroke();

  // shell rim (thick brown ring) + rivets
  ctx.strokeStyle = BROWN;
  ctx.lineWidth = S.l(0.12);
  shell();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  [0.2, 0.8, 1.35, 1.8, 2.3, 2.95, 3.5, 4.05, 4.6, 5.15, 5.7, 6.1].forEach((a) => {
    ctx.beginPath();
    ctx.arc(S.x(SHELL.u + Math.cos(a) * (SHELL.rx - 0.06)), S.y(SHELL.v + Math.sin(a) * (SHELL.ry - 0.06)), S.l(0.03), 0, Math.PI * 2);
    ctx.fill();
  });

  // top plate: a domed scute split in two halves
  const plate = () => {
    ctx.beginPath();
    ctx.roundRect(S.x(-1.28), S.y(1.28), S.l(2.56), S.l(1.5), [S.l(0.7), S.l(0.7), S.l(0.42), S.l(0.42)]);
  };
  ctx.fillStyle = MUSTARD;
  plate();
  ctx.fill();
  ctx.strokeStyle = BROWN;
  ctx.lineWidth = S.l(0.05);
  plate();
  ctx.stroke();
  ctx.lineWidth = S.l(0.035);
  ctx.beginPath();
  ctx.moveTo(S.x(0), S.y(1.28));
  ctx.lineTo(S.x(0), S.y(-0.22));
  ctx.stroke();
  // inner scute lines (lighter)
  ctx.strokeStyle = 'rgba(74,44,16,0.35)';
  ctx.lineWidth = S.l(0.02);
  ctx.beginPath();
  ctx.roundRect(S.x(-1.16), S.y(1.16), S.l(2.32), S.l(1.28), [S.l(0.6), S.l(0.6), S.l(0.36), S.l(0.36)]);
  ctx.stroke();

  // title: PATARA / B(turtle)ARD
  ctx.lineJoin = 'round';
  const titleLine = (text, v, px) => {
    ctx.font = fontSerif(px);
    ctx.lineWidth = S.l(0.055);
    ctx.strokeStyle = BROWN;
    ctx.strokeText(text, S.x(0), S.y(v));
    ctx.fillStyle = ORANGE;
    ctx.fillText(text, S.x(0), S.y(v));
  };
  titleLine('PATARA', 0.98, S.l(0.3));
  {
    const px = S.l(0.27);
    ctx.font = fontSerif(px);
    const wB = ctx.measureText('B').width, wO = ctx.measureText('O').width, wARD = ctx.measureText('ARD').width;
    const total = wB + wO + wARD;
    let x = S.x(0) - total / 2;
    const y = S.y(0.7);
    ctx.textAlign = 'left';
    ctx.lineWidth = S.l(0.055);
    ctx.strokeStyle = BROWN;
    ctx.fillStyle = ORANGE;
    ctx.strokeText('B', x, y);
    ctx.fillText('B', x, y);
    x += wB;
    tinyFace(ctx, x + wO / 2, y + px * 0.04, wO * 0.46);
    x += wO;
    ctx.strokeText('ARD', x, y);
    ctx.fillText('ARD', x, y);
    ctx.textAlign = 'center';
  }

  // d-pad and X / Y (printed)
  const disc = (u, v, r, glyph, px) => {
    ctx.beginPath();
    ctx.arc(S.x(u), S.y(v), S.l(r), 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = S.l(0.02);
    ctx.strokeStyle = '#111';
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.font = fontSans(S.l(px), 800);
    ctx.fillText(glyph, S.x(u), S.y(v) + S.l(0.01));
  };
  disc(-0.74, 0.55, 0.1, '▲', 0.11);
  disc(-0.74, 0.11, 0.1, '▼', 0.11);
  disc(-0.96, 0.33, 0.1, '◀', 0.11);
  disc(-0.52, 0.33, 0.1, '▶', 0.11);
  disc(0.74, 0.55, 0.12, 'X', 0.15);
  disc(0.98, 0.14, 0.12, 'Y', 0.15);

  // matrix footprint
  ctx.fillStyle = 'rgba(74,44,16,0.3)';
  for (let r = 0; r < 5; r++) for (let col = 0; col < 5; col++) {
    ctx.beginPath();
    ctx.arc(S.x(-0.28 + col * 0.14), S.y(0.62 - r * 0.14), S.l(0.03), 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- arms: gold pads and labels ---------------------------------------
  const LABELS = { '-1': ['GND', 'DOWN', 'RIGHT', 'LEFT', 'UP'], 1: ['GND', 'ENTER', 'R.CLICK', 'L.CLICK', 'SPACE'] };
  [-1, 1].forEach((side) => {
    armPads(side).forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(S.x(p.u), S.y(p.v), S.l(0.165), 0, Math.PI * 2);
      ctx.fillStyle = GOLD;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(S.x(p.u), S.y(p.v), S.l(0.045), 0, Math.PI * 2);
      ctx.fillStyle = '#1b1b1b';
      ctx.fill();
      const nx = -Math.sin(p.angle), ny = Math.cos(p.angle);
      const out = side < 0 ? 1 : -1;
      ctx.save();
      ctx.translate(S.x(p.u + nx * out * 0.25), S.y(p.v + ny * out * 0.25));
      ctx.rotate(side < 0 ? -(p.angle - Math.PI) : -p.angle);
      ctx.fillStyle = '#ffffff';
      ctx.font = fontSans(S.l(0.1), 800);
      ctx.fillText(LABELS[side][i], 0, 0);
      ctx.restore();
    });
  });

  // ---- feet: icons and through-holes ------------------------------------
  FEET.forEach((f) => {
    ctx.save();
    ctx.translate(S.x(f.u), S.y(f.v));
    ctx.rotate(-f.rot);
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = S.l(0.028);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-f.side * S.l(0.26), S.l(-0.2 + i * 0.13), S.l(0.035), 0, Math.PI * 2);
      ctx.stroke();
    }
    if (f.side < 0) {
      // mouse with a "1" (left click)
      ctx.beginPath();
      ctx.roundRect(S.l(-0.04), S.l(-0.2), S.l(0.24), S.l(0.36), S.l(0.12));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(S.l(0.08), S.l(-0.2));
      ctx.lineTo(S.l(0.08), S.l(-0.03));
      ctx.moveTo(S.l(-0.04), S.l(-0.03));
      ctx.lineTo(S.l(0.2), S.l(-0.03));
      ctx.stroke();
      ctx.font = fontSans(S.l(0.09), 800);
      ctx.fillText('1', S.l(0.03), S.l(-0.11));
    } else {
      ctx.save();
      ctx.rotate(-Math.PI / 2);
      ctx.font = fontSans(S.l(0.15), 800);
      ctx.fillText('WASD', 0, S.l(-0.08));
      ctx.restore();
      ctx.beginPath();
      ctx.roundRect(S.l(0.06), S.l(-0.2), S.l(0.15), S.l(0.4), S.l(0.03));
      ctx.stroke();
      for (let r = 0; r < 5; r++) for (let q = 0; q < 2; q++) ctx.fillRect(S.l(0.09 + q * 0.055), S.l(-0.17 + r * 0.075), S.l(0.035), S.l(0.04));
    }
    ctx.restore();
  });

  // ---- head (drawn over the shell rim) ------------------------------------
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.arc(S.x(HEAD.u), S.y(HEAD.v), S.l(HEAD.r), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(S.x(-0.5), S.y(1.9), S.l(1.0), S.l(0.45));
  // freckles
  ctx.fillStyle = GREEN_DOT;
  [[-0.62, 2.05], [-0.58, 1.85], [-0.66, 1.68], [0.62, 2.05], [0.58, 1.85], [0.66, 1.68], [-0.4, 2.35], [0.4, 2.35]].forEach(([u, v]) => {
    ctx.beginPath();
    ctx.arc(S.x(u), S.y(v), S.l(0.025), 0, Math.PI * 2);
    ctx.fill();
  });
  const eye = (u, v) => {
    ctx.beginPath();
    ctx.ellipse(S.x(u), S.y(v), S.l(0.19), S.l(0.24), 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = S.l(0.03);
    ctx.strokeStyle = '#111';
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(S.x(u + 0.03), S.y(v - 0.03), S.l(0.1), S.l(0.12), 0, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(S.x(u + 0.06), S.y(v + 0.03), S.l(0.035), 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  };
  eye(-0.25, 1.98);
  eye(0.25, 1.98);
  ctx.fillStyle = '#ea5b52';
  [-0.52, 0.52].forEach((u) => {
    ctx.beginPath();
    ctx.arc(S.x(u), S.y(1.7), S.l(0.11), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#111';
  [-0.06, 0.06].forEach((u) => {
    ctx.beginPath();
    ctx.arc(S.x(u), S.y(1.77), S.l(0.022), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.strokeStyle = '#111';
  ctx.lineWidth = S.l(0.04);
  ctx.beginPath();
  ctx.arc(S.x(0), S.y(1.72), S.l(0.26), Math.PI * 0.18, Math.PI * 0.82);
  ctx.stroke();

  // ---- hat ------------------------------------------------------------------
  ctx.fillStyle = KHAKI;
  ctx.beginPath();
  ctx.ellipse(S.x(0), S.y(2.32), S.l(1.04), S.l(0.3), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = KHAKI_DARK;
  ctx.lineWidth = S.l(0.03);
  ctx.stroke();
  crownPath(ctx, S);
  ctx.fillStyle = KHAKI;
  ctx.fill();
  ctx.strokeStyle = KHAKI_DARK;
  ctx.stroke();
  // rivets
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  [-0.84, -0.46, 0, 0.46, 0.84].forEach((u) => {
    ctx.beginPath();
    ctx.arc(S.x(u), S.y(2.34), S.l(0.035), 0, Math.PI * 2);
    ctx.fill();
  });
  [[-0.3, 2.9], [0, 3.0], [0.3, 2.9]].forEach(([u, v]) => {
    ctx.beginPath();
    ctx.arc(S.x(u), S.y(v), S.l(0.03), 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Back artwork: green PCB with a hexagon pour, headers' labels and the title. */
export function makeBackTexture(size = 512) {
  const k = size / ART.W;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = Math.round(ART.H * k);
  const ctx = c.getContext('2d');
  const S = scaler(k);
  ctx.fillStyle = GREEN_DARK;
  paintSilhouette(ctx, S);
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1.5;
  const r = S.l(0.14);
  for (let y = 0; y < c.height + r; y += r * 1.5) {
    for (let x = 0; x < c.width + r; x += r * Math.sqrt(3)) {
      const ox = (Math.round(y / (r * 1.5)) % 2) * (r * Math.sqrt(3)) / 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        const px = x + ox + Math.cos(a) * r, py = y + Math.sin(a) * r;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = fontSerif(S.l(0.32));
  ctx.lineWidth = S.l(0.05);
  ctx.strokeStyle = '#1e4d1a';
  ctx.strokeText('PATARA', S.x(0), S.y(0.2));
  ctx.strokeText('BOARD', S.x(0), S.y(-0.15));
  ctx.fillStyle = ORANGE;
  ctx.fillText('PATARA', S.x(0), S.y(0.2));
  ctx.fillText('BOARD', S.x(0), S.y(-0.15));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Trace the silhouette into a THREE.Shape (board units). */
export function makeOutlineShape(res = 560) {
  const k = res / ART.W;
  const W = res, H = Math.round(ART.H * k);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  paintSilhouette(ctx, scaler(k));
  const d = ctx.getImageData(0, 0, W, H).data;
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4] > 127;

  let sx = -1, sy = -1;
  outer: for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(x, y)) { sx = x; sy = y; break outer; }
  if (sx < 0) throw new Error('empty silhouette');
  // Moore-neighbour tracing, clockwise; the backtrack of the start pixel is the (outside) pixel on its left.
  const N = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const pts = [];
  let cx = sx, cy = sy, dir = 0;
  const start = { x: sx, y: sy };
  let startDir = -1;
  for (let guard = 0; guard < W * H; guard++) {
    pts.push([cx, cy]);
    let found = false;
    for (let i = 0; i < 8; i++) {
      const nd = (dir + 5 + i) % 8;
      const nx = cx + N[nd][0], ny = cy + N[nd][1];
      if (inside(nx, ny)) {
        if (cx === start.x && cy === start.y && startDir === -1) startDir = nd;
        cx = nx; cy = ny; dir = nd; found = true;
        break;
      }
    }
    if (!found) break;
    if (cx === start.x && cy === start.y && pts.length > 2) {
      let nd0 = -1;
      for (let i = 0; i < 8; i++) {
        const nd = (dir + 5 + i) % 8;
        if (inside(cx + N[nd][0], cy + N[nd][1])) { nd0 = nd; break; }
      }
      if (nd0 === startDir) break;
    }
  }
  let poly = pts;
  for (let it = 0; it < 2; it++) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    poly = out;
  }
  poly = simplify(poly, 1.2);
  const shape = new THREE.Shape();
  poly.forEach(([x, y], i) => {
    const u = x / k + ART.uMin, v = ART.vMax - y / k;
    i ? shape.lineTo(u, v) : shape.moveTo(u, v);
  });
  shape.closePath();
  return shape;
}

function simplify(points, eps) {
  if (points.length < 3) return points;
  const sq = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  const segDist = (p, a, b) => {
    const l2 = sq(a, b);
    if (!l2) return sq(p, a);
    let t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / l2;
    t = Math.max(0, Math.min(1, t));
    return sq(p, [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
  };
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = 0, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const dd = segDist(points[i], points[s], points[e]);
      if (dd > maxD) { maxD = dd; idx = i; }
    }
    if (maxD > eps * eps && idx > 0) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}
