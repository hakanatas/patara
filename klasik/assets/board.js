/* Patara Board — stylised SVG renderer.
   Usage: const api = PataraBoard.render(container); api.setLed(pattern); api.press('up'); api.highlight('matrix'); */
(function () {
  const PADS_LEFT  = [['up', '↑'], ['down', '↓'], ['left', '←'], ['right', '→'], ['gnd', 'GND']];
  const PADS_RIGHT = [['space', 'SPACE'], ['enter', 'ENTER'], ['click', 'CLICK'], ['rclick', 'R.CLK'], ['gnd2', 'GND']];
  const PIN_GROUPS = [['MOUSE', 4], ['GND', 4], ['W A S D', 4]];

  const PATTERNS = {
    off:   ['.....', '.....', '.....', '.....', '.....'],
    up:    ['..#..', '.###.', '#.#.#', '..#..', '..#..'],
    down:  ['..#..', '..#..', '#.#.#', '.###.', '..#..'],
    left:  ['..#..', '.#...', '#####', '.#...', '..#..'],
    right: ['..#..', '...#.', '#####', '...#.', '..#..'],
    heart: ['.#.#.', '#####', '#####', '.###.', '..#..'],
    smile: ['.....', '.#.#.', '.....', '#...#', '.###.'],
    star:  ['..#..', '.###.', '#####', '.###.', '#...#'],
    check: ['.....', '....#', '...#.', '#.#..', '.#...'],
    x:     ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    note:  ['...#.', '...#.', '...#.', '.##..', '.##..'],
    full:  ['#####', '#####', '#####', '#####', '#####'],
  };

  function el(name, attrs, children) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    (children || []).forEach(c => n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return n;
  }

  function render(container, opts) {
    opts = opts || {};
    const svg = el('svg', { viewBox: '0 0 600 520', class: 'pboard', role: 'img', 'aria-label': 'Patara Board çizimi' });

    // defs: glow
    const defs = el('defs', {}, [
      el('filter', { id: 'pb-glow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, [
        el('feGaussianBlur', { stdDeviation: '4', result: 'b' }),
        el('feMerge', {}, [el('feMergeNode', { in: 'b' }), el('feMergeNode', { in: 'SourceGraphic' })]),
      ]),
    ]);
    svg.appendChild(defs);

    // USB
    const usb = el('g', { class: 'pb-part pb-usb', 'data-part': 'usb' }, [
      el('rect', { x: 262, y: 22, width: 76, height: 52, rx: 10, class: 'pb-usb-shell' }),
      el('rect', { x: 278, y: 34, width: 44, height: 20, rx: 4, class: 'pb-usb-slot' }),
    ]);

    // Arms
    const arms = el('g', { class: 'pb-part pb-arms', 'data-part': 'arms' });
    arms.appendChild(el('rect', { x: 18, y: 150, width: 140, height: 300, rx: 34, class: 'pb-arm' }));
    arms.appendChild(el('rect', { x: 442, y: 150, width: 140, height: 300, rx: 34, class: 'pb-arm' }));
    const pads = {};
    const makePad = (x, y, key, label) => {
      const g = el('g', { class: 'pb-pad', 'data-key': key, transform: `translate(${x} ${y})` }, [
        el('circle', { r: 24, class: 'pb-pad-ring' }),
        el('circle', { r: 17, class: 'pb-pad-core' + (key.startsWith('gnd') ? ' pb-pad-gnd' : '') }),
        el('text', { y: label.length > 1 ? 3 : 7, class: 'pb-pad-lbl' + (label.length > 1 ? ' small' : ''), 'text-anchor': 'middle' }, [label]),
      ]);
      pads[key] = g;
      arms.appendChild(g);
    };
    PADS_LEFT.forEach(([k, l], i) => makePad(88, 195 + i * 56, k, l));
    PADS_RIGHT.forEach(([k, l], i) => makePad(512, 195 + i * 56, k, l));

    // Body
    const body = el('g', { class: 'pb-body-g' }, [
      el('rect', { x: 140, y: 70, width: 320, height: 390, rx: 40, class: 'pb-body' }),
      el('rect', { x: 152, y: 82, width: 296, height: 366, rx: 32, class: 'pb-body-inner' }),
      // corner holes
      ...[[162, 92], [438, 92], [162, 438], [438, 438]].map(([x, y]) => el('circle', { cx: x, cy: y, r: 5, class: 'pb-hole' })),
      el('text', { x: 300, y: 104, class: 'pb-logo', 'text-anchor': 'middle' }, ['PATARA']),
    ]);

    // Matrix
    const matrix = el('g', { class: 'pb-part pb-matrix', 'data-part': 'matrix' });
    matrix.appendChild(el('rect', { x: 218, y: 112, width: 164, height: 164, rx: 14, class: 'pb-matrix-bg' }));
    const leds = [];
    for (let r = 0; r < 5; r++) {
      leds[r] = [];
      for (let c = 0; c < 5; c++) {
        const led = el('rect', { x: 230 + c * 30, y: 124 + r * 30, width: 20, height: 20, rx: 5, class: 'pb-led' });
        matrix.appendChild(led);
        leds[r][c] = led;
      }
    }

    // Piano
    const piano = el('g', { class: 'pb-part pb-piano', 'data-part': 'piano' });
    piano.appendChild(el('rect', { x: 168, y: 290, width: 264, height: 74, rx: 10, class: 'pb-piano-bg' }));
    const keys = [];
    for (let i = 0; i < 8; i++) {
      const k = el('rect', { x: 176 + i * 32, y: 298, width: 26, height: 58, rx: 5, class: 'pb-key' });
      piano.appendChild(k);
      keys.push(k);
    }

    // Function + direction buttons
    const func = el('g', { class: 'pb-part pb-func', 'data-part': 'func' });
    const dpad = [[0, -1, 'up'], [0, 1, 'down'], [-1, 0, 'left'], [1, 0, 'right']];
    dpad.forEach(([dx, dy, k]) => {
      func.appendChild(el('rect', { x: 210 + dx * 22 - 9, y: 400 + dy * 22 - 9, width: 18, height: 18, rx: 4, class: 'pb-dbtn', 'data-dkey': k }));
    });
    func.appendChild(el('rect', { x: 201, y: 391, width: 18, height: 18, rx: 4, class: 'pb-dbtn pb-dbtn-center' }));
    func.appendChild(el('circle', { cx: 350, cy: 400, r: 17, class: 'pb-fbtn pb-fbtn-x' }));
    func.appendChild(el('text', { x: 350, y: 406, class: 'pb-fbtn-lbl', 'text-anchor': 'middle' }, ['X']));
    func.appendChild(el('circle', { cx: 400, cy: 400, r: 17, class: 'pb-fbtn pb-fbtn-y' }));
    func.appendChild(el('text', { x: 400, y: 406, class: 'pb-fbtn-lbl', 'text-anchor': 'middle' }, ['Y']));

    // Bottom pins
    const pins = el('g', { class: 'pb-part pb-pins', 'data-part': 'pins' });
    pins.appendChild(el('rect', { x: 168, y: 428, width: 264, height: 22, rx: 6, class: 'pb-pins-bg' }));
    let px = 178;
    PIN_GROUPS.forEach(([label, n], gi) => {
      for (let i = 0; i < n; i++) {
        pins.appendChild(el('rect', { x: px, y: 434, width: 7, height: 10, rx: 1.5, class: 'pb-pin' }));
        px += 14;
      }
      pins.appendChild(el('text', { x: px - n * 7 - 4, y: 466, class: 'pb-pin-lbl', 'text-anchor': 'middle' }, [label]));
      px += 30;
    });

    [usb, arms, body, matrix, piano, func, pins].forEach(g => svg.appendChild(g));
    container.innerHTML = '';
    container.appendChild(svg);

    const api = {
      svg, pads, leds, keys,
      setLed(name, cls) {
        const p = typeof name === 'string' ? PATTERNS[name] || PATTERNS.off : name;
        for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
          const on = p[r][c] === '#';
          leds[r][c].classList.toggle('on', on);
          leds[r][c].classList.toggle('alt', on && cls === 'alt');
        }
      },
      press(key, ms) {
        const g = pads[key];
        if (!g) return;
        g.classList.add('active');
        clearTimeout(g._t);
        g._t = setTimeout(() => g.classList.remove('active'), ms || 500);
      },
      pressKey(i, ms) {
        const k = keys[i];
        if (!k) return;
        k.classList.add('active');
        clearTimeout(k._t);
        k._t = setTimeout(() => k.classList.remove('active'), ms || 300);
      },
      highlight(part) {
        svg.querySelectorAll('.pb-part').forEach(p => p.classList.toggle('hl', p.dataset.part === part));
        svg.classList.toggle('dim', !!part);
      },
      patterns: PATTERNS,
    };
    if (opts.led) api.setLed(opts.led);
    return api;
  }

  window.PataraBoard = { render, PATTERNS };
})();
