/* Patara'nın Ekibi · mürekkep çizim seti ve karakterler (Canvas 2D).
   Görsel dil Nokta'nın Kasabası / Çarşısı ile aynı: kâğıt üstünde mürekkep, ışık soldan,
   gölge tarafında tarama, çift kalem izi, sabit (kıpırdamayan) titreme, sağa kayık yer gölgesi.
   Hedef yaş 7–14: yüzler göz kapağı ve kalın kaşla oynar, varsayılan ifade kendinden emin yarım gülüş.
   Kullanım: const K = PT.Ink(ctx); K.t = saniye; PT.chars.patara.draw(K, { state: 'happy' });
   Durumlar: idle · happy · think · surprised · sad. Şekiller SVG yol dizgisiyle yazılır, bir kez örneklenip
   önbelleğe alınır; hareket için yol dizgisini değil ctx dönüşümlerini değiştir. */
(function () {
  const PT = (window.PT = window.PT || {});
  const C = (PT.C = {
    INK: '#171411', AMBER: '#e8a33d', DEEP: '#b8741a', SEAL: '#c4432b', SHEET: '#fffaf0', PAPER: '#f1eadc',
    G: '#5e9b3f', GOLD: '#efc04a', SHELL: '#8d6430', HAT: '#efdcae', BRIM: '#e2c995', BAND: '#a8743c',
    SLATE: '#5b7c99', SKIN: '#f0c49a', METAL: '#d3d8de', RED: '#d4553a', BANANA: '#f2cf4a', MOUTH: '#5a3a2c',
    HOODIE: '#3f6f8f', DENIM: '#34405a',
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
      gr.addColorStop(1, mix(base, '#1a120a', 0.26 * k));
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
    /* Kol yeni: mürekkep kenarlı kalın kol (kapüşonlu kolu gibi), iki parçalı */
    K.sleeve = (pts, col, w = 10) => {
      const trace = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]); };
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      trace(); ctx.strokeStyle = INK; ctx.lineWidth = w + 5; ctx.stroke();
      trace(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
      trace(); ctx.strokeStyle = 'rgba(23,20,17,.18)'; ctx.lineWidth = w * 0.35; ctx.save(); ctx.translate(w * 0.22, w * 0.22); ctx.stroke(); ctx.restore();
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
    /* düşünme baloncukları */
    K.ponder = (x, y, s = 1) => {
      const t = K.t;
      [[0, 0, 2.6], [7, -9, 3.6], [17, -21, 5]].forEach(([dx, dy, r], i) => {
        const a = 0.5 + 0.5 * Math.sin(t * 3 - i);
        ctx.globalAlpha = 0.35 + a * 0.65; ctx.lineWidth = 1.8 * s; ctx.strokeStyle = INK; ctx.fillStyle = C.SHEET;
        ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, 7); ctx.fill(); ctx.stroke();
      });
      ctx.globalAlpha = 1;
    };
    K.blinking = (ph = 0) => (K.t + ph) % 4.3 < 0.13;

    /* ── Yüz parçaları ── */
    /* Göz: beyaz, göz bebeği, ifadeye göre eğilen kapak (kapak rengi = ten) */
    K.eye = (ex, ey, rx, ry, o = {}) => {
      const st = o.state || 'idle', sd = o.sd || 1, lw = o.lw || 2, skin = o.skin || C.SKIN;
      if (st === 'happy') {
        ctx.strokeStyle = INK; ctx.lineWidth = lw * 1.35; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(ex, ey + ry * 0.45, rx * 0.95, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
        return;
      }
      if (st === 'surprised') { rx *= 1.12; ry *= 1.14; }
      ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0, 0, 7); ctx.fillStyle = C.SHEET; ctx.fill();
      ctx.save(); ctx.clip();
      const pr = rx * (st === 'surprised' ? 0.42 : 0.62);
      const px = ex + (o.look || 0) * rx * 0.3 - sd * rx * 0.08 + (st === 'think' ? -rx * 0.3 : 0);
      const py = ey + (st === 'think' ? -ry * 0.32 : st === 'sad' ? ry * 0.22 : ry * 0.12);
      K.dot(px, py, pr); K.dot(px + pr * 0.36, py - pr * 0.42, pr * 0.32, '#fff');
      // kapak kenarı: iç (burna yakın) ve dış köşenin yüksekliği, ry biriminde
      let li, lo;
      if (o.blink) li = lo = 1.3;
      else if (st === 'surprised') li = lo = -1.4;
      else if (st === 'sad') { li = -0.8; lo = -0.12; }
      else if (st === 'think') li = lo = sd > 0 ? 0.02 : -0.62;
      else if (o.stern) { li = -0.08; lo = -0.62; }
      else li = lo = o.lid ?? -0.42;
      if (li > -1.3) {
        const xi = ex - sd * (rx + 2), xo = ex + sd * (rx + 2);
        ctx.fillStyle = skin; ctx.beginPath();
        ctx.moveTo(xo, ey - ry - 3); ctx.lineTo(xi, ey - ry - 3); ctx.lineTo(xi, ey + li * ry); ctx.lineTo(xo, ey + lo * ry); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = lw * 1.15; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(xi, ey + li * ry); ctx.lineTo(xo, ey + lo * ry); ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0, 0, 7); ctx.stroke();
    };
    /* Kaş: kalın, ifadeye göre iç ucu iner/kalkar */
    K.brow = (bx, by, hw, sd, st, lw, stern) => {
      let inner = 0, outer = 0, arch = -hw * 0.3;
      if (st === 'sad') { inner = -hw * 0.5; outer = hw * 0.2; arch = -hw * 0.05; }
      else if (st === 'surprised') { inner = outer = -hw * 0.55; arch = -hw * 0.5; }
      else if (st === 'happy') { inner = outer = -hw * 0.28; arch = -hw * 0.45; }
      else if (st === 'think') { if (sd < 0) { inner = outer = -hw * 0.6; arch = -hw * 0.5; } else { inner = hw * 0.18; arch = 0; } }
      else if (stern) { inner = hw * 0.4; outer = -hw * 0.2; arch = 0; }
      else { inner = hw * 0.05; outer = -hw * 0.08; }
      const xi = bx - sd * hw, xo = bx + sd * hw;
      ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(xo, by + outer); ctx.quadraticCurveTo(bx, by + arch + (inner + outer) / 2, xi, by + inner); ctx.stroke();
    };
    /* Ağız: yarım gülüş (varsayılan), sırıtış, düşünceli, şaşkın, üzgün, kuralcı */
    K.mouth = (x, my, s, st, o = {}) => {
      const lw = 2 * Math.min(s, 1.4), w = 5.6 * s;
      ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (st === 'happy') {
        const p = new Path2D();
        p.moveTo(x - w, my - 1.2 * s); p.quadraticCurveTo(x, my + 0.6 * s, x + w, my - 2 * s); p.quadraticCurveTo(x + w * 0.5, my + 9.5 * s, x - w, my - 1.2 * s); p.closePath();
        ctx.fillStyle = C.MOUTH; ctx.fill(p);
        ctx.save(); ctx.clip(p);
        ctx.fillStyle = '#fffaf0'; ctx.fillRect(x - w - 2, my - 4 * s, 2 * w + 4, 4.4 * s);
        K.oval(x + 1.5 * s, my + 7 * s, 3.6 * s, 2.6 * s, '#e07a6a');
        ctx.restore();
        ctx.stroke(p);
        return;
      }
      ctx.beginPath();
      if (st === 'surprised') { ctx.ellipse(x, my + 1.5 * s, 2.8 * s, 3.8 * s, 0, 0, 7); ctx.fillStyle = C.MOUTH; ctx.fill(); ctx.stroke(); return; }
      if (st === 'sad') { ctx.moveTo(x - w * 0.8, my + 2.4 * s); ctx.quadraticCurveTo(x, my - 2.8 * s, x + w * 0.8, my + 2.8 * s); }
      else if (st === 'think') { ctx.moveTo(x - w * 0.1, my + 1 * s); ctx.quadraticCurveTo(x + w * 0.45, my + 1.6 * s, x + w * 0.95, my - 0.4 * s); }
      else if (o.stern) { ctx.moveTo(x - w * 0.8, my + 0.8 * s); ctx.quadraticCurveTo(x, my - 0.6 * s, x + w * 0.8, my + 0.8 * s); }
      else {
        ctx.moveTo(x - w * 0.9, my); ctx.quadraticCurveTo(x + w * 0.1, my + 3.8 * s, x + w, my - 1.8 * s);
        ctx.moveTo(x + w * 0.82, my - 2.9 * s); ctx.lineTo(x + w * 1.12, my - 0.9 * s);
      }
      ctx.stroke();
    };
    /* Ortak yüz. skin = kapak rengi, er = göz yarıçapı, bh = kaş yüksekliği */
    K.face = (x, y, o = {}) => {
      const s = o.s || 1, gap = (o.gap || 8) * s, st = o.state || 'idle', lw = 1.8 * Math.min(s, 1.5), er = (o.er || 3.4) * s;
      const blink = st !== 'happy' && K.blinking(o.ph || 0);
      const look = o.look ?? Math.sin(K.t * 0.45 + (o.ph || 0)) * 0.8;
      [-1, 1].forEach((sd) => K.eye(x + sd * gap, y, er, er * 1.25, { state: st, sd, lw, skin: o.skin, look, blink, stern: o.stern, lid: o.lid }));
      if (o.brows !== false) [-1, 1].forEach((sd) => K.brow(x + sd * gap, y - er * 1.25 - (o.bh ?? 3.2) * s, er * 1.05, sd, st, lw * 1.4, o.stern));
      if (st === 'happy' && o.blush !== false) [-1, 1].forEach((sd) => K.oval(x + sd * (gap + 3 * s), y + 5 * s, 3.6 * s, 2 * s, 'rgba(196,67,43,.2)'));
      K.mouth(x + (o.mx || 0) * s, y + (o.my ?? 9) * s, s, st, { stern: o.stern });
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
    think: ['.###.', '#...#', '..##.', '.....', '..#..'],
    star: ['..#..', '.###.', '#####', '.###.', '#...#'],
    note: ['...#.', '...#.', '...#.', '.##..', '.##..'],
    up: ['..#..', '.###.', '#.#.#', '..#..', '..#..'],
    off: ['.....', '.....', '.....', '.....', '.....'],
  });

  /* ═════════ PATARA: safari şapkalı kâşif kaplumbağa = kartın kendisi ═════════ */
  const ARM = 'M92 150 C 56 146 26 124 22 94 C 20 78 40 72 48 88 C 56 108 74 124 102 130 Z';
  const FOOT = 'M82 226 C 58 228 44 242 48 254 C 62 262 90 258 100 246 C 104 236 96 226 82 226 Z';
  const PADS = [[32, 97], [38, 112], [48, 125], [61, 135], [77, 143]];
  const DPAD = [[84, 182, 'up'], [84, 204, 'down'], [73, 193, 'left'], [95, 193, 'right']];
  const RIM = el(130, 184, 82, 70), INNER = el(130, 184, 72, 61);
  const TOP = 'M48 152 C 50 122 92 116 130 116 C 168 116 210 122 212 152 C 212 166 198 170 178 170 L 82 170 C 62 170 48 166 48 152 Z';
  const MIDL = 'M52 186 C 52 178 58 176 66 176 L 120 176 C 126 176 128 180 128 186 L 128 202 C 128 208 124 210 118 210 L 62 210 C 56 210 52 206 52 200 Z';
  const MIDR = 'M208 186 C 208 178 202 176 194 176 L 140 176 C 134 176 132 180 132 186 L 132 202 C 132 208 136 210 142 210 L 198 210 C 204 210 208 206 208 200 Z';
  const LEDR = 'M118 133 L 142 133 Q 148 133 148 139 L 148 163 Q 148 169 142 169 L 118 169 Q 112 169 112 163 L 112 139 Q 112 133 118 133 Z';
  const HEAD = el(130, 80, 58, 48);
  const SCARF = 'M88 116 C 108 132 152 132 172 116 L 174 125 C 152 138 108 138 86 125 Z';
  chars.patara = {
    box: [-8, 0, 268, 272], ground: 262,
    /* tıklama hedefleri için parça konumları (Patara'nın kendi koordinatlarında) */
    parts: {
      left: PADS.map(([x, y], i) => ({ x, y, key: ['up', 'left', 'right', 'down', 'gnd'][i] })),
      right: PADS.map(([x, y], i) => ({ x: 260 - x, y, key: ['space', 'click', 'rclick', 'enter', 'gnd2'][i] })),
      dpad: DPAD.map(([x, y, key]) => ({ x, y, key })), xy: [{ x: 168, y: 188, key: 'X' }, { x: 192, y: 198, key: 'Y' }],
      led: { x: 112, y: 133, w: 36, h: 36 }, piano: { x: 40, y: 216, w: 180, h: 44, keyW: 22.5 },
    },
    draw(K, o = {}) {
      const { ctx, t } = K, st = o.state || 'idle', hap = st === 'happy', sad = st === 'sad', sur = st === 'surprised', thk = st === 'think';
      const walking = o.walk != null;
      const hop = hap ? Math.abs(Math.sin(t * 8)) * 12 : sur ? Math.max(0, Math.sin(t * 3)) * 3 : walking ? Math.abs(Math.cos(o.walk)) * 4 : 0;
      K.shadow(130, 262, 210, 1 - hop / 40);
      ctx.save(); ctx.translate(0, -hop + (sad ? 2 : 0));
      // kuyruk ve arka ayaklar
      K.shape('M198 214 C 214 218 228 232 238 230 C 232 218 216 206 204 204 Z', { lit: C.G });
      const foot = (lift) => { ctx.save(); ctx.translate(0, hop - lift); K.shape(FOOT, { lit: C.G }); K.line('M58 250 L 62 243 M69 254 L 73 246', { w: 1.6, trace: false }); ctx.restore(); };
      const lift = (sgn) => (walking ? Math.max(0, sgn * Math.sin(o.walk)) * 9 : hop);
      foot(lift(1)); K.mirror(130, () => foot(lift(-1)));
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
      const wave = hap ? Math.sin(t * 14) * 0.2 : o.wave ? Math.sin(t * 7) * 0.22 : sad ? 0.1 : thk ? -0.12 : Math.sin(t * 1.6) * 0.05;
      arm(['up', 'left', 'right', 'down', 'gnd'], sad ? 0.1 : 0);
      K.mirror(130, () => arm(['space', 'click', 'rclick', 'enter', 'gnd2'], wave));
      // kabuk: kenar, koyu aralık, sarı plakalar, piyano
      K.shape(RIM, { lit: C.SHELL, w: 3.4 });
      K.shape(INNER, { fill: '#3b2a14', w: 2, trace: false, hatch: false });
      ctx.save(); K.clip(INNER);
      K.shape(TOP, { lit: C.GOLD, w: 2.2, hatch: false });
      K.line('M62 146 C 76 134 92 130 104 130', { w: 1.3, alpha: 0.3, trace: false });
      K.line('M156 130 C 168 130 184 134 198 146', { w: 1.3, alpha: 0.3, trace: false });
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
      const pat = o.ledGrid || LED[o.led || (hap ? 'heart' : sad ? 'sad' : sur ? 'wow' : thk ? 'think' : cyc[Math.floor(t / 1.8) % cyc.length])];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
        const on = o.ledGrid ? !!pat[r * 5 + c] : pat[r][c] === '#', x = 118 + c * 6, y = 139 + r * 6;
        if (on) { ctx.save(); ctx.shadowColor = '#ff4a3a'; ctx.shadowBlur = 6; K.dot(x, y, 2.3, '#ff5040'); ctx.restore(); }
        else K.dot(x, y, 2.1, '#3a2a14');
      }
      // yön tuşları ve X / Y
      DPAD.forEach(([x, y, k]) => K.circle(x, y, 4.8, { fill: o.btn === k ? C.AMBER : C.SHEET, w: 1.8, trace: false }));
      [[168, 188, 'X'], [192, 198, 'Y']].forEach(([x, y, s]) => {
        K.circle(x, y, 6.2, { fill: o.btn === s ? C.AMBER : C.SHEET, w: 1.8, trace: false });
        ctx.fillStyle = INK; ctx.font = '600 8px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y + 0.5);
      });
      // kâşif fuları: düğüm sağda, uçları rüzgârda
      K.rot(170, 122, Math.sin(t * 3.2) * 0.09 + (hap ? Math.sin(t * 10) * 0.08 : 0), () => {
        K.shape('M168 120 C 182 126 192 138 194 150 L 185 149 C 182 140 176 133 166 128 Z', { lit: '#c94b32', w: 2.4 });
        K.shape('M168 123 C 176 133 180 146 176 157 L 169 152 C 171 143 168 135 163 129 Z', { lit: '#b2402a', w: 2.4 });
      });
      K.shape(SCARF, { lit: '#d4553a', w: 2.6, inside: () => { [[104, 128], [120, 131], [140, 131], [156, 128]].forEach(([x, y]) => K.dot(x, y, 1.8, 'rgba(255,240,220,.7)')); } });
      K.circle(169, 123, 6, { lit: '#c94b32', w: 2.2, hatch: false, trace: false });
      // kafa
      const tilt = sad ? 0.07 : hap ? Math.sin(t * 8) * 0.05 : thk ? -0.08 : Math.sin(t * 1.3) * 0.02;
      K.rot(130, 126, tilt, () => {
        ctx.save(); ctx.translate(0, Math.sin(t * 2) * 0.8);
        K.shape(HEAD, { lit: C.G, w: 3.4, speck: { n: 8, r: 2.6, color: 'rgba(40,80,20,.2)' } });
        K.face(130, 82, { s: 3.2, gap: 7.5, er: 4.6, skin: mix(C.G, '#ffffff', 0.1), my: 8, bh: 2.2, state: st, look: o.look, blush: false });
        K.dot(124, 99, 1.9); K.dot(136, 99, 1.9);
        if (hap) { K.oval(86, 104, 8, 4.5, 'rgba(196,67,43,.28)'); K.oval(174, 104, 8, 4.5, 'rgba(196,67,43,.28)'); }
        // safari şapkası, hafif yana yatık
        const hb = hap ? -Math.abs(Math.sin(t * 8 - 0.5)) * 5 : sur ? -5 : 0;
        K.rot(130, 44, -0.14 + (hap ? Math.sin(t * 8) * 0.04 : 0), () => {
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
      if (thk) K.ponder(196, 52, 1.3);
      if (hap) K.joy(130, 112, 138);
      ctx.restore();
    },
  };

  /* ═════════ KIVILCIM: akım ═════════ */
  const SBODY = 'M100 40 C 106 58 118 66 128 54 C 132 74 152 96 152 136 C 152 168 128 190 100 190 C 72 190 48 168 48 136 C 48 112 58 94 68 82 C 68 94 76 100 84 92 C 84 72 90 56 100 40 Z';
  const SINNER = 'M100 92 C 110 108 128 120 128 144 C 128 162 116 174 100 174 C 84 174 72 162 72 144 C 72 120 90 108 100 92 Z';
  const bolt = (ctx, x, y, s, a) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(-3, -10); ctx.lineTo(3, -2); ctx.lineTo(-2, 0); ctx.lineTo(4, 10); ctx.stroke(); ctx.restore(); };
  chars.spark = {
    box: [0, 0, 200, 222], ground: 212,
    draw(K, o = {}) {
      const { ctx, t } = K, st = o.state || 'idle', hap = st === 'happy', sad = st === 'sad', sur = st === 'surprised', thk = st === 'think';
      const fy = Math.sin(t * 2.4) * 6 - (hap ? Math.abs(Math.sin(t * 9)) * 10 : 0) + (sad ? 8 : 0);
      if (!o.noShadow) K.shadow(100, 212, 80, 0.7);
      ctx.save(); ctx.translate(0, fy);
      const gl = ctx.createRadialGradient(100, 132, 4, 100, 132, 96);
      gl.addColorStop(0, `rgba(255,215,122,${sad ? 0.18 : 0.85})`); gl.addColorStop(1, 'rgba(255,215,122,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(100, 132, 96, 0, 7); ctx.fill();
      if (!sad) {
        ctx.strokeStyle = C.DEEP; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let i = 0; i < 2; i++) { const a = t * 2.2 + i * Math.PI; bolt(ctx, 100 + Math.cos(a) * 78, 128 + Math.sin(a) * 34, 1, a); }
      }
      ctx.save(); ctx.translate(Math.sin(t * 13) * 1.6, 0);
      K.line('M100 188 L 92 199 L 103 203 L 95 217', { w: 3, color: sad ? '#9b8a6a' : C.DEEP });
      ctx.restore();
      const sq = 1 + Math.sin(t * 11) * 0.025, body = sad ? '#d6b06c' : '#f4b443';
      ctx.save(); ctx.translate(100, 190); ctx.scale(sq, 2 - sq); ctx.translate(-100, -190);
      K.shape(SBODY, { lit: body, w: 3.4, inside: () => { ctx.fillStyle = sad ? 'rgba(255,240,205,.45)' : '#ffe08f'; ctx.fill(K.path(SINNER)); } });
      ctx.restore();
      const ay = 146, hw = (a) => Math.sin(t * 14 + a) * 4;
      if (hap) { K.limb(54, ay, 26, 98 + hw(0), { sd: -1 }); K.limb(146, ay, 174, 98 + hw(1), { sd: 1 }); }
      else if (sad) { K.limb(54, ay, 42, 180, { sd: -1, bend: 3 }); K.limb(146, ay, 158, 180, { sd: 1, bend: 3 }); }
      else if (sur) { K.limb(54, ay, 24, 120, { sd: -1 }); K.limb(146, ay, 176, 120, { sd: 1 }); }
      else if (thk) { K.limb(54, ay, 36, 170, { sd: -1 }); K.limb(146, ay, 116, 152, { sd: 1, bend: 10 }); }
      else { K.limb(54, ay, 28, 160, { sd: -1 }); K.limb(146, ay, 178, 112 + Math.sin(t * 5) * 6, { sd: 1 }); K.dot(28, 160, 5); }
      K.face(100, 128, { s: 1.55, gap: 9.5, er: 3.8, skin: '#ffd77a', state: st, ph: 0.7, my: 9 });
      if (thk) K.ponder(148, 72, 1);
      if (hap) K.joy(100, 124, 88);
      ctx.restore();
    },
  };

  /* ═════════ TİMSAH KISKAÇ: bağlayıcı (o.black = GND ikizi) ═════════ */
  const BOOT = 'M150 86 C 170 84 192 88 202 96 C 212 108 212 120 202 130 C 192 138 170 140 150 138 C 142 122 142 102 150 86 Z';
  const teeth = (y, dy, x0, x1) => { let d = `M${x0} ${y}`, i = 0; for (let x = x0; x < x1; x += 10, i++) d += ` L ${x + 5} ${y + dy * (i % 2 ? 0.65 : 1)} L ${x + 10} ${y}`; return d + ' Z'; };
  const T_UP = teeth(125, -8, 62, 142), T_DN = teeth(115, 9, 56, 146);
  chars.clip = {
    box: [26, 40, 272, 194], ground: 182,
    draw(K, o = {}) {
      const { ctx, t } = K, st = o.state || 'idle', hap = st === 'happy', sad = st === 'sad', sur = st === 'surprised', thk = st === 'think';
      const boot = o.black ? '#3d342e' : C.SEAL, bootD = o.black ? '#2a2420' : '#a8341f';
      if (!o.noShadow) K.shadow(150, 182, 240, 0.8);
      ctx.save(); ctx.translate(0, -(hap ? Math.abs(Math.sin(t * 8)) * 7 : 0));
      const wire = 'M204 112 C 238 112 248 146 226 158 C 204 170 214 190 270 188';
      if (!o.noWire) { K.line(wire, { w: 10, trace: false }); K.line(wire, { w: 5, color: o.black ? '#4a403a' : C.SEAL, trace: false }); }
      // bacaklar ve pençeler
      [['M160 130 L 156 166 C 156 172 170 172 170 166 L 174 132 Z', 158], ['M186 128 L 188 166 C 190 172 202 172 202 166 L 198 126 Z', 190]].forEach(([d, fx]) => {
        K.shape(d, { lit: bootD });
        K.line(`M${fx} 170 L ${fx - 3} 176 M${fx + 6} 171 L ${fx + 5} 177 M${fx + 11} 170 L ${fx + 13} 176`, { w: 2, trace: false });
      });
      // sırt dikenleri
      K.shape('M154 89 L 160 77 L 166 87 L 173 75 L 180 88 L 187 78 L 194 92 Z', { lit: bootD, w: 2.2, hatch: false });
      K.shape(BOOT, { lit: boot, inside: () => {
        K.line('M166 86 C 160 104 160 122 166 140', { w: 1.6, alpha: 0.45, trace: false });
        K.line('M182 88 C 176 106 176 122 182 138', { w: 1.6, alpha: 0.45, trace: false });
        K.oval(160, 98, 7, 3, 'rgba(255,255,255,.35)', -0.2);
      } });
      K.line('M150 100 C 143 103 143 109 150 112 C 157 115 157 121 150 124', { w: 2, trace: false });
      // alt çene
      K.shape(T_UP, { fill: C.SHEET, w: 1.6, trace: false, hatch: false });
      K.shape('M158 120 L 58 124 C 40 126 36 140 50 141 L 160 140 Z', { lit: C.METAL });
      K.line('M70 134 L 140 134', { w: 1.2, alpha: 0.35, trace: false });
      // üst çene: ısırır
      const open = hap ? (Math.sin(t * 12) * 0.5 + 0.5) * 0.32 : sad ? 0.08 : sur ? 0.34 : thk ? 0.04 : Math.pow(Math.max(0, Math.sin(t * 2.1)), 6) * 0.26;
      K.rot(158, 116, -open, () => {
        K.shape(T_DN, { fill: C.SHEET, w: 1.6, trace: false, hatch: false });
        K.shape('M160 88 C 140 86 112 92 84 96 C 66 98 50 98 42 106 C 38 112 42 117 50 117 L 160 118 Z', { lit: '#e2e6eb' });
        K.line('M72 96 Q 77 89 82 95 M88 94 Q 93 87 98 93 M104 92 Q 109 85 114 91', { w: 2, trace: false });
        K.circle(50, 101, 5, { lit: '#e2e6eb', w: 2, hatch: false, trace: false }); K.dot(50, 101, 1.7);
        // göz yuvası ve kalın kaş çıkıntısı
        K.circle(132, 88, 15, { lit: '#e2e6eb', w: 2.8 });
        K.eye(132, 88, 8.4, 9.6, { state: st, sd: 1, lw: 2.2, skin: '#dfe3e8', look: o.look ?? Math.sin(t * 0.5) * 0.6, blink: st !== 'happy' && K.blinking(1.3), lid: -0.2 });
        K.brow(132, 72, 12, 1, st, 4.2, !hap && !sad && !sur && !thk);
        // ağız kenarı: yarım gülüş
        if (!sad) K.line('M150 117 Q 156 112 160 106', { w: 2.4, trace: false });
      });
      K.circle(158, 117, 6.6, { lit: '#8b919c', w: 2.2, hatch: false, trace: false }); K.dot(158, 117, 1.7);
      if (thk) K.ponder(150, 56, 1);
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
    else if (st === 'think') { K.limb(L[0], L[1], L[0] - 8, L[1] + 22, { sd: -1 }); K.limb(R[0], R[1], R[0] - 10, R[1] - 16, { sd: 1, bend: 12 }); }
    else { K.limb(L[0], L[1], L[0] - 10, L[1] + 22, { sd: -1 }); K.limb(R[0], R[1], R[0] + 8, R[1] + 22 + Math.sin(t * 2 + (o.ph || 0)) * 2, { sd: 1 }); }
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
      K.face(41, 94, { s: 0.95, gap: 7.4, er: 3.3, skin: '#f6d76a', lid: -0.12, state: o.state, ph: o.ph });
      if (o.state === 'think') K.ponder(64, 60, 0.8);
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
      K.face(50, 114, { s: 1.15, gap: 10, er: 3.6, skin: '#e0634a', lid: -0.6, state: o.state, ph: (o.ph || 0) + 0.5 });
      if (o.state === 'think') K.ponder(80, 84, 0.8);
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
        inside: () => { ['M36 108 Q 48 100 60 106', 'M32 114 Q 48 103 64 112', 'M30 121 Q 48 109 68 119'].forEach((d) => K.line(d, { w: 1.2, alpha: 0.28, trace: false })); } });
      K.face(52, 144, { s: 1.15, gap: 10.5, er: 3.8, skin: '#86cc88', lid: -0.3, state: st, ph: (o.ph || 0) + 1.1, look: st === 'idle' ? Math.sin(t * 0.8) * 1.2 : undefined });
      ctx.restore();
      if (st === 'think') K.ponder(84, 104, 0.8);
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
      K.face(50, 62, { s: 1, gap: 9, er: 3.4, skin: '#e3e7ec', state: o.state, ph: (o.ph || 0) + 2 });
      if (o.state === 'think') K.ponder(76, 30, 0.8);
      if (o.state === 'happy') K.joy(50, 64, 50, 0.8);
      ctx.restore();
    },
  };

  /* ═════════ SİLGİ: yalıtkan, ayıklama oyununun hakemi (düdüklü) ═════════ */
  chars.silgi = {
    box: [0, 40, 236, 214], ground: 208,
    draw(K, o = {}) {
      const { ctx, t } = K, st = o.state || 'idle', hap = st === 'happy', sad = st === 'sad', thk = st === 'think';
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
        // yüz: iki yarıda iki ayrı ten
        const blink = st !== 'happy' && K.blinking(0.4), stern = st === 'idle', look = Math.sin(t * 0.5) * 0.6;
        K.eye(114, 108, 6.6, 8.2, { state: st, sd: -1, lw: 2.4, skin: '#e8806a', look, blink, stern });
        K.eye(150, 108, 6.6, 8.2, { state: st, sd: 1, lw: 2.4, skin: '#7090ab', look, blink, stern });
        K.brow(114, 92, 8, -1, st, 4, stern); K.brow(150, 92, 8, 1, st, 4, stern);
        K.mouth(132, 128, 1.6, st, { stern });
        // hakem düdüğü
        K.line('M96 134 C 104 150 120 158 130 160 M168 134 C 160 150 144 158 134 160', { w: 1.6, alpha: 0.75, trace: false });
        K.shape('M122 158 L 140 158 C 147 158 149 168 142 172 L 128 172 C 120 172 118 162 122 158 Z', { lit: '#c3c8d0', w: 2.2, hatch: false, trace: false });
        K.shape('M140 160 L 150 158 L 150 164 L 141 166 Z', { fill: '#8b919c', w: 1.8, hatch: false, trace: false });
        if (hap) { K.limb(84, 140, 52, 110, { sd: -1 }); K.limb(180, 140, 214, 96, { sd: 1, hr: 6 }); }
        else if (sad) { K.limb(84, 140, 72, 172, { sd: -1, bend: 3 }); K.limb(180, 140, 192, 172, { sd: 1, bend: 3 }); }
        else if (thk) { K.limb(84, 142, 150, 156, { sd: 1, bend: 8 }); K.limb(180, 142, 154, 132, { sd: -1, bend: 10 }); }
        else { K.limb(84, 142, 150, 150, { sd: 1, bend: 8 }); K.limb(180, 142, 114, 150, { sd: -1, bend: 8 }); }
      });
      if (thk) K.ponder(196, 54, 1);
      if (hap) K.joy(138, 110, 86);
      ctx.restore();
    },
  };

  /* ═════════ DENİZ: sen; 11–12 yaşında, kapüşonlu, kulaklıklı, sırt çantalı ═════════
     o.gnd === false → GND kıskacı elinde değil. El noktaları: sağ el (196,96), sol el (66,156), omuzlar (138,98) (86,98). */
  chars.deniz = {
    box: [-6, 4, 236, 236], ground: 230,
    hands: { right: [196, 96], left: [66, 156], rs: [138, 98], ls: [86, 98] },
    draw(K, o = {}) {
      const { ctx, t } = K, st = o.state || 'idle', hap = st === 'happy', sur = st === 'surprised', thk = st === 'think', sad = st === 'sad';
      const gnd = o.gnd !== false;
      K.shadow(112, 230, 120);
      if (gnd && !o.noWire) K.line('M60 166 C 46 206 26 220 -6 228', { w: 5, color: '#2a2420', trace: false });
      ctx.save(); ctx.translate(0, -(hap ? Math.abs(Math.sin(t * 8)) * 10 : 0));
      // sırt çantası (arkada)
      K.shape('M74 100 C 74 92 150 92 150 100 L 154 150 C 154 156 70 156 70 150 Z', { lit: '#d08a2e' });
      // bacaklar: kot, spor ayakkabı
      K.shape('M82 158 L 142 158 L 144 214 L 122 214 L 112 176 L 104 214 L 80 214 Z', { lit: C.DENIM });
      K.line('M112 176 L 112 162', { w: 1.4, alpha: 0.5, trace: false });
      [[92, -1], [133, 1]].forEach(([x, d]) => {
        K.shape(`M${x - 14} 212 L ${x + 10} 212 C ${x + 10 + d * 8} 214 ${x + 12 + d * 10} 222 ${x + 8 + d * 8} 228 L ${x - 16} 228 C ${x - 20} 222 ${x - 18} 214 ${x - 14} 212 Z`, { fill: '#f4efe4', w: 2.4, hatch: false });
        K.line(`M${x - 16} 223 L ${x + 12 + d * 6} 223`, { w: 2, color: C.SEAL, trace: false });
      });
      // kapüşonlu gövde
      K.shape('M84 94 C 98 88 126 88 140 94 L 147 160 C 128 168 96 168 77 160 Z', { lit: C.HOODIE, inside: () => {
        K.line('M94 138 L 130 138 L 135 158 L 89 158 Z', { w: 1.4, alpha: 0.45, trace: false });
        K.shape('M104 112 L 99 124 L 106 124 L 102 136 L 114 120 L 107 120 L 110 112 Z', { fill: C.AMBER, w: 1.4, hatch: false, trace: false });
      } });
      K.line('M88 94 L 94 140 M136 94 L 130 140', { w: 4, color: '#8a5a2e', trace: false });
      K.line('M108 98 L 106 118 M118 98 L 120 116', { w: 1.4, color: C.SHEET, trace: false });
      // sol kol: siyah GND kıskacını tutar
      const lh = sad ? [70, 160] : [66, 156];
      K.sleeve([[88, 100], [70, 124], lh], C.HOODIE);
      K.circle(lh[0], lh[1] + 2, 6.4, { lit: C.SKIN, w: 2.2, hatch: false, trace: false });
      if (gnd) K.rot(lh[0], lh[1] + 2, 1.15, () => {
        K.shape(`M${lh[0] - 24} ${lh[1] - 4} L ${lh[0] - 5} ${lh[1] - 4} L ${lh[0] - 5} ${lh[1] + 8} L ${lh[0] - 24} ${lh[1] + 8} Z`, { fill: '#2a2420', w: 2, hatch: false, trace: false });
        K.shape(`M${lh[0] - 24} ${lh[1] - 3} L ${lh[0] - 34} ${lh[1]} L ${lh[0] - 34} ${lh[1] + 4} L ${lh[0] - 24} ${lh[1] + 7} Z`, { fill: C.METAL, w: 1.8, hatch: false, trace: false });
      });
      // sağ kol: dokunmak için uzanır / düşünürken çeneye / sevinçte yumruk havada
      const rh = hap ? [150, 22 + Math.sin(t * 14) * 3] : thk ? [124, 82] : sad ? [150, 160] : [196 + Math.sin(t * 2) * 2, 96];
      const re = hap ? [160, 60] : thk ? [154, 116] : sad ? [148, 130] : [166, 100];
      // kulaklık bandı boynun arkasında
      K.line('M99 90 C 102 100 122 100 125 90', { w: 4.5, color: '#2a2f36', trace: false });
      // kafa
      K.shape('M106 76 L 118 76 L 118 92 L 106 92 Z', { fill: mix(C.SKIN, '#1a120a', 0.15), w: 2, hatch: false, trace: false });
      K.circle(84, 54, 6, { lit: C.SKIN, w: 2.2, hatch: false, trace: false }); K.circle(140, 54, 6, { lit: C.SKIN, w: 2.2, hatch: false, trace: false });
      K.shape(el(112, 52, 28, 30), { lit: C.SKIN, w: 3.2 });
      K.shape('M82 48 C 78 22 98 12 116 16 C 134 18 146 30 142 50 C 138 42 132 38 126 42 C 122 32 110 32 106 40 C 100 34 90 38 82 48 Z', { lit: '#3a2a20', w: 2.6 });
      K.line('M110 18 C 108 8 118 4 122 10 M96 22 C 90 16 92 10 98 10', { w: 2.4, trace: false });
      K.face(112, 56, { s: 1.1, gap: 10, er: 3.6, skin: C.SKIN, my: 12, state: st, ph: 2.2 });
      // kulaklık kapakları
      K.circle(99, 90, 6.5, { lit: '#3a4250', w: 2.2, hatch: false, trace: false }); K.circle(125, 90, 6.5, { lit: '#3a4250', w: 2.2, hatch: false, trace: false });
      K.dot(99, 90, 2.2, C.AMBER); K.dot(125, 90, 2.2, C.AMBER);
      K.sleeve([[136, 100], re, rh], C.HOODIE);
      K.circle(rh[0], rh[1], 6.4, { lit: C.SKIN, w: 2.2, hatch: false, trace: false });
      if (!hap && !thk && !sad) {
        ctx.strokeStyle = C.DEEP; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        const a = 0.5 + 0.5 * Math.sin(t * 4); ctx.globalAlpha = a;
        ctx.beginPath(); ctx.moveTo(rh[0] + 10, rh[1] - 8); ctx.lineTo(rh[0] + 14, rh[1] - 13); ctx.moveTo(rh[0] + 12, rh[1]); ctx.lineTo(rh[0] + 19, rh[1]); ctx.moveTo(rh[0] + 10, rh[1] + 8); ctx.lineTo(rh[0] + 14, rh[1] + 13); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (thk) K.ponder(150, 22, 1);
      if (hap) K.joy(112, 50, 70);
      ctx.restore();
    },
  };

  /* ═════════ BİLGİ: bilgisayar (o.key = ekrandaki tuş) ═════════ */
  const CASE = 'M46 18 L 194 18 Q 210 18 210 34 L 210 146 Q 210 162 194 162 L 46 162 Q 30 162 30 146 L 30 34 Q 30 18 46 18 Z';
  const SCREEN = 'M58 32 L 182 32 Q 194 32 194 44 L 194 128 Q 194 140 182 140 L 58 140 Q 46 140 46 128 L 46 44 Q 46 32 58 32 Z';
  chars.pc = {
    box: [0, 8, 244, 232], ground: 224,
    draw(K, o = {}) {
      const { ctx, t } = K, st = o.state || 'idle', hap = st === 'happy', sad = st === 'sad', sur = st === 'surprised', thk = st === 'think';
      K.shadow(120, 224, 190);
      ctx.save(); ctx.translate(0, -(hap ? Math.abs(Math.sin(t * 8)) * 6 : 0));
      if (hap) { K.limb(34, 100, 10, 66 + Math.sin(t * 14) * 4, { sd: -1 }); K.limb(206, 100, 232, 66 + Math.cos(t * 14) * 4, { sd: 1 }); }
      else if (sad) { K.limb(34, 104, 18, 130, { sd: -1, bend: 3 }); K.limb(206, 104, 222, 130, { sd: 1, bend: 3 }); }
      else if (thk) { K.limb(34, 104, 16, 128, { sd: -1 }); K.limb(206, 104, 226, 76, { sd: 1 }); }
      else { K.limb(34, 104, 12, 82, { sd: -1 }); K.limb(206, 104, 230, 86 + Math.sin(t * 5) * 7, { sd: 1 }); }
      K.shape('M108 160 L 132 160 L 135 184 L 105 184 Z', { lit: '#d4c8ad' });
      K.shape(el(120, 188, 52, 9), { lit: '#e6dcc6' });
      K.shape('M206 40 C 230 52 234 128 206 150 Z', { lit: '#d6caa9' });
      K.shape(CASE, { lit: '#ebe2cd', w: 3.2 });
      K.line('M42 152 L 62 152', { w: 1.6, alpha: 0.6, trace: false });
      K.dot(190, 152, 3, '#7fb35a');
      // çıkartmalar: şimşek ve kaplumbağa
      K.rot(176, 152, -0.2, () => K.shape('M170 146 L 166 154 L 171 154 L 168 161 L 177 151 L 172 151 L 175 146 Z', { fill: C.AMBER, w: 1.4, hatch: false, trace: false }));
      K.circle(78, 152, 5, { fill: C.G, w: 1.6, hatch: false, trace: false }); K.dot(76.5, 151, 1, INK); K.dot(79.5, 151, 1, INK);
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
        if (hap) [[-6, 6], [0, 0], [6, 6]].forEach(([dx, dy]) => ctx.fillRect(x + dx - 3, 54 + dy, 6, 6));
        else if (blink) ctx.fillRect(x - 6, 62, 12, 3);
        else if (sur) ctx.fillRect(x - 6, 46, 12, 22);
        else if (sad) { ctx.fillRect(x - 5, 58, 10, 10); ctx.fillRect(sd < 0 ? x - 5 : x - 1, 54, 6, 4); }
        else if (thk) { if (sd < 0) ctx.fillRect(x - 5, 48, 10, 16); else ctx.fillRect(x - 6, 58, 12, 5); }
        else { ctx.fillRect(x - 5, 52, 10, 14); ctx.fillRect(sd < 0 ? x - 6 : x - 4, 46, 10, 3); }
      });
      ctx.font = '500 30px "JetBrains Mono", ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = P; ctx.shadowBlur = 8;
      const keys = ['↑', '←', '→', '↓', '␣', '⏎'];
      ctx.fillText(o.key ?? (sad ? '?' : sur ? '!' : thk ? '…' : keys[Math.floor(t / 1.4) % keys.length]), 120, 104);
      ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.shadowBlur = 0;
      ctx.fillText('>' + (Math.floor(t * 2) % 2 ? '_' : ''), 56, 130);
      // klavye
      K.shape('M48 196 L 192 196 L 204 216 L 36 216 Z', { lit: '#efe6d2', w: 2.6 });
      ctx.fillStyle = 'rgba(23,20,17,.5)';
      for (let i = 0; i < 8; i++) ctx.fillRect(56 + i * 17, 200, 11, 4);
      ctx.fillRect(84, 208, 72, 4);
      if (thk) K.ponder(214, 40, 1);
      if (hap) K.joy(120, 90, 112);
      ctx.restore();
    },
  };
})();
