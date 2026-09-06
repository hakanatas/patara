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
  led: '#ffd23f',
  ledWarm: '#ff7a59',
  ledOff: '#1b2431',
  matrixBg: '#0e141c',
  paper: '#fbf5ea',
  metal: '#b9bfc9',
  metalDark: '#5b6270',
  white: '#fbf8f2',
};

/** Keys a pad can emit, with UI labels. */
export const KEYS = {
  up: { label: '↑', name: 'Yukarı ok' },
  down: { label: '↓', name: 'Aşağı ok' },
  left: { label: '←', name: 'Sol ok' },
  right: { label: '→', name: 'Sağ ok' },
  space: { label: 'Space', name: 'Boşluk' },
  enter: { label: 'Enter', name: 'Enter' },
  click: { label: 'Click', name: 'Sol tık' },
  rclick: { label: 'R.Click', name: 'Sağ tık' },
  gnd: { label: 'GND', name: 'Toprak (GND)' },
  gnd2: { label: 'GND', name: 'Toprak (GND)' },
};

export const PADS_LEFT = ['space', 'enter', 'click', 'rclick', 'gnd'];
export const PADS_RIGHT = ['up', 'down', 'left', 'right', 'gnd2'];

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
    { id: 'muz', name: 'Muz', key: 'up', kind: 'banana', pos: [3.1, 0, -1.05] },
    { id: 'elma', name: 'Elma', key: 'down', kind: 'apple', pos: [3.25, 0, 0.3] },
    { id: 'hamur', name: 'Oyun hamuru', key: 'left', kind: 'dough', pos: [2.9, 0, 1.5], color: '#7cc47f' },
    { id: 'kasik', name: 'Kaşık', key: 'right', kind: 'spoon', pos: [2.15, 0, 2.5] },
    { id: 'kalem', name: 'Kalem çizgisi', key: 'space', kind: 'pencil', pos: [-1.35, 0, 2.55] },
  ],
  kirtasiye: [
    { id: 'folyo', name: 'Alüminyum folyo', key: 'up', kind: 'foil', pos: [3.1, 0, -1.05] },
    { id: 'para', name: 'Madeni para', key: 'down', kind: 'coin', pos: [3.25, 0, 0.3] },
    { id: 'anahtar', name: 'Anahtar', key: 'left', kind: 'key', pos: [2.9, 0, 1.5] },
    { id: 'hamur2', name: 'Oyun hamuru', key: 'right', kind: 'dough', pos: [2.15, 0, 2.5], color: '#e6a3c6' },
    { id: 'kalem2', name: 'Kalem çizgisi', key: 'space', kind: 'pencil', pos: [-1.35, 0, 2.55] },
  ],
};

/** Camera presets used by the chapters. */
export const VIEWS = {
  overview: { target: [0.9, 0.25, 0.3], pos: [2.5, 5.9, 8.6] },
  usb: { target: [0.1, 0.2, -1.0], pos: [1.7, 4.2, 4.4] },
  objects: { target: [1.6, 0.25, 0.8], pos: [3.0, 5.4, 7.6] },
  arms: { target: [1.3, 0.12, 0.1], pos: [2.5, 3.5, 4.2] },
  body: { target: [0, 0.12, -0.15], pos: [0.4, 4.6, 4.6] },
  bottom: { target: [0.05, 0.1, 0.75], pos: [0.5, 4.2, 5.8] },
  monitor: { target: [1.3, 0.55, -2.0], pos: [3.0, 4.0, 3.6] },
  book: { target: [3.3, 0.15, -2.4], pos: [4.6, 3.8, 2.6] },
  wide: { target: [0.9, 0.3, 0.1], pos: [3.3, 6.8, 10.0] },
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
