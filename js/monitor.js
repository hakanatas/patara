import * as THREE from 'three';
import { PALETTE } from './config.js';

/** A small laptop whose screen shows the game the board is controlling. */
export function createMonitor() {
  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: '#d8d4cc', roughness: 0.4, metalness: 0.5 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 1.1), shell);
  base.position.y = 0.025;
  base.castShadow = base.receiveShadow = true;
  const keys = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.012, 0.55), new THREE.MeshStandardMaterial({ color: '#3a3f4a', roughness: 0.7 }));
  keys.position.set(0, 0.056, -0.05);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.01, 0.28), new THREE.MeshStandardMaterial({ color: '#c8c4bc', roughness: 0.5 }));
  pad.position.set(0, 0.056, 0.36);
  const lid = new THREE.Group();
  const lidBody = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.08, 0.05), shell);
  lidBody.position.y = 0.54;
  lidBody.castShadow = true;
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 400;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.56, 0.96), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.set(0, 0.55, 0.027);
  screen.userData.pick = { type: 'monitor' };
  lid.add(lidBody, screen);
  lid.position.set(0, 0.05, -0.53);
  lid.rotation.x = -0.32;
  g.add(base, keys, pad, lid);
  g.userData = { picks: [screen] };

  const ctx = canvas.getContext('2d');
  const game = { x: 0, y: 3, sx: 4, sy: 1, score: 0, keys: [], jump: 0, flash: 0, message: '' };

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#0f1a33';
    ctx.fillRect(0, 0, W, H);
    // title bar
    ctx.fillStyle = '#1a2340';
    ctx.fillRect(0, 0, W, 40);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(22 + i * 22, 20, 7, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '600 16px "Instrument Sans", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('patara-oyun.sb3', 100, 26);
    ctx.textAlign = 'right';
    ctx.fillText(`Yıldız: ${game.score}`, W - 18, 26);
    // stage grid 6x4
    const gx = 0, gy = 40, gw = W, gh = H - 40 - 46;
    const cw = gw / 6, ch = gh / 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(gx + i * cw, gy);
      ctx.lineTo(gx + i * cw, gy + gh);
      ctx.stroke();
    }
    for (let j = 1; j < 4; j++) {
      ctx.beginPath();
      ctx.moveTo(gx, gy + j * ch);
      ctx.lineTo(gx + gw, gy + j * ch);
      ctx.stroke();
    }
    // star
    const scx = gx + game.sx * cw + cw / 2, scy = gy + game.sy * ch + ch / 2;
    ctx.fillStyle = PALETTE.led;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 11 : 26;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(scx + Math.cos(a) * r, scy + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    // robot
    const rx = gx + game.x * cw + cw / 2, ry = gy + game.y * ch + ch / 2 - game.jump * 22;
    ctx.fillStyle = game.flash > 0 ? '#ffd23f' : '#9fd3ff';
    ctx.beginPath();
    ctx.roundRect(rx - 26, ry - 24, 52, 48, 12);
    ctx.fill();
    ctx.fillStyle = '#0f1a33';
    ctx.beginPath();
    ctx.arc(rx - 10, ry - 6, 5, 0, Math.PI * 2);
    ctx.arc(rx + 10, ry - 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f1a33';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(rx, ry + 6, 9, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#9fd3ff';
    ctx.fillRect(rx - 3, ry - 36, 6, 12);
    ctx.beginPath();
    ctx.arc(rx, ry - 38, 5, 0, Math.PI * 2);
    ctx.fill();
    // key log bar
    ctx.fillStyle = '#0a1226';
    ctx.fillRect(0, H - 46, W, 46);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '500 15px "Instrument Sans", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Bilgisayarın gördüğü:', 16, H - 17);
    let kx = 190;
    ctx.font = '700 16px "Instrument Sans", Arial, sans-serif';
    for (const k of game.keys.slice(-8)) {
      const w = ctx.measureText(k).width + 18;
      ctx.fillStyle = '#eef2ff';
      ctx.beginPath();
      ctx.roundRect(kx, H - 36, w, 26, 7);
      ctx.fill();
      ctx.fillStyle = '#0f1a33';
      ctx.fillText(k, kx + 9, H - 17);
      kx += w + 6;
    }
    if (game.message) {
      ctx.font = '600 18px "Instrument Sans", Arial, sans-serif';
      const w = ctx.measureText(game.message).width + 32;
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.beginPath();
      ctx.roundRect(W / 2 - w / 2, H - 100, w, 36, 18);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(game.message, W / 2, H - 76);
    }
    tex.needsUpdate = true;
  }

  let msgTimer = 0;
  function update(dt) {
    let dirty = false;
    if (game.jump > 0) {
      game.jump = Math.max(0, game.jump - dt * 4);
      dirty = true;
    }
    if (game.flash > 0) {
      game.flash -= dt;
      dirty = true;
    }
    if (msgTimer > 0) {
      msgTimer -= dt;
      if (msgTimer <= 0) {
        game.message = '';
        dirty = true;
      }
    }
    if (dirty) draw();
  }
  function moveStar() {
    let nx, ny;
    do {
      nx = Math.floor(Math.random() * 6);
      ny = Math.floor(Math.random() * 4);
    } while (nx === game.x && ny === game.y);
    game.sx = nx;
    game.sy = ny;
  }
  /** Apply a key. Returns true when a star was collected. */
  function press(key, label) {
    game.keys.push(label);
    if (key === 'up') game.y = Math.max(0, game.y - 1);
    if (key === 'down') game.y = Math.min(3, game.y + 1);
    if (key === 'left') game.x = Math.max(0, game.x - 1);
    if (key === 'right') game.x = Math.min(5, game.x + 1);
    if (key === 'space') game.jump = 1;
    let got = false;
    if (game.x === game.sx && game.y === game.sy) {
      game.score++;
      game.flash = 0.5;
      got = true;
      moveStar();
    }
    draw();
    return got;
  }
  function say(msg, secs = 2.2) {
    game.message = msg;
    msgTimer = secs;
    draw();
  }
  function reset() {
    Object.assign(game, { x: 0, y: 3, sx: 4, sy: 1, score: 0, keys: [], jump: 0, flash: 0, message: '' });
    draw();
  }
  draw();
  return { group: g, game, draw, update, press, say, reset, screen };
}
