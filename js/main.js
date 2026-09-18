import * as THREE from 'three';
import { createScene } from './scene.js';
import { PALETTE, KEYS, OBJECT_SETS, WIRE_COLORS, VIEWS, STORAGE_KEY, PADS_LEFT, PADS_RIGHT } from './config.js';
import { Tweens, Ease, rand } from './tween.js';
import { SoundKit } from './audio.js';
import { createBoard } from './board.js';
import { loadArtwork } from './artwork.js';
import { createObject, createWire, createWristband, createBook } from './objects.js';
import { createMonitor } from './monitor.js';
import { STEPS } from './steps.js';

// ---------------------------------------------------------------------------
// State & DOM
// ---------------------------------------------------------------------------

const $ = (sel) => document.querySelector(sel);
const canvas = $('#stage');
const dom = {
  loading: $('#loading'),
  loadingBar: $('#loading-bar'),
  loadingText: $('#loading-text'),
  hint: $('#hint'),
  hover: $('#hover-label'),
  toast: $('#toast'),
  tags: $('#tags'),
  a11y: $('#a11y-list'),
  hideUi: $('#btn-hide-ui'),
  showUi: $('#btn-show-ui'),
  lesson: $('#lesson'),
  count: $('#lesson-count'),
  title: $('#lesson-title'),
  text: $('#lesson-text'),
  action: $('#btn-action'),
  action2: $('#btn-action2'),
  collapse: $('#btn-collapse'),
  prev: $('#btn-prev'),
  next: $('#btn-next'),
  dots: $('#dots'),
};

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 860;

const state = {
  set: 'mutfak',
  gnd: true,
  sound: false,
  autoplay: false,
  uiHidden: false,
  step: 0,
  reducedMotion: reducedMotionQuery.matches,
  keyboardMode: false,
};
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  if (OBJECT_SETS[saved.set]) state.set = saved.set;
} catch {
  /* ignore */
}
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ set: state.set }));
  } catch {
    /* ignore */
  }
}

let toastTimer = 0;
function toast(msg, { ms = 2400, warn = false } = {}) {
  dom.toast.textContent = msg;
  dom.toast.classList.toggle('is-warn', warn);
  dom.toast.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('is-on'), ms);
}
function setLoading(fraction, text) {
  dom.loadingBar.style.width = `${Math.round(10 + fraction * 90)}%`;
  if (text) dom.loadingText.textContent = text;
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

let api;
try {
  api = createScene(canvas, { isMobile });
} catch (err) {
  console.error(err);
  setLoading(1, 'Bu tarayıcıda WebGL kullanılamıyor.');
  throw err;
}
const { renderer, scene, camera, controls } = api;
const tweens = new Tweens();
tweens.timeScale = state.reducedMotion ? 0.7 : 1;
const sound = new SoundKit();

setLoading(0.2, 'Kart lehimleniyor…');

let board = null; // created in boot() once the fonts are ready (the artwork is drawn on canvas)

const monitor = createMonitor();
monitor.group.position.set(2.6, 0, -4.1);
monitor.group.rotation.y = 0.35;
scene.add(monitor.group);

const book = createBook();
book.position.set(3.8, 0, -1.6);
scene.add(book);

const wristband = createWristband();
wristband.position.set(2.45, 0, 2.15);
wristband.rotation.y = 0.4;
scene.add(wristband);

const gndWire = createWire(WIRE_COLORS.gnd);
scene.add(gndWire.group);

const touchRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 48), new THREE.MeshBasicMaterial({ color: PALETTE.terracotta, transparent: true, opacity: 0, depthWrite: false }));
touchRing.rotation.x = -Math.PI / 2;
touchRing.visible = false;
scene.add(touchRing);

// ---------------------------------------------------------------------------
// Objects & wires
// ---------------------------------------------------------------------------

let objects = [];
const wires = new Map(); // key -> wire
const tmpV = new THREE.Vector3();

function objectTop(obj) {
  obj.updateMatrixWorld(true);
  return obj.localToWorld(obj.userData.top.clone());
}
function padTop(key) {
  return board.pads[key].top();
}
function objectFor(id) {
  return objects.find((o) => o.userData.def.id === id);
}
function objectForKey(key) {
  return objects.find((o) => o.userData.def.key === key);
}

