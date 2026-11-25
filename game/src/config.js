// Every tuning number, colour, dish and station in one place. The kitchen is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below depends
// on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Length of one shift, in seconds. */
export const SHIFT_SECONDS = 150;

export const CHEF = { speed: 430, y: 408, radius: 34 };
export const HEARTS = 3;
export const MAX_ORDERS = 3;

/** How close (in px, by x) the chef must stand to use a station. */
export const NEAR = 78;

/** Prep stages, in order. An ingredient's final stage is the last entry of its chain. */
export const STAGES = ['raw', 'chopped', 'cooked'];

/** Each ingredient: colour, prep chain (stages after raw), and a short label. */
export const INGREDIENTS = {
  tomato: { name: 'Tomato', color: '#e5534b', dark: '#a8322b', chain: ['chopped', 'cooked'] },
  onion: { name: 'Onion', color: '#c9a0dc', dark: '#8a5fa8', chain: ['chopped', 'cooked'] },
  bread: { name: 'Bread', color: '#d9a05b', dark: '#9c6b2e', chain: [] },
  cheese: { name: 'Cheese', color: '#f2c94c', dark: '#b8932a', chain: ['chopped'] },
  mushroom: { name: 'Mushroom', color: '#d8b596', dark: '#8a5a3a', chain: ['chopped', 'cooked'] },
  herb: { name: 'Herb', color: '#58b368', dark: '#2f7a3e', chain: ['chopped'] },
};
export const ING_ORDER = ['tomato', 'onion', 'bread', 'cheese', 'mushroom', 'herb'];

/** The menu: every dish is 3 ingredients at their final stage, with its coin value. */
export const DISHES = [
  {
    name: 'Sunny Tomato Soup',
    coins: 18,
    needs: [
      { ing: 'tomato', stage: 'cooked' },
      { ing: 'onion', stage: 'cooked' },
      { ing: 'herb', stage: 'chopped' },
    ],
  },
  {
    name: 'Mushroom Melt',
    coins: 16,
    needs: [
      { ing: 'bread', stage: 'raw' },
      { ing: 'cheese', stage: 'chopped' },
      { ing: 'mushroom', stage: 'cooked' },
    ],
  },
  {
    name: 'Garden Stack',
    coins: 14,
    needs: [
      { ing: 'bread', stage: 'raw' },
      { ing: 'tomato', stage: 'chopped' },
      { ing: 'cheese', stage: 'chopped' },
    ],
  },
  {
    name: 'Forest Stew',
    coins: 18,
    needs: [
      { ing: 'mushroom', stage: 'cooked' },
      { ing: 'onion', stage: 'cooked' },
      { ing: 'herb', stage: 'chopped' },
    ],
  },
  {
    name: 'Cheesy Tomato Toast',
    coins: 16,
    needs: [
      { ing: 'bread', stage: 'raw' },
      { ing: 'tomato', stage: 'cooked' },
      { ing: 'cheese', stage: 'chopped' },
    ],
  },
];

/** Stations, left to right. Bins, board and stove sit on the back counter; the plate
 * station and the serve window sit on the front counter. The chef walks the aisle
 * between them, so a station is used by standing under it. */
export const STATIONS = [
  { id: 'tomato', kind: 'bin', ing: 'tomato', x: 100, key: '1' },
  { id: 'onion', kind: 'bin', ing: 'onion', x: 240, key: '2' },
  { id: 'bread', kind: 'bin', ing: 'bread', x: 380, key: '3' },
  { id: 'cheese', kind: 'bin', ing: 'cheese', x: 520, key: '4' },
  { id: 'mushroom', kind: 'bin', ing: 'mushroom', x: 660, key: '5' },
  { id: 'herb', kind: 'bin', ing: 'herb', x: 800, key: '6' },
  { id: 'board', kind: 'board', x: 950, key: 'Space' },
  { id: 'stove', kind: 'stove', x: 1110, key: 'Space' },
  { id: 'plate', kind: 'plate', x: 330, key: 'Space' },
  { id: 'serve', kind: 'serve', x: 1000, key: 'Enter' },
];

export const CHOP_SECONDS = 1.0;
export const COOK_SECONDS = 2.0;
export const ORDER_PATIENCE = 70;
export const ORDER_SPAWN_FIRST = 2;
export const ORDER_SPAWN_EVERY = 16;
export const ORDER_SPAWN_MIN = 11;

export const PALETTE = {
  wall: '#f3ddba',
  wallTrim: '#e0bd85',
  floor: '#b97e4e',
  floorDark: '#a96f42',
  board: '#5d3a1e',
  boardEdge: '#7a4e28',
  ticket: '#fff8e7',
  ticketEdge: '#d9c48f',
  counter: '#8a5a33',
  counterTop: '#a9713f',
  counterFront: '#6e4525',
  steel: '#c9ced6',
  steelDark: '#9aa1ad',
  text: '#2b1d12',
  muted: '#7a6a58',
  cream: '#fff3dd',
  timerGood: '#2f7a3e',
  timerWarn: '#c77f1a',
  timerBad: '#c0392b',
  gold: '#f2c94c',
  heart: '#e5534b',
  heartEmpty: '#cbb9a6',
  panel: '#2b1d12',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'copper-ladle-kitchen.best';
