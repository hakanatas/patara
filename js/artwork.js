/**
 * Front and back artwork of the Patara PCB, drawn on canvas in "board units"
 * (u to the right, v up, origin at the shell centre), plus the silhouette
 * outline traced from the same drawing so the 3D board is cut exactly like
 * the print.
 */
import * as THREE from 'three';

export const ART = { uMin: -2.45, uMax: 2.45, vMin: -2.35, vMax: 3.0 };
ART.W = ART.uMax - ART.uMin;
ART.H = ART.vMax - ART.vMin;

const GREEN = '#43a838';
const GREEN_DARK = '#2f7d2a';
const BROWN = '#5a3714';
const YELLOW = '#f5b82e';
const MUSTARD = '#f0a21c';
const GOLD = '#d9b25a';
const BEIGE = '#e6c88a';
const BEIGE_DARK = '#c9a563';

/** Centreline of an arm; side = -1 (left) or +1 (right). */
export function armCurve(side) {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 1.2, 0.2, 0),
    new THREE.Vector3(side * 1.72, 0.5, 0),
    new THREE.Vector3(side * 2.0, 0.95, 0),
    new THREE.Vector3(side * 2.08, 1.45, 0),
  ]);
}
export const ARM_HALF_WIDTH = 0.32;
/** Pad positions along an arm, from the shell outwards (5 pads). */
export function armPads(side) {
  const c = armCurve(side);
  return [0.1, 0.3, 0.5, 0.7, 0.9].map((t) => {
    const p = c.getPointAt(t);
    const tan = c.getTangentAt(t);
    return { u: p.x, v: p.y, angle: Math.atan2(tan.y, tan.x), t };
  });
}
export const FEET = [
  { side: -1, u: -1.5, v: -1.7, rot: 0.45 },
  { side: 1, u: 1.5, v: -1.7, rot: -0.45 },
];
export const HEAD = { u: 0, v: 1.85, r: 0.72 };
export const USB = { u: 0, v: 2.85 };

/** Build a mapping between board units and canvas pixels. */
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
    outer.push([p.x + nx * w, p.y + ny * w]);
    inner.push([p.x - nx * w, p.y - ny * w]);
  }
  const tip = c.getPointAt(1);
  const tan = c.getTangentAt(1);
  const a0 = Math.atan2(tan.x, -tan.y); // angle of the outer offset
  const cap = [];
  for (let i = 0; i <= 12; i++) {
    const a = a0 - (i / 12) * Math.PI;
    cap.push([tip.x + Math.cos(a) * w, tip.y + Math.sin(a) * w]);
  }
  return [...outer, ...cap, ...inner.reverse()];
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
  ellipse(0, -0.15, 1.6, 1.7); // shell
  ctx.fillRect(S.x(-0.48), S.y(1.9), S.l(0.96), S.l(0.8)); // neck
  ellipse(HEAD.u, HEAD.v, HEAD.r, HEAD.r); // head
  ellipse(0, 2.28, 1.04, 0.3); // hat brim
  poly([[-0.64, 2.15], [-0.5, 2.9], [-0.3, 2.98], [0.3, 2.98], [0.5, 2.9], [0.64, 2.15]]); // crown
  poly(armPolygon(-1));
  poly(armPolygon(1));
  FEET.forEach((f) => {
    ctx.save();
    ctx.translate(S.x(f.u), S.y(f.v));
    ctx.rotate(-f.rot);
    ctx.beginPath();
    ctx.roundRect(-S.l(0.34), -S.l(0.3), S.l(0.68), S.l(0.6), S.l(0.2));
    ctx.fill();
    ctx.restore();
  });
}