function buildObjects(setName) {
  objects.forEach((o) => scene.remove(o));
  objects = OBJECT_SETS[setName].map((def) => {
    const o = createObject(def);
    o.castShadow = true;
    scene.add(o);
    return o;
  });
  objects.forEach((o) => {
    const key = o.userData.def.key;
    if (!wires.has(key)) {
      const w = createWire(WIRE_COLORS[key] || '#888');
      scene.add(w.group);
      wires.set(key, w);
    }
    wires.get(key).setEnds(padTop(key), objectTop(o));
  });
  refreshA11y();
}

/** Pop the objects in and re-attach the leads one by one. */
function attachWires(animated) {
  const ctx = newSeq();
  objects.forEach((o, i) => {
    const key = o.userData.def.key;
    const w = wires.get(key);
    const from = padTop(key);
    const to = objectTop(o);
    if (!animated || state.reducedMotion) {
      w.setEnds(from, to);
      return;
    }
    w.setEnds(from, from.clone().add(new THREE.Vector3(0, 0.05, 0)));
    tweens
      .wait(ctx, 0.25 + i * 0.32)
      .then(() => tweens.run(ctx, 0.45, (t) => w.setEnds(from, from.clone().lerp(to, t)), Ease.outCubic))
      .then(() => {
        w.setEnds(from, to);
        sound.play('clip');
        o.userData.squash = 0.35;
      })
      .catch(() => {});
  });
  tweens.wait(ctx, 0.25 + objects.length * 0.32).then(() => updateGndWire(true)).catch(() => {});
}

function updateGndWire(snap) {
  const from = padTop('gnd2');
  const to = state.gnd ? objectTop(wristband) : new THREE.Vector3(2.5, 0.03, 1.0);
  gndWire.setEnds(from, to, { sag: state.gnd ? 0.45 : 0.25 });
  if (snap) sound.play('clip', { volume: 0.7 });
}

let seqCtx = null;
function newSeq() {
  if (seqCtx) seqCtx.cancel();
  seqCtx = new (class { constructor() { this.cancelled = false; } cancel() { this.cancelled = true; } check() {} })();
  return seqCtx;
}
function later(sec, fn) {
  return tweens.wait(seqCtx, sec).then(fn).catch(() => {});
}

// ---------------------------------------------------------------------------
// Key emission (what the computer "sees")
// ---------------------------------------------------------------------------

function emit(key) {
  const label = KEYS[key]?.label || key;
  board.pressPad(key);
  board.setLed(key === 'space' ? 'space' : key);
  sound.play('touch');
  const got = monitor.press(key, label);
  if (got) {
    sound.play('star');
    toast('Yıldız toplandı! ⭐');
    tweens.wait(null, 0.35).then(() => board.setLed('star', true));
  }
}

let touchBusy = false;
function touch(id, via = 'pointer') {
  const obj = objectFor(id);
  if (!obj) return;
  sound.unlock();
  dom.hint.style.opacity = '0';
  const key = obj.userData.def.key;
  obj.userData.squash = 0.55;
  showTouchRing(objectTop(obj));
  if (!state.gnd) {
    sound.play('buzz');
    board.setLed('x', true);
    monitor.say('Devre açık: tuş gelmedi');
    toast('Devre açık! GND bilekliğini tak; akım vücudunun üzerinden dönmeli.', { warn: true, ms: 3200 });
    obj.userData.shake = 0.5;
    return;
  }
  const w = wires.get(key);
  w?.firePulse();
  sound.play('pulse', { volume: 0.6 });
  tweens.wait(null, 0.36).then(() => emit(key));
  void via;
}

function touchAll() {
  const list = objects.slice();
  list.forEach((o, i) => tweens.wait(null, i * 0.55).then(() => touch(o.userData.def.id, 'auto')));
}

function showTouchRing(pos) {
  touchRing.position.copy(pos).add(new THREE.Vector3(0, 0.08, 0));
  touchRing.visible = true;
  touchRing.userData.t = 0;
}

