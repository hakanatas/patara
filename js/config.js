/** Shared palette, layout and content constants for the Patara Board scene. */

export const PALETTE = {
  cream: '#f5eee3',
  creamDeep: '#ecdfcc',
  mat: '#e9dcc6',
  ink: '#2b211b',
  terracotta: '#c4623d',
  terracottaDeep: '#9c472a',
  moss: '#1d5c4b',
  mossDeep: '#154538',
  gold: '#d9b25a',
  goldDeep: '#a8843a',
  led: '#ff3b2f',
  ledWarm: '#ffd23f',
  ledOff: '#4a3410',
  matrixBg: '#0e141c',
  paper: '#fbf5ea',
  metal: '#b9bfc9',
  metalDark: '#5b6270',
  white: '#fbf8f2',
};

/** Keys a pad can emit, with UI labels. */
export const KEYS = {
  up: { label: '↑', short: 'UP', name: 'Yukarı ok' },
  down: { label: '↓', short: 'DOWN', name: 'Aşağı ok' },
  left: { label: '←', short: 'LEFT', name: 'Sol ok' },
  right: { label: '→', short: 'RIGHT', name: 'Sağ ok' },
  space: { label: 'Space', short: 'SPACE', name: 'Boşluk' },
  enter: { label: 'Enter', short: 'ENTER', name: 'Enter' },
  click: { label: 'L.Click', short: 'L.CLICK', name: 'Sol tık' },
  rclick: { label: 'R.Click', short: 'R.CLICK', name: 'Sağ tık' },
  gnd: { label: 'GND', short: 'GND', name: 'Toprak (GND)' },
  gnd2: { label: 'GND', short: 'GND', name: 'Toprak (GND)' },
};

/** Pads from the shell outwards to the arm tip. */
export const PADS_LEFT = ['gnd', 'down', 'right', 'left', 'up'];
export const PADS_RIGHT = ['gnd2', 'enter', 'rclick', 'click', 'space'];

export const WIRE_COLORS = {
  up: '#c4623d',
  down: '#5b7c99',
  left: '#d9a441',
  right: '#4f9a7a',
  space: '#8a5ba8',
  gnd: '#3a2f28',
};

/** Two sets of conductive objects that sit around the board. */
export const OBJECT_SETS = {
  mutfak: [
    { id: 'muz', name: 'Muz', key: 'up', kind: 'banana', pos: [-2.9, 0, -2.75] },
    { id: 'elma', name: 'Elma', key: 'left', kind: 'apple', pos: [-3.55, 0, -1.6] },
    { id: 'hamur', name: 'Oyun hamuru', key: 'right', kind: 'dough', pos: [-3.65, 0, -0.1], color: '#7cc47f' },
    { id: 'kasik', name: 'Kaşık', key: 'down', kind: 'spoon', pos: [-3.3, 0, 1.4] },
    { id: 'kalem', name: 'Kalem çizgisi', key: 'space', kind: 'pencil', pos: [3.0, 0, 0.7] },
  ],
  kirtasiye: [
    { id: 'folyo', name: 'Alüminyum folyo', key: 'up', kind: 'foil', pos: [-2.9, 0, -2.75] },
    { id: 'para', name: 'Madeni para', key: 'left', kind: 'coin', pos: [-3.55, 0, -1.6] },
    { id: 'anahtar', name: 'Anahtar', key: 'right', kind: 'key', pos: [-3.65, 0, -0.1] },
    { id: 'hamur2', name: 'Oyun hamuru', key: 'down', kind: 'dough', pos: [-3.3, 0, 1.4], color: '#e6a3c6' },
    { id: 'kalem2', name: 'Kalem çizgisi', key: 'space', kind: 'pencil', pos: [3.0, 0, 0.7] },
  ],
};

/** Camera presets used by the chapters. */
export const VIEWS = {
  overview: { target: [-0.3, 0.3, -0.6], pos: [1.2, 6.8, 8.8] },
  usb: { target: [0, 0.2, -3.3], pos: [-1.3, 4.3, 1.2] },
  objects: { target: [-1.9, 0.25, -0.4], pos: [-3.4, 5.6, 7.2] },
  arms: { target: [-1.5, 0.1, -1.2], pos: [-2.5, 4.6, 4.1] },
  body: { target: [0, 0.1, -0.1], pos: [0.2, 4.9, 4.5] },
  bottom: { target: [0, 0.1, 1.0], pos: [0.3, 4.5, 6.1] },
  monitor: { target: [2.5, 0.55, -3.8], pos: [1.2, 4.3, 1.8] },
  book: { target: [3.8, 0.1, -1.6], pos: [2.7, 3.9, 3.5] },
  wide: { target: [-0.2, 0.3, -0.5], pos: [1.5, 7.8, 10.6] },
};

export const LED = {
  off: ['.....', '.....', '.....', '.....', '.....'],
  up: ['..#..', '.###.', '#.#.#', '..#..', '..#..'],
  down: ['..#..', '..#..', '#.#.#', '.###.', '..#..'],
  left: ['..#..', '.#...', '#####', '.#...', '..#..'],
  right: ['..#..', '...#.', '#####', '...#.', '..#..'],
  heart: ['.#.#.', '#####', '#####', '.###.', '..#..'],
  smile: ['.....', '.#.#.', '.....', '#...#', '.###.'],
  star: ['..#..', '.###.', '#####', '.###.', '#...#'],
  check: ['.....', '....#', '...#.', '#.#..', '.#...'],
  x: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  note: ['...#.', '...#.', '...#.', '.##..', '.##..'],
  space: ['.....', '.....', '.....', '#...#', '#####'],
  full: ['#####', '#####', '#####', '#####', '#####'],
  usb: ['..#..', '.###.', '..#..', '.###.', '.###.'],
};

export const ACTIVITIES = [
  [9, 'En Ünlü Gitarist'],
  [13, 'İletken mi, Yalıtkan mı?'],
  [16, 'Küçük Yol Bulucu'],
  [19, 'Patara ve Küçük Sincap'],
  [22, 'Patara ve Pataralar'],
  [25, "Gorki'nin Doğum Günü"],
  [28, 'Kâşif Patara ve Arkadaşları'],
  [32, 'Basketbolcu Patara'],
  [35, 'Patara ve Roby Plajda'],
  [38, 'Dansçı Patara'],
  [41, 'Güçlü Patara Kütüphanede'],
  [45, 'Koş Patara Koş'],
];

export const STORAGE_KEY = 'patara-board:v1';
