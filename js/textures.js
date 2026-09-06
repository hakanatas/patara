import * as THREE from 'three';
import { PALETTE } from './config.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
function finish(c, { repeat = null, anisotropy = 4 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

/** Round pad label (transparent background). */
export function makePadLabel(text, { fg = '#1c1a10', bg = null, size = 128 } = {}) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  if (bg) {
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const big = text.length <= 1;
  ctx.font = `${big ? 700 : 800} ${big ? size * 0.62 : text.length > 5 ? size * 0.2 : size * 0.26}px "Instrument Sans", "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText(text, size / 2, size / 2 + (big ? size * 0.03 : size * 0.02));
  return finish(c);
}

/** Small silkscreen text (transparent). */
export function makeSilkText(text, { fg = 'rgba(255,255,255,0.7)', w = 512, h = 96, font = 700, spacing = 0.28, size = 56 } = {}) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${font} ${size}px "Fraunces", Georgia, serif`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing * size}px`;
  ctx.fillText(text, w / 2 + (spacing * size) / 2, h / 2);
  return finish(c);
}

/** A sheet of paper with a graphite pencil drawing (a filled arrow). */
export function makePencilPaper() {
  const c = canvas(512, 400);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fbf7ee';
  ctx.fillRect(0, 0, 512, 400);
  // faint ruled lines
  ctx.strokeStyle = 'rgba(120,140,200,0.18)';
  ctx.lineWidth = 2;
  for (let y = 60; y < 400; y += 44) {
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(482, y);
    ctx.stroke();
  }
  // graphite scribble: a fat arrow drawn with many strokes
  ctx.strokeStyle = 'rgba(48,48,52,0.85)';
  ctx.lineCap = 'round';
  const arrow = [[110, 300], [300, 300], [300, 340], [420, 240], [300, 140], [300, 180], [110, 180]];
  for (let pass = 0; pass < 14; pass++) {
    ctx.lineWidth = 4 + Math.random() * 3;
    ctx.beginPath();
    arrow.forEach(([x, y], i) => {
      const jx = x + (Math.random() - 0.5) * 14;
      const jy = y + (Math.random() - 0.5) * 14;
      if (i === 0) ctx.moveTo(jx, jy);
      else ctx.lineTo(jx, jy);
    });
    ctx.closePath();
    ctx.stroke();
  }
  // hatch fill
  ctx.strokeStyle = 'rgba(48,48,52,0.6)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 40; i++) {
    const y = 185 + i * 3.2;
    ctx.beginPath();
    ctx.moveTo(120 + Math.random() * 10, y + Math.random() * 6);
    ctx.lineTo(290 + Math.random() * 10, y + Math.random() * 6);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(48,48,52,0.85)';
  ctx.font = '600 22px "Fraunces", Georgia, serif';
  ctx.fillText('kurşun kalem = iletken', 130, 365);
  return finish(c);
}

/** Book cover for the activity book. */
export function makeBookCover() {
  const c = canvas(512, 680);
  const ctx = c.getContext('2d');
  ctx.fillStyle = PALETTE.terracotta;
  ctx.fillRect(0, 0, 512, 680);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
    if ((i + j) % 2) continue;
    ctx.beginPath();
    ctx.roundRect(120 + i * 56, 90 + j * 56, 40, 40, 10);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = '500 58px "Fraunces", Georgia, serif';
  ctx.fillText('Patara', 256, 470);
  ctx.font = '400 40px "Fraunces", Georgia, serif';
  ctx.fillText('Etkinlik Kitabı', 256, 525);
  ctx.font = '600 18px "Instrument Sans", Arial, sans-serif';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
  ctx.fillText('12 MACERA', 258, 590);
  return finish(c);
}

/** Subtle PCB grid for the board top. */
export function makePcbTexture(color = PALETTE.moss) {
  const c = canvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(10 + i * 44, 0);
    ctx.lineTo(10 + i * 44, 256);
    ctx.moveTo(0, 20 + i * 44);
    ctx.lineTo(256, 20 + i * 44);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 256, 1.5 + Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  return finish(c, { repeat: [3, 3] });
}

/** Bubbly two-line product title for the shell: orange letters with a dark outline. */
export function makeTitleText() {
  const c = canvas(512, 256);
  const ctx = c.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const draw = (text, y, size) => {
    ctx.font = `800 ${size}px "Fraunces", Georgia, serif`;
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#5a2d0c';
    ctx.strokeText(text, 256, y);
    ctx.fillStyle = '#f26b21';
    ctx.fillText(text, 256, y);
  };
  draw('PATARA', 84, 96);
  draw('BOARD', 186, 84);
  return finish(c);
}

/** Small white pictogram + caption for the feet (mouse / keyboard). */
export function makeFootLabel(kind) {
  const c = canvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  if (kind === 'mouse') {
    ctx.beginPath();
    ctx.roundRect(88, 40, 80, 120, 40);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(128, 40);
    ctx.lineTo(128, 96);
    ctx.moveTo(88, 96);
    ctx.lineTo(168, 96);
    ctx.stroke();
    ctx.font = '700 44px "Instrument Sans", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MOUSE', 128, 215);
  } else {
    ctx.beginPath();
    ctx.roundRect(36, 60, 184, 100, 16);
    ctx.stroke();
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.roundRect(52 + i * 27, 78 + r * 30, 18, 18, 4);
      ctx.fill();
    }
    ctx.font = '700 48px "Instrument Sans", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WASD', 128, 215);
  }
  return finish(c);
}