function setGnd(on, { silent = false } = {}) {
  state.gnd = on;
  document.querySelector('[data-toggle="gnd"]').setAttribute('aria-pressed', String(on));
  updateGndWire(true);
  board.pressPad('gnd2');
  board.setLed(on ? 'check' : 'x', !on);
  if (!silent) toast(on ? 'GND bağlandı. Devre hazır!' : 'GND çıkarıldı. Nesneler artık tepki vermez.', { warn: !on });
}

// ---------------------------------------------------------------------------
// Chapter helpers
// ---------------------------------------------------------------------------

function unplug(animated) {
  board.plug.position.z = board.PLUG_OUT;
  board.setLed('off');
  if (animated) sound.play('click');
}
function plugIn() {
  const plug = board.plug;
  return tweens
    .run(seqCtx, 0.7, (t) => (plug.position.z = board.PLUG_OUT + (board.PLUG_IN - board.PLUG_OUT) * t), Ease.outCubic)
    .then(() => {
      sound.play('plug');
      board.setLed('usb');
      return tweens.wait(seqCtx, 0.5);
    })
    .then(() => {
      sound.play('boot');
      board.setLed('smile');
      toast('Bilgisayar Patara’yı klavye ve fare olarak tanıdı.');
      monitor.say('Yeni cihaz: klavye + fare');
    })
    .catch(() => {});
}

function pulsePads() {
  [...PADS_LEFT, ...PADS_RIGHT].forEach((k, i) => tweens.wait(seqCtx, i * 0.12).then(() => board.pressPad(k)).catch(() => {}));
}

function ledShow() {
  const seq = ['up', 'right', 'down', 'left', 'heart', 'smile', 'star', 'note'];
  seq.forEach((p, i) => tweens.wait(seqCtx, 0.4 + i * 0.55).then(() => board.setLed(p, p === 'heart')).catch(() => {}));
}

function playMelody() {
  const notes = [0, 2, 4, 5, 4, 2, 0, 4, 7];
  notes.forEach((n, i) =>
    tweens
      .wait(seqCtx, i * 0.28)
      .then(() => {
        board.pressKey(n);
        board.setLed('note');
        sound.play('note', { freq: board.pianoKeys[n].userData.pick.freq });
      })
      .catch(() => {})
  );
}

function pressDpadSequence() {
  const seq = ['up', 'right', 'right', 'down', 'left'];
  seq.forEach((k, i) =>
    tweens
      .wait(seqCtx, i * 0.45)
      .then(() => {
        board.pressButton(board.dpad[k]);
        emit(k);
      })
      .catch(() => {})
  );
}

