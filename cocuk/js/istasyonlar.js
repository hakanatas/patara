/* Devre Kasabası · istasyonların yakın plan tahtaları (900 × 600 mantıksal).
   Her tahta: init(Z) · draw(K, t, Z) · down/move/up(p, Z) · guide(tid, Z) → { how, pt } · prog(tid, Z) · ctl(host, Z) · key(e, Z).
   Z.task() sıradaki görev, Z.done(tid, söz) görevi bitirir, Z.say(söz, ruh hâli) Patara'nın kutusuna yazar. */
(function () {
  const C = PT.C, CH = PT.chars, P = CH.patara.parts;
  const BW = 900, BH = 600;
  const now = () => performance.now();
  const near = (p, q, r) => !!p && !!q && Math.hypot(p.x - q.x, p.y - q.y) < r;
  const inRect = (p, r) => !!p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const ease = (x) => x * x * (3 - 2 * x);
  const KEYLBL = { up: '↑ UP', left: '← LEFT', right: '→ RIGHT', down: '↓ DOWN', space: 'SPACE', click: 'SOL TIK', rclick: 'SAĞ TIK', enter: 'ENTER', gnd: 'GND', gnd2: 'GND' };
  const ARROW = { up: '↑', left: '←', right: '→', down: '↓' };
  const WIRE = { up: '#c4623d', left: '#d9a441', right: '#4f9a7a', down: '#5b7c99' };

  /* ── ortak çizim yardımcıları ── */
  function paper(K, floorY) {
    const c = K.ctx;
    c.fillStyle = '#fffaf0'; c.fillRect(0, 0, BW, BH);
    c.fillStyle = 'rgba(23,20,17,.07)';
    for (let x = 30; x < BW; x += 30) for (let y = 30; y < BH; y += 30) c.fillRect(x - 1, y - 1, 2, 2);
    if (floorY) { c.strokeStyle = C.INK; c.lineWidth = 2; c.setLineDash([2, 9]); c.lineCap = 'round'; c.beginPath(); c.moveTo(0, floorY); c.lineTo(BW, floorY); c.stroke(); c.setLineDash([]); }
  }
  function text(K, s, x, y, o = {}) {
    const c = K.ctx;
    c.font = o.mono ? `500 ${o.size || 14}px "JetBrains Mono", ui-monospace, monospace` : `${o.size || 22}px "Caveat Brush", "Comic Sans MS", cursive`;
    c.fillStyle = o.color || C.INK; c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'alphabetic';
    c.fillText(s, x, y);
  }
  function tag(K, s, x, y, o = {}) {
    const c = K.ctx;
    c.font = `500 ${o.size || 14}px "JetBrains Mono", ui-monospace, monospace`;
    const w = c.measureText(s).width + 16, h = (o.size || 14) + 12;
    c.fillStyle = o.fill || C.SHEET; c.strokeStyle = C.INK; c.lineWidth = 2;
    c.beginPath(); c.roundRect ? c.roundRect(x - w / 2, y - h / 2, w, h, h / 2) : c.rect(x - w / 2, y - h / 2, w, h); c.fill(); c.stroke();
    c.fillStyle = o.color || (o.fill && o.fill !== C.SHEET ? C.SHEET : C.INK); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, x, y + 1);
    return w;
  }
  function bubble(K, s, x, y, o = {}) {
    const c = K.ctx;
    c.font = `${o.size || 22}px "Caveat Brush", "Comic Sans MS", cursive`;
    const w = c.measureText(s).width + 26, h = 40, bx = Math.max(6, Math.min(BW - w - 6, x - w / 2)), by = y - h - 16;
    c.fillStyle = C.SHEET; c.strokeStyle = C.INK; c.lineWidth = 2.5; c.lineJoin = 'round';
    c.beginPath(); c.roundRect ? c.roundRect(bx, by, w, h, 12) : c.rect(bx, by, w, h); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x - 8, by + h - 1); c.lineTo(x, y - 2); c.lineTo(x + 8, by + h - 1); c.fill();
    c.beginPath(); c.moveTo(x - 8, by + h); c.lineTo(x, y - 2); c.lineTo(x + 8, by + h); c.stroke();
    c.fillStyle = C.INK; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(s, bx + 13, by + h / 2 + 1);
  }
  const charAt = (K, id, ox, oy, s, o) => K.at(ox, oy, s, () => CH[id].draw(K, o || {}));
  const pg = (ox, oy, s, q) => ({ x: ox + q.x * s, y: oy + q.y * s });
  /* kablo: mürekkep kenarlı renkli eğri; ctrl = sarkma noktası */
  function wire(K, a, b, col, sag = 40, w = 5) {
    const c = K.ctx, mx = (a.x + b.x) / 2, my = Math.max(a.y, b.y) + sag;
    [[C.INK, w + 4], [col, w]].forEach(([s, lw]) => { c.strokeStyle = s; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo(mx, my, b.x, b.y); c.stroke(); });
    return { x: mx, y: my };
  }
  const qpt = (a, m, b, t) => ({ x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * m.x + t * t * b.x, y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * m.y + t * t * b.y });
  /* küçük Timsah Kıskaç başı. bite = çene ucu; dir 1: sağa bakar. Kablonun bağlandığı kuyruk noktasını döndürür. */
  function clipHead(K, bite, dir, s, o = {}) {
    const ox = bite.x - (dir > 0 ? 256 : 44) * s, oy = bite.y - 116 * s;
    const opts = { noWire: true, noShadow: true, black: o.black, state: o.state || 'idle' };
    K.at(ox, oy, s, () => { if (dir > 0) K.mirror(150, () => CH.clip.draw(K, opts)); else CH.clip.draw(K, opts); });
    return { tail: { x: ox + (dir > 0 ? 96 : 204) * s, y: oy + 112 * s }, grab: { x: ox + 150 * s, y: oy + 108 * s } };
  }
  const clipGrab = (bite, dir, s) => ({ x: bite.x - (dir > 0 ? 256 : 44) * s + 150 * s, y: bite.y - 116 * s + 108 * s });
  function miniSpark(K, x, y, s = 0.24, st = 'idle') {
    const nsh = K.noShadow; K.noShadow = true;
    K.at(x, y, s, () => { K.ctx.translate(-100, -134); CH.spark.draw(K, { state: st }); });
    K.noShadow = nsh;
  }

  /* ═════════ 1 · TANIŞ ═════════ */
  const NEED1 = { yon: ['up', 'left', 'right', 'down'], sag: ['space', 'click', 'rclick', 'enter'], gnd: ['gnd', 'gnd2'], govde: ['led', 'piano'] };
  const PADMSG = {
    up: '**UP**: yukarı ok tuşu. Oyunlarda zıplamak için çok kullanılır.', left: '**LEFT**: sol ok tuşu.', right: '**RIGHT**: sağ ok tuşu.', down: '**DOWN**: aşağı ok tuşu.',
    space: '**SPACE**: boşluk tuşu. Birçok oyunda ateş ya da zıpla.', click: '**Sol tık**: farenin sol düğmesi gibi.', rclick: '**Sağ tık**: farenin sağ düğmesi gibi.', enter: '**ENTER**: onay tuşu.',
    gnd: '**GND**: toprak pedi. Akımın karta geri döndüğü yol.', gnd2: '**GND**: öbür koldaki toprak pedi. İkisi aynı işi yapar.',
  };
  KAMP.def('tanis', {
    geo: () => { const s = 1.95; return { s, ox: 450 - 130 * s, oy: 24 }; },
    spots() {
      const g = this.geo(), L = [];
      P.left.forEach((q) => L.push({ ...pg(g.ox, g.oy, g.s, q), key: q.key, side: -1 }));
      P.right.forEach((q) => L.push({ ...pg(g.ox, g.oy, g.s, q), key: q.key, side: 1 }));
      return L;
    },
    rects() {
      const g = this.geo();
      return {
        led: { x: g.ox + P.led.x * g.s, y: g.oy + P.led.y * g.s, w: P.led.w * g.s, h: P.led.h * g.s },
        piano: { x: g.ox + P.piano.x * g.s, y: g.oy + P.piano.y * g.s, w: P.piano.w * g.s, h: 34 * g.s },
      };
    },
    init(Z) { Z.data = { hit: new Set(), glow: null, glowUntil: 0, led: null, ledUntil: 0, note: null, noteUntil: 0, joy: 0 }; },
    draw(K, t, Z) {
      const d = Z.data, g = this.geo(), n = now();
      paper(K, 560);
      K.at(g.ox, g.oy, g.s, () => CH.patara.draw(K, { state: d.joy > n ? 'happy' : 'idle', pad: d.glowUntil > n ? d.glow : null, led: d.ledUntil > n ? d.led : null, note: d.noteUntil > n ? d.note : null }));
      this.spots().forEach((p) => {
        if (!d.hit.has(p.key)) return;
        const tx = p.x + p.side * 78, c = K.ctx;
        c.strokeStyle = C.INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(p.x + p.side * 12, p.y); c.lineTo(tx - p.side * 30, p.y); c.stroke();
        tag(K, KEYLBL[p.key], tx, p.y, { fill: p.key.startsWith('gnd') ? '#3a2f28' : C.SHEET });
      });
      const R = this.rects();
      if (d.hit.has('led')) tag(K, '5×5 LED · 25 ışık', R.led.x + R.led.w + 90, R.led.y + 20, { fill: C.AMBER, color: C.INK });
      if (d.hit.has('piano')) tag(K, 'dokunmatik piyano', R.piano.x + R.piano.w / 2, R.piano.y + R.piano.h + 34, { fill: C.AMBER, color: C.INK });
    },
    down(p, Z) {
      const d = Z.data, n = now();
      const s = this.spots().find((q) => near(p, q, 22));
      if (s) {
        d.hit.add(s.key); d.glow = s.key; d.glowUntil = n + 800; Z.sfx.zap();
        if (ARROW[s.key]) { d.led = s.key === 'up' ? 'up' : 'smile'; d.ledUntil = n + 900; }
        Z.say(PADMSG[s.key]); this.check(Z); return;
      }
      const R = this.rects();
      if (inRect(p, R.led)) {
        d.hit.add('led'); d.led = pick(['heart', 'star', 'note', 'smile']); d.ledUntil = n + 1600; Z.sfx.pop();
        Z.say('**LED ekran**: 5 satır, 5 sütun, 25 ışık. Ok, yüz, kalp… ne istersen çizebilir.'); this.check(Z); return;
      }
      if (inRect(p, R.piano)) {
        const i = Math.max(0, Math.min(7, Math.floor((p.x - R.piano.x) / (R.piano.w / 8))));
        d.hit.add('piano'); d.note = i; d.noteUntil = n + 400; Z.sfx.note(i);
        Z.say('**Piyano**: kıskaç gerekmez, dokunuşunu kendisi hisseder. Do, re, mi…'); this.check(Z); return;
      }
      Z.say('Altın pedlere, kabuktaki LED ekrana ya da piyanoya dokun.', 'think');
    },
    check(Z) {
      const tid = Z.task(), need = NEED1[tid];
      if (!need || !need.every((k) => Z.data.hit.has(k))) return;
      Z.data.joy = now() + 1400;
      Z.done(tid, {
        yon: 'Dört yön tamam! Bu pedler klavyedeki **ok tuşları** gibi çalışır.',
        sag: 'Sağ kol hem klavye (**Space, Enter**) hem **fare** (sol tık, sağ tık).',
        gnd: '**GND** pedleri devrenin dönüş yolu. Halka Meydanı\'nda çok işimize yarayacak!',
        govde: 'LED ekranla resim çizer, piyanoyla şarkı çalarım. Sahnede deneyeceğiz!',
      }[tid]);
    },
    prog(tid, Z) { const n = NEED1[tid]; return n ? `${n.filter((k) => Z.data.hit.has(k)).length}/${n.length}` : ''; },
    guide(tid, Z) {
      const need = NEED1[tid]; if (!need) return null;
      const k = need.find((x) => !Z.data.hit.has(x)); if (!k) return null;
      let q;
      if (k === 'led' || k === 'piano') { const r = this.rects()[k]; q = { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
      else q = this.spots().find((s) => s.key === k);
      return { how: { x: q.x, y: q.y, r: 24, t: 'dokun' }, pt: { x: q.x, y: q.y, r: 24, t: 'buraya dokun' } };
    },
  });

  /* ═════════ 2 · TAK ═════════ */
  const KEYSYM = { up: '↑', down: '↓', left: '←', right: '→', X: 'X', Y: 'Y' };
  const PLUG0 = { x: 420, y: 470 };
  /* USB fişi: büyük siyah gövde (üstünde USB yazısı), gümüş uç sağa bakar. (x, y) = gövdenin ortası */
  function usbPlug(K, x, y, o = {}) {
    const c = K.ctx;
    if (o.ring) { c.save(); c.strokeStyle = C.AMBER; c.lineWidth = 4; c.setLineDash([7, 6]); c.beginPath(); c.roundRect ? c.roundRect(x - 40, y - 26, 96, 52, 14) : c.rect(x - 40, y - 26, 96, 52); c.stroke(); c.restore(); }
    K.shape(`M${x + 22} ${y - 11} L ${x + 50} ${y - 11} L ${x + 50} ${y + 11} L ${x + 22} ${y + 11} Z`, { lit: '#d3d8de', w: 2.4, hatch: false, trace: false });
    c.fillStyle = '#353b43'; c.fillRect(x + 30, y - 5, 7, 4); c.fillRect(x + 40, y - 5, 7, 4);
    K.shape(`M${x - 32} ${y - 18} L ${x + 22} ${y - 18} L ${x + 22} ${y + 18} L ${x - 32} ${y + 18} Z`, { lit: '#353b43', w: 2.8 });
    c.fillStyle = '#fff'; c.font = '600 15px "JetBrains Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('USB', x - 5, y + 1);
  }
  KAMP.def('tak', {
    geo: () => ({ ps: 1.2, pox: 40, poy: 564 - 262 * 1.2, cs: 1.3, cox: 560, coy: 564 - 224 * 1.3 }),
    port() { const g = this.geo(); return { x: g.cox + 40 * g.cs, y: g.coy + 186 * g.cs }; },
    start() { const g = this.geo(); return { x: g.pox + 214 * g.ps, y: g.poy + 140 * g.ps }; },
    btns() { const g = this.geo(); return [...P.dpad, ...P.xy].map((q) => ({ ...pg(g.pox, g.poy, g.ps, q), key: q.key })); },
    /* fiş takılınca gövde ortası girişin solunda durur */
    seat() { const pt = this.port(); return { x: pt.x - 52, y: pt.y }; },
    init(Z) {
      const conn = Z.isDone('usb');
      Z.data = { plug: conn ? this.seat() : { ...PLUG0 }, conn, drag: false, moved: conn, log: [], seen: new Set(), btn: null, btnUntil: 0, hello: 0 };
    },
    draw(K, t, Z) {
      const d = Z.data, g = this.geo(), n = now(), c = K.ctx;
      paper(K, 564);
      // Bilgi'nin gördüğü tuş şeridi
      c.fillStyle = 'rgba(29,42,51,.92)'; c.strokeStyle = C.INK; c.lineWidth = 2.4;
      c.beginPath(); c.roundRect ? c.roundRect(40, 22, 820, 54, 10) : c.rect(40, 22, 820, 54); c.fill(); c.stroke();
      text(K, "Bilgi'nin gördüğü:", 58, 56, { size: 22, color: '#ffd77a' });
      if (!d.log.length) text(K, d.conn ? 'tuşlara bas…' : 'hiçbir şey: kablo takılı değil', 250, 56, { size: 20, color: 'rgba(255,215,122,.55)' });
      d.log.slice(-12).forEach((k, i) => tag(K, k, 270 + i * 48, 49, { fill: '#ffd77a', size: 16 }));
      // Patara ve Bilgi
      K.at(g.pox, g.poy, g.ps, () => CH.patara.draw(K, { state: d.btnUntil > n ? 'happy' : d.conn ? 'idle' : 'think', btn: d.btnUntil > n ? d.btn : null }));
      const pcState = d.hello > n ? 'happy' : d.conn ? 'idle' : 'think';
      K.at(g.cox, g.coy, g.cs, () => CH.pc.draw(K, { state: pcState, key: d.btnUntil > n ? KEYSYM[d.btn] : d.conn ? '⌨' : '…' }));
      // USB girişi: Bilgi'nin ayağında, etiketli
      const pt = this.port(), hot = d.drag && near(d.plug, this.seat(), 70);
      if (!d.conn) {
        const k = 0.5 + 0.5 * Math.sin(t * 5);
        c.save(); c.globalAlpha = 0.35 + k * 0.4; c.fillStyle = hot ? C.AMBER : '#ffd77a'; c.beginPath(); c.arc(pt.x, pt.y, 30, 0, 7); c.fill(); c.restore();
      }
      K.shape(`M${pt.x - 20} ${pt.y - 12} L ${pt.x + 20} ${pt.y - 12} L ${pt.x + 20} ${pt.y + 12} L ${pt.x - 20} ${pt.y + 12} Z`, { fill: '#2a2f36', w: 2.6, hatch: false, trace: false });
      c.fillStyle = '#d3d8de'; c.fillRect(pt.x - 12, pt.y - 4, 24, 8);
      if (!d.conn) tag(K, 'USB girişi', pt.x, pt.y + 42, { fill: C.AMBER, size: 14 });
      // kablo ve fiş
      const back = { x: d.plug.x - 32, y: d.plug.y };
      wire(K, this.start(), back, '#8b919c', d.conn ? 26 : 34, 6);
      // ilk dokunuşa kadar: fişin gideceği yol ve kayan hayalet fiş
      if (!d.moved) {
        const a = PLUG0, b = this.seat(), m = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 80 };
        c.save(); c.strokeStyle = C.DEEP; c.lineWidth = 3; c.setLineDash([3, 9]); c.lineCap = 'round';
        c.beginPath(); c.moveTo(a.x + 56, a.y); c.quadraticCurveTo(m.x, m.y, b.x, b.y); c.stroke(); c.restore();
        const f = (t * 0.6) % 1, q = qpt(a, m, b, ease(f));
        c.save(); c.globalAlpha = 0.28 * Math.sin(f * Math.PI); usbPlug(K, q.x, q.y); c.restore();
        tag(K, 'USB fişi', a.x + 8, a.y + 48, { fill: C.SHEET, size: 14 });
      }
      usbPlug(K, d.plug.x, d.plug.y, { ring: !d.conn && !d.drag });
      if (d.hello > n) bubble(K, 'Yeni klavye ve fare bulundu!', g.cox + 120 * g.cs, g.coy + 20);
    },
    down(p, Z) {
      const d = Z.data;
      if (!d.conn && inRect(p, { x: d.plug.x - 46, y: d.plug.y - 34, w: 110, h: 68 })) { d.drag = true; d.moved = true; d.off = { x: d.plug.x - p.x, y: d.plug.y - p.y }; Z.sfx.tick(); return; }
      const b = this.btns().find((q) => near(p, q, 18));
      if (b) {
        if (!d.conn) { Z.say('Önce kabloyu tak: Bilgi henüz Patara\'yı görmüyor.', 'think'); Z.sfx.bad(); return; }
        d.btn = b.key; d.btnUntil = now() + 700; d.seen.add(b.key); d.log.push(KEYSYM[b.key]); Z.sfx.key();
        this.check(Z); return;
      }
    },
    move(p, Z) { const d = Z.data; if (d.drag && p) d.plug = { x: p.x + d.off.x, y: p.y + d.off.y }; },
    up(p, Z) {
      const d = Z.data; if (!d.drag) return;
      d.drag = false;
      if (near(d.plug, this.seat(), 70) || near({ x: d.plug.x + 40, y: d.plug.y }, this.port(), 60)) {
        d.plug = this.seat(); d.conn = true; d.hello = now() + 2800; Z.sfx.win();
        Z.done('usb', 'Tık! Bilgi beni hemen tanıdı: **yeni klavye ve fare**. Program kurmaya gerek yok.');
      } else Z.say('Fişin gümüş ucunu Bilgi\'nin ayağındaki **USB girişine** yaklaştır ve bırak.', 'think');
    },
    check(Z) {
      const tid = Z.task(), d = Z.data;
      if (tid === 'yon' && ['up', 'down', 'left', 'right'].every((k) => d.seen.has(k))) Z.done('yon', 'Bilgi dört **ok tuşunu** da gördü. Onun için ben sıradan bir klavyeyim!');
      else if (tid === 'xy' && ['X', 'Y'].every((k) => d.seen.has(k))) Z.done('xy', '**X** ve **Y** de geldi. Kıskaçsız, hazır bir oyun kolu gibi çalışırım.');
      else if (tid === 'yon' || tid === 'xy') Z.say(`Bilgi **${KEYSYM[d.btn]}** gördü. Devam!`);
    },
    prog(tid, Z) {
      const need = tid === 'yon' ? ['up', 'down', 'left', 'right'] : tid === 'xy' ? ['X', 'Y'] : null;
      return need ? `${need.filter((k) => Z.data.seen.has(k)).length}/${need.length}` : '';
    },
    guide(tid, Z) {
      const d = Z.data;
      if (tid === 'usb') { const to = this.seat(), h = { x: d.plug.x, y: d.plug.y }; return { how: { ...h, r: 48, t: 'sürükle' }, pt: { ...this.port(), r: 34, t: 'USB girişi', below: true }, drag: [h, to] }; }
      const need = tid === 'yon' ? ['up', 'down', 'left', 'right'] : ['X', 'Y'], k = need.find((x) => !d.seen.has(x));
      const q = this.btns().find((b) => b.key === k); if (!q) return null;
      return { how: { x: q.x, y: q.y, r: 18, t: 'bas' }, pt: { x: q.x, y: q.y, r: 18, t: 'bu tuş' } };
    },
  });

  /* ═════════ 3 · KISKAÇLA ═════════ */
  const OBJ = [
    { id: 'muz', ad: 'muz', dat: 'muza', x: 34, bite: { x: 62, y: 100 } },
    { id: 'elma', ad: 'elma', dat: 'elmaya', x: 136, bite: { x: 88, y: 112 } },
    { id: 'hamur', ad: 'oyun hamuru', dat: 'oyun hamuruna', x: 236, bite: { x: 94, y: 150 } },
    { id: 'kasik', ad: 'kaşık', dat: 'kaşığa', x: 342, bite: { x: 74, y: 64 } },
  ];
  const KS = 0.8, KGY = 540, CLS = 0.3, PADKEYS = ['up', 'left', 'right', 'down'];
  KAMP.def('kiskac', {
    geo: () => ({ s: 1.25, ox: 558, oy: 560 - 262 * 1.25 }),
    pad(key) { const g = this.geo(); return pg(g.ox, g.oy, g.s, P.left.find((q) => q.key === key)); },
    bite(o) { return { x: o.x + o.bite.x * KS, y: KGY - 188 * KS + o.bite.y * KS }; },
    idle(i) { return { x: 470, y: 150 + i * 62 }; },
    init(Z) {
      const at = {}, pos = {};
      const done = Z.isDone('hepsi'), first = Z.isDone('ilk');
      PADKEYS.forEach((k, i) => {
        const o = done ? OBJ[i] : first && k === 'up' ? OBJ[0] : null;
        at[k] = o ? o.id : null; pos[k] = o ? this.bite(o) : this.idle(i);
      });
      Z.data = { at, pos, drag: null, chomp: {}, ask: pick(OBJ.slice(1)) };
    },
    draw(K, t, Z) {
      const d = Z.data, g = this.geo(), n = now(), c = K.ctx;
      paper(K, 560);
      K.shape('M14 540 L 446 540 L 446 556 L 14 556 Z', { lit: '#b08654', w: 2.6 });
      K.line('M34 556 L 34 600 M426 556 L 426 600', { w: 5, color: '#7a5434', trace: false });
      K.at(g.ox, g.oy, g.s, () => CH.patara.draw(K, { state: 'idle', pad: d.drag }));
      OBJ.forEach((o) => {
        const busy = PADKEYS.find((k) => d.at[k] === o.id);
        charAt(K, o.id, o.x, KGY - 188 * KS, KS, { state: busy && d.chomp[busy] > n ? 'happy' : 'idle', ph: o.x });
        const b = this.bite(o);
        if (busy) tag(K, ARROW[busy], o.x + 52 * KS, KGY + 34, { fill: WIRE[busy], size: 16 });
        else text(K, o.ad, o.x + 52 * KS, KGY + 40, { size: 20, align: 'center', color: 'rgba(23,20,17,.6)' });
        if (!busy && d.drag) { c.save(); c.strokeStyle = C.AMBER; c.setLineDash([5, 6]); c.lineWidth = 2.4; c.beginPath(); c.arc(b.x, b.y, 22, 0, 7); c.stroke(); c.restore(); }
      });
      PADKEYS.forEach((k) => {
        const bite = d.pos[k], h = clipHead(K, bite, -1, CLS, { state: d.chomp[k] > n ? 'happy' : 'idle' });
        wire(K, this.pad(k), h.tail, WIRE[k], 30, 4);
        clipHead(K, bite, -1, CLS, { state: d.chomp[k] > n ? 'happy' : 'idle' });
        if (!d.at[k] && d.drag !== k) tag(K, ARROW[k], bite.x + 2, bite.y - 34, { fill: WIRE[k], size: 13 });
      });
    },
    down(p, Z) {
      const d = Z.data;
      const k = PADKEYS.find((key) => near(p, clipGrab(d.pos[key], -1, CLS), 38));
      if (k) { d.drag = k; d.at[k] = null; d.off = { x: d.pos[k].x - p.x, y: d.pos[k].y - p.y }; Z.sfx.tick(); return; }
      const o = OBJ.find((ob) => p.x > ob.x && p.x < ob.x + 104 * KS && p.y > KGY - 170 * KS && p.y < KGY);
      if (o) { const busy = PADKEYS.find((key) => d.at[key] === o.id); Z.say(busy ? `Bu ${o.ad} artık **${ARROW[busy]}** tuşu.` : `${o.ad[0].toUpperCase() + o.ad.slice(1)} henüz hiçbir pede bağlı değil.`); }
    },
    move(p, Z) { const d = Z.data; if (d.drag && p) d.pos[d.drag] = { x: p.x + d.off.x, y: p.y + d.off.y }; },
    up(p, Z) {
      const d = Z.data, k = d.drag; if (!k) return;
      d.drag = null;
      const o = OBJ.find((ob) => near(d.pos[k], this.bite(ob), 70) && !PADKEYS.some((key) => d.at[key] === ob.id));
      if (o) { d.at[k] = o.id; d.pos[k] = this.bite(o); d.chomp[k] = now() + 1200; Z.sfx.chomp(); Z.say(`Hap! ${o.ad[0].toUpperCase() + o.ad.slice(1)} artık **${ARROW[k]}** tuşu.`, 'happy'); }
      else { d.pos[k] = this.idle(PADKEYS.indexOf(k)); Z.say('Kıskacı boştaki bir nesnenin üstüne bırak.', 'think'); }
      this.check(Z);
    },
    check(Z) {
      const d = Z.data, tid = Z.task();
      if (tid === 'ilk') {
        if (d.at.up === 'muz') Z.done('ilk', 'Muz artık **↑ tuşu**! Muza dokunmak yukarı oka basmak demek.');
        else if (Object.values(d.at).includes('muz')) Z.say('Muza başka bir kıskaç ısırdı. Bu görevde **UP** pedinin kıskacını kullan.', 'think');
      } else if (tid === 'hepsi' && OBJ.every((o) => PADKEYS.some((k) => d.at[k] === o.id))) {
        Z.done('hepsi', 'Dört nesne, dört tuş. Mutfaktan bir **oyun kumandası** yaptın!');
      }
    },
    ctl(host, Z) {
      if (Z.task() !== 'oku') return;
      const o = Z.data.ask;
      host.innerHTML = `<p class="q"><b>${o.dat[0].toUpperCase() + o.dat.slice(1)}</b> dokununca hangi tuş basılır?</p><div class="row">${PADKEYS.map((k) => `<button type="button" class="pick" data-k="${k}">${ARROW[k]}</button>`).join('')}</div>`;
      host.querySelectorAll('.pick').forEach((b) => b.addEventListener('click', () => {
        const key = PADKEYS.find((k) => Z.data.at[k] === o.id);
        if (b.dataset.k === key) Z.done('oku', `Evet: ${o.ad} **${KEYLBL[key]}** pedine bağlı, yani **${ARROW[key]}** tuşu.`);
        else { Z.sfx.bad(); Z.say(`${o.ad[0].toUpperCase() + o.ad.slice(1)}dan çıkan kabloyu takip et: hangi pede gidiyor?`, 'think'); }
      }));
    },
    guide(tid, Z) {
      const d = Z.data;
      if (tid === 'ilk') { const h = clipGrab(d.pos.up, -1, CLS), b = this.bite(OBJ[0]); return { how: { ...h, r: 30, t: 'UP kıskacı' }, pt: { ...b, r: 26, t: 'muz', below: true }, drag: [h, b] }; }
      if (tid === 'hepsi') {
        const k = PADKEYS.find((key) => !d.at[key]), o = OBJ.find((ob) => !PADKEYS.some((key) => d.at[key] === ob.id));
        if (!k || !o) return null;
        const h = clipGrab(d.pos[k], -1, CLS), b = this.bite(o);
        return { how: { ...h, r: 30, t: 'sürükle' }, pt: { ...b, r: 26, t: o.ad, below: true }, drag: [h, b] };
      }
      if (tid === 'oku') { const key = PADKEYS.find((k) => d.at[k] === d.ask.id); const q = key && this.pad(key); return q ? { pt: { ...q, r: 20, t: 'bu ped' }, answer: key } : null; }
      return null;
    },
  });

  /* ═════════ 4 · HALKA ═════════ */
  const Y0 = 230, FL = 290;
  const UP_MUZ = 'M359 138 C 320 104 262 116 226 150';
  const HP = {
    ok: UP_MUZ + ' L 216 169 L 164 171 L 117 171 L 99 225 C 96 274 150 292 250 290 C 330 288 350 214 401 181',
    nognd: UP_MUZ + ' L 216 169 L 164 171 L 117 171 L 99 225',
  };
  const HAND = { x: 99, y: 225 }, GNDPAD = { x: 401, y: 181 }, CLIP0 = { x: 136, y: 288 };
  const GND_HELD = 'M99 225 C 96 274 150 292 250 290 C 330 288 350 214 401 181';
  const fracAt = (d, q) => { const P2 = PT.geo(d).runs[0].pts; let bi = 0, bd = 1e9; P2.forEach((p, i) => { const dd = Math.hypot(p[0] - q.x, p[1] - q.y); if (dd < bd) { bd = dd; bi = i; } }); return bi / (P2.length - 1); };
  KAMP.def('halka', {
    init(Z) {
      const held = Z.isDone('gnd');
      Z.data = { held, clip: held ? { ...HAND } : { ...CLIP0 }, drag: false, phase: 'idle', t0: 0, out: null };
      Z.data.fr = { ok: [fracAt(HP.ok, { x: 226, y: 150 }), fracAt(HP.ok, { x: 216, y: 169 }), fracAt(HP.ok, { x: 99, y: 225 })], nognd: [fracAt(HP.nognd, { x: 226, y: 150 }), fracAt(HP.nognd, { x: 216, y: 169 }), 1] };
    },
    draw(K, t, Z) {
      const d = Z.data, c = K.ctx, n = now() / 1000;
      paper(K, FL + Y0 + 2);
      let f = 0, end = false;
      if (d.phase === 'run') { f = Math.min(1, (n - d.t0) / 3.6); if (f >= 1) { d.phase = 'end'; d.t0 = n; this.finish(Z); } }
      else if (d.phase === 'end') { f = 1; end = true; if (n - d.t0 > 3.2) d.phase = 'idle'; }
      const out = d.phase === 'idle' ? null : d.out, path = HP[out || 'ok'];
      this.schema(K, f, out, d);
      c.save(); c.translate(0, Y0);
      // kablolar
      K.line(UP_MUZ, { w: 8, trace: false }); K.line(UP_MUZ, { w: 4, color: C.SEAL, trace: false });
      if (d.held && !d.drag) { K.line(GND_HELD, { w: 7, trace: false }); K.line(GND_HELD, { w: 3, color: '#4a403a', trace: false }); }
      else wire(K, GNDPAD, d.clip, '#4a403a', 60, 3);
      if (d.phase !== 'idle') {
        const pts = PT.geo(path).runs[0].pts, m = Math.max(1, Math.floor(f * (pts.length - 1)));
        c.strokeStyle = C.AMBER; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = 0.9;
        c.beginPath(); pts.slice(0, m + 1).forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke(); c.globalAlpha = 1;
      }
      const ok = end && out === 'ok', bad = end && out === 'nognd';
      K.at(40, FL - 230 * 0.9, 0.9, () => CH.deniz.draw(K, { state: ok ? 'happy' : bad ? 'surprised' : 'idle', gnd: d.held && !d.drag, noWire: true }));
      K.at(178, FL - 188 * 0.9, 0.9, () => CH.muz.draw(K, { state: ok ? 'happy' : 'idle' }));
      K.at(330, FL - 262 * 0.92, 0.92, () => CH.patara.draw(K, { state: ok ? 'happy' : bad ? 'surprised' : 'idle', pad: d.phase === 'run' || ok ? 'up' : null, led: ok ? 'up' : null }));
      K.at(680, FL - 224 * 0.86, 0.86, () => CH.pc.draw(K, { state: ok ? 'happy' : bad ? 'sad' : 'idle', key: ok ? '↑' : bad ? '?' : '…' }));
      clipHead(K, { x: 232, y: 146 }, -1, 0.2, {});
      if (!d.held || d.drag) clipHead(K, d.clip, -1, 0.26, { black: true });
      if (d.phase !== 'idle') {
        const [x, y] = PT.along(path, f);
        miniSpark(K, x, y - 4, 0.26, !end ? 'idle' : ok ? 'happy' : 'sad');
      }
      text(K, 'UP pedi', 300, 112, { size: 21 });
      text(K, d.held ? 'GND Deniz\'in elinde' : 'GND kıskacı yerde', 150, 340 - 2, { size: 21, color: d.held ? C.INK : C.SEAL });
      c.restore();
    },
    /* üstte devre şeması: hangi parça yanıyor? */
    schema(K, f, out, d) {
      const c = K.ctx, nodes = [['Patara · UP', 110], ['Muz', 330], ['Deniz', 550], ['GND · Patara', 780]];
      const fr = d.fr[out || 'ok'], lit = (i) => d.phase !== 'idle' && f >= (i === 0 ? 0.001 : fr[i - 1]);
      c.fillStyle = 'rgba(241,234,220,.9)'; c.strokeStyle = C.INK; c.lineWidth = 2;
      c.beginPath(); c.roundRect ? c.roundRect(24, 16, 852, 170, 14) : c.rect(24, 16, 852, 170); c.fill(); c.stroke();
      text(K, 'devre şeması', 44, 44, { mono: true, size: 12, color: 'rgba(23,20,17,.6)' });
      const Y = 96;
      [[0, 1, 'kırmızı kablo'], [1, 2, 'dokunuş'], [2, 3, 'siyah kablo']].forEach(([a, b, l], i) => {
        const broken = i === 2 && !d.held;
        c.strokeStyle = lit(i + 1) && !(broken) ? C.AMBER : broken ? C.SEAL : C.INK; c.lineWidth = lit(i + 1) ? 6 : 3;
        if (broken) c.setLineDash([8, 8]);
        c.beginPath(); c.moveTo(nodes[a][1] + 62, Y); c.lineTo(nodes[b][1] - 62, Y); c.stroke(); c.setLineDash([]);
        text(K, broken ? 'kopuk!' : l, (nodes[a][1] + nodes[b][1]) / 2, Y - 14, { size: 18, align: 'center', color: broken ? C.SEAL : C.INK });
      });
      const back = d.phase !== 'idle' && out === 'ok' && f >= 0.999;
      c.strokeStyle = back ? C.AMBER : 'rgba(23,20,17,.45)'; c.lineWidth = back ? 5 : 2.4; c.setLineDash([4, 6]);
      c.beginPath(); c.moveTo(nodes[3][1], Y + 24); c.quadraticCurveTo(445, Y + 92, nodes[0][1], Y + 24); c.stroke(); c.setLineDash([]);
      text(K, 'kartın içinden geri: halka kapanır', 445, Y + 74, { size: 18, align: 'center', color: back ? C.DEEP : 'rgba(23,20,17,.55)' });
      nodes.forEach(([l, x], i) => {
        const on = lit(i) || (i === 3 && back);
        c.fillStyle = on ? C.AMBER : C.SHEET; c.strokeStyle = C.INK; c.lineWidth = 2.4;
        c.beginPath(); c.roundRect ? c.roundRect(x - 62, Y - 20, 124, 40, 10) : c.rect(x - 62, Y - 20, 124, 40); c.fill(); c.stroke();
        text(K, l, x, Y + 1, { mono: true, size: 13, align: 'center', base: 'middle' });
      });
    },
    finish(Z) {
      const d = Z.data, tid = Z.task();
      if (d.out === 'nognd') {
        Z.sfx.bad();
        if (tid === 'acik') Z.done('acik', "Gördün mü? Kıvılcım **Deniz'in elinde** kaldı. GND yoksa halka **açık**, tuş basılmaz.");
        else Z.say("Kıvılcım Deniz'de takıldı: GND kıskacı elinde değil.", 'sad');
      } else {
        Z.sfx.win();
        if (tid === 'kapali') Z.done('kapali', 'Halka kapandı! Kıvılcım pedden muza, Deniz\'e, GND\'ye ve karta döndü. **↑ basıldı!**');
        else if (tid === 'acik') Z.say('Halka kapalıyken ↑ basılıyor. Ama önce GND olmadan denemeliydik: siyah kıskacı Deniz\'in elinden alıp yere bırak.', 'think');
        else Z.say('**↑** basıldı. Halka kapalı!', 'happy');
      }
    },
    run(Z) { const d = Z.data; if (d.phase === 'run') return; d.out = d.held ? 'ok' : 'nognd'; d.phase = 'run'; d.t0 = now() / 1000; Z.sfx.zap(); },
    down(p, Z) {
      const d = Z.data, q = p && { x: p.x, y: p.y - Y0 };
      const grab = clipGrab(d.clip, -1, 0.26);
      if (near(q, grab, 40) || (d.held && near(q, HAND, 30))) { d.drag = true; d.held = false; Z.sfx.tick(); return; }
      if ((q.x > 178 && q.x < 272 && q.y > 140 && q.y < 290) || near(q, { x: 216, y: 169 }, 30)) { this.run(Z); return; }
      Z.say('Muza dokun ya da siyah GND kıskacını sürükle.', 'think');
    },
    move(p, Z) { const d = Z.data; if (d.drag && p) d.clip = { x: p.x + 30, y: p.y - Y0 }; },
    up(p, Z) {
      const d = Z.data; if (!d.drag) return;
      d.drag = false;
      if (near(d.clip, HAND, 56)) {
        d.held = true; d.clip = { ...HAND }; Z.sfx.chomp();
        if (Z.task() === 'gnd') Z.done('gnd', 'GND kıskacı Deniz\'in elinde. Artık Kıvılcım\'ın eve dönüş yolu var.');
        else if (Z.task() === 'acik') Z.say('Önce GND olmadan denemiştik. Kıskacı Deniz\'in elinden alıp yere bırak, sonra muza dokun.', 'think');
      } else { d.clip = { x: Math.max(60, Math.min(840, d.clip.x)), y: FL - 2 }; d.held = false; }
    },
    guide(tid, Z) {
      const d = Z.data, sh = (q) => ({ x: q.x, y: q.y + Y0 });
      if (tid === 'acik' || tid === 'kapali') { const m = sh({ x: 226, y: 210 }); return { how: { ...m, r: 34, t: 'muza dokun' }, pt: { ...m, r: 34, t: 'muz' } }; }
      if (tid === 'gnd') { const h = sh(clipGrab(d.clip, -1, 0.26)), to = sh(HAND); return { how: { ...h, r: 30, t: 'GND kıskacı' }, pt: { ...to, r: 26, t: 'Deniz\'in eli' }, drag: [h, to] }; }
      return null;
    },
  });

  /* ═════════ 5 · İLETKEN Mİ? ═════════ */
  const ITEMS = {
    kasik: { ad: 'Kaşık', il: true, why: 'Kaşık metaldir; metaller Kıvılcım\'ı rahat geçirir.' },
    para: { ad: 'Madeni para', il: true, why: 'Madeni para metaldir.' },
    anahtar: { ad: 'Anahtar', il: true, why: 'Anahtar metaldir.' },
    folyo: { ad: 'Folyo', il: true, why: 'Folyo ince bir alüminyum, yani metal.' },
    muz: { ad: 'Muz', il: true, why: 'Muzun içinde su var; su Kıvılcım\'ı geçirir.' },
    elma: { ad: 'Elma', il: true, why: 'Elma sulu bir meyve; içindeki su iletir.' },
    hamur: { ad: 'Oyun hamuru', il: true, why: 'Oyun hamurunun içinde tuzlu su var.' },
    grafit: { ad: 'Kalem çizgisi', il: true, why: 'Kurşun kalem izi grafittir ve iletir.' },
    silgi: { ad: 'Silgi', il: false, why: 'Silgi lastiktir; lastik yalıtkandır.' },
    cetvel: { ad: 'Plastik cetvel', il: false, why: 'Plastik yalıtkandır.' },
    tahta: { ad: 'Tahta blok', il: false, why: 'Kuru tahta yalıtkandır.' },
    kagit: { ad: 'Kâğıt', il: false, why: 'Kuru kâğıt yalıtkandır.' },
    balon: { ad: 'Balon', il: false, why: 'Balon lastiktir; yalıtkandır.' },
    cam: { ad: 'Cam bilye', il: false, why: 'Cam yalıtkandır.' },
    yun: { ad: 'Yün yumak', il: false, why: 'Yün yalıtkandır.' },
  };
  /* nesne simgeleri: (0,0) ortasında, yaklaşık ±30 birim */
  const ICON = {
    kasik: (K) => { K.shape('M-4 -2 L 26 -6 L 27 0 L -3 4 Z', { lit: '#b9bfc9', w: 2.2 }); K.ellipse(-16, 0, 14, 10, { lit: '#dfe3e8', w: 2.4 }); },
    para: (K) => { K.circle(0, 0, 22, { lit: '#d9b25a', w: 2.6 }); K.circle(0, 0, 15, { fill: 'rgba(0,0,0,0)', w: 1.4 }); K.ctx.fillStyle = C.INK; K.ctx.font = '600 16px "JetBrains Mono", monospace'; K.ctx.textAlign = 'center'; K.ctx.textBaseline = 'middle'; K.ctx.fillText('1', 0, 1); },
    anahtar: (K) => { K.circle(-16, 0, 12, { lit: '#d9b25a', w: 2.4 }); K.dot(-16, 0, 4, C.SHEET); K.shape('M-5 -4 L 28 -4 L 28 4 L 24 4 L 24 10 L 19 10 L 19 4 L 14 4 L 14 9 L 9 9 L 9 4 L -5 4 Z', { lit: '#d9b25a', w: 2, hatch: false }); },
    folyo: (K) => { K.shape('M-24 6 L -18 -14 L -2 -22 L 18 -16 L 26 2 L 12 20 L -10 18 Z', { lit: '#d3d8de', w: 2.4, inside: () => K.line('M-14 -6 L 6 -12 M-8 6 L 14 -2 M-2 14 L 16 8', { w: 1.2, alpha: 0.5, trace: false }) }); },
    muz: (K) => { K.shape('M-14 -24 C -30 0 -20 22 18 26 C 24 22 22 18 18 16 C -2 10 -8 -8 -4 -22 Z', { lit: C.BANANA, w: 2.4 }); K.shape('M-15 -25 L -14 -31 L -7 -31 L -4 -22 Z', { fill: '#7a5a2e', w: 1.6, hatch: false, trace: false }); },
    elma: (K) => { K.shape('M0 -14 C -12 -24 -26 -14 -24 4 C -22 20 -10 28 0 24 C 10 28 22 20 24 4 C 26 -14 12 -24 0 -14 Z', { lit: C.RED, w: 2.4 }); K.line('M0 -14 Q 2 -22 6 -26', { w: 3, color: '#6b4423', trace: false }); },
    hamur: (K) => { K.shape('M-26 18 C -30 0 -20 -16 -4 -18 C 12 -22 28 -8 26 18 Z', { lit: '#7cc47f', w: 2.4 }); K.line('M-10 -6 Q 0 -12 10 -6', { w: 1.2, alpha: 0.35, trace: false }); },
    grafit: (K) => { K.shape('M-28 -18 L 28 -18 L 28 18 L -28 18 Z', { fill: C.SHEET, w: 2.2, hatch: false }); K.line('M-20 6 L -8 -6 L 2 6 L 12 -6 L 22 4', { w: 4.5, color: '#3a3a3a', trace: false }); },
    silgi: (K) => { K.shape('M-24 -12 L 0 -12 L 0 12 L -24 12 Z', { lit: '#e06a52', w: 2.2, hatch: false }); K.shape('M0 -12 L 24 -12 L 24 12 L 0 12 Z', { lit: C.SLATE, w: 2.2 }); },
    cetvel: (K) => { K.shape('M-30 -9 L 30 -9 L 30 9 L -30 9 Z', { fill: 'rgba(120,170,210,.55)', w: 2.2, hatch: false, inside: () => { for (let x = -26; x < 30; x += 6) K.ctx.fillRect(x, -9, 1.4, x % 12 === 0 ? 8 : 5); } }); },
    tahta: (K) => { K.shape('M-24 -16 L 24 -16 L 24 16 L -24 16 Z', { lit: '#c99f6a', w: 2.4, inside: () => K.line('M-24 -4 Q 0 -10 24 -2 M-24 8 Q 0 2 24 10', { w: 1.3, alpha: 0.45, trace: false }) }); },
    kagit: (K) => { K.shape('M-20 -24 L 12 -24 L 22 -14 L 22 24 L -20 24 Z', { fill: C.SHEET, w: 2.2, hatch: false }); K.line('M-12 -10 L 14 -10 M-12 0 L 14 0 M-12 10 L 8 10', { w: 1.2, alpha: 0.45, trace: false }); },
    balon: (K) => { K.ellipse(0, -6, 18, 22, { lit: C.SEAL, w: 2.4 }); K.line('M0 16 L -3 22 L 3 22 Z M0 22 Q 6 28 0 32', { w: 1.6, trace: false }); },
    cam: (K) => { K.circle(0, 0, 18, { fill: 'rgba(150,200,220,.45)', w: 2.4, hatch: false, inside: () => K.line('M-10 6 Q 0 -10 10 4', { w: 3, color: '#3f8f8a', trace: false }) }); K.dot(-6, -7, 3, '#fff'); },
    yun: (K) => { K.circle(0, 0, 20, { lit: '#b56a9a', w: 2.4, inside: () => K.line('M-18 -6 Q 0 -16 18 -4 M-18 4 Q 0 -6 18 8 M-14 14 Q 0 4 14 16', { w: 1.3, alpha: 0.5, trace: false }) }); },
  };
  const TEST = { x: 400, y: 112 }, BIN = { il: { x: 50, y: 434, w: 380, h: 150 }, ya: { x: 470, y: 434, w: 380, h: 150 } };
  KAMP.def('iletken', {
    init(Z) {
      const il = shuffle(Object.keys(ITEMS).filter((k) => ITEMS[k].il)).slice(0, 4), ya = shuffle(Object.keys(ITEMS).filter((k) => !ITEMS[k].il)).slice(0, 4);
      const ids = shuffle([...il, ...ya]);
      const sorted = Z.isDone('ayir');
      const cnt = { il: 0, ya: 0 };
      Z.data = {
        items: ids.map((id, i) => {
          const home = { x: 78 + i * 106, y: 292 };
          const it = { id, ...ITEMS[id], home, x: home.x, y: home.y, at: 'shelf' };
          if (sorted) { const b = it.il ? 'il' : 'ya'; it.at = 'bin'; const k = cnt[b]++; it.x = BIN[b].x + 50 + (k % 4) * 90; it.y = BIN[b].y + 92; }
          return it;
        }),
        drag: -1, test: null, tested: 0,
      };
    },
    draw(K, t, Z) {
      const d = Z.data, c = K.ctx, n = now() / 1000;
      paper(K);
      // test düzeneği: küçük Patara, iki kıskaç, test yeri
      const ps = 0.56, pox = 24, poy = 12, up = pg(pox, poy, ps, P.left[0]), gnd = pg(pox, poy, ps, P.left[4]);
      const tr = d.test, ti = tr ? d.items[tr.i] : null, tf = tr ? Math.min(1, (n - tr.t0) / 1.6) : 0;
      const res = tr && tf >= 1 ? (ti.il ? 'ok' : 'no') : null;
      K.at(pox, poy, ps, () => CH.patara.draw(K, { state: res === 'ok' ? 'happy' : res === 'no' ? 'sad' : 'idle', led: res === 'ok' ? 'up' : res === 'no' ? 'off' : null, pad: tr && tf < 1 ? 'up' : null }));
      const lb = { x: TEST.x - 44, y: TEST.y }, rb = { x: TEST.x + 44, y: TEST.y };
      const lh = clipHead(K, lb, 1, 0.24, {}), rh = clipHead(K, rb, -1, 0.24, { black: true });
      const m1 = wire(K, up, lh.tail, C.SEAL, 30, 4), m2 = wire(K, gnd, rh.tail, '#4a403a', 120, 4);
      clipHead(K, lb, 1, 0.24, {}); clipHead(K, rb, -1, 0.24, { black: true });
      c.save(); c.strokeStyle = C.AMBER; c.lineWidth = 2.6; c.setLineDash([6, 6]); c.beginPath(); c.arc(TEST.x, TEST.y, 40, 0, 7); c.stroke(); c.restore();
      if (!ti) text(K, 'test yeri', TEST.x, TEST.y + 62, { size: 20, align: 'center', color: C.DEEP });
      if (tr) {
        // Kıvılcım: kırmızı kablodan test yerine; iletkense siyah kablodan geri
        let q;
        if (tf < 0.5) q = qpt(up, m1, lh.tail, tf / 0.5);
        else if (ti.il) q = qpt(rh.tail, m2, gnd, (tf - 0.5) / 0.5);
        else { const b = (tf - 0.5) / 0.5; q = { x: lh.tail.x - Math.sin(b * Math.PI) * 30, y: lh.tail.y - Math.sin(b * Math.PI) * 26 }; }
        miniSpark(K, q.x, q.y - 4, 0.2, res === 'ok' ? 'happy' : res === 'no' ? 'sad' : 'idle');
        if (res) tag(K, res === 'ok' ? `${ti.ad}: Kıvılcım geçti · İLETKEN` : `${ti.ad}: geçemedi · YALITKAN`, 640, 70, { fill: res === 'ok' ? C.AMBER : '#bccbd8', size: 15 });
      }
      // raf
      K.shape('M30 352 L 870 352 L 870 366 L 30 366 Z', { lit: '#b08654', w: 2.4 });
      text(K, 'nesneleri sürükle: önce test yerine, sonra sepete', 450, 400, { size: 20, align: 'center', color: 'rgba(23,20,17,.6)' });
      // sepetler
      [['il', "Kıvılcım'ın sepeti · İLETKEN", C.AMBER], ['ya', "Silgi'nin sepeti · YALITKAN", C.SLATE]].forEach(([b, l, col]) => {
        const r = BIN[b], hot = d.drag >= 0 && inRect(d.items[d.drag], r);
        K.shape(`M${r.x} ${r.y + 34} L ${r.x + r.w} ${r.y + 34} L ${r.x + r.w - 22} ${r.y + r.h} L ${r.x + 22} ${r.y + r.h} Z`, { lit: hot ? '#e6c48a' : '#d8bb8a', w: 2.8, inside: () => {
          for (let y = r.y + 50; y < r.y + r.h; y += 16) K.ctx.fillRect(r.x, y, r.w, 1.4);
        } });
        tag(K, l, r.x + r.w / 2, r.y + 14, { fill: col, color: b === 'il' ? C.INK : C.SHEET, size: 14 });
      });
      miniSpark(K, BIN.il.x + 26, BIN.il.y + 10, 0.2, 'happy');
      K.at(BIN.ya.x + 360 - 26, BIN.ya.y - 18, 0.2, () => CH.silgi.draw(K, { noSpark: true, state: 'idle' }));
      // nesneler (sürüklenen en üstte)
      const order = d.items.map((_, i) => i).filter((i) => i !== d.drag);
      if (d.drag >= 0) order.push(d.drag);
      order.forEach((i) => {
        const it = d.items[i], s = it.at === 'bin' ? 0.75 : 1;
        K.at(it.x, it.y, s, () => ICON[it.id](K));
        if (it.at === 'shelf' || i === d.drag) text(K, it.ad, it.x, it.y + 48, { size: 16, align: 'center' });
      });
    },
    pickAt(p) { const d = KAMP.Z.data; for (let i = d.items.length - 1; i >= 0; i--) { const it = d.items[i]; if (it.at !== 'bin' && near(p, it, 36)) return i; } return -1; },
    down(p, Z) { const i = this.pickAt(p); if (i >= 0) { const it = Z.data.items[i]; Z.data.drag = i; Z.data.off = { x: it.x - p.x, y: it.y - p.y }; Z.sfx.tick(); } },
    move(p, Z) { const d = Z.data; if (d.drag >= 0 && p) { const it = d.items[d.drag]; it.x = p.x + d.off.x; it.y = p.y + d.off.y; } },
    up(p, Z) {
      const d = Z.data, i = d.drag; if (i < 0) return;
      d.drag = -1;
      const it = d.items[i];
      const home = () => { it.x = it.home.x; it.y = it.home.y; it.at = 'shelf'; };
      if (near(it, TEST, 64)) {
        if (d.test && d.test.i !== i) { const o = d.items[d.test.i]; o.x = o.home.x; o.y = o.home.y; o.at = 'shelf'; }
        it.x = TEST.x; it.y = TEST.y; it.at = 'test'; d.test = { i, t0: now() / 1000 };
        Z.sfx.zap();
        setTimeout(() => {
          if (!KAMP.Z || KAMP.Z.sid !== 'iletken') return;
          it.il ? Z.sfx.good() : Z.sfx.bad();
          if (Z.task() === 'test') Z.done('test', `${it.il ? 'Kıvılcım geçti, ↑ basıldı' : 'Kıvılcım geçemedi, tuş basılmadı'}. ${it.why} Şimdi hepsini sepetlere ayır.`);
          else Z.say(`${it.ad}: ${it.il ? '**iletken**' : '**yalıtkan**'}. ${it.why}`, it.il ? 'happy' : 'idle');
        }, 1650);
        return;
      }
      const bin = inRect(it, BIN.il) ? 'il' : inRect(it, BIN.ya) ? 'ya' : null;
      if (!bin) { home(); return; }
      if (d.test && d.test.i === i) d.test = null;
      if ((bin === 'il') === it.il) {
        const k = d.items.filter((x) => x.at === 'bin' && x.il === it.il).length;
        it.at = 'bin'; it.x = BIN[bin].x + 50 + (k % 4) * 90; it.y = BIN[bin].y + 92;
        Z.sfx.good();
        const left = d.items.filter((x) => x.at !== 'bin').length;
        if (!left && Z.task() === 'ayir') Z.done('ayir', 'Sekizi de doğru sepette! İletkenleri yalıtkanlardan ayırmayı öğrendin.');
        else if (!left) Z.say('Hepsi sepette!', 'happy');
        else Z.say(`Doğru! ${it.why} (${8 - left}/8)`, 'happy');
      } else {
        home(); Z.sfx.bad();
        Z.say(`${it.ad} o sepete uymadı. Emin değilsen önce **test yerinde** dene: lamba yanıyor mu?`, 'think');
      }
    },
    ctl(host, Z) {
      if (Z.task() !== 'neden') return;
      const ops = [['Metal ya da su içerirler', true], ['Hepsi sarı renklidir', false], ['Hepsi ağırdır', false]];
      host.innerHTML = `<p class="q">İletken nesnelerde ortak olan ne?</p><div class="col">${shuffle(ops.slice()).map(([l, ok]) => `<button type="button" class="pick wide" data-ok="${ok}">${l}</button>`).join('')}</div>`;
      host.querySelectorAll('.pick').forEach((b) => b.addEventListener('click', () => {
        if (b.dataset.ok === 'true') Z.done('neden', '**Metaller** ve **su içeren** şeyler iletir. Kalem izindeki grafit de bu takıma katılır.');
        else { Z.sfx.bad(); Z.say('Renge ya da ağırlığa değil, neyden yapıldıklarına bak: kaşık, para… muz, hamur…', 'think'); }
      }));
    },
    prog(tid, Z) { return tid === 'ayir' ? `${Z.data.items.filter((x) => x.at === 'bin').length}/8` : ''; },
    guide(tid, Z) {
      const d = Z.data, it = d.items.find((x) => x.at !== 'bin');
      if (tid === 'test' && it) return { how: { x: it.x, y: it.y, r: 34, t: 'sürükle' }, pt: { ...TEST, r: 40, t: 'test yeri', below: true }, drag: [{ x: it.x, y: it.y }, TEST] };
      if (tid === 'ayir' && it) { const r = it.il ? BIN.il : BIN.ya, to = { x: r.x + r.w / 2, y: r.y + 92 }; return { how: { x: it.x, y: it.y, r: 34, t: 'sürükle' }, pt: { ...to, r: 40, t: it.il ? 'iletken' : 'yalıtkan' }, drag: [{ x: it.x, y: it.y }, to] }; }
      return null;
    },
  });

  /* ═════════ 6 · IŞIK VE MÜZİK ═════════ */
  const GX = 52, GY = 70, GC = 50, PIA = { x: 50, y: 400, w: 800, h: 160 }, NOTE = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];
  const toGrid = (name) => PT.LED[name].join('').split('').map((ch) => (ch === '#' ? 1 : 0));
  KAMP.def('sahne', {
    init(Z) {
      const tg = pick(['heart', 'smile', 'up', 'star', 'note']);
      const mel = []; while (mel.length < 4) { const k = Math.floor(Math.random() * 8); if (k !== mel[mel.length - 1]) mel.push(k); }
      Z.data = { grid: Array(25).fill(0), tg, target: toGrid(tg), mel, mpos: 0, lit: -1, litUntil: 0, show: 0, play: null };
    },
    cell(p) { const c = Math.floor((p.x - GX) / GC), r = Math.floor((p.y - GY) / GC); return c >= 0 && c < 5 && r >= 0 && r < 5 ? r * 5 + c : -1; },
    draw(K, t, Z) {
      const d = Z.data, c = K.ctx, n = now();
      paper(K);
      text(K, 'LED ekran', GX, GY - 16, { size: 22 });
      c.fillStyle = '#1b1f26'; c.strokeStyle = C.INK; c.lineWidth = 3;
      c.beginPath(); c.roundRect ? c.roundRect(GX - 12, GY - 12, GC * 5 + 24, GC * 5 + 24, 14) : c.rect(GX - 12, GY - 12, GC * 5 + 24, GC * 5 + 24); c.fill(); c.stroke();
      d.grid.forEach((on, i) => {
        const x = GX + (i % 5) * GC + GC / 2, y = GY + Math.floor(i / 5) * GC + GC / 2;
        if (on) { c.save(); c.shadowColor = '#ff4a3a'; c.shadowBlur = 16; K.dot(x, y, 17, '#ff5040'); c.restore(); } else K.dot(x, y, 15, '#3a2a24');
      });
      // örnek
      if (!Z.isDone('ciz')) {
        text(K, 'örnek', 352, 92, { size: 20 });
        c.fillStyle = '#1b1f26'; c.fillRect(350, 100, 104, 104); c.strokeStyle = C.INK; c.lineWidth = 2; c.strokeRect(350, 100, 104, 104);
        d.target.forEach((on, i) => K.dot(362 + (i % 5) * 20, 112 + Math.floor(i / 5) * 20, 7, on ? '#ff5040' : '#3a2a24'));
      }
      // Patara: çizdiğin onun kabuğunda
      K.at(540, 26, 1.12, () => CH.patara.draw(K, { state: d.show > n ? 'happy' : 'idle', ledGrid: d.grid, note: d.litUntil > n ? d.lit : null }));
      text(K, 'çizdiğin, kabuğumda!', 690, 384, { size: 19, align: 'center', color: 'rgba(23,20,17,.6)' });
      // piyano
      const kw = PIA.w / 8;
      for (let i = 0; i < 8; i++) {
        const x = PIA.x + i * kw, on = d.litUntil > n && d.lit === i;
        K.shape(`M${x} ${PIA.y} L ${x + kw} ${PIA.y} L ${x + kw} ${PIA.y + PIA.h} L ${x} ${PIA.y + PIA.h} Z`, { fill: on ? '#ffd77a' : C.SHEET, w: 2.6, hatch: false, trace: false });
        text(K, NOTE[i], x + kw / 2, PIA.y + PIA.h - 16, { size: 24, align: 'center' });
      }
      c.fillStyle = C.INK; [1, 2, 4, 5, 6].forEach((i) => c.fillRect(PIA.x + i * kw - 18, PIA.y, 36, 86));
    },
    down(p, Z) {
      const d = Z.data, i = this.cell(p);
      if (i >= 0) { d.grid[i] = d.grid[i] ? 0 : 1; Z.sfx.tick(); this.check(Z); return; }
      if (inRect(p, PIA)) { this.press(Math.max(0, Math.min(7, Math.floor((p.x - PIA.x) / (PIA.w / 8)))), Z); return; }
    },
    press(i, Z) {
      const d = Z.data; d.lit = i; d.litUntil = now() + 350; Z.sfx.note(i);
      if (Z.task() !== 'melodi') return;
      if (i === d.mel[d.mpos]) { d.mpos++; if (d.mpos >= d.mel.length) Z.done('melodi', 'Tıpatıp aynı melodi! Parmağın piyanoya dokundu, Patara hissetti. Kablo yok, kıskaç yok.'); else Z.refresh(); }
      else { d.mpos = 0; Z.sfx.bad(); Z.say('Olmadı; baştan başla. Unuttuysan **Dinle**\'ye bir daha bas.', 'think'); Z.refresh(); }
    },
    listen(Z) {
      const d = Z.data; d.mpos = 0; Z.refresh();
      d.mel.forEach((k, j) => setTimeout(() => { if (KAMP.Z && KAMP.Z.sid === 'sahne') { d.lit = k; d.litUntil = now() + 420; Z.sfx.note(k); } }, j * 560));
    },
    check(Z) {
      const d = Z.data;
      if (Z.task() === 'ciz' && d.grid.every((v, i) => v === d.target[i])) { d.show = now() + 2000; Z.done('ciz', 'Aynısını çizdin! LED ekran 25 küçük ışıktan oluşan bir **piksel** tablosu.'); }
    },
    ctl(host, Z) {
      const tid = Z.task();
      host.innerHTML = `<div class="row">${tid === 'melodi' ? '<button type="button" class="pick wide" id="sListen">♪ Dinle</button>' : ''}<button type="button" class="pick wide" id="sClear">Temizle</button>${tid === 'serbest' ? '<button type="button" class="pick wide" id="sShow">Göster</button>' : ''}</div>`;
      const l = host.querySelector('#sListen'); if (l) l.addEventListener('click', () => this.listen(Z));
      host.querySelector('#sClear').addEventListener('click', () => { Z.data.grid.fill(0); Z.sfx.tick(); });
      const s = host.querySelector('#sShow');
      if (s) s.addEventListener('click', () => {
        const k = Z.data.grid.reduce((a, b) => a + b, 0);
        if (k >= 8) { Z.data.show = now() + 2400; Z.done('serbest', `Harika bir resim: ${k} ışık! Kod yazarak LED ekrana kendi animasyonlarını da çizebilirsin.`); }
        else { Z.sfx.bad(); Z.say(`Şu an ${k} ışık yanıyor. En az **8** olsun.`, 'think'); }
      });
    },
    prog(tid, Z) {
      const d = Z.data;
      if (tid === 'melodi') return `${d.mpos}/${d.mel.length}`;
      if (tid === 'serbest') return `${d.grid.reduce((a, b) => a + b, 0)}/8 ışık`;
      return '';
    },
    guide(tid, Z) {
      const d = Z.data, cc = (i) => ({ x: GX + (i % 5) * GC + GC / 2, y: GY + Math.floor(i / 5) * GC + GC / 2 });
      if (tid === 'ciz') { const i = d.grid.findIndex((v, j) => v !== d.target[j]); if (i < 0) return null; return { how: { x: GX + GC * 2.5, y: GY + GC * 2.5, r: 60, t: 'ışıklara dokun' }, pt: { ...cc(i), r: 22, t: d.target[i] ? 'yak' : 'söndür' } }; }
      if (tid === 'melodi') { const k = d.mel[d.mpos], x = PIA.x + (k + 0.5) * (PIA.w / 8); return { how: { x: PIA.x + PIA.w / 2, y: PIA.y + 120, r: 50, t: 'önce Dinle, sonra çal' }, pt: { x, y: PIA.y + 120, r: 30, t: NOTE[k] }, seq: d.mel.slice(d.mpos) }; }
      if (tid === 'serbest') { const i = d.grid.findIndex((v) => !v); if (i < 0) return null; return { how: { x: GX + GC * 2.5, y: GY + GC * 2.5, r: 60, t: 'kendi resmin' }, pt: { ...cc(i), r: 22, t: 'yak' } }; }
      return null;
    },
  });

  /* ═════════ 7 · OYUN ZAMANI ═════════ */
  const MC = 7, MR = 5, CS = 64, MX = 36, MY = 96, GOAL = { c: 6, r: 0 }, START = { c: 0, r: 4 };
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const CTRL = [
    { id: 'muz', key: 'up', cx: 700, cy: 120 }, { id: 'elma', key: 'left', cx: 590, cy: 240 },
    { id: 'hamur', key: 'right', cx: 810, cy: 240 }, { id: 'kasik', key: 'down', cx: 700, cy: 350 },
  ];
  const MINI = { up: { x: 676, y: 432 }, left: { x: 626, y: 482 }, down: { x: 676, y: 482 }, right: { x: 726, y: 482 } };
  const CBOX = { muz: [0, 6, 104, 194], elma: [0, 40, 104, 194], hamur: [0, 80, 106, 194], kasik: [8, 24, 92, 194] };
  function bfs(rocks) {
    const key = (c, r) => r * MC + c, prev = new Map([[key(START.c, START.r), null]]), q = [START];
    while (q.length) {
      const u = q.shift();
      if (u.c === GOAL.c && u.r === GOAL.r) { const path = []; let k = key(u.c, u.r); while (prev.get(k)) { const [pk, dir] = prev.get(k); path.unshift(dir); k = pk; } return path; }
      for (const [dir, [dc, dr]] of Object.entries(DIRS)) {
        const c = u.c + dc, r = u.r + dr, k = key(c, r);
        if (c < 0 || c >= MC || r < 0 || r >= MR || rocks.has(k) || prev.has(k)) continue;
        prev.set(k, [key(u.c, u.r), dir]); q.push({ c, r });
      }
    }
    return null;
  }
  function makeMaze() {
    for (let tries = 0; tries < 200; tries++) {
      const rocks = new Set();
      for (let i = 0; i < MC * MR; i++) if (Math.random() < 0.3) rocks.add(i);
      rocks.delete(START.r * MC + START.c); rocks.delete(GOAL.r * MC + GOAL.c);
      const p = bfs(rocks);
      if (p && p.length >= 10) return rocks;
    }
    return new Set([8, 9, 10, 22, 23, 25]);
  }
  KAMP.def('oyun', {
    init(Z) { Z.data = { rocks: makeMaze(), pos: { ...START }, from: { ...START }, mt: 0, log: [], bump: 0, win: 0, moves: 0, pressed: null, pressedUntil: 0 }; },
    ctrlBox(o) { const s = 0.55, b = CBOX[o.id]; return { ox: o.cx - ((b[0] + b[2]) / 2) * s, oy: o.cy - ((b[1] + b[3]) / 2) * s, s }; },
    draw(K, t, Z) {
      const d = Z.data, c = K.ctx, n = now();
      paper(K);
      // harita
      c.fillStyle = '#efe6d2'; c.fillRect(MX, MY, MC * CS, MR * CS);
      c.strokeStyle = 'rgba(23,20,17,.2)'; c.lineWidth = 1.2;
      for (let i = 0; i <= MC; i++) { c.beginPath(); c.moveTo(MX + i * CS, MY); c.lineTo(MX + i * CS, MY + MR * CS); c.stroke(); }
      for (let j = 0; j <= MR; j++) { c.beginPath(); c.moveTo(MX, MY + j * CS); c.lineTo(MX + MC * CS, MY + j * CS); c.stroke(); }
      c.strokeStyle = C.INK; c.lineWidth = 3; c.strokeRect(MX, MY, MC * CS, MR * CS);
      d.rocks.forEach((k) => { const x = MX + (k % MC) * CS + CS / 2, y = MY + Math.floor(k / MC) * CS + CS / 2; K.at(x, y, 1, () => K.shape('M-22 14 C -28 -2 -16 -20 0 -20 C 18 -22 28 -4 24 14 Z', { lit: '#a69c8c', w: 2.4 })); });
      const gx = MX + GOAL.c * CS + CS / 2, gy = MY + GOAL.r * CS + CS / 2;
      K.rot(gx, gy, Math.sin(t * 2) * 0.12, () => K.at(gx, gy, 1, () => K.shape('M0 -24 L 7 -8 L 24 -7 L 11 4 L 15 21 L 0 12 L -15 21 L -11 4 L -24 -7 L -7 -8 Z', { lit: '#ffcf4a', w: 2.4 })));
      // Patara (kaydırarak geçiş)
      const k = Math.min(1, (n - d.mt) / 220), cc = d.from.c + (d.pos.c - d.from.c) * k, rr = d.from.r + (d.pos.r - d.from.r) * k;
      const bx = d.bump > n ? Math.sin((d.bump - n) / 30) * 4 : 0;
      const px = MX + cc * CS + CS / 2 + bx, py = MY + rr * CS + CS / 2;
      K.at(px - 130 * 0.21, py - 150 * 0.21, 0.21, () => { const nsh = K.noShadow; K.noShadow = true; CH.patara.draw(K, { state: d.win > n ? 'happy' : 'idle', walk: k < 1 ? t * 12 : null }); K.noShadow = nsh; });
      text(K, 'Patara\'yı yıldıza götür', MX, MY - 22, { size: 24 });
      // Bilgi'nin gördüğü
      text(K, "Bilgi'nin gördüğü:", MX, 452, { size: 20 });
      d.log.slice(-9).forEach((s, i) => tag(K, s, MX + 18 + i * 46, 486, { fill: '#ffd77a', size: 15 }));
      text(K, `hamle: ${d.moves}`, MX, 540, { mono: true, size: 13, color: 'rgba(23,20,17,.6)' });
      // kumanda
      text(K, 'mutfak kumandası', 700, 40, { size: 20, align: 'center', color: 'rgba(23,20,17,.6)' });
      CTRL.forEach((o) => {
        const b = this.ctrlBox(o), on = d.pressedUntil > n && d.pressed === o.key;
        K.at(b.ox, b.oy - (on ? 6 : 0), b.s, () => CH[o.id].draw(K, { state: on ? 'happy' : 'idle', ph: o.cx }));
        tag(K, ARROW[o.key], o.cx + 44, o.cy - 34, { fill: on ? C.AMBER : C.SHEET, size: 15 });
      });
      // küçük klavye
      text(K, 'klavye:', 596, 440, { size: 19, align: 'right', color: 'rgba(23,20,17,.6)' });
      Object.entries(MINI).forEach(([key, q]) => {
        const on = d.pressedUntil > n && d.pressed === key && d.via === 'klavye';
        c.fillStyle = on ? C.AMBER : C.SHEET; c.strokeStyle = C.INK; c.lineWidth = 2.4;
        c.beginPath(); c.roundRect ? c.roundRect(q.x - 22, q.y - 20, 44, 40, 8) : c.rect(q.x - 22, q.y - 20, 44, 40); c.fill(); c.stroke();
        text(K, ARROW[key], q.x, q.y + 2, { mono: true, size: 18, align: 'center', base: 'middle' });
      });
    },
    move(p, Z) { /* sürükleme yok */ },
    go(dir, via, Z) {
      const d = Z.data, n = now(), [dc, dr] = DIRS[dir], c = d.pos.c + dc, r = d.pos.r + dr;
      d.pressed = dir; d.pressedUntil = n + 300; d.via = via; d.log.push(ARROW[dir]); d.moves++; Z.sfx.key();
      const tid = Z.task();
      if (tid === 'ilk') {
        if (dir === 'up' && via === 'nesne') Z.done('ilk', 'Muza dokundun, Bilgi **↑** gördü, Patara yukarı gitti!');
        else if (via === 'nesne') Z.say('Bu da bir hamle! Ama bu görevde **muzu** dene: muz ↑ tuşu.', 'think');
      }
      if (tid === 'klavye' && via === 'klavye') Z.done('klavye', 'Bilgi için hiçbir fark yok: **muz da ok tuşu da ↑**. Patara nesneleri tuşa çevirir.');
      if (c < 0 || c >= MC || r < 0 || r >= MR || d.rocks.has(r * MC + c)) { d.bump = n + 220; Z.sfx.bad(); return; }
      d.from = { ...d.pos }; d.pos = { c, r }; d.mt = n;
      if (c === GOAL.c && r === GOAL.r) {
        d.win = n + 1800; Z.sfx.win();
        if (Z.task() === 'yildiz') Z.done('yildiz', `Yıldıza ulaştın: ${d.moves} hamle! Mutfak kumandası işe yaradı.`);
        else Z.say('Yıldız! Yeni bir harita geliyor…', 'happy');
        setTimeout(() => { if (KAMP.Z && KAMP.Z.sid === 'oyun') { d.rocks = makeMaze(); d.pos = { ...START }; d.from = { ...START }; d.moves = 0; } }, 1500);
      }
    },
    down(p, Z) {
      for (const o of CTRL) if (near(p, { x: o.cx, y: o.cy }, 54)) { this.go(o.key, 'nesne', Z); return; }
      for (const [key, q] of Object.entries(MINI)) if (Math.abs(p.x - q.x) < 24 && Math.abs(p.y - q.y) < 22) { this.go(key, 'klavye', Z); return; }
    },
    key(e, Z) {
      const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' }[e.key];
      if (!m) return;
      e.preventDefault(); this.go(m, 'klavye', Z);
    },
    guide(tid, Z) {
      const d = Z.data;
      if (tid === 'ilk') { const o = CTRL[0]; return { how: { x: o.cx, y: o.cy, r: 50, t: 'muza dokun' }, pt: { x: o.cx, y: o.cy, r: 50, t: 'muz = ↑' } }; }
      const cur = { ...d.pos };
      // sıradaki hamle: Patara'nın şimdiki yerinden yıldıza en kısa yol
      const nextDir = (() => {
        const key = (c, r) => r * MC + c, prev = new Map([[key(cur.c, cur.r), null]]), q = [cur];
        while (q.length) {
          const u = q.shift();
          if (u.c === GOAL.c && u.r === GOAL.r) { let k = key(u.c, u.r), first = null; while (prev.get(k)) { const [pk, dir] = prev.get(k); first = dir; k = pk; } return first; }
          for (const [dir, [dc, dr]] of Object.entries(DIRS)) { const c = u.c + dc, r = u.r + dr, k = key(c, r); if (c < 0 || c >= MC || r < 0 || r >= MR || d.rocks.has(k) || prev.has(k)) continue; prev.set(k, [key(u.c, u.r), dir]); q.push({ c, r }); }
        }
        return 'up';
      })() || 'up';
      if (tid === 'yildiz') { const o = CTRL.find((x) => x.key === nextDir); return { how: { x: o.cx, y: o.cy, r: 50, t: 'nesnelere dokun' }, pt: { x: o.cx, y: o.cy, r: 50, t: ARROW[nextDir] } }; }
      if (tid === 'klavye') { const q = MINI[nextDir]; return { how: { x: 676, y: 460, r: 64, t: 'ok tuşları' }, pt: { ...q, r: 26, t: ARROW[nextDir] } }; }
      return null;
    },
  });
})();