function fontSans(px, weight = 700) {
  return `${weight} ${px}px "Instrument Sans", "Helvetica Neue", Arial, sans-serif`;
}
function fontSerif(px, weight = 800) {
  return `${weight} ${px}px "Fraunces", Georgia, serif`;
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

  // base PCB green
  ctx.fillStyle = GREEN;
  paintSilhouette(ctx, S);
  // faint copper pour texture
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * (c.height / 40));
    ctx.lineTo(c.width, i * (c.height / 40) + 30);
    ctx.stroke();
  }
  ctx.restore();

  // white outline dots along arms and feet (like the print)
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  [-1, 1].forEach((side) => {
    const cur = armCurve(side);
    for (let i = 0; i <= 9; i++) {
      const p = cur.getPointAt(i / 9);
      const tan = cur.getTangentAt(i / 9);
      const nx = -tan.y, ny = tan.x;
      ctx.beginPath();
      ctx.arc(S.x(p.x + nx * side * -0.25), S.y(p.y + ny * side * -0.25), S.l(0.022), 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // --- shell -------------------------------------------------------------
  const shell = () => {
    ctx.beginPath();
    ctx.ellipse(S.x(0), S.y(-0.15), S.l(1.52), S.l(1.62), 0, 0, Math.PI * 2);
  };
  ctx.fillStyle = YELLOW;
  shell();
  ctx.fill();

  // piano region (clipped by the shell)
  ctx.save();
  shell();
  ctx.clip();
  const keysTop = -0.3, keysBottom = -1.9, KW = 0.325, u0 = -1.3;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(S.x(u0), S.y(keysTop), S.l(KW * 8), S.l(keysTop - keysBottom));
  ctx.strokeStyle = '#111';
  ctx.lineWidth = S.l(0.03);
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(S.x(u0 + i * KW), S.y(keysTop));
    ctx.lineTo(S.x(u0 + i * KW), S.y(keysBottom));
    ctx.stroke();
  }
  ctx.fillStyle = '#111';
  [1, 2, 4, 5, 6].forEach((i) => {
    ctx.beginPath();
    ctx.roundRect(S.x(u0 + i * KW - 0.085), S.y(keysTop), S.l(0.17), S.l(0.62), [0, 0, S.l(0.03), S.l(0.03)]);
    ctx.fill();
  });
  ctx.font = fontSans(S.l(0.2), 800);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#111';
  ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'].forEach((n, i) => {
    const u = u0 + (i + 0.5) * KW;
    const vy = -0.15 - 1.62 * Math.sqrt(Math.max(0, 1 - ((u - 0) / 1.52) ** 2)) + 0.22;
    ctx.fillText(n, S.x(u), S.y(Math.max(vy, keysBottom + 0.14)));
  });
  ctx.restore();
  ctx.lineWidth = S.l(0.05);
  ctx.strokeStyle = '#111';
  ctx.beginPath();
  ctx.moveTo(S.x(-1.5), S.y(keysTop));
  ctx.lineTo(S.x(1.5), S.y(keysTop));
  ctx.stroke();

  // shell outline
  ctx.strokeStyle = BROWN;
  ctx.lineWidth = S.l(0.075);
  shell();
  ctx.stroke();

  // top plate (two halves)
  const plate = (inset) => {
    ctx.beginPath();
    ctx.roundRect(S.x(-1.22 + inset), S.y(1.12 - inset), S.l(2.44 - inset * 2), S.l(1.3 - inset * 2), S.l(0.32));
  };
  ctx.fillStyle = MUSTARD;
  plate(0);
  ctx.fill();
  ctx.strokeStyle = BROWN;
  ctx.lineWidth = S.l(0.045);
  plate(0);
  ctx.stroke();
  ctx.lineWidth = S.l(0.03);
  ctx.beginPath();
  ctx.moveTo(S.x(0), S.y(1.12));
  ctx.lineTo(S.x(0), S.y(-0.18));
  ctx.stroke();

  // title
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const title = (text, v, px) => {
    ctx.font = fontSerif(px);
    ctx.lineWidth = S.l(0.05);
    ctx.strokeStyle = BROWN;
    ctx.strokeText(text, S.x(0), S.y(v));
    ctx.fillStyle = '#f26b21';
    ctx.fillText(text, S.x(0), S.y(v));
  };
  title('PATARA', 0.92, S.l(0.3));
  title('BOARD', 0.66, S.l(0.27));

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
  disc(-0.72, 0.53, 0.1, '▲', 0.11);
  disc(-0.72, 0.09, 0.1, '▼', 0.11);
  disc(-0.94, 0.31, 0.1, '◀', 0.11);
  disc(-0.5, 0.31, 0.1, '▶', 0.11);
  disc(0.72, 0.52, 0.12, 'X', 0.15);
  disc(0.96, 0.12, 0.12, 'Y', 0.15);

  // matrix footprint (dots under the LEDs)
  ctx.fillStyle = 'rgba(90,55,20,0.35)';
  for (let r = 0; r < 5; r++) for (let col = 0; col < 5; col++) {
    ctx.beginPath();
    ctx.arc(S.x(-0.28 + col * 0.14), S.y(0.6 - r * 0.14), S.l(0.03), 0, Math.PI * 2);
    ctx.fill();
  }

  // --- arms: gold pads and labels ----------------------------------------
  const LABELS = { '-1': ['GND', 'DOWN', 'RIGHT', 'LEFT', 'UP'], 1: ['GND', 'ENTER', 'R.CLICK', 'L.CLICK', 'SPACE'] };
  [-1, 1].forEach((side) => {
    armPads(side).forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(S.x(p.u), S.y(p.v), S.l(0.16), 0, Math.PI * 2);
      ctx.fillStyle = GOLD;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(S.x(p.u), S.y(p.v), S.l(0.045), 0, Math.PI * 2);
      ctx.fillStyle = '#1b1b1b';
      ctx.fill();
      // label along the arm, on the outer edge (away from the head)
      const nx = -Math.sin(p.angle), ny = Math.cos(p.angle);
      const out = side < 0 ? 1 : -1;
      ctx.save();
      ctx.translate(S.x(p.u + nx * out * 0.245), S.y(p.v + ny * out * 0.245));
      ctx.rotate(side < 0 ? -(p.angle - Math.PI) : -p.angle);
      ctx.fillStyle = '#ffffff';
      ctx.font = fontSans(S.l(0.105), 800);
      ctx.fillText(LABELS[side][i], 0, 0);
      ctx.restore();
    });
  });

  // --- feet: icons and through-holes -------------------------------------
  FEET.forEach((f) => {
    ctx.save();
    ctx.translate(S.x(f.u), S.y(f.v));
    ctx.rotate(-f.rot);
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = S.l(0.025);
    // four through-holes along the inner edge
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-f.side * S.l(0.19), S.l(-0.18 + i * 0.12), S.l(0.03), 0, Math.PI * 2);
      ctx.stroke();
    }
    if (f.side < 0) {
      ctx.beginPath();
      ctx.roundRect(S.l(-0.02), S.l(-0.16), S.l(0.2), S.l(0.3), S.l(0.1));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(S.l(0.08), S.l(-0.16));
      ctx.lineTo(S.l(0.08), S.l(-0.02));
      ctx.stroke();
    } else {
      ctx.font = fontSans(S.l(0.13), 800);
      ctx.save();
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('WASD', S.l(0.02), S.l(-0.14));
      ctx.restore();
      ctx.beginPath();
      ctx.roundRect(S.l(0.04), S.l(-0.2), S.l(0.14), S.l(0.36), S.l(0.03));
      ctx.stroke();
      for (let r = 0; r < 4; r++) for (let q = 0; q < 2; q++) {
        ctx.fillRect(S.l(0.07 + q * 0.05), S.l(-0.17 + r * 0.08), S.l(0.03), S.l(0.04));
      }
    }
    ctx.restore();
  });

  // --- head ----------------------------------------------------------------
  const eye = (u, v) => {
    ctx.beginPath();
    ctx.ellipse(S.x(u), S.y(v), S.l(0.17), S.l(0.21), 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = S.l(0.03);
    ctx.strokeStyle = '#111';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(S.x(u + 0.02), S.y(v - 0.02), S.l(0.09), 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(S.x(u + 0.05), S.y(v + 0.02), S.l(0.03), 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  };
  eye(-0.24, 1.95);
  eye(0.24, 1.95);
  ctx.fillStyle = '#e8534a';
  [-0.5, 0.5].forEach((u) => {
    ctx.beginPath();
    ctx.arc(S.x(u), S.y(1.7), S.l(0.1), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#111';
  [-0.06, 0.06].forEach((u) => {
    ctx.beginPath();
    ctx.arc(S.x(u), S.y(1.76), S.l(0.02), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.strokeStyle = '#111';
  ctx.lineWidth = S.l(0.035);
  ctx.beginPath();
  ctx.arc(S.x(0), S.y(1.72), S.l(0.24), Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();

  // --- hat -----------------------------------------------------------------
  ctx.fillStyle = BEIGE_DARK;
  ctx.beginPath();
  ctx.ellipse(S.x(0), S.y(2.28), S.l(1.0), S.l(0.27), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BEIGE;
  ctx.beginPath();
  ctx.moveTo(S.x(-0.6), S.y(2.2));
  ctx.lineTo(S.x(-0.48), S.y(2.88));
  ctx.quadraticCurveTo(S.x(0), S.y(3.02), S.x(0.48), S.y(2.88));
  ctx.lineTo(S.x(0.6), S.y(2.2));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = BROWN;
  ctx.lineWidth = S.l(0.025);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  [-0.78, -0.4, 0, 0.4, 0.78].forEach((u) => {
    ctx.beginPath();
    ctx.arc(S.x(u), S.y(2.3), S.l(0.035), 0, Math.PI * 2);
    ctx.fill();
  });
  [-0.28, 0, 0.28].forEach((u) => {
    ctx.beginPath();
    ctx.arc(S.x(u), S.y(2.55), S.l(0.03), 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Back artwork: green PCB with a hexagon pour and the title. */
export function makeBackTexture(size = 512) {
  const k = size / ART.W;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = Math.round(ART.H * k);
  const ctx = c.getContext('2d');
  const S = scaler(k);
  ctx.fillStyle = GREEN_DARK;
  paintSilhouette(ctx, S);
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
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = fontSerif(S.l(0.32));
  ctx.lineWidth = S.l(0.05);
  ctx.strokeStyle = '#1e4d1a';
  ctx.strokeText('PATARA', S.x(0), S.y(0.2));
  ctx.strokeText('BOARD', S.x(0), S.y(-0.15));
  ctx.fillStyle = '#f26b21';
  ctx.fillText('PATARA', S.x(0), S.y(0.2));
  ctx.fillText('BOARD', S.x(0), S.y(-0.15));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Trace the silhouette into a THREE.Shape (board units). */
export function makeOutlineShape(res = 520) {
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

  // start: first filled pixel scanning top-down
  let sx = -1, sy = -1;
  outer: for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(x, y)) { sx = x; sy = y; break outer; }
  if (sx < 0) throw new Error('empty silhouette');
  // Moore-neighbour tracing, clockwise
  const N = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const pts = [];
  let cx = sx, cy = sy, dir = 0; // backtrack is the (outside) pixel on the left; scan starts up-left, clockwise
  const start = { x: sx, y: sy };
  let startDir = -1;
  for (let guard = 0; guard < W * H; guard++) {
    pts.push([cx, cy]);
    let found = false;
    for (let i = 0; i < 8; i++) {
      const nd = (dir + 5 + i) % 8; // start from the neighbour after the backtrack
      const nx = cx + N[nd][0], ny = cy + N[nd][1];
      if (inside(nx, ny)) {
        if (cx === start.x && cy === start.y) {
          if (startDir === -1) startDir = nd;
          else if (nd === startDir && pts.length > 2) { found = false; break; }
        }
        cx = nx; cy = ny; dir = nd; found = true;
        break;
      }
    }
    if (!found) break;
    if (cx === start.x && cy === start.y && pts.length > 2 && startDir !== -1) {
      // check next move equals the very first one → closed loop
      let nd0 = -1;
      for (let i = 0; i < 8; i++) {
        const nd = (dir + 5 + i) % 8;
        if (inside(cx + N[nd][0], cy + N[nd][1])) { nd0 = nd; break; }
      }
      if (nd0 === startDir) break;
    }
  }
  // smooth (Chaikin) + simplify (Douglas–Peucker)
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