// floating labels ------------------------------------------------------------
const tagItems = [];
function clearTags() {
  tagItems.length = 0;
  dom.tags.innerHTML = '';
}
function setTags(list) {
  clearTags();
  list.forEach((t) => {
    const el = document.createElement('span');
    el.className = 'tag' + (t.cls ? ' ' + t.cls : '');
    el.textContent = t.text;
    dom.tags.appendChild(el);
    tagItems.push({ ...t, el });
    requestAnimationFrame(() => el.classList.add('is-on'));
  });
}
function showPadTags() {
  const names = { up: '↑ yukarı', down: '↓ aşağı', left: '← sol', right: '→ sağ', gnd: 'GND', space: 'Space', enter: 'Enter', click: 'Sol tık', rclick: 'Sağ tık', gnd2: 'GND' };
  setTags([...PADS_LEFT, ...PADS_RIGHT].map((k) => ({ pos: padTop(k).add(new THREE.Vector3(0, 0.05, 0)), text: names[k], cls: 'tag--key', dx: PADS_LEFT.includes(k) ? -66 : 66 })));
}
function showPinTags() {
  const list = board.parts.pins.userData.labels.map((l) => ({ pos: l.pos, text: l.label, dy: 34 }));
  list.push({ pos: board.positions.dpad, text: 'Yön tuşları', dy: -30 });
  list.push({ pos: board.positions.xy, text: 'X · Y', dy: -30 });
  setTags(list);
}
function updateTags() {
  const r = canvas.getBoundingClientRect();
  for (const t of tagItems) {
    tmpV.copy(t.pos).project(camera);
    const behind = tmpV.z > 1;
    const sx = r.left + ((tmpV.x + 1) / 2) * r.width + (t.dx || 0);
    const sy = r.top + ((1 - tmpV.y) / 2) * r.height + (t.dy || 0);
    // keep labels out of the hero copy / lesson panel column on wide screens
    const underCopy = r.width > 900 && sx > r.width * 0.68;
    t.el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`;
    t.el.style.visibility = behind || underCopy || state.uiHidden ? 'hidden' : 'visible';
  }
}

// camera ---------------------------------------------------------------------
let camCtx = null;
function focus(viewName, duration = 1.25) {
  const v = VIEWS[viewName] || VIEWS.overview;
  if (camCtx) camCtx.cancel();
  camCtx = { cancelled: false, cancel() { this.cancelled = true; } };
  const fromT = controls.target.clone();
  const fromP = camera.position.clone();
  const toT = new THREE.Vector3().fromArray(v.target);
  const dir = new THREE.Vector3().fromArray(v.pos).sub(toT);
  const toP = toT.clone().add(dir.multiplyScalar(api.fitFactor()));
  controls.enabled = false;
  return tweens
    .run(camCtx, state.reducedMotion ? 0.4 : duration, (t) => {
      controls.target.lerpVectors(fromT, toT, t);
      camera.position.lerpVectors(fromP, toP, t);
    }, Ease.inOutCubic)
    .then(() => (controls.enabled = true))
    .catch(() => (controls.enabled = true));
}

// ---------------------------------------------------------------------------
// Chapters
// ---------------------------------------------------------------------------

const ctx = {
  get board() { return board; },
  monitor, tweens, sound, later, focus, touch, touchAll, attachWires, unplug, plugIn, pulsePads, ledShow, playMelody, pressDpadSequence,
  showPadTags, showPinTags, clearTags, setGnd, toast, state,
  get objects() { return objects; },
  goStep: (i) => goStep(i),
};

STEPS.forEach((s, i) => {
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<span>${s.label}</span>`;
  b.title = `${String(i + 1).padStart(2, '0')} · ${s.label}`;
  b.addEventListener('click', () => goStep(i));
  li.appendChild(b);
  dom.dots.appendChild(li);
});

