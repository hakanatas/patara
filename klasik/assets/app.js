(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Nav ---------- */
  const nav = $('#nav');
  const navToggle = $('#navToggle');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 24);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  $$('.nav-links a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

  /* ---------- Hash router (#/slug) ---------- */
  const routes = new Map($$('[data-route]').map(s => [s.dataset.route, s]));
  let suppressHash = false;
  function goTo(hash, instant) {
    const slug = (hash || '#/').replace(/^#/, '') || '/';
    const target = routes.get(slug);
    if (!target) return;
    const y = slug === '/' ? 0 : target.getBoundingClientRect().top + window.scrollY - 60;
    window.scrollTo({ top: y, behavior: instant || reduced ? 'auto' : 'smooth' });
  }
  window.addEventListener('hashchange', () => { if (!suppressHash) goTo(location.hash); suppressHash = false; });
  // Update hash + active nav link as sections pass through the viewport
  const navLinks = $$('.nav-links a');
  const sectionIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const route = e.target.dataset.route;
      navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + route));
      const want = '#' + route;
      if (location.hash !== want) { suppressHash = true; history.replaceState(null, '', want); }
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  routes.forEach(s => sectionIO.observe(s));
  if (location.hash && location.hash !== '#/') setTimeout(() => goTo(location.hash, true), 50);

  /* ---------- Reveal on scroll ---------- */
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } });
  }, { threshold: 0.12 });
  $$('.reveal').forEach(el => revealIO.observe(el));

  /* ---------- Hero board animation ---------- */
  const hero = PataraBoard.render($('#heroBoard'), { led: 'smile' });
  const heroTip = $('#heroTip');
  const heroSeq = [
    ['up', '↑', 'up'], ['right', '→', 'right'], ['space', 'Space', 'star'], ['down', '↓', 'down'],
    ['click', 'Click', 'check'], ['left', '←', 'left'], ['enter', 'Enter', 'heart'],
  ];
  let heroI = 0;
  function heroStep() {
    const [pad, label, led] = heroSeq[heroI % heroSeq.length];
    hero.press(pad, 900);
    hero.setLed(led, led === 'heart' ? 'alt' : '');
    heroTip.innerHTML = `<span class="key">${label}</span> tuşuna basıldı`;
    heroTip.classList.add('show');
    heroI++;
  }
  if (!reduced) { setTimeout(heroStep, 900); setInterval(heroStep, 1900); }
  else { heroStep(); }

  /* ---------- Simulator ---------- */
  const sim = {
    gnd: false, x: 0, y: 3, sx: 4, sy: 1, score: 0,
    board: PataraBoard.render($('#simBoard'), { led: 'smile' }),
  };
  const gndBtn = $('#gndBtn'), gndHint = $('#gndHint'), player = $('#player'), star = $('#star');
  const toast = $('#toast'), keylogKeys = $('#keylogKeys'), scoreEl = $('#score b');
  const KEY_LABEL = { up: '↑', down: '↓', left: '←', right: '→', space: 'Space' };
  let toastT;
  function showToast(msg, kind) {
    toast.textContent = msg;
    toast.className = 'toast show' + (kind ? ' ' + kind : '');
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove('show'), 2200);
  }
  function place() {
    player.style.transform = `translate(${sim.x * 100}%, ${sim.y * 100}%)`;
    star.style.transform = `translate(${sim.sx * 100}%, ${sim.sy * 100}%)`;
  }
  function logKey(label) {
    if (keylogKeys.querySelector('em')) keylogKeys.innerHTML = '';
    const k = document.createElement('span');
    k.className = 'k'; k.textContent = label;
    keylogKeys.appendChild(k);
    while (keylogKeys.children.length > 8) keylogKeys.removeChild(keylogKeys.firstChild);
  }
  function moveStar() {
    let nx, ny;
    do { nx = Math.floor(Math.random() * 6); ny = Math.floor(Math.random() * 4); } while (nx === sim.x && ny === sim.y);
    sim.sx = nx; sim.sy = ny;
  }
  function trigger(key, viaKeyboard) {
    const btn = $(`.object[data-key="${key}"]`);
    if (key === 'none') {
      btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake');
      sim.board.setLed('x', 'alt');
      showToast('Plastik yalıtkandır: akım geçmez, tuş tetiklenmez.', 'warn');
      return;
    }
    if (!sim.gnd && !viaKeyboard) {
      btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake');
      sim.board.setLed('x', 'alt');
      showToast('Devre açık! Önce GND bilekliğini tak.', 'warn');
      return;
    }
    if (btn) { btn.classList.remove('zap'); void btn.offsetWidth; btn.classList.add('zap'); }
    sim.board.press(key, 350);
    sim.board.setLed(key === 'space' ? 'star' : key);
    logKey(KEY_LABEL[key]);
    if (key === 'up') sim.y = Math.max(0, sim.y - 1);
    if (key === 'down') sim.y = Math.min(3, sim.y + 1);
    if (key === 'left') sim.x = Math.max(0, sim.x - 1);
    if (key === 'right') sim.x = Math.min(5, sim.x + 1);
    if (key === 'space') { player.classList.remove('jump'); void player.offsetWidth; player.classList.add('jump'); }
    if (sim.x === sim.sx && sim.y === sim.sy) {
      sim.score++; scoreEl.textContent = sim.score;
      sim.board.setLed('heart', 'alt');
      showToast('Yıldız toplandı! 🎉', 'good');
      moveStar();
    }
    place();
  }
  gndBtn.addEventListener('click', () => {
    sim.gnd = !sim.gnd;
    gndBtn.setAttribute('aria-pressed', String(sim.gnd));
    gndBtn.querySelector('span:last-child').textContent = sim.gnd ? 'GND bağlı — devre hazır' : 'GND bilekliğini tak';
    gndHint.textContent = sim.gnd ? 'Devre tamamlandı. Şimdi nesnelere dokun!' : 'Devre tamamlanmadı. Nesneler henüz tepki vermez.';
    gndHint.classList.toggle('ok', sim.gnd);
    sim.board.press(sim.gnd ? 'gnd' : 'gnd2', 600);
    sim.board.setLed(sim.gnd ? 'check' : 'smile');
    if (sim.gnd) showToast('Süper! Muza dokun ve robotu yıldıza götür.', 'good');
  });
  $$('.object').forEach(b => b.addEventListener('click', () => trigger(b.dataset.key, false)));
  const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', ' ': 'space' };
  let simVisible = false;
  new IntersectionObserver(es => es.forEach(e => (simVisible = e.isIntersecting)), { threshold: 0.2 }).observe($('#sim'));
  document.addEventListener('keydown', e => {
    if (!simVisible || e.target.closest('input, textarea, select')) return;
    const k = KEYMAP[e.key];
    if (!k) return;
    e.preventDefault();
    trigger(k, true);
  });
  place();

  /* ---------- Piano (WebAudio) ---------- */
  let ctx;
  function tone(freq) {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      o.connect(g).connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.65);
    } catch (_) { /* audio unavailable */ }
  }
  $$('#piano button').forEach((b, i) => {
    const play = () => {
      tone(parseFloat(b.dataset.note));
      b.classList.add('active'); setTimeout(() => b.classList.remove('active'), 200);
      sim.board.pressKey(i, 250);
      sim.board.setLed('note');
    };
    b.addEventListener('pointerdown', play);
    b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); } });
  });

  /* ---------- Board tour ---------- */
  const tour = PataraBoard.render($('#tourBoard'), { led: 'smile' });
  const tourCaption = $('#tourCaption');
  const cards = $$('.tcard');
  const captions = { arms: '10 kıskaç pedi', matrix: '5×5 LED matris', piano: 'Dokunmatik piyano', func: 'X–Y ve yön tuşları', pins: 'Alt pin girişleri', usb: 'USB güç ve veri' };
  const tourLed = { arms: 'right', matrix: 'heart', piano: 'note', func: 'x', pins: 'full', usb: 'check' };
  const tourIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const part = e.target.dataset.part;
      cards.forEach(c => c.classList.toggle('active', c === e.target));
      tour.highlight(part);
      tour.setLed(tourLed[part], part === 'matrix' ? 'alt' : '');
      tourCaption.textContent = captions[part];
      if (part === 'arms') ['up', 'right', 'space', 'click'].forEach((k, i) => setTimeout(() => tour.press(k, 700), i * 220));
      if (part === 'piano') [0, 2, 4, 7].forEach((k, i) => setTimeout(() => tour.pressKey(k, 300), i * 160));
    });
  }, { rootMargin: '-40% 0px -40% 0px' });
  cards.forEach(c => tourIO.observe(c));
  // Reset when the tour scrolls out of view
  new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) { tour.highlight(null); tourCaption.textContent = 'Patara Board'; cards.forEach(c => c.classList.remove('active')); } }), { threshold: 0 }).observe($('.tour-cards'));

  /* ---------- Final matrix twinkle ---------- */
  const fm = $('#finalMatrix');
  for (let i = 0; i < 140; i++) { const c = document.createElement('i'); if (Math.random() < 0.18) c.classList.add('on'); fm.appendChild(c); }
  const cells = $$('i', fm);
  if (!reduced) setInterval(() => {
    cells.forEach(c => { if (Math.random() < 0.02) c.classList.toggle('on'); });
  }, 300);
})();
