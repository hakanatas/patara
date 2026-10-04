/* Patara'nın Ekibi · mürekkep çizim seti ve karakterler (Canvas 2D).
   Görsel dil Nokta'nın Kasabası / Çarşısı ile aynı: kâğıt üstünde mürekkep, ışık soldan,
   gölge tarafında tarama, çift kalem izi, sabit (kıpırdamayan) titreme, sağa kayık yer gölgesi.
   Kullanım: const K = PT.Ink(ctx); K.t = saniye; PT.chars.patara.draw(K, { state: 'happy' });
   Durumlar: idle · happy · surprised · sad. Şekiller SVG yol dizgisiyle yazılır, bir kez örneklenip önbelleğe alınır;
   hareket için yol dizgisini değil ctx dönüşümlerini değiştir. */
(function () {
  const PT = (window.PT = window.PT || {});
  const C = (PT.C = {
    INK: '#171411', AMBER: '#e8a33d', DEEP: '#b8741a', SEAL: '#c4432b', SHEET: '#fffaf0', PAPER: '#f1eadc',
    G: '#5e9b3f', GOLD: '#efc04a', SHELL: '#8d6430', HAT: '#efdcae', BRIM: '#e2c995', BAND: '#a8743c',
    SLATE: '#5b7c99', SKIN: '#f2c9a0', METAL: '#d3d8de', RED: '#d4553a', BANANA: '#f2cf4a', MOUTH: '#5a3a2c',
  });
  const INK = C.INK;
  const nz = (PT.nz = (a) => { const v = Math.sin(a * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); });
  const sn = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return nz(i) * (1 - u) + nz(i + 1) * u; };
  const hex = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  const mix = (PT.mix = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`; });
  const f1 = (v) => Math.round(v * 10) / 10;
  const el = (PT.el = (cx, cy, rx, ry = rx) => `M${f1(cx - rx)} ${f1(cy)} A${f1(rx)} ${f1(ry)} 0 1 0 ${f1(cx + rx)} ${f1(cy)} A${f1(rx)} ${f1(ry)} 0 1 0 ${f1(cx - rx)} ${f1(cy)} Z`);

  /* ── SVG yolunu örnekle (önbellekli) ── */
  let probe = null;
  const cache = new Map();
  function geo(d) {
    let g = cache.get(d);
    if (g) return g;
    if (cache.size > 3000) cache.clear();
    if (!probe) {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.setAttribute('aria-hidden', 'true');
      s.style.position = 'absolute';
      probe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      s.appendChild(probe); document.body.appendChild(s);
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const runs = d.trim().split(/(?=M)/).filter(Boolean).map((sd) => {
      probe.setAttribute('d', sd);
      const L = probe.getTotalLength(), n = Math.max(6, Math.ceil(L / 3)), pts = [];
      for (let i = 0; i <= n; i++) {
        const p = probe.getPointAtLength((L * i) / n);
        pts.push([p.x, p.y]);
        if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
      }
      return { pts, closed: /z\s*$/i.test(sd.trim()) };
    });
    g = { runs, bb: { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 }, path: new Path2D(d), strokes: new Map() };
    cache.set(d, g);
    return g;
  }
  PT.geo = geo;
  PT.along = (d, f) => {
    const P = geo(d).runs[0].pts, i = Math.max(0, Math.min(P.length - 1, f * (P.length - 1)));
    const a = P[Math.floor(i)], b = P[Math.ceil(i)], k = i - Math.floor(i);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  };

  /* Titrek kontur: sabit gürültü, köşede hafif taşma; trace = yanındaki silik ikinci kalem izi */
  function wobble(g, amp, seed, trace) {
    const key = `${amp}|${seed}|${trace}`;
    let p = g.strokes.get(key);
    if (p) return p;
    p = new Path2D();
    g.runs.forEach((r, ri) => {
      const P = r.pts, m = r.closed ? P.length - 1 : P.length;
      if (m < 2) return;
      const start = r.closed && trace ? Math.floor(nz(seed + ri) * m) : 0;
      const count = r.closed ? m + (trace ? Math.round(m * 0.07) : 2) : m - 1;
      for (let k = 0; k <= count; k++) {
        const i = r.closed ? (start + k) % m : k;
        const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
        let nx = a[1] - b[1], ny = b[0] - a[0];
        const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
        const j = (sn(i * 0.085 + seed * 7.3 + ri * 3.1) - 0.5) * 2 * amp;
        const x = P[i][0] + nx * j, y = P[i][1] + ny * j;
        k ? p.lineTo(x, y) : p.moveTo(x, y);
      }
    });
    g.strokes.set(key, p);
    return p;
  }

  /* ── Çizim bağlamı ── */
  PT.Ink = function (ctx) {
    const K = { ctx, t: 0, flip: false, noShadow: false };

    function lit(bb, base, k = 1) {
      const cx = bb.x0 + bb.w * (K.flip ? 0.7 : 0.3), cy = bb.y0 + bb.h * 0.28, R = Math.max(bb.w, bb.h) * 0.95 + 1;
      const gr = ctx.createRadialGradient(cx, cy, 1, cx, cy, R);
      gr.addColorStop(0, mix(base, '#ffffff', 0.32 * k));
      gr.addColorStop(0.5, base);
      gr.addColorStop(1, mix(base, '#1a120a', 0.24 * k));
      return gr;
    }
    function hatch(g, k = 1) {
      const { x0, y0, w, h } = g.bb;
      if (w < 8 || h < 8) return;
      ctx.save();
      ctx.clip(g.path);
      const cut = new Path2D();
      cut.rect(x0 - 60, y0 - 60, w + 120, h + 120);
      cut.addPath(g.path, new DOMMatrix().translate(K.flip ? w * 0.3 : -w * 0.3, -h * 0.22));
      ctx.clip(cut, 'evenodd');
      ctx.strokeStyle = `rgba(23,20,17,${0.24 * k})`;
      ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      ctx.beginPath();
      const gap = Math.max(4, Math.min(6.5, w / 9));
      for (let x = x0 - h, i = 0; x < x0 + w + 4; x += gap, i++) {
        const j = (nz(x * 0.1 + i) - 0.5) * 2.4;
        ctx.moveTo(x + j, y0 + h + 2); ctx.lineTo(x + h + j + 2, y0 - 2);
      }
      ctx.stroke();
      ctx.restore();
    }
    function specks(g, s) {
      const { x0, y0, w, h } = g.bb;
      ctx.save(); ctx.clip(g.path);
      ctx.fillStyle = s.color || 'rgba(80,60,40,.2)';
      for (let i = 0; i < (s.n || 20); i++) {
        ctx.beginPath();
        ctx.arc(x0 + nz(i * 3.1 + x0) * w, y0 + nz(i * 5.7 + y0) * h, (s.r || 1) * (0.6 + nz(i + 9) * 0.8), 0, 7);
        ctx.fill();
      }
      ctx.restore();
    }

    K.stroke = (g, o = {}) => {
      const w = o.w ?? 3, amp = o.amp ?? 1.1, p0 = g.runs[0].pts[0], seed = o.seed ?? f1(p0[0] * 0.13 + p0[1] * 0.07);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = o.color || INK;
      ctx.globalAlpha = o.alpha ?? 1; ctx.lineWidth = w;
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.stroke(wobble(g, amp, seed, false));
      if (o.trace !== false && !o.dash) {
        ctx.globalAlpha = (o.alpha ?? 1) * 0.35; ctx.lineWidth = w * 0.45;
        ctx.save(); ctx.translate(0.7, 0.5); ctx.stroke(wobble(g, amp * 1.5, seed + 17, true)); ctx.restore();
      }
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    };
    /* Dolu şekil: lit = soldan aydınlanan gradyan, hatch = sağ alt taramalı gölge, speck = benek, inside = dolgudan sonra çiz */
    K.shape = (d, o = {}) => {
      const g = geo(d);
      if (o.lit || o.fill) { ctx.fillStyle = o.lit ? lit(g.bb, o.lit, o.litK) : o.fill; ctx.fill(g.path); }
      if (o.speck) specks(g, o.speck);
      if (o.inside) { ctx.save(); ctx.clip(g.path); o.inside(); ctx.restore(); }
      if (o.hatch !== false && (o.lit || o.hatch)) hatch(g, o.hatchK);
      if (o.w !== 0) K.stroke(g, o);
      return g;
    };
    K.line = (d, o = {}) => K.stroke(geo(d), o);
    K.shade = (d, k) => hatch(geo(d), k);
    K.path = (d) => geo(d).path;
    K.clip = (d) => ctx.clip(geo(d).path);
    K.circle = (cx, cy, r, o) => K.shape(el(cx, cy, r), o);
    K.ellipse = (cx, cy, rx, ry, o) => K.shape(el(cx, cy, rx, ry), o);
    K.dot = (x, y, r, col = INK) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
    K.oval = (x, y, rx, ry, col, rot = 0) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 7); ctx.fill(); };
    K.limb = (ax, ay, bx, by, o = {}) => {
      const bend = o.bend ?? 6, sd = o.sd ?? 1;
      ctx.strokeStyle = o.color || INK; ctx.lineWidth = o.w || 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo((ax + bx) / 2 + sd * bend, (ay + by) / 2 - Math.abs(bend) * 0.6, bx, by);
      ctx.stroke();
      if (o.hand !== false) {
        K.dot(bx, by, o.hr || 3.9, o.handColor || INK);
        if (o.handColor) { ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(bx, by, o.hr || 3.9, 0, 7); ctx.stroke(); }
      }
    };
    K.foot = (x, y, dir = 1, s = 1) => { K.oval(x + dir * 3 * s, y - 2.6 * s, 6.6 * s, 3.8 * s, INK); };
    K.shadow = (cx, gy, w, k = 1) => {
      if (K.noShadow) return;
      const sx = cx + w * 0.12;
      ctx.save(); ctx.translate(sx, gy); ctx.scale(1, 0.14);
      const gr = ctx.createRadialGradient(0, 0, 2, 0, 0, w * 0.62);
      gr.addColorStop(0, `rgba(40,30,20,${0.24 * k})`); gr.addColorStop(1, 'rgba(40,30,20,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, w * 0.62, 0, 7); ctx.fill();
      ctx.restore();
    };
    K.mirror = (cx, fn) => { ctx.save(); ctx.translate(cx * 2, 0); ctx.scale(-1, 1); K.flip = !K.flip; fn(); K.flip = !K.flip; ctx.restore(); };
    K.rot = (x, y, a, fn) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.translate(-x, -y); fn(); ctx.restore(); };
    K.at = (x, y, s, fn) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); fn(); ctx.restore(); };
    /* sevinç kırıntıları (Nokta'daki gibi kehribar çizgiler) */
    K.joy = (cx, cy, r, s = 1) => {
      const t = K.t;
      ctx.strokeStyle = C.AMBER; ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.42 + Math.sin(t * 3 + i) * 0.08, rr = r + Math.sin(t * 6 + i * 2) * 5 * s;
        const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
        ctx.beginPath(); ctx.moveTo(px - Math.cos(a) * 5 * s, py - Math.sin(a) * 5 * s); ctx.lineTo(px + Math.cos(a) * 5 * s, py + Math.sin(a) * 5 * s); ctx.stroke();
      }
    };
    K.blinking = (ph = 0) => (K.t + ph) % 4.3 < 0.13;
    /* Ortak yüz: nokta gözler, kaşlar, yanak, ağız. stern = kuralcı (Silgi) */
    K.face = (x, y, o = {}) => {
      const s = o.s || 1, gap = (o.gap || 8) * s, st = o.state || 'idle', blink = K.blinking(o.ph || 0);
      const happy = st === 'happy', sad = st === 'sad', sur = st === 'surprised';
      ctx.strokeStyle = INK; ctx.lineCap = 'round';
      [-1, 1].forEach((sd) => {
        const ex = x + sd * gap + (o.look || 0) * s;
        if (happy) { ctx.lineWidth = 2.2 * s; ctx.beginPath(); ctx.arc(ex, y + 1.5 * s, 3.6 * s, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
        else if (blink) { ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(ex - 3.4 * s, y); ctx.quadraticCurveTo(ex, y + 2 * s, ex + 3.4 * s, y); ctx.stroke(); }
        else {
          const ry = (sur ? 4.3 : sad ? 2.7 : 3.3) * s, rx = (sur ? 3.6 : 2.5) * s, yy = y + (sad ? 1.6 * s : 0);
          K.oval(ex, yy, rx, ry, INK);
          K.dot(ex + 0.9 * s, yy - 1.3 * s, 0.95 * s, '#fff');
        }
      });
      if (o.brows !== false) {
        ctx.lineWidth = 1.6 * s; ctx.globalAlpha = sad || sur || o.stern ? 0.9 : 0.55;
        [-1, 1].forEach((sd) => {
          const bx = x + sd * gap, by = y - 7.5 * s - (happy ? 1.5 * s : 0) - (sur ? 3 * s : 0);
          let inner = by, outer = by;
          if (sad) { inner -= 2.6 * s; outer += 1.4 * s; }
          else if (o.stern && st === 'idle') { inner += 2.6 * s; outer -= 1.6 * s; }
          else if (happy) outer -= 1 * s;
          ctx.beginPath(); ctx.moveTo(bx - sd * 3.6 * s, inner); ctx.lineTo(bx + sd * 3.6 * s, outer); ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }
      if (o.blush !== false) [-1, 1].forEach((sd) => K.oval(x + sd * (gap + 5 * s), y + 7 * s, 4 * s, 2.4 * s, 'rgba(196,67,43,.22)'));
      const my = y + (o.my ?? 8) * s;
      ctx.lineWidth = 2 * s; ctx.strokeStyle = INK; ctx.beginPath();
      if (happy) { ctx.moveTo(x - 5.5 * s, my - 1 * s); ctx.quadraticCurveTo(x, my + 9 * s, x + 5.5 * s, my - 1 * s); ctx.closePath(); ctx.fillStyle = C.MOUTH; ctx.fill(); ctx.stroke(); }
      else if (sad) { ctx.arc(x, my + 6 * s, 4.6 * s, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
      else if (sur) { ctx.ellipse(x, my + 1 * s, 2.6 * s, 3.5 * s, 0, 0, 7); ctx.fillStyle = C.MOUTH; ctx.fill(); ctx.stroke(); }
      else if (o.stern) { ctx.moveTo(x - 5 * s, my); ctx.lineTo(x + 5 * s, my); ctx.stroke(); }
      else { ctx.arc(x, my - 4 * s, 5 * s, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); }
    };
    return K;
  };

  const chars = (PT.chars = {});

  /* 5×5 LED desenleri */
  const LED = (PT.LED = {
    heart: ['.#.#.', '#####', '#####', '.###.', '..#..'],
    smile: ['.....', '.#.#.', '.....', '#...#', '.###.'],
    sad: ['.....', '.#.#.', '.....', '.###.', '#...#'],
    wow: ['.#.#.', '.....', '..#..', '.#.#.', '..#..'],
    star: ['..#..', '.###.', '#####', '.###.', '#...#'],
    note: ['...#.', '...#.', '...#.', '.##..', '.##..'],
    up: ['..#..', '.###.', '#.#.#', '..#..', '..#..'],
    off: ['.....', '.....', '.....', '.....', '.....'],
  });

  /* ═════════ PATARA: safari şapkalı kaplumbağa = kartın kendisi ═════════ */
  const ARM = 'M92 150 C 56 146 26 124 22 94 C 20 78 40 72 48 88 C 56 108 74 124 102 130 Z';
  const FOOT = 'M82 226 C 58 228 44 242 48 254 C 62 262 90 258 100 246 C 104 236 96 226 82 226 Z';
  const PADS = [[32, 97], [38, 112], [48, 125], [61, 135], [77, 143]];
  const RIM = el(130, 184, 82, 70), INNER = el(130, 184, 72, 61);
  const TOP = 'M48 152 C 50 122 92 116 130 116 C 168 116 210 122 212 152 C 212 166 198 170 178 170 L 82 170 C 62 170 48 166 48 152 Z';
  const MIDL = 'M52 186 C 52 178 58 176 66 176 L 120 176 C 126 176 128 180 128 186 L 128 202 C 128 208 124 210 118 210 L 62 210 C 56 210 52 206 52 200 Z';
  const MIDR = 'M208 186 C 208 178 202 176 194 176 L 140 176 C 134 176 132 180 132 186 L 132 202 C 132 208 136 210 142 210 L 198 210 C 204 210 208 206 208 200 Z';
  const LEDR = 'M118 128 L 142 128 Q 148 128 148 134 L 148 160 Q 148 166 142 166 L 118 166 Q 112 166 112 160 L 112 134 Q 112 128 118 128 Z';
  const HEAD = el(130, 80, 58, 48);
  chars.patara = {
    box: [-8, 0, 268, 272], ground: 262,
    draw(K, o = {}) {
      const { ctx, t } = K, st = o.state || 'idle', hap = st === 'happy', sad = st === 'sad', sur = st === 'surprised';
      const hop = hap ? Math.abs(Math.sin(t * 8)) * 12 : sur ? Math.max(0, Math.sin(t * 3)) * 3 : 0;
      K.shadow(130, 262, 210, 1 - hop / 40);
      ctx.save(); ctx.translate(0, -hop + (sad ? 2 : 0));
      // kuyruk ve arka ayaklar
      K.shape('M198 214 C 214 218 228 232 238 230 C 232 218 216 206 204 204 Z', { lit: C.G });
      const foot = () => { K.shape(FOOT, { lit: C.G }); K.line('M58 250 L 62 243 M69 254 L 73 246', { w: 1.6, trace: false }); };
      foot(); K.mirror(130, foot);
      // kollar: sol kol yön pedleri, sağ kol Space / tıklar / Enter; dipte GND
      const arm = (keys, swing) => K.rot(96, 140, swing, () => {
        K.shape(ARM, { lit: C.G });
        K.line('M30 86 C 34 81 42 82 45 88', { w: 1.4, alpha: 0.45, trace: false });
        PADS.forEach(([x, y], i) => {
          const gnd = i === 4, on = o.pad && o.pad === keys[i];
          if (on) { ctx.save(); ctx.shadowColor = '#ffd04a'; ctx.shadowBlur = 16; K.dot(x, y, 7, '#ffd77a'); ctx.restore(); }
          K.circle(x, y, 5.6, { lit: gnd ? '#4a3d33' : C.GOLD, w: 2, hatch: false, trace: false });
          K.dot(x, y, 2.1, gnd ? C.GOLD : '#7a5520');
        });
      });
      const wave = hap ? Math.sin(t * 14) * 0.2 : o.wave ? Math.sin(t * 7) * 0.22 : sad ? 0.1 : Math.sin(t * 1.6) * 0.05;
      arm(['up', 'left', 'right', 'down', 'gnd'], sad ? 0.1 : 0);
      K.mirror(130, () => arm(['space', 'click', 'rclick', 'enter', 'gnd2'], wave));
      // kabuk: kenar, koyu aralık, sarı plakalar, piyano
      K.shape(RIM, { lit: C.SHELL, w: 3.4 });
      K.shape(INNER, { fill: '#3b2a14', w: 2, trace: false, hatch: false });
      ctx.save(); K.clip(INNER);
      K.shape(TOP, { lit: C.GOLD, w: 2.2, hatch: false });
      K.line('M62 142 C 80 130 98 127 110 128', { w: 1.3, alpha: 0.3, trace: false });
      K.line('M150 128 C 164 127 182 131 198 142', { w: 1.3, alpha: 0.3, trace: false });
      K.shape(MIDL, { lit: C.GOLD, w: 2.2, hatch: false });
      K.shape(MIDR, { lit: C.GOLD, w: 2.2, hatch: false });
      K.shape('M38 216 L 222 216 L 222 264 L 38 264 Z', { fill: C.SHEET, w: 2, hatch: false, trace: false });
      const keyW = 22.5;
      if (o.note != null) { ctx.fillStyle = 'rgba(232,163,61,.45)'; ctx.fillRect(40 + o.note * keyW, 216, keyW, 48); }
      for (let k = 1; k < 8; k++) K.line(`M${f1(40 + k * keyW)} 216 L ${f1(40 + k * keyW)} 264`, { w: 1.4, trace: false, amp: 0.4 });
      ctx.fillStyle = INK;
      [1, 2, 4, 5, 6].forEach((k) => ctx.fillRect(40 + k * keyW - 5, 216, 10, 20));
      ctx.restore();
      K.shade(INNER, 0.9);
      // 5x5 LED
      K.shape(LEDR, { fill: '#1b1f26', w: 2.4, hatch: false, trace: false });
      const cyc = ['smile', 'heart', 'star', 'note'];
      const pat = LED[o.led || (hap ? 'heart' : sad ? 'sad' : sur ? 'wow' : cyc[Math.floor(t / 1.8) % cyc.length])];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
        const on = pat[r][c] === '#', x = 118 + c * 6, y = 135 + r * 6;
        if (on) { ctx.save(); ctx.shadowColor = '#ff4a3a'; ctx.shadowBlur = 6; K.dot(x, y, 2.3, '#ff5040'); ctx.restore(); }
        else K.dot(x, y, 2.1, '#3a2a14');
      }
      // yön tuşları ve X / Y
      [[84, 182], [84, 204], [73, 193], [95, 193]].forEach(([x, y]) => K.circle(x, y, 4.8, { fill: C.SHEET, w: 1.8, trace: false }));
      [[168, 188, 'X'], [192, 198, 'Y']].forEach(([x, y, s]) => {
        K.circle(x, y, 6.2, { fill: C.SHEET, w: 1.8, trace: false });
        ctx.fillStyle = INK; ctx.font = '600 8px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y + 0.5);
      });
      // kafa
      const tilt = sad ? 0.07 : hap ? Math.sin(t * 8) * 0.05 : Math.sin(t * 1.3) * 0.02;
      K.rot(130, 126, tilt, () => {
        ctx.save(); ctx.translate(0, Math.sin(t * 2) * 0.8);
        K.shape(HEAD, { lit: C.G, w: 3.4, speck: { n: 8, r: 2.6, color: 'rgba(40,80,20,.2)' } });
        const look = o.look ?? Math.sin(t * 0.6) * 2.2, blink = K.blinking();
        [[106, -1], [154, 1]].forEach(([ex, sd]) => {
          if (hap) { ctx.lineWidth = 3.4; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(ex, 90, 10, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke(); return; }
          const rx = sur ? 16 : 15, ry = sur ? 20 : 18, E = el(ex, 82, rx, ry);
          K.shape(E, { fill: C.SHEET, w: 2.6, hatch: false });
          if (blink) {
            ctx.save(); K.clip(E); ctx.fillStyle = C.G; ctx.fillRect(ex - 20, 58, 40, 50); ctx.restore();
            K.stroke(PT.geo(E), { w: 2.6, trace: false });
            ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(ex - 13, 84); ctx.quadraticCurveTo(ex, 92, ex + 13, 84); ctx.stroke();
            return;
          }
          const pr = sur ? 5.4 : 7.6, px = ex + look - sd * 2, py = 85 + (sad ? 4 : 0);
          K.dot(px, py, pr); K.dot(px + 2.6, py - 3, 2.5, '#fff'); K.dot(px - 2.4, py + 2.6, 1.1, '#fff');
          if (sad) {
            ctx.save(); K.clip(E); ctx.fillStyle = C.G; ctx.beginPath();
            ctx.moveTo(ex - 20, 58); ctx.lineTo(ex + 20, 58); ctx.lineTo(ex + 20, sd < 0 ? 70 : 79); ctx.lineTo(ex - 20, sd < 0 ? 79 : 70); ctx.fill();
            ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(ex - 20, sd < 0 ? 79 : 70); ctx.lineTo(ex + 20, sd < 0 ? 70 : 79); ctx.stroke();
            ctx.restore();
            K.stroke(PT.geo(E), { w: 2.6, trace: false });
          }
        });
        // kaşlar
        ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
        [[106, -1], [154, 1]].forEach(([ex, sd]) => {
          const base = 57 - (hap ? 5 : 0) - (sur ? 8 : 0), inner = base + (sad ? -5 : 0), outer = base + (sad ? 3 : hap ? 1 : 0);
          ctx.beginPath(); ctx.moveTo(ex + sd * 10, outer); ctx.quadraticCurveTo(ex, base - 4, ex - sd * 10, inner); ctx.stroke();
        });
        K.oval(90, 104, 8.5, 5, 'rgba(196,67,43,.32)'); K.oval(170, 104, 8.5, 5, 'rgba(196,67,43,.32)');
        K.dot(124, 101, 1.9); K.dot(136, 101, 1.9);
        if (hap) {
          K.shape('M108 106 Q 130 138 152 106 Q 130 114 108 106 Z', { fill: C.MOUTH, w: 2.6, hatch: false, trace: false,
            inside: () => K.oval(130, 124, 9, 5, '#e07a6a') });
        } else if (sad) K.line('M115 119 Q 130 107 145 119', { w: 2.8 });
        else if (sur) K.ellipse(130, 115, 6, 8, { fill: C.MOUTH, w: 2.4, hatch: false, trace: false });
        else K.line('M111 108 Q 130 123 149 108', { w: 2.8 });
        // safari şapkası
        const hb = hap ? -Math.abs(Math.sin(t * 8 - 0.5)) * 5 : sur ? -4 : 0;
        K.rot(130, 44, -0.12 + (hap ? Math.sin(t * 8) * 0.04 : 0), () => {
          ctx.save(); ctx.translate(0, hb);
          K.line('M80 50 C 74 64 74 80 80 96', { w: 3.6, color: '#6b4423', trace: false });
          K.shape('M72 68 L 79 67 L 80 74 L 73 75 Z', { fill: '#c9a25a', w: 1.4, trace: false, hatch: false });
          K.shape(el(130, 46, 62, 14), { lit: C.BRIM });
          K.line('M76 52 Q 130 68 184 52', { w: 1.2, alpha: 0.5, dash: [3, 5] });
          K.shape('M90 46 C 88 8 172 8 170 46 Z', { lit: C.HAT });
          K.line('M130 12 C 124 22 120 32 118 42', { w: 1.3, alpha: 0.4, trace: false });
          K.line('M130 12 C 140 22 146 32 150 42', { w: 1.3, alpha: 0.4, trace: false });
          K.shape('M90 38 Q 130 49 170 38 L 170 46 Q 130 57 90 46 Z', { lit: C.BAND, w: 2.2, hatch: false });
          K.circle(130, 12, 3.6, { lit: C.BRIM, w: 2, hatch: false, trace: false });
          K.dot(153, 26, 1.8); K.dot(159, 33, 1.8);
          ctx.restore();
        });
        ctx.restore();
      });
      if (hap) K.joy(130, 112, 138);
      ctx.restore();
    },
  };

  /* ═════════ KIVILCIM: akım ═════════ */
  const SBODY = 'M100 46 C 116 76 152 98 152 138 C 152 168 128 188 100 188 C 72 188 48 168 48 138 C 48 98 84 76 100 46 Z';
  const SINNER = 'M100 90 C 110 106 128 118 128 142 C 128 160 116 172 100 172 C 84 172 72 160 72 142 C 72 118 90 106 100 90 Z';
  chars.spark = {
    box: [0, 0, 200, 222], ground: 212,
    draw(K, o = {}) {
      const { ctx, t } = K, st = o.state || 'idle', hap = st === 'happy', sad = st === 'sad', sur = st === 'surprised';
      const fy = Math.sin(t * 2.4) * 6 - (hap ? Math.abs(Math.sin(t * 9)) * 10 : 0) + (sad ? 8 : 0);
      if (!o.noShadow) K.shadow(100, 212, 80, 0.7);
      ctx.save(); ctx.translate(0, fy);
      const gl = ctx.createRadialGradient(100, 132, 4, 100, 132, 96);
      gl.addColorStop(0, `rgba(255,215,122,${sad ? 0.2 : 0.85})`); gl.addColorStop(1, 'rgba(255,215,122,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(100, 132, 96, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(Math.sin(t * 13) * 1.6, 0);
      K.line('M100 186 L 92 198 L 103 202 L 95 216', { w: 3, color: sad ? '#9b8a6a' : C.DEEP });
      ctx.restore();
      const hairs = ['M96 52 L 84 36 L 92 33 L 80 16', 'M100 48 L 97 30 L 106 27 L 101 6', 'M104 52 L 116 37 L 109 33 L 122 20'];
      hairs.forEach((d, i) => K.rot(100, 50, (sad ? (i - 1) * 0.55 : sur ? (i - 1) * -0.15 : 0) + Math.sin(t * 7 + i * 2) * 0.09, () => K.line(d, { w: 2.8, color: sad ? '#9b8a6a' : C.DEEP })));
      const sq = 1 + Math.sin(t * 11) * 0.025;
      ctx.save(); ctx.translate(100, 188); ctx.scale(sq, 2 - sq); ctx.translate(-100, -188);
      K.shape(SBODY, { lit: sad ? '#d6b06c' : '#f4b443', w: 3.2,
        inside: () => { ctx.fillStyle = sad ? 'rgba(255,240,205,.45)' : '#ffe08f'; ctx.fill(K.path(SINNER)); } });
      ctx.restore();
      const ay = 144, hw = (a) => Math.sin(t * 14 + a) * 4;
      if (hap) { K.limb(54, ay, 24, 100 + hw(0), { sd: -1 }); K.limb(146, ay, 176, 100 + hw(1), { sd: 1 }); }
      else if (sad) { K.limb(54, ay, 42, 178, { sd: -1, bend: 3 }); K.limb(146, ay, 158, 178, { sd: 1, bend: 3 }); }
      else if (sur) { K.limb(54, ay, 24, 118, { sd: -1 }); K.limb(146, ay, 176, 118, { sd: 1 }); }
      else { K.limb(54, ay, 30, 158 + Math.sin(t * 2) * 2, { sd: -1 }); K.limb(146, ay, 174, 116 + Math.sin(t * 5) * 6, { sd: 1 }); }
      K.face(100, 134, { s: 1.55, gap: 9, state: st, ph: 0.7 });
      if (hap) K.joy(100, 124, 86);
      ctx.restore();
    },
  };

  /* ═════════ TİMSAH KISKAÇ: bağlayıcı (o.black = GND ikizi) ═════════ */
  const BOOT = 'M150 86 C 170 84 192 88 202 96 C 212 108 212 120 202 130 C 192 138 170 140 150 138 C 142 122 142 102 150 86 Z';
  const teeth = (y, dy, x0, x1) => { let d = `M${x0} ${y}`; for (let x = x0; x < x1; x += 10) d += ` L ${x + 5} ${y + dy} L ${x + 10} ${y}`; return d + ' Z'; };
  const T_UP = teeth(125, -8, 62, 142), T_DN = teeth(113, 8, 62, 148);
  chars.clip = {
    box: [26, 44, 272, 194], ground: 182,
    draw(K, o = {}) {
      const { ctx, t } = K, st = o.state || 'idle', hap = st === 'happy', sad = st === 'sad', sur = st === 'surprised';
      const boot = o.black ? '#3d342e' : C.SEAL, bootD = o.black ? '#2a2420' : '#a8341f';
      K.shadow(150, 182, 240, 0.8);
      ctx.save(); ctx.translate(0, -(hap ? Math.abs(Math.sin(t * 8)) * 7 : 0));
      const wire = 'M204 112 C 238 112 248 146 226 158 C 204 170 214 190 270 188';
      K.line(wire, { w: 10, trace: false }); K.line(wire, { w: 5, color: o.black ? '#4a403a' : C.SEAL, trace: false });
      K.shape('M160 130 L 156 166 C 156 172 170 172 170 166 L 174 132 Z', { lit: bootD });
      K.shape('M186 128 L 188 166 C 190 172 202 172 202 166 L 198 126 Z', { lit: bootD });
      K.shape(BOOT, { lit: boot, inside: () => {
        K.line('M166 86 C 160 104 160 122 166 140', { w: 1.6, alpha: 0.45, trace: false });
        K.line('M182 88 C 176 106 176 122 182 138', { w: 1.6, alpha: 0.45, trace: false });
        K.oval(160, 98, 7, 3, 'rgba(255,255,255,.35)', -0.2);
      } });
      K.line('M150 100 C 143 103 143 109 150 112 C 157 115 157 121 150 124', { w: 2, trace: false });
      K.oval(144, 130, 6, 3.4, 'rgba(255,140,120,.5)');
      // alt çene
      K.shape(T_UP, { fill: C.SHEET, w: 1.6, trace: false, hatch: false });
      K.shape('M158 120 L 58 124 C 40 126 38 140 50 141 L 160 140 Z', { lit: C.METAL });
      // üst çene: ısırır
      const open = hap ? (Math.sin(t * 12) * 0.5 + 0.5) * 0.32 : sad ? 0.1 : sur ? 0.34 : Math.pow(Math.max(0, Math.sin(t * 2.1)), 6) * 0.26;
      K.rot(158, 116, -open, () => {
        K.shape(T_DN, { fill: C.SHEET, w: 1.6, trace: false, hatch: false });
        K.shape('M160 90 C 124 92 94 96 70 100 C 50 102 40 106 42 115 L 160 117 Z', { lit: '#e2e6eb' });
        K.line('M76 98 Q 82 90 88 96 M94 96 Q 100 88 106 94', { w: 2.2, trace: false });
        K.circle(52, 102, 4.4, { lit: '#e2e6eb', w: 2, hatch: false, trace: false }); K.dot(51, 102, 1.5);
        K.circle(130, 90, 15, { lit: '#e2e6eb', w: 2.6 });
        const E = el(130, 89, 9.5), blink = K.blinking(1.3);
        K.shape(E, { fill: C.SHEET, w: 2.2, hatch: false, trace: false });
        if (hap || blink) {
          ctx.save(); K.clip(E); ctx.fillStyle = '#d3d8de'; ctx.fillRect(118, 76, 24, 26); ctx.restore();
          K.stroke(PT.geo(E), { w: 2.2, trace: false });
          ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.beginPath();
          if (hap) ctx.arc(130, 94, 6, Math.PI * 1.1, Math.PI * 1.9); else { ctx.moveTo(121, 90); ctx.quadraticCurveTo(130, 95, 139, 90); }
          ctx.stroke();
        } else {
          const pr = sur ? 3.4 : 4.8, py = 90 + (sad ? 2.5 : 0);
          K.dot(126 + (o.look || 0), py, pr); K.dot(127.6 + (o.look || 0), py - 1.6, 1.4, '#fff');
          if (sad) { ctx.save(); K.clip(E); ctx.fillStyle = '#d3d8de'; ctx.beginPath(); ctx.moveTo(118, 76); ctx.lineTo(142, 76); ctx.lineTo(142, 86); ctx.lineTo(118, 82); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(118, 82); ctx.lineTo(142, 86); ctx.stroke(); ctx.restore(); }
        }
        ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath();
        const by = sur ? 70 : 74;
        if (sad) { ctx.moveTo(120, by + 2); ctx.lineTo(140, by - 3); } else { ctx.moveTo(120, by); ctx.quadraticCurveTo(130, by - 4, 140, by + (hap ? -1 : 1)); }
        ctx.stroke();
      });
      K.circle(158, 117, 6.6, { lit: '#8b919c', w: 2.2, hatch: false, trace: false }); K.dot(158, 117, 1.7);
      if (hap) K.joy(112, 112, 74);
      ctx.restore();
    },
  };

  /* ═════════ İLETKEN DOSTLAR ═════════ */
  const hopOf = (K, o, k = 1) => (o.state === 'happy' ? Math.abs(Math.sin(K.t * 9 + (o.ph || 0))) * 9 * k : 0);
  const armsBy = (K, o, L, R) => {
    const t = K.t, st = o.state || 'idle';
    if (st === 'happy') { K.limb(L[0], L[1], L[0] - 16, L[1] - 26 + Math.sin(t * 14) * 3, { sd: -1 }); K.limb(R[0], R[1], R[0] + 16, R[1] - 26 + Math.cos(t * 14) * 3, { sd: 1 }); }
    else if (st === 'sad') { K.limb(L[0], L[1], L[0] - 6, L[1] + 26, { sd: -1, bend: 3 }); K.limb(R[0], R[1], R[0] + 6, R[1] + 26, { sd: 1, bend: 3 }); }
    else if (st === 'surprised') { K.limb(L[0], L[1], L[0] - 18, L[1] - 10, { sd: -1 }); K.limb(R[0], R[1], R[0] + 18, R[1] - 10, { sd: 1 }); }
    else { K.limb(L[0], L[1], L[0] - 16, L[1] + 10 + Math.sin(t * 2 + (o.ph || 0)) * 2, { sd: -1 }); K.limb(R[0], R[1], R[0] + 16, R[1] - 12 + Math.sin(t * 4 + (o.ph || 0)) * 4, { sd: 1 }); }
  };
  const legs = (K, a, b, gy) => { K.limb(a[0], a[1], a[0] - 4, gy - 2, { hand: false }); K.limb(b[0], b[1], b[0] + 2, gy - 2, { hand: false }); K.foot(a[0] - 4, gy, -1); K.foot(b[0] + 2, gy, 1); };

  chars.muz = {
    box: [0, 6, 104, 194], ground: 188,
    draw(K, o = {}) {
      const { ctx } = K;
      K.shadow(56, 188, 72, 0.7);
      ctx.save(); ctx.translate(0, -hopOf(K, o));
      legs(K, [56, 158], [72, 162], 188);
      armsBy(K, o, [26, 112], [58, 116]);
      K.shape('M46 32 C 16 86 22 152 88 170 C 98 166 98 156 90 152 C 60 138 52 98 66 40 Z', { lit: C.BANANA, speck: { n: 10, r: 1.7, color: 'rgba(110,80,30,.45)' } });
      K.line('M54 52 C 44 96 52 132 82 156', { w: 1.3, alpha: 0.35, trace: false });
      K.shape('M47 34 L 46 20 L 57 19 L 65 39 Z', { lit: '#7a5a2e', w: 2.2, hatch: false, trace: false });
      K.shape('M86 152 C 94 156 96 162 90 168 C 84 166 80 160 86 152 Z', { fill: '#5a4320', w: 0 });
      K.face(41, 96, { s: 0.95, gap: 7, state: o.state, ph: o.ph });
      if (o.state === 'happy') K.joy(50, 92, 62, 0.8);
      ctx.restore();
    },
  };
  chars.elma = {
    box: [0, 40, 104, 194], ground: 188,
    draw(K, o = {}) {
      const { ctx } = K;
      K.shadow(50, 188, 74, 0.7);
      ctx.save(); ctx.translate(0, -hopOf(K, o));
      legs(K, [40, 160], [60, 160], 188);
      armsBy(K, o, [14, 118], [86, 116]);
      K.shape('M50 82 C 30 66 6 80 8 112 C 10 146 32 172 50 164 C 68 172 90 146 92 112 C 94 80 70 66 50 82 Z', { lit: C.RED,
        inside: () => { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(K.path('M22 98 C 19 108 21 118 26 122 C 28 113 30 105 34 99 C 30 94 25 94 22 98 Z')); } });
      K.line('M50 82 Q 52 66 58 56', { w: 3.6, color: '#6b4423', trace: false });
      K.shape('M57 66 C 66 53 80 55 85 61 C 77 70 65 72 57 66 Z', { lit: '#7fb35a', w: 2.2, hatch: false });
      K.line('M60 65 Q 70 61 80 61', { w: 1.2, alpha: 0.5, trace: false });
      K.face(50, 118, { s: 1.1, gap: 11, state: o.state, ph: (o.ph || 0) + 0.5 });
      if (o.state === 'happy') K.joy(50, 110, 66, 0.8);
      ctx.restore();
    },
  };
  chars.hamur = {
    box: [0, 80, 106, 194], ground: 188,
    draw(K, o = {}) {
      const { ctx, t } = K, st = o.state || 'idle';
      K.shadow(52, 188, 92, 0.7);
      const sq = st === 'happy' ? 1 + Math.sin(t * 12) * 0.08 : 1 + Math.sin(t * 2.2) * 0.025;
      ctx.save(); ctx.translate(52, 188); ctx.scale(2 - sq, sq * (st === 'sad' ? 0.94 : 1)); ctx.translate(-52, -188);
      armsBy(K, o, [16, 150], [88, 150]);
      K.shape('M10 188 C 2 160 10 128 28 118 C 32 92 70 88 78 112 C 96 118 102 152 94 188 Z', { lit: '#7cc47f',
        inside: () => {
          ['M36 108 Q 48 100 60 106', 'M32 114 Q 48 103 64 112', 'M30 121 Q 48 109 68 119'].forEach((d) => K.line(d, { w: 1.2, alpha: 0.28, trace: false }));
        } });
      K.face(52, 146, { s: 1.15, gap: 11, state: st, ph: (o.ph || 0) + 1.1 });
      ctx.restore();
      if (st === 'happy') K.joy(52, 136, 64, 0.8);
    },
  };
  chars.kasik = {
    box: [8, 24, 92, 194], ground: 188,
    draw(K, o = {}) {
      const { ctx } = K;
      K.shadow(50, 188, 56, 0.7);
      ctx.save(); ctx.translate(0, -hopOf(K, o));
      legs(K, [46, 160], [54, 160], 188);
      armsBy(K, o, [45, 124], [55, 126]);
      K.shape('M45 98 L 43 160 C 46 167 54 167 57 160 L 55 98 Z', { lit: '#b9bfc9', w: 2.6 });
      K.shape(el(50, 66, 25, 33), { lit: '#e3e7ec', w: 3,
        inside: () => { K.oval(52, 74, 16, 22, 'rgba(23,20,17,.07)'); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill(K.path('M32 50 C 30 60 30 70 34 78 C 36 68 38 58 42 50 C 38 46 34 46 32 50 Z')); } });
      K.face(50, 64, { s: 1, gap: 9, state: o.state, ph: (o.ph || 0) + 2 });
      if (o.state === 'happy') K.joy(50, 64, 50, 0.8);
      ctx.restore();
    },
  };

  /* ═════════ SİLGİ: yalıtkan ═════════ */
  chars.silgi = {
    box: [0, 40, 236, 214], ground: 208,
    draw(K, o = {}) {
      const { ctx, t } = K, st = o.state || 'idle', hap = st === 'happy', sad = st === 'sad';
      K.shadow(138, 208, 150);
      [[88, 205, 2], [80, 207, 1.6], [96, 207, 1.3]].forEach(([x, y, r]) => K.dot(x, y, r, '#d98a7c'));
      if (!o.noSpark) {
        const p = (t * 0.55) % 1, k = p < 0.5 ? p * 2 : (1 - p) * 2, sx = 14 + k * k * 48;
        K.at(sx, 98, 0.24, () => { ctx.translate(-100, -130); const nsh = K.noShadow; K.noShadow = true; chars.spark.draw(K, { state: k > 0.85 ? 'surprised' : 'idle' }); K.noShadow = nsh; });
        if (k > 0.86) { ctx.strokeStyle = C.DEEP; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(76, 76); ctx.lineTo(70, 68); ctx.moveTo(80, 98); ctx.lineTo(72, 98); ctx.moveTo(76, 118); ctx.lineTo(70, 126); ctx.stroke(); }
      }
      const shake = st === 'idle' ? Math.sin(t * 9) * 0.04 * Math.max(0, Math.sin(t * 1.1) - 0.7) * 3 : 0;
      ctx.save(); ctx.translate(0, -(hap ? Math.abs(Math.sin(t * 7)) * 8 : 0));
      K.rot(132, 206, shake, () => {
        legs(K, [110, 180], [154, 180], 208);
        K.shape('M84 76 L 132 76 L 132 182 L 96 182 C 88 182 84 176 84 168 Z', { lit: '#e06a52', hatch: false });
        K.shape('M132 76 L 180 76 L 180 182 L 132 182 Z', { lit: C.SLATE });
        K.shape('M84 76 L 98 62 L 146 62 L 132 76 Z', { fill: '#f2a594', w: 2.6, hatch: false });
        K.shape('M132 76 L 146 62 L 194 62 L 180 76 Z', { fill: '#a9bfd2', w: 2.6, hatch: false });
        K.shape('M180 76 L 194 62 L 194 168 L 180 182 Z', { fill: '#43607a', hatch: true, hatchK: 1.6 });
        K.line('M104 66 L 112 70 M160 66 L 168 70', { w: 1.3, alpha: 0.5, trace: false });
        K.face(132, 114, { s: 1.7, gap: 15, state: st, stern: true, ph: 0.4 });
        if (hap) { K.limb(84, 140, 52, 110, { sd: -1 }); K.limb(180, 140, 214, 96, { sd: 1, hr: 6 }); }
        else if (sad) { K.limb(84, 140, 72, 172, { sd: -1, bend: 3 }); K.limb(180, 140, 192, 172, { sd: 1, bend: 3 }); }
        else { K.limb(84, 142, 150, 156, { sd: 1, bend: 8 }); K.limb(180, 142, 114, 156, { sd: -1, bend: 8 }); }
      });
      if (hap) K.joy(138, 110, 86);
      ctx.restore();
    },
  };

  /* ═════════ DENİZ: sen (o.gnd === false → GND kıskacı elinde değil) ═════════ */
  chars.deniz = {
    box: [-6, 0, 236, 256], ground: 250,
    draw(K, o = {}) {
      const { ctx, t } = K, st = o.state || 'idle', hap = st === 'happy', sur = st === 'surprised', gnd = o.gnd !== false;
      K.shadow(110, 250, 110);
      if (gnd && !o.noWire) K.line('M56 172 C 42 214 26 232 -6 246', { w: 5, color: '#2a2420', trace: false });
      ctx.save(); ctx.translate(0, -(hap ? Math.abs(Math.sin(t * 8)) * 10 : 0));
      K.limb(100, 190, 98, 238, { hand: false, w: 3.6 }); K.limb(122, 190, 124, 238, { hand: false, w: 3.6 });
      K.oval(92, 240, 11, 5.4, INK); K.oval(130, 240, 11, 5.4, INK);
      K.line('M84 242 L 98 242 M124 242 L 138 242', { w: 1.2, color: '#fffaf0', alpha: 0.6, trace: false });
      K.shape('M80 168 L 142 168 L 145 194 L 114 194 L 111 184 L 108 194 L 77 194 Z', { lit: '#3d4a5c' });
      K.shape('M84 104 C 96 98 124 98 136 104 L 144 172 C 124 180 96 180 76 172 Z', { lit: C.SLATE,
        inside: () => K.shape('M106 124 L 100 138 L 108 138 L 104 152 L 116 134 L 108 134 L 112 124 Z', { fill: C.AMBER, w: 1.6, hatch: false, trace: false }) });
      // sol el: siyah GND kıskacı
      const lh = sur && !gnd ? [52, 140] : [60, 162];
      K.limb(86, 112, lh[0], lh[1], { sd: -1, w: 3.2, handColor: C.SKIN, hr: 6.5 });
      if (gnd) K.rot(lh[0], lh[1], 1.15, () => {
        K.shape(`M${lh[0] - 22} ${lh[1] - 6} L ${lh[0] - 4} ${lh[1] - 6} L ${lh[0] - 4} ${lh[1] + 6} L ${lh[0] - 22} ${lh[1] + 6} Z`, { fill: '#2a2420', w: 2, hatch: false, trace: false });
      });
      // sağ el: dokunmak için uzanır
      const reach = hap ? [196, 74 + Math.sin(t * 14) * 4] : [192 + Math.sin(t * 2) * 3, 108];
      K.limb(134, 112, reach[0], reach[1], { sd: 1, w: 3.2, handColor: C.SKIN, hr: 6.5, bend: 2 });
      // kafa
      K.circle(74, 66, 7, { lit: C.SKIN, w: 2.4, hatch: false, trace: false }); K.circle(146, 66, 7, { lit: C.SKIN, w: 2.4, hatch: false, trace: false });
      K.shape(el(110, 64, 36), { lit: C.SKIN, w: 3.2 });
      K.shape('M74 62 C 70 22 150 20 146 62 C 140 46 124 40 112 48 C 102 38 84 46 74 62 Z', { lit: '#3a2a20', w: 2.6 });
      K.line('M110 28 C 106 16 114 12 119 18', { w: 2.6, trace: false });
      K.face(110, 74, { s: 1.25, gap: 12, state: st, ph: 2.2 });
      if (hap) K.joy(110, 64, 70);
      ctx.restore();
    },
  };

  /* ═════════ BİLGİ: bilgisayar (o.key = ekrandaki tuş) ═════════ */
  const CASE = 'M46 18 L 194 18 Q 210 18 210 34 L 210 146 Q 210 162 194 162 L 46 162 Q 30 162 30 146 L 30 34 Q 30 18 46 18 Z';
  const SCREEN = 'M58 32 L 182 32 Q 194 32 194 44 L 194 128 Q 194 140 182 140 L 58 140 Q 46 140 46 128 L 46 44 Q 46 32 58 32 Z';
  chars.pc = {
    box: [0, 8, 244, 232], ground: 224,
    draw(K, o = {}) {
      const { ctx, t } = K, st = o.state || 'idle', hap = st === 'happy', sad = st === 'sad', sur = st === 'surprised';
      K.shadow(120, 224, 190);
      ctx.save(); ctx.translate(0, -(hap ? Math.abs(Math.sin(t * 8)) * 6 : 0));
      if (hap) { K.limb(34, 100, 10, 66 + Math.sin(t * 14) * 4, { sd: -1 }); K.limb(206, 100, 232, 66 + Math.cos(t * 14) * 4, { sd: 1 }); }
      else if (sad) { K.limb(34, 104, 18, 130, { sd: -1, bend: 3 }); K.limb(206, 104, 222, 130, { sd: 1, bend: 3 }); }
      else { K.limb(34, 104, 12, 82, { sd: -1 }); K.limb(206, 104, 230, 86 + Math.sin(t * 5) * 7, { sd: 1 }); }
      K.shape('M108 160 L 132 160 L 135 184 L 105 184 Z', { lit: '#d4c8ad' });
      K.shape(el(120, 188, 52, 9), { lit: '#e6dcc6' });
      K.shape('M206 40 C 230 52 234 128 206 150 Z', { lit: '#d6caa9' });
      K.shape(CASE, { lit: '#ebe2cd', w: 3.2 });
      K.line('M42 152 L 62 152', { w: 1.6, alpha: 0.6, trace: false });
      K.dot(190, 152, 3, '#7fb35a');
      K.shape(SCREEN, { fill: '#1d2a33', w: 2.4, hatch: false, trace: false, inside: () => {
        const g = ctx.createRadialGradient(120, 86, 6, 120, 86, 90); g.addColorStop(0, 'rgba(255,215,122,.16)'); g.addColorStop(1, 'rgba(255,215,122,0)');
        ctx.fillStyle = g; ctx.fillRect(46, 32, 148, 108);
        ctx.fillStyle = 'rgba(0,0,0,.22)'; for (let y = 34; y < 140; y += 4) ctx.fillRect(46, y, 148, 1.4);
        ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill(K.path('M58 36 L 120 36 L 70 90 L 50 90 L 50 44 Z'));
      } });
      // piksel yüz
      const P = '#ffd77a', blink = K.blinking(3.1);
      ctx.fillStyle = P;
      [[96, -1], [144, 1]].forEach(([x, sd]) => {
        if (hap) { [[-6, 6], [0, 0], [6, 6]].forEach(([dx, dy]) => ctx.fillRect(x + dx - 3, 56 + dy, 6, 6)); }
        else if (blink) ctx.fillRect(x - 6, 62, 12, 3);
        else if (sur) ctx.fillRect(x - 6, 48, 12, 20);
        else if (sad) { ctx.fillRect(x - 5, 58, 10, 10); ctx.fillRect(sd < 0 ? x - 5 : x - 1, 54, 6, 4); }
        else ctx.fillRect(x - 5, 50, 10, 16);
      });
      ctx.font = '500 30px "JetBrains Mono", ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = P; ctx.shadowBlur = 8;
      const keys = ['↑', '←', '→', '↓', '␣', '⏎'];
      ctx.fillText(o.key ?? (sad ? '?' : sur ? '!' : keys[Math.floor(t / 1.4) % keys.length]), 120, 106);
      ctx.shadowBlur = 0;
      // klavye
      K.shape('M48 196 L 192 196 L 204 216 L 36 216 Z', { lit: '#efe6d2', w: 2.6 });
      ctx.fillStyle = 'rgba(23,20,17,.5)';
      for (let i = 0; i < 8; i++) ctx.fillRect(56 + i * 17, 200, 11, 4);
      ctx.fillRect(84, 208, 72, 4);
      if (hap) K.joy(120, 90, 112);
      ctx.restore();
    },
  };
})();