let autoplayTimer = 0;
let autoActDone = false;
function goStep(i) {
  const n = STEPS.length;
  i = ((i % n) + n) % n;
  state.step = i;
  const s = STEPS[i];
  newSeq();
  clearTags();
  if (i !== 0) board.plug.position.z = board.PLUG_IN;
  dom.count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
  dom.title.textContent = s.title;
  dom.text.innerHTML = s.body;
  dom.action.hidden = !s.action;
  dom.action.textContent = s.action || '';
  dom.action2.hidden = !s.action2;
  dom.action2.textContent = s.action2 || '';
  dom.lesson.scrollTop = 0;
  dom.dots.querySelectorAll('button').forEach((b, k) => (k === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
  dom.prev.disabled = false;
  dom.next.textContent = i === n - 1 ? 'Başa dön' : 'Sonraki →';
  focus(s.focus);
  s.enter?.(ctx);
  autoplayTimer = 0;
  autoActDone = false;
}
function act(which) {
  const s = STEPS[state.step];
  sound.unlock();
  sound.play('click');
  if (which === 2) s.act2?.(ctx);
  else s.act?.(ctx);
}
function updateAutoplay(dt) {
  if (!state.autoplay) return;
  autoplayTimer += dt;
  const s = STEPS[state.step];
  if (!autoActDone && autoplayTimer > 3.2) {
    autoActDone = true;
    if (s.autoAct !== false && s.act) s.act(ctx);
  }
  if (autoplayTimer > 10) goStep(state.step + 1);
}

// ---------------------------------------------------------------------------
// Pointer & keyboard
// ---------------------------------------------------------------------------

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const pointerInfo = { over: false, down: null, moved: false, x: 0, y: 0 };
let hovered = null;
let hoverPoint = new THREE.Vector3();

function pickables() {
  const list = [...board.pickables, ...wristband.userData.picks, ...book.userData.picks, ...monitor.group.userData.picks];
  objects.forEach((o) => list.push(...o.userData.picks));
  return list;
}
function updatePointer(e) {
  const r = canvas.getBoundingClientRect();
  pointerInfo.x = e.clientX;
  pointerInfo.y = e.clientY;
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  pointerInfo.over = true;
}
canvas.addEventListener('pointermove', (e) => {
  updatePointer(e);
  if (pointerInfo.down && Math.hypot(e.clientX - pointerInfo.down.x, e.clientY - pointerInfo.down.y) > 7) {
    pointerInfo.moved = true;
    canvas.classList.add('is-dragging');
  }
});
canvas.addEventListener('pointerleave', () => {
  pointerInfo.over = false;
  setHovered(null);
});
canvas.addEventListener('pointerdown', (e) => {
  updatePointer(e);
  pointerInfo.down = { x: e.clientX, y: e.clientY, t: performance.now() };
  pointerInfo.moved = false;
});
window.addEventListener('pointerup', (e) => {
  canvas.classList.remove('is-dragging');
  const down = pointerInfo.down;
  pointerInfo.down = null;
  if (!down || pointerInfo.moved || performance.now() - down.t > 600) return;
  if (e.target !== canvas) return;
  updatePointer(e);
  const hit = pick();
  sound.unlock();
  if (hit) activate(hit.pick);
});

function pick() {
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pickables(), false)[0];
  if (!hit) return null;
  hoverPoint.copy(hit.point);
  return { pick: hit.object.userData.pick, point: hit.point };
}

function labelFor(p) {
  switch (p.type) {
    case 'object': {
      const o = objectFor(p.id);
      return `${o.userData.def.name} <em>· ${KEYS[o.userData.def.key].label} tuşu</em>`;
    }
    case 'pad':
      return p.key.startsWith('gnd') ? 'GND pedi <em>· devreyi tamamlar</em>' : `${KEYS[p.key].name} pedi <em>· ${KEYS[p.key].label}</em>`;
    case 'piano':
      return `Dokunmatik piyano <em>· ${p.note}</em>`;
    case 'dpad':
      return `Yön tuşu <em>· ${KEYS[p.key].label}</em>`;
    case 'fn':
      return `${p.key} fonksiyon tuşu`;
    case 'gnd':
      return `GND bilekliği <em>· tıkla: ${state.gnd ? 'çıkar' : 'tak'}</em>`;
    case 'book':
      return 'Etkinlik kitabı <em>· 12 macera</em>';
    case 'monitor':
      return 'Bilgisayar <em>· Patara’yı klavye sanıyor</em>';
    case 'foot':
      return p.key === 'mouse' ? 'Fare pinleri <em>· fare yönü, jumper ile</em>' : p.key === 'ground' ? 'GND pinleri <em>· çoklu toprak</em>' : 'W A S D pinleri <em>· jumper ile</em>';
    default:
      return '';
  }
}

function activate(p) {
  switch (p.type) {
    case 'object':
      touch(p.id);
      break;
    case 'pad':
      if (p.key.startsWith('gnd')) {
        toast('GND pedi: kıskacın bir ucu burada, öbürü sende.');
        board.pressPad(p.key);
      } else if (!state.gnd) {
        sound.play('buzz');
        board.setLed('x', true);
        toast('Pede dokundun ama GND yok: devre açık.', { warn: true });
      } else {
        emit(p.key);
      }
      break;
    case 'piano':
      board.pressKey(p.index);
      board.setLed('note');
      sound.play('note', { freq: p.freq });
      break;
    case 'dpad':
      board.pressButton(board.dpad[p.key]);
      emit(p.key);
      break;
    case 'fn':
      board.pressButton(p.key === 'X' ? board.btnX : board.btnY);
      board.setLed(p.key === 'X' ? 'x' : 'check', p.key === 'X');
      sound.play('click');
      toast(`${p.key} fonksiyon tuşu: kartın kendi tuşu, kıskaç gerekmez.`);
      break;
    case 'gnd':
      setGnd(!state.gnd);
      break;
    case 'book':
      goStep(6);
      break;
    case 'monitor':
      toast('Bilgisayar yalnızca tuşları görür: Patara ona sıradan bir klavye gibi görünür.');
      break;
    case 'foot':
      goStep(5);
      break;
    default:
      break;
  }
}

function setHovered(h) {
  const same = hovered && h && hovered.type === h.type && hovered.id === h.id && hovered.key === h.key && hovered.index === h.index;
  if (same) return;
  hovered = h;
  if (h) {
    canvas.classList.add('is-hovering');
    dom.hover.innerHTML = labelFor(h);
    dom.hover.hidden = false;
  } else {
    canvas.classList.remove('is-hovering');
    dom.hover.hidden = true;
  }
}

window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const onField = e.target instanceof HTMLElement && e.target.matches('input, select, textarea');
  if (onField) return;
  const onButton = e.target instanceof HTMLElement && e.target.matches('button, a');
  const keyObj = { w: 'up', s: 'down', a: 'left', d: 'right' }[e.key.toLowerCase()];
  if (keyObj) {
    e.preventDefault();
    const o = objectForKey(keyObj);
    if (o) touch(o.userData.def.id, 'keyboard');
    return;
  }
  switch (e.key) {
    case 'ArrowRight':
      e.preventDefault();
      goStep(state.step + 1);
      break;
    case 'ArrowLeft':
      e.preventDefault();
      goStep(state.step - 1);
      break;
    case ' ': {
      if (onButton) return;
      e.preventDefault();
      const o = objectForKey('space');
      if (o) touch(o.userData.def.id, 'keyboard');
      break;
    }
    case 'Enter':
      if (onButton) return;
      e.preventDefault();
      act(1);
      break;
    case 'g':
    case 'G':
      setGnd(!state.gnd);
      break;
    case 'm':
    case 'M':
      setToggle('sound', !state.sound);
      break;
    case 'o':
    case 'O':
      setToggle('autoplay', !state.autoplay);
      break;
    case 'r':
    case 'R':
      monitor.reset();
      toast('Oyun sıfırlandı.');
      break;
    case 'h':
    case 'H':
      setUiHidden(!state.uiHidden);
      break;
    case 'Escape':
      if (state.uiHidden) setUiHidden(false);
      break;
    default:
      return;
  }
});

