/* Devre Kasabası · dünya motoru.
   Yan kaydırmalı, paralaks katmanlı kamp; yedi istasyon; istasyon kartı (gözlem → Sence? → yakından incele → görevler → açıklama);
   yakın plan tahtası (900 × 600) ve rehber (görev kutusu, kademeli ipucu, tahtada işaret). İstasyon tahtaları istasyonlar.js içinde. */
(function () {
  const M = window.PATARA_METIN, C = PT.C, CH = PT.chars, STN = M.istasyonlar;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const Q = new URLSearchParams(location.search);
  const md = (s) => String(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (x) => x * x * (3 - 2 * x);

  /* ── kayıt ── */
  const KEY = 'patara-kamp:v1';
  const save = { done: {}, ans: {}, found: [], met: [], intro: false, sound: true, hava: 'sabah' };
  if (Q.has('sifirla')) { try { localStorage.removeItem(KEY); } catch (e) { /* yok */ } }
  try { Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* yok */ }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* yok */ } };
  SES.on = save.sound !== false;
  const doneList = (sid) => (save.done[sid] = save.done[sid] || []);
  const isDone = (sid, tid) => doneList(sid).includes(tid);
  const stationDone = (s) => s.gorevler.every((g) => isDone(s.id, g.id));
  const idx = (sid) => STN.findIndex((s) => s.id === sid);

  /* ── istasyon tahtaları kayıt defteri ── */
  const BOARDS = {};
  window.KAMP = { def: (id, b) => { BOARDS[id] = b; } };

  /* ═════════ DÜNYA ═════════ */
  const WH = 760, GROUND = 600, WW = 7700;
  const cv = $('#world'), ctx = cv.getContext('2d'), K = PT.Ink(ctx);
  let W = 0, H = 0, dpr = 1, S = 1, offY = 0;
  const cam = { x: 900, tx: 900 };
  let cur = 0;
  const pat = { x: 700, tx: 700, dir: 1, walk: 0, mood: 'idle', moodUntil: 0, say: '', sayUntil: 0, arrive: null };

  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    S = Math.min(H / WH, W / 620); offY = H - WH * S - (W < 700 ? 0 : 0);
  }
  addEventListener('resize', resize); resize();
  /* telefonda kart altta yer kaplar: zemini kartın hemen üstüne oturt */
  function layoutY() {
    if (W > 760) { offY = H - WH * S; return; }
    const r = document.getElementById('card').getBoundingClientRect(), top = r.height ? r.top : H;
    const tb = document.querySelector('.top').getBoundingClientRect().bottom;
    S = clamp((top - tb) / 430, W / 720, W / 560);
    offY = Math.min(H - WH * S, top - 650 * S);
  }
  const viewW = () => W / S;
  /* masaüstünde kart solda yer kaplar: istasyonu kalan alanın ortasına al */
  const camFor = (x) => (W > 760 ? x - Math.min(420, W * 0.3) / 2 / S : x - 80);
  const clampCam = (x) => clamp(x, viewW() / 2 - 120, WW - viewW() / 2 + 120);

  /* katman dönüşümü: p = paralaks katsayısı */
  const layer = (p) => ctx.setTransform(dpr * S, 0, 0, dpr * S, dpr * (W / 2 - cam.x * p * S), dpr * offY);
  const visible = (x, w, p = 1) => Math.abs(x - cam.x * p) < viewW() / 2 + w;

  /* ── gökyüzü, bulut, dağ, ağaç ── */
  const CLOUD = 'M0 0 C -6 -22 22 -30 34 -18 C 42 -36 76 -34 82 -14 C 100 -18 110 0 98 8 L 4 8 C -8 8 -8 2 0 0 Z';
  const MOUNT = 'M0 0 L 160 -150 L 210 -110 L 300 -220 L 420 -70 L 480 -120 L 600 0 Z';
  const PINE = 'M0 -110 L 26 -60 L 14 -60 L 34 -24 L 18 -24 L 40 8 L -40 8 L -18 -24 L -34 -24 L -14 -60 L -26 -60 Z';
  const BUSH = 'M-30 0 C -40 -22 -14 -34 0 -22 C 12 -38 40 -26 32 0 Z';
  function sky(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H), night = save.hava === 'aksam';
    if (night) { g.addColorStop(0, '#2a3150'); g.addColorStop(0.6, '#43465f'); g.addColorStop(1, '#6a5f6e'); }
    else { g.addColorStop(0, '#f3ead6'); g.addColorStop(0.6, '#f1e7d3'); g.addColorStop(1, '#ead9bb'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const sx = W * 0.82 - cam.x * 0.03 * S, sy = offY + 120 * S;
    if (night) { cloudsAndBack(t, true); return; }
    const gl = ctx.createRadialGradient(sx, sy, 6, sx, sy, 150 * S);
    gl.addColorStop(0, 'rgba(232,163,61,.5)'); gl.addColorStop(1, 'rgba(232,163,61,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(sx, sy, 150 * S, 0, 7); ctx.fill();
    ctx.fillStyle = '#ecae4f'; ctx.beginPath(); ctx.arc(sx, sy, 40 * S, 0, 7); ctx.fill();
    cloudsAndBack(t, false);
  }
  function cloudsAndBack(t, night) {
    layer(0.15);
    for (let i = 0; i < 14; i++) {
      const x = i * 620 + ((t * 6 + i * 90) % 620) - 300, y = 70 + (i % 3) * 46;
      if (!visible(x, 160, 0.15)) continue;
      K.at(x, y, 1 + (i % 2) * 0.3, () => K.shape(CLOUD, { fill: night ? '#d9d4e6' : '#fbf6ec', w: 2.2, trace: false }));
    }
    layer(0.3);
    for (let i = 0; i < 9; i++) {
      const x = i * 560 - 400;
      if (!visible(x + 300, 400, 0.3)) continue;
      K.at(x, GROUND - 40, 1 + (i % 3) * 0.12, () => K.shape(MOUNT, { lit: i % 2 ? '#ddd2ba' : '#d5c9b0', w: 2, trace: false, hatchK: 0.4 }));
    }
    // uzak kasaba silüeti: kondansatörler, çip gökdelenleri, transistörler, anten
    for (let i = 0; i < 40; i++) {
      const x = i * 130 - 300 + (PT.nz(i * 3) - 0.5) * 50;
      if (!visible(x, 90, 0.3)) continue;
      K.at(x, GROUND - 30, 0.55 + PT.nz(i + 11) * 0.45, () => PT.town.skyline(K, Math.floor(PT.nz(i * 5) * 4), i % 2 ? '#d2c3a6' : '#c9bb9f'));
    }
    layer(0.6);
    for (let i = 0; i < 60; i++) {
      const x = i * 170 + (PT.nz(i) - 0.5) * 80 - 300;
      if (!visible(x, 70, 0.6)) continue;
      const s = 0.8 + PT.nz(i + 3) * 0.5;
      if (i % 3 === 1) K.at(x, GROUND - 14, s * 0.9, () => PT.town.wireTree(K, t, { seed: i, col: i % 2 ? '#9fb489' : '#8fa87b' }));
      else K.at(x, GROUND - 22, s, () => { K.shape(PINE, { lit: i % 3 ? '#9fb489' : '#8fa87b', w: 2.2, trace: false }); K.line('M0 8 L 0 22', { w: 3, color: '#7a5a3a', trace: false }); });
    }
    train(t);
  }
  /* USB treni: arka planda kablodan bir ray üstünde Patara'dan Bilgi'ye tuş taşır */
  const TRAIN = ['↑', 'SPACE', '←', 'ENTER', '→'];
  const TRAIN_Y = GROUND - 8, TRAIN_LEN = WW * 0.6 + 1400;
  const trainX = (t) => ((t * 70) % TRAIN_LEN) - 500;
  function train(t) {
    const x0 = cam.x * 0.6 - viewW() / 2 - 80, x1 = cam.x * 0.6 + viewW() / 2 + 80;
    ctx.strokeStyle = C.INK; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, TRAIN_Y); ctx.lineTo(x1, TRAIN_Y); ctx.stroke();
    ctx.strokeStyle = '#8b919c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, TRAIN_Y); ctx.lineTo(x1, TRAIN_Y); ctx.stroke();
    const hx = trainX(t);
    if (hx < x0 - 60 || hx - TRAIN.length * 64 - 60 > x1) return;
    TRAIN.forEach((l, i) => K.at(hx - 66 - i * 62, TRAIN_Y - 2, 0.9, () => PT.town.wagon(K, l, PT.town.LEDCOL[i % 4])));
    K.at(hx, TRAIN_Y - 2, 0.9, () => PT.town.loco(K));
  }
  function ground(t) {
    layer(1);
    const x0 = cam.x - viewW() / 2 - 60, x1 = cam.x + viewW() / 2 + 60;
    ctx.fillStyle = '#e4d6b8'; ctx.fillRect(x0, GROUND, x1 - x0, WH - GROUND + 400);
    ctx.fillStyle = '#d8c7a2'; ctx.fillRect(x0, GROUND + 30, x1 - x0, 46);
    ctx.strokeStyle = C.INK; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = Math.floor(x0 / 40) * 40; x < x1; x += 40) ctx.lineTo(x, GROUND + (PT.nz(x * 0.01) - 0.5) * 2.2);
    ctx.stroke();
    // bakır yollar (devre kartındaki izler gibi), lehim noktaları ve akan elektronlar
    [GROUND + 42, GROUND + 64].forEach((y, k) => {
      ctx.strokeStyle = C.INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.strokeStyle = '#d39a4c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      for (let x = Math.floor(x0 / 300) * 300 + k * 150; x < x1; x += 300) { ctx.fillStyle = '#d39a4c'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); ctx.strokeStyle = C.INK; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = C.PAPER; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill(); }
      if (!reduce && save.hava !== 'aksam') {
        const dir = k ? -1 : 1, off = ((t * 140 * dir) % 90 + 90) % 90;
        ctx.save(); ctx.shadowColor = C.AMBER; ctx.shadowBlur = 8; ctx.fillStyle = '#ffe08f';
        for (let x = Math.floor(x0 / 90) * 90 + off; x < x1; x += 90) { ctx.beginPath(); ctx.arc(x, y, 2.8, 0, 7); ctx.fill(); }
        ctx.restore();
      }
    });
  }
  /* ── akşam: karanlık örtü, ay, yıldızlar ve ışık veren her şey ── */
  function glow(x, y, r, col, a) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  }
  function nightPass(t, now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(14,18,40,.5)'; ctx.fillRect(0, 0, W, H);
    // yıldızlar ve ay (ekran uzayı)
    ctx.fillStyle = '#fff8e0';
    for (let i = 0; i < 70; i++) {
      const x = ((i * 197 - cam.x * 0.04 * S) % (W + 40) + W + 40) % (W + 40) - 20, y = offY + ((i * 83) % 330 + 10) * S;
      ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.8 + i)); ctx.beginPath(); ctx.arc(x, y, (i % 3) * 0.5 + 0.8, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const mx = W * 0.8 - cam.x * 0.03 * S, my = offY + 110 * S;
    glow(mx, my, 120 * S, 'rgba(243,231,196,.55)', 1);
    ctx.fillStyle = '#f3e7c4'; ctx.beginPath(); ctx.arc(mx, my, 34 * S, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a3e58'; ctx.beginPath(); ctx.arc(mx + 14 * S, my - 8 * S, 30 * S, 0, 7); ctx.fill();
    // ışıklar
    layer(1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    LAMPS.forEach((x, i) => { if (!visible(x, 140)) return; const col = PT.town.LEDCOL[i % 4]; glow(x, GROUND - 170, 120, col, 0.55); glow(x, GROUND + 6, 90, col, 0.22); });
    HOUSES.forEach((h) => {
      if (!visible(h.x, 160) || !h.wins) return;
      h.wins(t).forEach((w) => { if (w.on) glow(h.x + w.x, GROUND + w.y, h.r, '#ffd77a', 0.45); });
    });
    WALK.forEach((w) => { if (w.kind === 'led' && visible(w.x, 60)) { const s = laneS(w); glow(w.x, laneY(w) - 46 * s, 64, w.col, 0.6); } });
    STN.forEach((st) => {
      if (!visible(st.x, 320)) return;
      if (st.id === 'tak') glow(st.x + 85, GROUND - 94, 60, '#ffd77a', 0.5);
      if (st.id === 'halka') glow(st.x, GROUND - 128, 130, '#ffb36a', 0.35);
      if (st.id === 'sahne') glow(st.x, GROUND - 145, 160, '#ff5040', 0.3);
      if (st.id === 'tanis') glow(st.x, GROUND - 40, 110, '#ffd77a', 0.3);
    });
    const sx = pat.x - pat.dir * 90 + Math.sin(t * 1.3) * 10, sy = GROUND - 190 + Math.sin(t * 2.1) * 8;
    glow(sx, sy, 90, '#ffd77a', 0.55);
    glow(pat.x, GROUND - 120, 40, '#ff5040', 0.3);
    // bakır yollarda akan elektronlar
    const x0 = cam.x - viewW() / 2 - 60, x1 = cam.x + viewW() / 2 + 60;
    [GROUND + 42, GROUND + 64].forEach((y, k) => {
      const dir = k ? -1 : 1, off = (((reduce ? 0 : t) * 140 * dir) % 90 + 90) % 90;
      for (let x = Math.floor(x0 / 90) * 90 + off; x < x1; x += 90) glow(x, y, 14, '#ffd77a', 0.9);
    });
    // havada süzülen elektron ateşböcekleri
    for (let i = 0; i < 26; i++) {
      const x = cam.x - viewW() / 2 + ((i * 173 + t * 12 * (i % 2 ? 1 : -1)) % viewW() + viewW()) % viewW();
      const y = GROUND - 60 - (i * 37) % 220 + Math.sin(t * 1.3 + i) * 14;
      glow(x, y, 10, '#ffe08f', 0.4 + 0.5 * Math.abs(Math.sin(t * 2 + i)));
    }
    ctx.restore();
  }
  function frontGrass(t) {
    layer(1.15);
    ctx.strokeStyle = 'rgba(80,100,60,.75)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    const x0 = cam.x * 1.15 - viewW() / 2 - 40, x1 = cam.x * 1.15 + viewW() / 2 + 40;
    ctx.beginPath();
    for (let x = Math.floor(x0 / 110) * 110; x < x1; x += 110) {
      const y = WH - 30 + PT.nz(x) * 20, sw = Math.sin(t * 1.5 + x) * 2.5;
      for (let k = -2; k <= 2; k++) { ctx.moveTo(x + k * 4, y); ctx.quadraticCurveTo(x + k * 6 + sw, y - 14, x + k * 7 + sw * 1.4, y - 24 - Math.abs(k) * -3); }
    }
    ctx.stroke();
  }

  /* ── tabelalar ve istasyon yapıları (yerel koordinat: taban ortası 0,0) ── */
  function sign(x, text, n, done, active) {
    K.at(x, GROUND, 1, () => {
      K.line('M0 0 L 0 -92', { w: 5, color: '#6b4f35', trace: false });
      K.shape('M-74 -128 L 74 -128 L 80 -96 L -70 -94 Z', { lit: '#c99f6a', w: 2.6 });
      ctx.fillStyle = C.INK; ctx.font = '20px "Caveat Brush", "Comic Sans MS", cursive'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, 4, -110);
    });
    // gökyüzünde numara madalyonu
    const y = 250 + Math.sin(K.t * 1.6 + n) * 4;
    ctx.beginPath(); ctx.arc(x, y, 22, 0, 7);
    ctx.fillStyle = done ? C.AMBER : active ? C.INK : C.SHEET; ctx.fill(); ctx.strokeStyle = C.INK; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.fillStyle = done ? C.INK : active ? C.SHEET : C.INK; ctx.font = '600 18px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(done ? '✓' : String(n), x, y + 1);
  }
  const BUILD = {
    tanis(t) {
      K.shape('M-150 0 L 0 -196 L 150 0 Z', { lit: '#d9c28c', w: 3.2 });
      K.shape('M-46 0 L 0 -126 L 46 0 Z', { fill: '#4a3a26', w: 2.4, hatch: false });
      K.shape('M0 -126 L 46 0 L 78 -12 Z', { lit: '#c8ad74', w: 2.4 });
      K.line('M-150 0 L -196 6 M150 0 L 196 6 M-70 -92 L -190 4 M70 -92 L 190 4', { w: 1.6, alpha: 0.7, trace: false });
      K.line('M0 -196 L 0 -244', { w: 3, color: '#6b4f35', trace: false });
      K.rot(0, -244, Math.sin(t * 3) * 0.08, () => K.shape('M0 -244 L 46 -232 L 0 -220 Z', { lit: C.AMBER, w: 2.2 }));
      K.line('M-110 -30 L -60 -112 M110 -30 L 60 -112', { w: 1.3, alpha: 0.3, trace: false });
    },
    tak(t) {
      K.shape('M-130 0 L -130 -150 L 130 -150 L 130 0 Z', { lit: '#b98b5a', w: 3 });
      for (let y = -130; y < 0; y += 22) K.line(`M-130 ${y} L 130 ${y}`, { w: 1.3, alpha: 0.4, trace: false });
      K.shape('M-150 -146 L 0 -226 L 150 -146 Z', { lit: '#8a5a3a', w: 3 });
      K.shape('M-34 0 L -34 -96 L 34 -96 L 34 0 Z', { fill: '#5a3e28', w: 2.4, hatch: false });
      K.dot(22, -48, 3.4, C.AMBER);
      K.shape('M60 -116 L 110 -116 L 110 -72 L 60 -72 Z', { fill: '#2a3640', w: 2.4, hatch: false, inside: () => { ctx.fillStyle = 'rgba(255,215,122,.35)'; ctx.fillRect(60, -116, 50, 44); } });
      K.line('M40 -196 L 40 -276 M40 -268 L 22 -290 M40 -268 L 58 -290', { w: 2.6, trace: false });
      const on = Math.sin(t * 4) > 0; K.dot(40, -278, 5, on ? '#ff5040' : '#7a3a30');
    },
    kiskac(t) {
      K.shape('M-140 -170 L 140 -170 L 140 -96 L -140 -96 Z', { lit: '#c9a777', w: 2.6 });
      for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) K.dot(-126 + i * 23, -156 + j * 24, 2, 'rgba(23,20,17,.45)');
      K.line('M-90 -150 L -90 -112 M-60 -152 L -50 -114 M70 -148 L 90 -118', { w: 4, color: '#6b6f78', trace: false });
      K.shape('M-150 -96 L 150 -96 L 150 -80 L -150 -80 Z', { lit: '#9c6b3e', w: 2.8 });
      K.line('M-136 -80 L -136 0 M136 -80 L 136 0 M-120 -40 L 120 -40', { w: 5, color: '#7a5434', trace: false });
    },
    halka(t) { PT.town.ringMonument(K, t, { lit: stationDone(STN[idx('halka')]) || Math.sin(t * 1.6) > 0.9 }); },
    iletken(t) { PT.town.market(K, t); },
    sahne(t) {
      K.shape('M-170 -44 L 170 -44 L 176 0 L -176 0 Z', { lit: '#a8743c', w: 3 });
      for (let x = -150; x < 170; x += 40) K.line(`M${x} -44 L ${x - 4} 0`, { w: 1.3, alpha: 0.4, trace: false });
      K.shape('M-120 -230 L 120 -230 L 120 -60 L -120 -60 Z', { lit: '#2a2f36', w: 3, hatch: false });
      const pats = ['heart', 'smile', 'note', 'star', 'up'], p = PT.LED[pats[Math.floor(t / 2) % pats.length]];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
        const on = p[r][c] === '#', x = -64 + c * 32, y = -206 + r * 32;
        if (on) { ctx.save(); ctx.shadowColor = '#ff4a3a'; ctx.shadowBlur = 14; K.dot(x, y, 11, '#ff5040'); ctx.restore(); } else K.dot(x, y, 10, '#3a2a24');
      }
      K.line('M-160 -44 L -160 -260 M160 -44 L 160 -260', { w: 5, color: '#4a3d33', trace: false });
      K.line('M-160 -250 Q 0 -200 160 -250', { w: 1.6, trace: false });
      for (let i = 0; i < 7; i++) { const x = -130 + i * 43, y = -236 + Math.pow((x / 160), 2) * 18 - 10; K.shape(`M${x - 10} ${y} L ${x + 10} ${y} L ${x} ${y + 20} Z`, { fill: [C.AMBER, C.SEAL, C.SLATE, C.G][i % 4], w: 1.6, hatch: false, trace: false }); }
    },
    oyun(t) {
      for (let i = 0; i < 5; i++) K.at(-160 + i * 40, 0, 1, () => K.shape('M-18 0 L -18 -60 L 18 -60 L 18 0 Z', { lit: '#7fa86a', w: 2.4 }));
      for (let i = 0; i < 3; i++) K.at(70 + i * 40, 0, 1, () => K.shape('M-18 0 L -18 -60 L 18 -60 L 18 0 Z', { lit: '#7fa86a', w: 2.4 }));
      K.line('M10 0 L 10 -200', { w: 4, color: '#6b4f35', trace: false });
      K.rot(10, -214, Math.sin(t * 2) * 0.15, () => K.shape('M10 -246 L 18 -224 L 42 -222 L 24 -208 L 30 -184 L 10 -198 L -10 -184 L -4 -208 L -22 -222 L 2 -224 Z', { lit: '#ffcf4a', w: 2.6 }));
    },
  };
  /* ── kasaba yapıları: istasyonların arasını dolduran evler ve lambalar ── */
  const HOUSES = [
    { x: 250, f: (t) => PT.town.gate(K, t) },
    { x: 1465, f: (t) => PT.town.chipHouse(K, t, { seed: 1 }), wins: (t) => PT.town.chipWins(t, 1), r: 34 },
    { x: 2465, f: (t) => PT.town.capTower(K, t, { seed: 2 }), wins: (t) => PT.town.capWins(t, 2), r: 28 },
    { x: 3465, f: (t) => PT.town.resHouse(K, t), wins: () => [{ x: 0, y: -80, on: true }], r: 50 },
    { x: 4465, f: (t) => PT.town.chipHouse(K, t, { seed: 4, label: 'İŞLEMCİ' }), wins: (t) => PT.town.chipWins(t, 4), r: 34 },
    { x: 5465, f: (t) => PT.town.capTower(K, t, { seed: 5, col: '#7a4a8a' }), wins: (t) => PT.town.capWins(t, 5), r: 28 },
    { x: 6465, f: (t) => PT.town.chipHouse(K, t, { seed: 6, label: 'BELLEK' }), wins: (t) => PT.town.chipWins(t, 6), r: 34 },
    { x: 7420, f: (t) => PT.town.capTower(K, t, { seed: 7 }), wins: (t) => PT.town.capWins(t, 7), r: 28 },
  ];
  const LAMPS = [520, 1290, 1640, 2290, 2640, 3290, 3640, 4290, 4640, 5290, 5640, 6290, 6640, 7250];
  function scenery(t) {
    LAMPS.forEach((x, i) => { if (visible(x, 60)) K.at(x, GROUND, 1, () => PT.town.ledLamp(K, t, { col: PT.town.LEDCOL[i % 4] })); });
    HOUSES.forEach((h) => { if (visible(h.x, 160)) K.at(h.x, GROUND, 1, () => h.f(t)); });
  }
  /* ── kasabalılar: yürüyen elektronik parçalar ── */
  const KINDS = ['led', 'direnc', 'cip', 'led', 'jumper', 'buton', 'led', 'cip', 'direnc', 'jumper'];
  const SPEED = { led: 38, direnc: 24, cip: 70, jumper: 30, buton: 34 };
  const WALK = KINDS.concat(KINDS, KINDS, KINDS).slice(0, 38).map((kind, i) => ({
    kind, i, x: 160 + PT.nz(i * 7.3) * (WW - 320), dir: PT.nz(i * 2.1) > 0.5 ? 1 : -1,
    v: SPEED[kind] * (0.75 + PT.nz(i + 5) * 0.5), ph: i * 1.7, col: kind === 'jumper' ? ['#4f9a7a', '#c4432b', '#4f86c6'][i % 3] : PT.town.LEDCOL[i % 4],
    front: i % 3 !== 0, pause: 0, lit: 0, say: '', sayUntil: 0, n: 0,
  }));
  const BIRDS = Array.from({ length: 6 }, (_, i) => ({ i, ph: i * 1.3, beep: 0, say: '', sayUntil: 0 }));
  const birdPos = (b, t) => ({ x: ((t * 46 + b.i * 70 + 300) % (WW + 600)) - 300, y: 150 + Math.sin(t * 1.4 + b.ph) * 12 + (b.i % 3) * 22 });
  const laneY = (w) => GROUND + (w.front ? 30 : 10), laneS = (w) => (w.front ? 1.15 : 0.95);
  function walkStep(dt, now) {
    WALK.forEach((w) => {
      if (w.pause > now) return;
      w.x += w.dir * w.v * dt;
      if (w.x < 120 || w.x > WW - 120) w.dir *= -1;
      if (Math.random() < dt * 0.06) { w.pause = now + 1200 + Math.random() * 2400; if (Math.random() < 0.4) w.dir *= -1; }
    });
  }
  function walkDraw(front, now) {
    WALK.forEach((w) => {
      if (w.front !== front || !visible(w.x, 60)) return;
      const s = laneS(w), o = { walk: w.pause < now, ph: w.ph, col: w.col, lit: w.lit > now || (w.kind === 'led' && Math.sin(K.t * 0.9 + w.ph) > 0.92), state: w.sayUntil > now ? 'happy' : 'idle' };
      K.at(w.x, laneY(w), s, () => { if (w.dir < 0) K.mirror(0, () => PT.town[w.kind](K, o)); else PT.town[w.kind](K, o); });
    });
  }
  function birdsDraw(t, now) {
    BIRDS.forEach((b) => { const p = birdPos(b, t); if (visible(p.x, 40)) K.at(p.x, p.y, 1.3, () => PT.town.bip(K, { ph: b.ph, beep: b.beep > now })); });
  }

  /* sahnede istasyonlarda duran karakterler */
  const CAST = [
    { id: 'pc', x: 1990, s: 0.46, st: 'tak' },
    { id: 'clip', x: 2950, s: 0.5, st: 'kiskac', y: -96 },
    { id: 'deniz', x: 4040, s: 0.62, st: 'halka' },
    { id: 'silgi', x: 4830, s: 0.42, st: 'iletken', y: -96 },
    { id: 'muz', x: 5050, s: 0.55, st: 'iletken' },
    { id: 'elma', x: 5112, s: 0.55, st: 'iletken' },
    { id: 'hamur', x: 6010, s: 0.5, st: 'sahne', y: -44 },
    { id: 'kasik', x: 6080, s: 0.5, st: 'sahne', y: -44 },
  ];
  const castState = {};
  function castDraw(c) {
    const ch = CH[c.id], gy = GROUND + (c.y || 0);
    const st = castState[c.id] && castState[c.id] > performance.now() ? 'happy' : stationDone(STN[idx(c.st)]) ? 'happy' : 'idle';
    K.at(c.x - 100 * c.s, gy - ch.ground * c.s, c.s, () => ch.draw(K, { state: st === 'happy' && (K.t + c.x) % 7 > 1.6 && !(castState[c.id] > performance.now()) ? 'idle' : st, noSpark: true, noWire: true }));
  }

  /* ── iletken avı nesneleri (dünya çizimi) ── */
  const ITEM_W = {
    para: () => { K.shape(PT.el(0, -6, 10, 6), { lit: '#d9b25a', w: 2 }); },
    anahtar: () => { K.shape(PT.el(-8, 0, 7), { lit: '#d9b25a', w: 2 }); K.shape('M-2 -2 L 16 -2 L 16 3 L 13 3 L 13 7 L 10 7 L 10 3 L -2 3 Z', { lit: '#d9b25a', w: 1.8, hatch: false }); },
    atas: () => { K.line('M-10 4 L -10 -6 Q -10 -10 -6 -10 L 8 -10 Q 12 -10 12 -6 L 12 2 Q 12 6 8 6 L -4 6 Q -6 6 -6 4 L -6 -4', { w: 2.2, color: '#8b919c', trace: false }); },
    folyo: () => { K.shape('M-14 0 L -10 -12 L 2 -16 L 14 -10 L 12 0 Z', { lit: '#d3d8de', w: 2, inside: () => K.line('M-8 -8 L 4 -12 M-4 -4 L 8 -6', { w: 1, alpha: 0.5, trace: false }) }); },
    kalem: () => { K.shape('M-20 -4 L 12 -4 L 20 0 L 12 4 L -20 4 Z', { lit: C.GOLD, w: 2, hatch: false }); K.shape('M12 -4 L 20 0 L 12 4 Z', { fill: '#3a3a3a', w: 1.6, hatch: false, trace: false }); },
    kasik: () => { K.shape(PT.el(-12, -3, 7, 5), { lit: '#d3d8de', w: 2 }); K.line('M-5 -3 L 18 -1', { w: 3, color: '#9aa1ab', trace: false }); },
  };
  function huntDraw(a) {
    if (!visible(a.x, 40)) return;
    const found = save.found.includes(a.id);
    K.at(a.x, a.y, 1.1, () => { ITEM_W[a.id](); });
    if (!found && !reduce) {
      const k = 0.5 + 0.5 * Math.sin(K.t * 3 + a.x);
      ctx.save(); ctx.globalAlpha = 0.3 + k * 0.7; ctx.strokeStyle = C.AMBER; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x + 16, a.y - 22); ctx.lineTo(a.x + 16, a.y - 30); ctx.moveTo(a.x + 12, a.y - 26); ctx.lineTo(a.x + 20, a.y - 26); ctx.stroke(); ctx.restore();
    }
    if (found) { ctx.fillStyle = C.G; ctx.font = '600 14px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText('✓', a.x, a.y - 22); }
  }

  /* ── Patara (rehber) ve Kıvılcım ── */
  const PS = 0.55;
  function drawPatara(t) {
    const moving = Math.abs(pat.tx - pat.x) > 2;
    const mood = pat.moodUntil > performance.now() ? pat.mood : 'idle';
    const o = { state: mood, walk: moving ? pat.walk : null };
    const ox = pat.x - 130 * PS, oy = GROUND - 262 * PS;
    ctx.save(); ctx.translate(ox, oy); ctx.scale(PS, PS);
    if (pat.dir < 0) K.mirror(130, () => CH.patara.draw(K, o)); else CH.patara.draw(K, o);
    ctx.restore();
    // Kıvılcım arkadan uçar
    const sx = pat.x - pat.dir * 90 + Math.sin(t * 1.3) * 10, sy = GROUND - 190 + Math.sin(t * 2.1) * 8;
    const nsh = K.noShadow; K.noShadow = true;
    K.at(sx, sy, 0.3, () => { ctx.translate(-100, -130); CH.spark.draw(K, { state: mood === 'happy' ? 'happy' : 'idle' }); });
    K.noShadow = nsh;
  }
  function bubble(t) {
    if (pat.sayUntil < performance.now() || !pat.say) return;
    bubbleAt(pat.x, GROUND - 262 * PS - 20, pat.say);
  }
  /* dünya noktasının üstünde konuşma balonu (ekran uzayında çizilir) */
  function bubbleAt(wx, wy, text, p = 1) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const px = W / 2 + (wx - cam.x * p) * S, py = offY + wy * S;
    ctx.font = '19px "Caveat Brush", "Comic Sans MS", cursive';
    const words = text.split(' '), lines = []; let line = '';
    words.forEach((w) => { const tt = line ? line + ' ' + w : w; if (ctx.measureText(tt).width > 220 && line) { lines.push(line); line = w; } else line = tt; });
    if (line) lines.push(line);
    const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 28, bh = lines.length * 22 + 18;
    const bx = clamp(px - bw / 2, 10, W - bw - 10), by = py - bh - 16;
    ctx.fillStyle = C.SHEET; ctx.strokeStyle = C.INK; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 12) : ctx.rect(bx, by, bw, bh); ctx.fill(); ctx.stroke();
    const tx = clamp(px, bx + 18, bx + bw - 18);
    ctx.beginPath(); ctx.moveTo(tx - 9, by + bh - 1); ctx.lineTo(tx, by + bh + 14); ctx.lineTo(tx + 9, by + bh - 1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(tx - 9, by + bh); ctx.lineTo(tx, by + bh + 14); ctx.lineTo(tx + 9, by + bh); ctx.stroke();
    ctx.fillStyle = C.INK; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, bx + 14, by + 10 + i * 22));
  }
  const say = (txt, mood = 'idle', ms = 4200) => { pat.say = txt; pat.sayUntil = performance.now() + ms; if (mood !== 'idle') { pat.mood = mood; pat.moodUntil = performance.now() + Math.min(ms, 2600); } };

  /* ── dünya çizimi ── */
  function drawWorld(t) {
    K.t = t;
    sky(t);
    ground(t);
    layer(1);
    scenery(t);
    STN.forEach((s, i) => {
      if (!visible(s.x, 320)) return;
      K.at(s.x, GROUND, 1, () => BUILD[s.id](t));
      sign(s.x + 330, s.kisa, i + 1, stationDone(s), i === cur);
    });
    const now = performance.now();
    birdsDraw(t, now);
    walkDraw(false, now);
    CAST.forEach((c) => { if (visible(c.x, 160)) castDraw(c); });
    M.avlar.forEach(huntDraw);
    drawPatara(t);
    walkDraw(true, now);
    frontGrass(t);
    if (save.hava === 'aksam') nightPass(t, now);
    bubble(t);
    WALK.forEach((w) => { if (w.sayUntil > now) bubbleAt(w.x, laneY(w) - 72 * laneS(w), w.say); });
    BIRDS.forEach((b) => { if (b.sayUntil > now) { const p = birdPos(b, t); bubbleAt(p.x, p.y - 18, b.say); } });
    if (trainSay.until > now) bubbleAt(trainX(t) - 60, TRAIN_Y - 70, trainSay.text, 0.6);
  }

  /* ── dünya girdisi ── */
  let drag = null;
  cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, cx: cam.x, moved: false }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 6 || Math.abs(e.clientY - drag.y) > 6) drag.moved = true;
    if (drag.moved) { cam.x = cam.tx = clampCam(drag.cx - dx / S); }
  });
  cv.addEventListener('pointerup', (e) => {
    if (drag && !drag.moved) worldClick((e.clientX - W / 2) / S + cam.x, (e.clientY - offY) / S);
    drag = null;
  });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); cam.tx = clampCam(cam.tx + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) / S); }, { passive: false });
  function worldClick(x, y) {
    SES.tick();
    for (const a of M.avlar) {
      if (Math.hypot(x - a.x, y - (a.y - 4)) < 30) { findHunt(a); return; }
    }
    const now = performance.now(), t = reduce ? 2 : now / 1000;
    for (const b of BIRDS) { const p = birdPos(b, t); if (Math.hypot(x - p.x, y - p.y) < 28) { b.beep = now + 900; SES.zap(); setTimeout(() => SES.zap(), 160); meet('bip', b); return; } }
    const hit = WALK.filter((w) => Math.abs(x - w.x) < 30 * laneS(w) && y < laneY(w) + 8 && y > laneY(w) - 70 * laneS(w)).sort((a, b) => b.front - a.front)[0];
    if (hit) { hit.pause = now + 2800; hit.lit = now + 2200; ({ led: SES.pop, buton: SES.key, cip: SES.zap, jumper: SES.tick, direnc: SES.tick })[hit.kind](); meet(hit.kind, hit); return; }
    const tx = trainX(t), lx = x - cam.x * 0.4;
    if (lx < tx + 40 && lx > tx - 66 - TRAIN.length * 62 && y > TRAIN_Y - 70 && y < TRAIN_Y + 6) { SES.key(); meet('tren', trainSay); return; }
    if (Math.abs(x - pat.x) < 80 && y > GROUND - 160 && y < GROUND + 10) { say(M.dunya.soz[Math.floor(Math.random() * M.dunya.soz.length)], 'happy'); SES.pop(); return; }
    for (const c of CAST) if (Math.abs(x - c.x) < 50 && y > GROUND - 160 && y < GROUND + 10) { castState[c.id] = performance.now() + 1600; SES.pop(); }
    const i = STN.findIndex((s) => x > s.x - 280 && x < s.x + 410 && y > 200 && y < GROUND + 40);
    if (i >= 0) goTo(i);
  }
  const trainSay = { text: '', until: 0, n: 0 };
  function meet(kind, who) {
    const d = M.sakinler[kind]; if (!d) return;
    const line = d.soz[(who.n || 0) % d.soz.length];
    who.n = (who.n || 0) + 1;
    if (who === trainSay) { trainSay.text = line; trainSay.until = performance.now() + 4200; }
    else { who.say = line; who.sayUntil = performance.now() + 4200; }
    if (!save.met.includes(kind)) {
      save.met.push(kind); persist(); renderTop();
      toast(`Yeni kasabalı: <b>${d.ad}</b> (${save.met.length}/${Object.keys(M.sakinler).length})`);
      if (save.met.length === Object.keys(M.sakinler).length) say('Bütün kasabalılarla tanıştın! Artık Devre Kasabası\'nın yerlisisin.', 'happy');
    }
  }
  function findHunt(a) {
    if (save.found.includes(a.id)) { toast(`${a.ad}: zaten buldun. ${a.not}`); return; }
    save.found.push(a.id); persist(); SES.good();
    toast(`<b>${a.ad}</b> bulundu! ${a.not} (${save.found.length}/${M.avlar.length})`);
    say(save.found.length === M.avlar.length ? 'Hepsini buldun! Gerçek bir iletken avcısısın.' : `${a.ad}! ${a.not}`, 'happy');
    renderTop();
  }
  addEventListener('keydown', (e) => {
    if (zoomOpen() || sheetOpen()) return;
    if (e.target.closest && e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowRight') { cam.tx = clampCam(cam.tx + 260); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { cam.tx = clampCam(cam.tx - 260); e.preventDefault(); }
    else if (/^[1-7]$/.test(e.key)) goTo(+e.key - 1);
  });

  /* ═════════ ARAYÜZ: üst çubuk, kart, tost ═════════ */
  function renderTop() {
    $('#stations').innerHTML = STN.map((s, i) => `<button type="button" class="st${i === cur ? ' on' : ''}${stationDone(s) ? ' ok' : ''}" data-i="${i}" aria-label="${i + 1}. istasyon: ${s.ad}${stationDone(s) ? ', tamamlandı' : ''}"><span>${stationDone(s) ? '✓' : i + 1}</span><em>${s.kisa}</em></button>`).join('');
    $('#avBtn').textContent = `${M.dunya.avAd} ${save.found.length}/${M.avlar.length}`;
    $('#metBtn').textContent = `kasabalılar ${save.met.length}/${Object.keys(M.sakinler).length}`;
  }
  $('#stations').addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) goTo(+b.dataset.i); });
  let toastT = 0;
  function toast(html, ms = 3200) { const el = $('#toast'); el.innerHTML = html; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms); }

  function goTo(i, quiet) {
    cur = clamp(i, 0, STN.length - 1);
    const s = STN[cur];
    cam.tx = clampCam(camFor(s.x + 60));
    pat.tx = s.x - 200;
    pat.arrive = quiet ? null : s.varis;
    renderTop(); renderCard();
  }
  function step(s) {
    const a = save.ans[s.id];
    if (a == null) return 1;
    if (!stationDone(s)) return 2;
    return 3;
  }
  function renderCard() {
    const s = STN[cur], a = save.ans[s.id], stp = step(s), n = s.gorevler.length, k = s.gorevler.filter((g) => isDone(s.id, g.id)).length;
    const card = $('#card');
    const label = stp === 1 ? '1. adım: tahminini seç' : stp === 2 ? `2. adım: Yakından incele'ye dokun, ${n - k} görev seni bekliyor` : 'Son adım: açıklamayı oku';
    let h = `<div class="c-head"><small>İstasyon ${cur + 1}/${STN.length} · ${s.kisa}</small><button type="button" class="c-min" id="cMin" aria-label="Kartı küçült">–</button></div>
      <h2>${s.ad}</h2><p class="c-step">${label}</p><div class="c-body">`;
    if (stp < 3) h += `<p>${md(s.gozlem)}</p>`;
    h += `<div class="sence"><b>Sence?</b> ${md(s.soru)}</div><div class="opts">`;
    s.secenekler.forEach((o, i) => { h += `<button type="button" class="opt${a === i ? (i === s.dogru ? ' right' : ' wrong') : ''}${a != null && i === s.dogru && a !== i ? ' show' : ''}" data-o="${i}"${a != null ? ' disabled' : ''}>${md(o)}</button>`; });
    h += '</div>';
    if (a != null) h += `<p class="fb ${a === s.dogru ? 'ok' : 'no'}">${md(s.geri[a])}</p>`;
    if (stp === 3) h += `<div class="expl"><b>Ne öğrendik?</b> ${md(s.aciklama)}</div>`;
    h += '</div><div class="c-foot">';
    if (a != null) h += `<button type="button" class="go${stp === 2 ? ' pulse' : ''}" id="cZoom">${stp === 3 ? 'Yeniden incele' : 'Yakından incele →'}</button>`;
    h += `<span class="c-prog">${k}/${n} görev</span>`;
    if (stp === 3 && cur < STN.length - 1) h += `<button type="button" class="go pulse" id="cNext">Sonraki istasyon →</button>`;
    if (stp === 3 && cur === STN.length - 1 && STN.every(stationDone)) h += '<span class="c-fin">Kampın hepsini bitirdin!</span>';
    h += '</div>';
    card.innerHTML = h;
    card.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => answer(+b.dataset.o)));
    const z = $('#cZoom'); if (z) z.addEventListener('click', () => openZoom(s.id));
    const nx = $('#cNext'); if (nx) nx.addEventListener('click', () => goTo(cur + 1));
    $('#cMin').addEventListener('click', () => card.classList.toggle('min'));
  }
  function answer(i) {
    const s = STN[cur];
    save.ans[s.id] = i; persist();
    if (i === s.dogru) { SES.good(); say('Güzel tahmin! Hadi yakından bakalım.', 'happy'); }
    else { SES.bad(); say('Hımm, ilginç bir tahmin. Deneyince göreceğiz!', 'think'); }
    renderCard();
  }

  /* ═════════ YAKIN PLAN ═════════ */
  const zcv = $('#zcv'), zctx = zcv.getContext('2d'), ZK = PT.Ink(zctx);
  const mcv = $('#zpat'), mctx = mcv.getContext('2d'), MK = PT.Ink(mctx);
  const BW = 900, BH = 600;
  let Z = null; // açık yakın planın durumu
  const zoomOpen = () => !$('#zoom').hidden;
  const sheetOpen = () => [...document.querySelectorAll('.sheet')].some((s) => !s.hidden);

  function curTask() { const s = STN[idx(Z.sid)]; return s.gorevler.find((g) => !isDone(s.id, g.id)) || null; }
  function openZoom(sid) {
    const s = STN[idx(sid)], B = BOARDS[sid];
    Z = { sid, s, B, hint: 0, touched: false, mood: 'idle', moodUntil: 0, msg: s.varis, data: {}, down: false, flash: null };
    Z.say = (txt, mood = 'idle') => { Z.msg = txt; Z.mood = mood; Z.moodUntil = performance.now() + 2600; renderSay(); };
    Z.isDone = (tid) => isDone(sid, tid);
    Z.task = () => { const g = curTask(); return g ? g.id : null; };
    Z.done = (tid, txt) => {
      if (isDone(sid, tid)) return;
      doneList(sid).push(tid); persist(); SES.good();
      Z.say(txt, 'happy'); Z.hint = 0; Z.touched = false; Z.justDone = tid;
      renderSide(); renderTop(); renderCard();
    };
    Z.refresh = () => renderSide();
    Z.sfx = SES; Z.toast = toast; Z.PT = PT; Z.CH = CH; Z.BW = BW; Z.BH = BH;
    $('#zoom').hidden = false; document.body.classList.add('zooming');
    B.init(Z);
    renderSide();
    sizeZoom();
    setTimeout(() => { const f = $('.zside .z-task button, #zClose'); if (f) f.focus(); }, 30);
  }
  function closeZoom() { if (B_ON() && Z.B.close) Z.B.close(Z); $('#zoom').hidden = true; document.body.classList.remove('zooming'); Z = null; renderCard(); const b = $('#cZoom'); if (b) b.focus(); }
  const B_ON = () => !!Z;
  function sizeZoom() {
    const box = zcv.parentElement.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
    const bh = innerWidth <= 760 ? Math.max(200, innerHeight * 0.48) : box.height || 9999;
    const w = Math.min(box.width, bh * 1.5), h = w / 1.5;
    zcv.style.width = w + 'px'; zcv.style.height = h + 'px';
    zcv.width = Math.round(w * d); zcv.height = Math.round(h * d);
    mcv.width = mcv.height = Math.round(72 * d);
  }
  addEventListener('resize', () => { if (Z) sizeZoom(); });
  $('#zClose').addEventListener('click', () => closeZoom());
  $('#zoom').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeZoom();
    else if (Z && Z.B.key) Z.B.key(e, Z);
  });
  addEventListener('keydown', (e) => { if (Z && Z.B.key && !e.target.closest('#zoom')) Z.B.key(e, Z); });

  function renderSay() { $('#zsay').innerHTML = `<b>Patara:</b> ${md(Z.msg || '')}`; }
  function renderSide() {
    const s = Z.s, g = curTask(), n = s.gorevler.length, k = s.gorevler.filter((x) => isDone(s.id, x.id)).length;
    $('#zTitle').textContent = `${cur + 1}. ${s.ad}`;
    const box = $('#ztask');
    if (!g) {
      box.className = 'z-task win';
      box.innerHTML = `<small>Bütün görevler bitti</small><p>Aferin! ${n} görevin hepsini tamamladın.</p><button type="button" class="go pulse" id="zExpl">Açıklamayı oku →</button>`;
      $('#zExpl').addEventListener('click', () => { closeZoom(); const c = $('#card'); c.classList.remove('min'); c.scrollTop = c.scrollHeight; });
    } else {
      const prog = Z.B.prog ? Z.B.prog(g.id, Z) : '';
      box.className = 'z-task' + (Z.justDone ? ' fresh' : '');
      const shown = g.ipucu.slice(0, Z.hint);
      box.innerHTML = `<small>Görev ${k + 1} / ${n}${prog ? ` · <span class="prog">${prog}</span>` : ''}</small><p>${md(g.yonerge)}</p>
        ${shown.length ? `<ol class="hints">${shown.map((x) => `<li>${md(x)}</li>`).join('')}</ol>` : ''}
        ${Z.hint < g.ipucu.length ? `<button type="button" class="hint" id="zHint">İpucu (${Z.hint + 1}/${g.ipucu.length})</button>` : ''}`;
      const hb = $('#zHint'); if (hb) hb.addEventListener('click', () => { Z.hint++; SES.tick(); Z.mood = 'think'; Z.moodUntil = performance.now() + 2000; renderSide(); });
      Z.justDone = null;
    }
    renderSay();
    const ctl = $('#zctl'); ctl.innerHTML = '';
    if (Z.B.ctl) Z.B.ctl(ctl, Z);
    $('#ztasks').innerHTML = s.gorevler.map((x) => `<li class="${isDone(s.id, x.id) ? 'ok' : x === g ? 'now' : ''}">${md(x.metin)}</li>`).join('');
  }
  Object.defineProperty(window.KAMP, 'Z', { get: () => Z });
  window.KAMP.refresh = () => Z && renderSide();

  /* tahta girdisi: 900 × 600 mantıksal koordinat */
  const bp = (e) => { const r = zcv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * BW, y: ((e.clientY - r.top) / r.height) * BH }; };
  zcv.addEventListener('pointerdown', (e) => { if (!Z) return; e.preventDefault(); zcv.setPointerCapture(e.pointerId); Z.down = true; Z.touched = true; Z.B.down && Z.B.down(bp(e), Z); });
  zcv.addEventListener('pointermove', (e) => { if (!Z) return; const p = bp(e); Z.hover = p; Z.B.move && Z.B.move(p, Z); });
  zcv.addEventListener('pointerup', (e) => { if (!Z) return; Z.down = false; Z.B.up && Z.B.up(bp(e), Z); });
  zcv.addEventListener('pointercancel', () => { if (Z) { Z.down = false; Z.B.up && Z.B.up(null, Z); } });

  /* rehber işareti: how (neyle, ilk dokunuşta kaybolur) ve pt (nerede, bütün ipuçlarından sonra) */
  function guideMark(K2, t) {
    const g = curTask(); if (!g || !Z.B.guide) return;
    const G = Z.B.guide(g.id, Z) || {};
    const c = K2.ctx;
    const ring = (p, col) => {
      const r = (p.r || 30) + Math.sin(t * 5) * 3;
      c.save(); c.strokeStyle = col; c.lineWidth = 3.5; c.setLineDash([8, 7]); c.beginPath(); c.arc(p.x, p.y, r, 0, 7); c.stroke(); c.restore();
      if (p.t) {
        c.font = '22px "Caveat Brush", "Comic Sans MS", cursive'; const w = c.measureText(p.t).width + 18;
        const ly = p.below ? p.y + r + 30 : p.y - r - 16, lx = clamp(p.x - w / 2, 6, BW - w - 6);
        c.fillStyle = 'rgba(255,250,240,.94)'; c.strokeStyle = col; c.lineWidth = 2;
        c.beginPath(); c.rect(lx, ly - 22, w, 30); c.fill(); c.stroke();
        c.fillStyle = C.INK; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText(p.t, lx + 9, ly);
      }
    };
    const arrow = (a, b, col) => {
      c.save(); c.strokeStyle = col; c.lineWidth = 4; c.lineCap = 'round'; c.setLineDash([2, 10]);
      c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo((a.x + b.x) / 2, Math.min(a.y, b.y) - 60, b.x, b.y); c.stroke(); c.restore();
    };
    if (G.how && !Z.touched) ring(G.how, C.AMBER);
    if (G.pt && Z.hint >= g.ipucu.length) { ring(G.pt, C.SEAL); if (G.how) arrow(G.how, G.pt, C.SEAL); }
  }
  window.__rehber = () => {
    if (!Z) return { open: false, sid: STN[cur].id, ans: save.ans[STN[cur].id], dogru: STN[cur].dogru };
    const g = curTask();
    return { open: true, sid: Z.sid, tid: g ? g.id : null, done: !g, ...(g && Z.B.guide ? Z.B.guide(g.id, Z) : {}) };
  };

  function drawZoom(t) {
    const d = zcv.width / BW;
    zctx.setTransform(1, 0, 0, 1, 0, 0); zctx.clearRect(0, 0, zcv.width, zcv.height);
    zctx.setTransform(d, 0, 0, d, 0, 0);
    ZK.t = t;
    Z.t = t;
    Z.B.draw(ZK, t, Z);
    guideMark(ZK, t);
    const g = curTask(), pe = document.querySelector('#ztask .prog');
    if (g && pe && Z.B.prog) { const v = Z.B.prog(g.id, Z); if (pe.textContent !== v) pe.textContent = v; }
    // Patara yüzü (yan panel)
    const md2 = mcv.width / 150;
    mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.clearRect(0, 0, mcv.width, mcv.height);
    mctx.setTransform(md2, 0, 0, md2, -54 * md2, -6 * md2);
    MK.t = t; MK.noShadow = true;
    CH.patara.draw(MK, { state: Z.moodUntil > performance.now() ? Z.mood : 'idle' });
  }

  /* ═════════ SAYFALAR: tanıtım, öğretmen ═════════ */
  function openSheet(id) { $(id).hidden = false; const f = $(id).querySelector('button'); if (f) f.focus(); }
  function closeSheets() {
    if (!$('#intro').hidden && !save.intro) { save.intro = true; persist(); setTimeout(() => say(STN[cur].varis, 'happy'), 200); }
    document.querySelectorAll('.sheet').forEach((s) => (s.hidden = true));
  }
  document.querySelectorAll('.sheet').forEach((s) => s.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheets(); }));
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeSheets));
  $('#introText').innerHTML = M.tanitim.metin.map((p) => `<p>${md(p)}</p>`).join('');
  $('#introGo').textContent = M.tanitim.dugme;
  $('#introGo').addEventListener('click', () => { save.intro = true; persist(); closeSheets(); SES.pop(); say(STN[cur].varis, 'happy'); });
  $('#ogrBody').innerHTML = `<p>${md(M.ogretmenGenel)}</p><ol>${STN.map((s) => `<li><b>${s.ad}</b> · ${md(s.ogretmen)}</li>`).join('')}</ol>`;
  $('#ogrBtn').addEventListener('click', () => openSheet('#ogretmen'));
  $('#yardimBtn').addEventListener('click', () => openSheet('#intro'));
  $('#resetBtn').addEventListener('click', () => { save.done = {}; save.ans = {}; save.found = []; save.met = []; persist(); closeSheets(); goTo(0); renderTop(); toast('İlerleme sıfırlandı.'); });
  $('#metBtn').addEventListener('click', () => toast(`${M.dunya.sakinIpucu}<br>Tanıştıkların: ${save.met.length ? save.met.map((k) => M.sakinler[k].ad).join(', ') : 'henüz kimse'}.`, 5600));
  $('#avBtn').addEventListener('click', () => toast(`${M.dunya.avIpucu}<br>Bulunan: ${save.found.length ? save.found.map((id) => M.avlar.find((a) => a.id === id).ad).join(', ') : 'henüz yok'}.`, 5200));
  const syncHava = () => document.querySelectorAll('#hava [data-hava]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.hava === save.hava)));
  document.querySelectorAll('#hava [data-hava]').forEach((b) => b.addEventListener('click', () => {
    if (save.hava === b.dataset.hava) return;
    save.hava = b.dataset.hava; persist(); syncHava(); SES.pop();
    say(save.hava === 'aksam' ? 'Akşam oldu: LED\'ler yandı! Lambalar, pencereler, hepsi elektrikle ışık veriyor.' : 'Günaydın! Kasaba uyandı.', 'happy');
  }));
  syncHava();
  const sesBtn = $('#sesBtn');
  const syncSes = () => { sesBtn.setAttribute('aria-pressed', String(SES.on)); sesBtn.textContent = SES.on ? 'ses açık' : 'ses kapalı'; };
  sesBtn.addEventListener('click', () => { SES.on = !SES.on; save.sound = SES.on; persist(); syncSes(); SES.tick(); });
  syncSes();
  // tanıtımdaki Patara
  const icv = $('#introPat'), ictx = icv.getContext('2d'), IK = PT.Ink(ictx);

  /* ═════════ DÖNGÜ ═════════ */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = reduce ? 2 : now / 1000;
    // kamera ve Patara
    cam.x += (cam.tx - cam.x) * (reduce ? 1 : 0.1);
    const dx = pat.tx - pat.x;
    if (Math.abs(dx) > 2) { const v = Math.sign(dx) * Math.min(Math.abs(dx), (reduce ? 4000 : 300) * dt); pat.x += v; pat.dir = Math.sign(dx); pat.walk += dt * 11; }
    else if (pat.arrive) { say(pat.arrive, 'happy'); pat.arrive = null; pat.dir = 1; }
    try {
      if (!Z) { if (!reduce) walkStep(dt, now); layoutY(); drawWorld(t); }
      else drawZoom(t);
    } catch (err) { if (!frame.warned) { frame.warned = true; console.error(err); } }
    if (!$('#intro').hidden) {
      const d = Math.min(2, devicePixelRatio || 1), w = icv.clientWidth;
      if (icv.width !== Math.round(w * d)) { icv.width = Math.round(w * d); icv.height = Math.round(icv.clientHeight * d); }
      const s = icv.width / 300;
      ictx.setTransform(1, 0, 0, 1, 0, 0); ictx.clearRect(0, 0, icv.width, icv.height);
      ictx.setTransform(s, 0, 0, s, 20 * s, 4 * s); IK.t = t; CH.patara.draw(IK, { state: Math.floor(t / 3) % 3 === 1 ? 'happy' : 'idle', wave: true });
    }
    requestAnimationFrame(frame);
  }

  /* ── başlangıç ── */
  const first = STN.findIndex((s) => !stationDone(s));
  const startAt = Q.get('istasyon') ? idx(Q.get('istasyon')) : first < 0 ? 0 : first;
  cur = Math.max(0, startAt);
  cam.x = cam.tx = clampCam(camFor(STN[cur].x + 60)); pat.x = pat.tx = STN[cur].x - 200;
  renderTop(); renderCard();
  if (!save.intro && !Q.has('tanitimsiz')) openSheet('#intro');
  else setTimeout(() => say(STN[cur].varis, 'happy'), 600);
  requestAnimationFrame(frame);
  window.KAMP.open = openZoom; window.KAMP.goTo = goTo; window.KAMP.close = () => Z && closeZoom();
})();
