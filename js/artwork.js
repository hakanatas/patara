/**
 * The real Patara artwork (front and back prints exported from the
 * production files) mapped into "board units": u to the right, v up,
 * origin near the shell centre. The silhouette is traced from the alpha
 * channel of the front print so the 3D board is cut exactly like the PCB.
 */
import * as THREE from 'three';

/** Board width in world units; the print's aspect ratio gives the height. */
export const BOARD_W = 4.9;
export const ART = { uMin: -BOARD_W / 2, uMax: BOARD_W / 2, vMin: -2.0, vMax: 3.62 };
ART.W = ART.uMax - ART.uMin;
ART.H = ART.vMax - ART.vMin;

/** Image-fraction (0..1 from the top-left of the print) → board units. */
export function P(fx, fy) {
  return { u: ART.uMin + fx * ART.W, v: ART.vMax - fy * ART.H };
}

export const FRONT_URL = './assets/board-front.webp';
export const BACK_URL = './assets/board-back.webp';

function loadImage(url, onProgress) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
    void onProgress;
  });
}

/** Load both prints, build textures and trace the outline. */
export async function loadArtwork(onStep) {
  onStep?.(0.35, 'Kaplumbağa çiziliyor…');
  const [front, back] = await Promise.all([loadImage(FRONT_URL), loadImage(BACK_URL)]);
  onStep?.(0.55, 'Kart kesiliyor…');
  const frontTex = new THREE.Texture(front);
  frontTex.colorSpace = THREE.SRGBColorSpace;
  frontTex.anisotropy = 8;
  frontTex.needsUpdate = true;
  const backTex = new THREE.Texture(back);
  backTex.colorSpace = THREE.SRGBColorSpace;
  backTex.needsUpdate = true;
  [frontTex, backTex].forEach((t) => {
    t.repeat.set(1 / ART.W, 1 / ART.H);
    t.offset.set(-ART.uMin / ART.W, -ART.vMin / ART.H);
  });
  const shape = traceOutline(front, 640);
  return { frontTex, backTex, shape, front, back };
}

/** Trace the alpha channel of the print into a THREE.Shape (board units). */
export function traceOutline(img, res = 640) {
  const W = res, H = Math.round((img.height / img.width) * res);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 110;
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
  poly = simplify(poly, 1.1);
  const shape = new THREE.Shape();
  poly.forEach(([x, y], i) => {
    const u = ART.uMin + (x / W) * ART.W, v = ART.vMax - (y / H) * ART.H;
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