// ---------------------------------------------------------------------------
// UI wiring
// ---------------------------------------------------------------------------

function setSet(name) {
  state.set = name;
  document.querySelectorAll('[data-set]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.set === name)));
  buildObjects(name);
  attachWires(true);
  persist();
}
function setToggle(name, on) {
  state[name] = on;
  const b = document.querySelector(`[data-toggle="${name}"]`);
  if (b) b.setAttribute('aria-pressed', String(on));
  if (name === 'sound') {
    sound.unlock();
    sound.setEnabled(on);
    if (on) sound.play('click');
  }
  if (name === 'autoplay') {
    autoplayTimer = 0;
    autoActDone = false;
    if (on) sound.unlock();
  }
}
function setUiHidden(hidden) {
  state.uiHidden = hidden;
  document.body.classList.toggle('ui-hidden', hidden);
  dom.showUi.hidden = !hidden;
  if (hidden) setHovered(null);
}
function refreshA11y() {
  dom.a11y.innerHTML = '';
  objects.forEach((o) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `${o.userData.def.name} nesnesine dokun (${KEYS[o.userData.def.key].name})`;
    b.addEventListener('click', () => touch(o.userData.def.id));
    dom.a11y.appendChild(b);
  });
}

document.querySelectorAll('[data-set]').forEach((b) =>
  b.addEventListener('click', () => {
    sound.unlock();
    sound.play('click');
    setSet(b.dataset.set);
  })
);
document.querySelectorAll('[data-toggle]').forEach((b) =>
  b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    if (b.dataset.toggle === 'gnd') {
      sound.unlock();
      setGnd(on);
    } else setToggle(b.dataset.toggle, on);
  })
);
dom.prev.addEventListener('click', () => goStep(state.step - 1));
dom.next.addEventListener('click', () => goStep(state.step + 1));
dom.action.addEventListener('click', () => act(1));
dom.action2.addEventListener('click', () => act(2));
dom.collapse.addEventListener('click', () => {
  const collapsed = dom.lesson.classList.toggle('is-collapsed');
  dom.collapse.textContent = collapsed ? 'Aç' : 'Küçült';
  dom.collapse.setAttribute('aria-expanded', String(!collapsed));
});
dom.hideUi.addEventListener('click', () => setUiHidden(true));
dom.showUi.addEventListener('click', () => setUiHidden(false));
reducedMotionQuery.addEventListener?.('change', (e) => {
  state.reducedMotion = e.matches;
  tweens.timeScale = e.matches ? 0.7 : 1;
});

