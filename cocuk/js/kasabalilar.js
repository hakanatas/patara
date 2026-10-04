/* Devre Kasabası · kasabalılar ve kasaba yapıları (Canvas 2D, patara-cizim.js mürekkep setiyle).
   Kasabada herkes bir elektronik parça: LED, direnç, çip böceği, jumper kablo, buton, bazır kuşu, USB treni.
   Kasabalılar: ayaklar (0,0) noktasında, yüz sağa bakar; sola yürürken K.mirror ile çevrilir.
   Yapılar: taban ortası (0,0), yukarısı eksi y. */
(function () {
  const C = PT.C, INK = C.INK, METAL = '#a9b0ba';
  const T = (PT.town = {});
  T.LEDCOL = ['#e0503c', '#5fae4a', '#4f86c6', '#f0c040'];

  const leads = (c, pts, w = 2.6) => {
    c.strokeStyle = METAL; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
  };
  const foot = (K, x) => K.oval(x, -1, 4.2, 2.2, INK);

  /* ── LED: kubbe kafa, iki bacak. Uzun bacak artı (+), kısa bacak eksi (−) ── */
  T.led = (K, o = {}) => {
    const c = K.ctx, t = K.t, ph = o.ph || 0, sw = o.walk ? Math.sin(t * 9 + ph) : 0, col = o.col || T.LEDCOL[0];
    const lift = o.walk ? Math.abs(Math.cos(t * 9 + ph)) * 2 : 0;
    c.save(); c.translate(0, -lift);
    leads(c, [[-6, -26], [-7 + sw * 5, -1]]);
    leads(c, [[6, -26], [11, -15], [7 - sw * 5, -1]]);
    foot(K, -7 + sw * 5); foot(K, 7 - sw * 5);
    if (o.lit) {
      const g = c.createRadialGradient(0, -46, 2, 0, -46, 46); g.addColorStop(0, PT.mix(col, '#ffffff', 0.3)); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.globalAlpha = 0.6; c.fillStyle = g; c.beginPath(); c.arc(0, -46, 46, 0, 7); c.fill(); c.globalAlpha = 1;
    }
    K.shape('M-15 -32 L 15 -32 L 15 -25 L -15 -25 Z', { fill: PT.mix(col, '#1a120a', 0.25), w: 2, hatch: false, trace: false });
    K.shape('M-12 -32 L -12 -50 C -12 -67 12 -67 12 -50 L 12 -32 Z', { lit: o.lit ? PT.mix(col, '#ffffff', 0.45) : col, w: 2.4 });
    leads(c, [[-3, -32], [-3, -41], [3, -43], [3, -32]], 1.4);
    K.face(0, -51, { s: 0.78, gap: 5, er: 2.8, skin: o.lit ? PT.mix(col, '#ffffff', 0.45) : col, state: o.state || 'idle', ph, my: 7, brows: false, blush: false });
    c.restore();
  };

  /* ── Direnç: renkli şeritli kapsül, bacakları uç telleri ── */
  const RES = 'M-22 -36 C -22 -47 -13 -48 -8 -44 L 8 -44 C 13 -48 22 -47 22 -36 C 22 -25 13 -24 8 -28 L -8 -28 C -13 -24 -22 -25 -22 -36 Z';
  T.direnc = (K, o = {}) => {
    const c = K.ctx, t = K.t, ph = o.ph || 0, sw = o.walk ? Math.sin(t * 7 + ph) : 0;
    leads(c, [[-8, -28], [-9 + sw * 4, -1]]); leads(c, [[8, -28], [9 - sw * 4, -1]]);
    foot(K, -9 + sw * 4); foot(K, 9 - sw * 4);
    leads(c, [[-22, -36], [-32, -30 + Math.sin(t * 3 + ph) * 3]]); leads(c, [[22, -36], [32, -42 + Math.sin(t * 3 + ph + 1) * 3]]);
    K.dot(-32, -30 + Math.sin(t * 3 + ph) * 3, 2.6, INK); K.dot(32, -42 + Math.sin(t * 3 + ph + 1) * 3, 2.6, INK);
    K.shape(RES, { lit: '#dcc290', w: 2.4, inside: () => {
      [[-15, '#7a4a2a'], [-9, '#171411'], [7, '#c4432b'], [14, '#d9b25a']].forEach(([x, col]) => { c.fillStyle = col; c.fillRect(x, -50, 4, 28); });
    } });
    K.face(-1, -38, { s: 0.6, gap: 6, er: 3, skin: '#dcc290', state: o.state || 'idle', ph, my: 7, brows: false, blush: false });
  };

  /* ── Çip böceği: siyah gövde, gümüş pin bacaklar ── */
  T.cip = (K, o = {}) => {
    const c = K.ctx, t = K.t, ph = o.ph || 0;
    [-19, -7, 5, 17].forEach((x, i) => { const sw = o.walk ? Math.sin(t * 16 + ph + i * 1.6) * 3 : 0; leads(c, [[x, -12], [x + sw, -1]], 3); });
    K.shape('M-26 -34 L 26 -34 L 26 -12 L -26 -12 Z', { lit: '#353b43', w: 2.6 });
    K.dot(-19, -28, 2, '#d3d8de');
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-14, -18); c.lineTo(4, -18); c.moveTo(-14, -22); c.lineTo(0, -22); c.stroke();
    K.eye(10, -26, 3.4, 4, { sd: -1, lw: 1.6, skin: '#353b43', state: o.state || 'idle', look: 0.6, blink: K.blinking(ph) });
    K.eye(19, -26, 3.4, 4, { sd: 1, lw: 1.6, skin: '#353b43', state: o.state || 'idle', look: 0.6, blink: K.blinking(ph) });
    leads(c, [[14, -34], [12, -42]], 1.6); leads(c, [[18, -34], [22, -42]], 1.6);
    K.dot(12, -43, 2, C.AMBER); K.dot(22, -43, 2, C.AMBER);
  };

  /* ── Jumper kablo: kıvrılan renkli kablo, uçlarında siyah başlık ── */
  T.jumper = (K, o = {}) => {
    const c = K.ctx, t = K.t, ph = o.ph || 0, col = o.col || '#4f9a7a', sp = o.walk ? 7 : 2;
    const pts = []; for (let x = -32; x <= 32; x += 4) pts.push([x, -12 + Math.sin(x * 0.16 - t * sp + ph) * 5]);
    [[INK, 10], [col, 6]].forEach(([s, w]) => { c.strokeStyle = s; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); });
    const end = (x, y, d) => {
      K.shape(`M${x} ${y - 7} L ${x + d * 12} ${y - 7} L ${x + d * 12} ${y + 7} L ${x} ${y + 7} Z`, { fill: '#2a2420', w: 2, hatch: false, trace: false });
      leads(c, [[x + d * 12, y], [x + d * 20, y]], 2.2);
    };
    const [x0, y0] = pts[0], [x1, y1] = pts[pts.length - 1];
    end(x0, y0, -1); end(x1, y1, 1);
    K.dot(x1 + 4, y1 - 2, 1.8, '#fff'); K.dot(x1 + 8, y1 - 2, 1.8, '#fff');
  };

  /* ── Buton: zıplayan dokunmatik düğme ── */
  T.buton = (K, o = {}) => {
    const c = K.ctx, t = K.t, ph = o.ph || 0, col = o.col || C.SEAL;
    const hop = Math.abs(Math.sin(t * 3.4 + ph)), y = o.walk ? -hop * 16 : 0, pressed = o.walk && hop < 0.2;
    c.save(); c.translate(0, y);
    [-11, 11].forEach((x) => leads(c, [[x, -3], [x + (x < 0 ? -2 : 2), 2]], 2.4));
    K.shape('M-17 -20 L 17 -20 L 17 -3 L -17 -3 Z', { lit: '#353b43', w: 2.4 });
    K.shape('M-8 -20 L 8 -20 L 8 -26 L -8 -26 Z', { fill: PT.mix(col, '#1a120a', 0.3), w: 1.8, hatch: false, trace: false });
    K.ellipse(0, pressed ? -24 : -27, 11, 5, { lit: col, w: 2.2, hatch: false });
    K.dot(-6, -11, 2.4, '#fff'); K.dot(6, -11, 2.4, '#fff'); K.dot(-5.4, -11, 1.2, INK); K.dot(6.6, -11, 1.2, INK);
    c.restore();
  };

  /* ── Bazır kuşu (buzzer): yuvarlak siyah gövde, ortasında ses deliği ── */
  T.bip = (K, o = {}) => {
    const c = K.ctx, t = K.t, ph = o.ph || 0, fl = Math.sin(t * 14 + ph) * 0.7;
    [[-1, -7], [1, 7]].forEach(([d, x]) => K.rot(x, -2, d * fl, () => K.ellipse(x + d * 8, -4, 9, 4, { fill: '#e3e7ec', w: 1.8, hatch: false, trace: false })));
    K.circle(0, 0, 10, { lit: '#353b43', w: 2.2 });
    K.dot(0, 2, 2.6, C.PAPER);
    K.dot(-3.5, -4, 1.8, '#fff'); K.dot(3.5, -4, 1.8, '#fff');
    if (o.beep) { c.strokeStyle = C.AMBER; c.lineWidth = 2; for (let i = 1; i <= 3; i++) { c.globalAlpha = 1 - i * 0.25; c.beginPath(); c.arc(4, 0, 8 + i * 6, -0.6, 0.6); c.stroke(); } c.globalAlpha = 1; }
  };

  /* ── USB treni: lokomotif bir USB fişi, vagonlarda tuşlar ── */
  T.loco = (K, o = {}) => {
    const c = K.ctx, t = K.t;
    [-34, -6].forEach((x) => { K.circle(x, -9, 8, { fill: '#2a2420', w: 2, hatch: false, trace: false }); K.dot(x, -9, 2.4, METAL); });
    K.shape('M-48 -17 L 6 -17 L 6 -52 L -48 -52 Z', { lit: '#353b43', w: 2.6 });
    K.shape('M6 -24 L 40 -24 L 40 -45 L 6 -45 Z', { lit: '#d3d8de', w: 2.4 });
    c.fillStyle = '#353b43'; c.fillRect(16, -38, 7, 5); c.fillRect(28, -38, 7, 5);
    c.fillStyle = '#fff'; c.font = '600 9px "JetBrains Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('USB', -21, -24);
    K.eye(-28, -38, 4, 5, { sd: -1, lw: 1.8, skin: '#353b43', look: 1 }); K.eye(-14, -38, 4, 5, { sd: 1, lw: 1.8, skin: '#353b43', look: 1 });
    for (let i = 0; i < 3; i++) { const k = ((t * 1.4 + i / 3) % 1); K.dot(-36 - k * 16, -56 - k * 26, 3 + k * 4, `rgba(255,215,122,${0.7 * (1 - k)})`); }
  };
  T.wagon = (K, label, col) => {
    const c = K.ctx;
    [-16, 16].forEach((x) => { K.circle(x, -8, 7, { fill: '#2a2420', w: 2, hatch: false, trace: false }); K.dot(x, -8, 2, METAL); });
    K.shape('M-28 -15 L 28 -15 L 28 -38 L -28 -38 Z', { lit: col, w: 2.4 });
    K.shape('M-20 -38 L 20 -38 L 18 -56 L -18 -56 Z', { fill: C.SHEET, w: 2.2, hatch: false, trace: false });
    c.fillStyle = INK; c.font = `500 ${label.length > 2 ? 9 : 14}px "JetBrains Mono", monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, 0, -47);
  };

  /* ═════════ YAPILAR ═════════ */
  /* çip evi: pinler kazık, gövde siyah, pencereler sarı */
  T.chipHouse = (K, t, o = {}) => {
    const c = K.ctx;
    for (let x = -80; x <= 80; x += 32) K.shape(`M${x - 5} -46 L ${x + 5} -46 L ${x + 5} 0 L ${x - 5} 0 Z`, { lit: METAL, w: 2, hatch: false, trace: false });
    K.shape('M-96 -46 L 96 -46 L 96 -168 L -96 -168 Z', { lit: '#353b43', w: 3.2 });
    K.shape('M-96 -114 C -84 -114 -84 -96 -96 -96 Z', { fill: C.PAPER, w: 2, hatch: false, trace: false });
    K.dot(-78, -152, 4, '#d3d8de');
    for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) {
      const on = Math.sin(t * 0.7 + r * 3 + k * 1.3 + (o.seed || 0)) > -0.3, x = -54 + k * 38, y = -146 + r * 46;
      c.fillStyle = on ? '#ffd77a' : '#4a525c'; c.fillRect(x, y, 24, 26); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(x, y, 24, 26);
    }
    c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '600 12px "JetBrains Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.label || 'ÇİP EVİ', 0, -58);
  };
  /* kondansatör kulesi: silindir, eksi şeridi, tepede çentik */
  T.capTower = (K, t, o = {}) => {
    const c = K.ctx, col = o.col || '#3f6f8f';
    K.line('M-16 0 L -16 -14 M16 0 L 16 -14', { w: 4, color: METAL, trace: false });
    K.shape('M-40 -14 L -40 -212 C -40 -228 40 -228 40 -212 L 40 -14 Z', { lit: col, w: 3 });
    K.shape('M18 -14 L 18 -218 C 26 -218 40 -222 40 -212 L 40 -14 Z', { fill: 'rgba(255,255,255,.28)', w: 1.6, hatch: false, trace: false });
    c.fillStyle = INK; for (let y = -190; y < -30; y += 34) c.fillRect(25, y, 8, 3);
    K.line('M-24 -222 L 24 -214 M24 -222 L -24 -214', { w: 2, trace: false, alpha: 0.6 });
    for (let k = 0; k < 4; k++) { const on = Math.sin(t * 0.6 + k * 2 + (o.seed || 0)) > -0.2, y = -186 + k * 42; c.fillStyle = on ? '#ffd77a' : 'rgba(23,20,17,.35)'; c.fillRect(-26, y, 16, 20); c.strokeStyle = INK; c.lineWidth = 1.8; c.strokeRect(-26, y, 16, 20); }
  };
  /* direnç evi: yatık direnç gövdesi, uç telleri sütun */
  T.resHouse = (K, t) => {
    const c = K.ctx;
    K.line('M-120 0 L -120 -96 L -104 -96 M120 0 L 120 -96 L 104 -96', { w: 6, color: METAL, trace: false });
    K.shape('M-110 -96 C -110 -150 -76 -158 -56 -140 L 56 -140 C 76 -158 110 -150 110 -96 C 110 -42 76 -34 56 -52 L -56 -52 C -76 -34 -110 -42 -110 -96 Z', { lit: '#dcc290', w: 3, inside: () => {
      [[-66, '#7a4a2a'], [-34, '#171411'], [24, '#c4432b'], [62, '#d9b25a']].forEach(([x, col]) => { c.fillStyle = col; c.fillRect(x, -170, 16, 140); });
    } });
    K.shape('M-14 -52 L -14 -100 C -14 -112 14 -112 14 -100 L 14 -52 Z', { fill: '#5a3e28', w: 2.4, hatch: false });
    c.fillStyle = INK; c.font = '600 12px "JetBrains Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('1 kΩ', 0, -124);
  };
  /* LED sokak lambası */
  T.ledLamp = (K, t, o = {}) => {
    const c = K.ctx, col = o.col || '#f0c040', on = o.on !== false;
    leads(c, [[-5, 0], [-5, -150]], 3.4); leads(c, [[5, 0], [5, -132], [10, -142], [5, -150]], 3.4);
    if (on) { const g = c.createRadialGradient(0, -168, 2, 0, -168, 70); g.addColorStop(0, PT.mix(col, '#ffffff', 0.4)); g.addColorStop(1, 'rgba(255,255,255,0)'); c.globalAlpha = 0.55; c.fillStyle = g; c.beginPath(); c.arc(0, -168, 70, 0, 7); c.fill(); c.globalAlpha = 1; }
    K.shape('M-14 -150 L 14 -150 L 14 -157 L -14 -157 Z', { fill: PT.mix(col, '#1a120a', 0.25), w: 2, hatch: false, trace: false });
    K.shape('M-11 -157 L -11 -172 C -11 -188 11 -188 11 -172 L 11 -157 Z', { lit: on ? PT.mix(col, '#ffffff', 0.35) : col, w: 2.4, hatch: false });
  };
  /* kablo ağacı: örgülü kablo gövde, yapraklarda yanıp sönen LED meyveler */
  const CANOPY = 'M-46 -70 C -62 -86 -50 -124 -22 -120 C -16 -146 22 -146 28 -120 C 56 -126 64 -88 46 -70 C 42 -56 -42 -56 -46 -70 Z';
  T.wireTree = (K, t, o = {}) => {
    const c = K.ctx;
    [[C.SEAL, 0], [C.SLATE, Math.PI]].forEach(([col, p]) => { c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); for (let y = 0; y >= -66; y -= 4) c.lineTo(Math.sin(y * 0.18 + p) * 5, y); c.stroke(); c.strokeStyle = col; c.lineWidth = 3.6; c.beginPath(); for (let y = 0; y >= -66; y -= 4) c.lineTo(Math.sin(y * 0.18 + p) * 5, y); c.stroke(); });
    K.shape(CANOPY, { lit: o.col || '#8fb07a', w: 2.6 });
    [[-26, -96], [6, -116], [28, -90], [-8, -78], [34, -110]].forEach(([x, y], i) => {
      const on = Math.sin(t * 2 + i * 1.7 + (o.seed || 0)) > 0.2, col = T.LEDCOL[(i + (o.seed || 0)) % 4];
      if (on) { c.save(); c.shadowColor = col; c.shadowBlur = 10; K.dot(x, y, 5, PT.mix(col, '#ffffff', 0.3)); c.restore(); } else K.dot(x, y, 4.4, PT.mix(col, '#1a120a', 0.35));
      c.strokeStyle = INK; c.lineWidth = 1.4; c.beginPath(); c.arc(x, y, 5, 0, 7); c.stroke();
    });
  };
  /* uzak silüet (soluk): kondansatör, çip gökdeleni, transistör, anten */
  T.skyline = (K, kind, col) => {
    const o = { lit: col, w: 2, trace: false, hatchK: 0.5 };
    if (kind === 0) { K.shape('M-34 0 L -34 -170 C -34 -186 34 -186 34 -170 L 34 0 Z', o); }
    else if (kind === 1) { K.shape('M-60 -24 L 60 -24 L 60 -250 L -60 -250 Z', o); for (let x = -48; x <= 48; x += 24) K.line(`M${x} -24 L ${x} 0`, { w: 4, color: '#b9b0a0', trace: false }); }
    else if (kind === 2) { K.shape('M-40 -60 L -40 -130 C -40 -170 40 -170 40 -130 L 40 -60 Z', o); K.line('M-20 -60 L -20 0 M0 -60 L 0 0 M20 -60 L 20 0', { w: 4, color: '#b9b0a0', trace: false }); }
    else { K.line('M-40 0 L 0 -230 L 40 0 M-28 -70 L 28 -70 M-18 -130 L 18 -130 M-30 -70 L 18 -130 M30 -70 L -18 -130', { w: 3, color: '#b9b0a0', trace: false }); K.dot(0, -234, 5, C.SEAL); }
  };
  /* kasaba kapısı: iki kondansatör sütun, üstte direnç kemer */
  T.gate = (K, t) => {
    const c = K.ctx;
    [-110, 110].forEach((x) => K.at(x, 0, 0.62, () => T.capTower(K, t, { col: x < 0 ? '#3f6f8f' : '#7a4a8a', seed: x })));
    K.shape('M-120 -150 C -120 -176 -90 -180 -76 -170 L 76 -170 C 90 -180 120 -176 120 -150 C 120 -124 90 -120 76 -130 L -76 -130 C -90 -120 -120 -124 -120 -150 Z', { lit: '#dcc290', w: 3, inside: () => {
      [[-90, '#7a4a2a'], [70, '#d9b25a']].forEach(([x, col]) => { c.fillStyle = col; c.fillRect(x, -190, 14, 80); });
    } });
    c.fillStyle = INK; c.font = '24px "Caveat Brush", "Comic Sans MS", cursive'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Devre Kasabası', 0, -150);
  };
  /* halka anıtı: bakır telden kocaman bir halka, tepesinde LED; Kıvılcım halkayı döner */
  T.ringMonument = (K, t, o = {}) => {
    const c = K.ctx, R = 70, cy = -128;
    K.shape('M-60 0 L 60 0 L 48 -30 L -48 -30 Z', { lit: '#a69c8c', w: 2.8 });
    c.lineCap = 'round';
    [[INK, 15], ['#c98a3a', 9]].forEach(([s, w]) => { c.strokeStyle = s; c.lineWidth = w; c.beginPath(); c.arc(0, cy, R, Math.PI * 0.62, Math.PI * 2.38); c.stroke(); });
    c.strokeStyle = 'rgba(255,240,200,.6)'; c.lineWidth = 2.4; c.beginPath(); c.arc(-2, cy - 2, R, Math.PI * 1.1, Math.PI * 1.5); c.stroke();
    K.line('M-30 -30 L -34 -64 M30 -30 L 34 -64', { w: 7, color: '#c98a3a' });
    const a = t * 1.6; K.dot(Math.cos(a) * R, cy + Math.sin(a) * R, 7, '#ffd77a');
    c.save(); c.shadowColor = C.AMBER; c.shadowBlur = 14; K.dot(Math.cos(a) * R, cy + Math.sin(a) * R, 4, '#fff'); c.restore();
    K.at(0, cy - R + 4, 0.9, () => T.ledLampHead(K, o.lit));
  };
  T.ledLampHead = (K, on) => {
    const col = '#e0503c', c = K.ctx;
    if (on) { const g = c.createRadialGradient(0, -20, 2, 0, -20, 50); g.addColorStop(0, '#ffb0a0'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.globalAlpha = 0.7; c.fillStyle = g; c.beginPath(); c.arc(0, -20, 50, 0, 7); c.fill(); c.globalAlpha = 1; }
    K.shape('M-14 0 L 14 0 L 14 -7 L -14 -7 Z', { fill: '#9c3a2a', w: 2, hatch: false, trace: false });
    K.shape('M-11 -7 L -11 -22 C -11 -38 11 -38 11 -22 L 11 -7 Z', { lit: on ? '#ff8a70' : col, w: 2.4, hatch: false });
  };
  /* malzeme pazarı tezgâhı: çizgili tente, kasalarda nesneler */
  T.market = (K, t) => {
    const c = K.ctx;
    K.line('M-140 0 L -140 -190 M140 0 L 140 -190', { w: 5, color: '#7a5434', trace: false });
    K.shape('M-160 -190 L 160 -190 L 150 -150 L -150 -150 Z', { fill: C.SHEET, w: 2.8, hatch: false, inside: () => { c.fillStyle = 'rgba(196,67,43,.75)'; for (let x = -160; x < 160; x += 40) c.fillRect(x, -190, 20, 40); } });
    for (let i = 0; i < 8; i++) { const x = -150 + i * 40; K.shape(`M${x} -150 Q ${x + 20} -136 ${x + 40} -150 Z`, { fill: i % 2 ? C.SHEET : '#c4432b', w: 1.8, hatch: false, trace: false }); }
    K.shape('M-150 -96 L 150 -96 L 140 -76 L -140 -76 Z', { lit: '#b08654', w: 2.6 });
    K.shape('M-120 -96 L -60 -96 L -64 -122 L -116 -122 Z', { lit: '#c99f6a', w: 2.2 });
    K.shape('M40 -96 L 110 -96 L 106 -124 L 44 -124 Z', { lit: '#c99f6a', w: 2.2 });
    K.dot(-100, -126, 6, '#d9b25a'); K.dot(-86, -128, 6, '#d9b25a'); K.dot(-74, -125, 6, '#d3d8de');
    K.line('M54 -130 L 76 -134 M60 -138 L 96 -132', { w: 4, color: '#d3d8de', trace: false });
    c.fillStyle = INK; c.font = '20px "Caveat Brush", "Comic Sans MS", cursive'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('iletken mi, yalıtkan mı?', 0, -166);
  };
})();