// ---------------------------------------------------------------------------
// Boot & frame loop
// ---------------------------------------------------------------------------

function resize() {
  api.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
let time = 0;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  time += dt;
  tweens.update(dt);
  board.update(dt);
  wires.forEach((w) => w.update(dt));
  gndWire.update(dt);
  monitor.update(dt);
  updateAutoplay(dt);

  for (const o of objects) {
    const u = o.userData;
    u.squash = Math.max(0, u.squash - dt * 2.4);
    const s = 1 - u.squash * 0.35;
    o.scale.set(1 + u.squash * 0.15, s, 1 + u.squash * 0.15);
    if (u.shake > 0) {
      u.shake -= dt;
      o.position.x = u.def.pos[0] + Math.sin(time * 60) * 0.03 * u.shake;
    } else o.position.x = u.def.pos[0];
  }
  if (touchRing.visible) {
    touchRing.userData.t += dt * 2.2;
    const t = touchRing.userData.t;
    if (t >= 1) touchRing.visible = false;
    else {
      const s = 0.4 + t * 1.4;
      touchRing.scale.set(s, s, 1);
      touchRing.material.opacity = 1 - t;
    }
  }

  // hover
  if (pointerInfo.over && !pointerInfo.down && !state.uiHidden) {
    const hit = pick();
    setHovered(hit ? hit.pick : null);
  } else if (!pointerInfo.over) setHovered(null);
  if (hovered && !dom.hover.hidden) {
    tmpV.copy(hoverPoint).project(camera);
    const r = canvas.getBoundingClientRect();
    dom.hover.style.transform = `translate(${r.left + ((tmpV.x + 1) / 2) * r.width}px, ${r.top + ((1 - tmpV.y) / 2) * r.height - 16}px) translate(-50%, -100%)`;
  }
  updateTags();
  controls.update();
  renderer.render(scene, camera);
}

async function boot() {
  const fontsReady = document.fonts?.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
  const art = await loadArtwork(setLoading);
  await fontsReady;
  board = createBoard(art);
  scene.add(board.group);
  setLoading(0.65, 'Kıskaçlar takılıyor…');
  buildObjects(state.set);
  setLoading(0.8, 'Masa hazırlanıyor…');
  document.querySelectorAll('[data-set]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.set === state.set)));
  setToggle('sound', false);
  setToggle('autoplay', false);
  updateGndWire(false);
  if (window.matchMedia('(pointer: coarse)').matches) dom.hint.innerHTML = '<span class="hint__key">İpucu</span> Dokunmak için nesnelere dokun.';
  controls.target.fromArray(VIEWS.wide.target);
  camera.position.copy(controls.target).add(new THREE.Vector3().fromArray(VIEWS.wide.pos).sub(controls.target).multiplyScalar(api.fitFactor()));
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  setLoading(1, 'Hazır.');
  frame();
  goStep(0);
  window.__patara = { state, board, monitor, objects: () => objects, touch, goStep, setGnd, camera, controls, get time() { return time; } };
  requestAnimationFrame(() => {
    dom.loading.classList.add('is-done');
    if (state.reducedMotion) toast('Azaltılmış hareket açık: daha sakin animasyonlar.', { ms: 3200 });
  });
}

boot().catch((err) => {
  console.error(err);
  setLoading(1, 'Bir şeyler ters gitti. Lütfen sayfayı yenileyin.');
});
