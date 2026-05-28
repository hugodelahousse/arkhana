
// ---------------------------------------------------------------------------
// Procgen Tarot – faithful TypeScript port of watabou's compiled JS
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// PRNG – Park-Miller LCG (global singleton, matches original's static seed)
// ---------------------------------------------------------------------------
class RNG {
  seed: number;

  constructor(seed: number) {
    this.seed = seed | 0;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  float(): number {
    this.seed = (this.seed * 48271.0) % 2147483647 | 0;
    return this.seed / 2147483647;
  }

  /** Bell curve 0..1 (average of 3 floats) */
  normal(): number {
    return (this.float() + this.float() + this.float()) / 3;
  }

  /** Bell curve -1..1 */
  normal2(): number {
    return this.normal() * 2 - 1;
  }

  /** Small positive values clustered near 0 */
  small(): number {
    return Math.abs(
      (this.float() + this.float() + this.float() + this.float()) / 2 - 1,
    );
  }

  int(min: number, max: number): number {
    return Math.floor(min + this.float() * (max - min));
  }

  int0(max: number): number {
    return Math.floor(this.float() * max);
  }

  bool(chance: number = 0.5): boolean {
    return this.float() < chance;
  }

  pick<T>(arr: T[]): T {
    return arr[this.int0(arr.length)];
  }
}

// ---------------------------------------------------------------------------
// Vec2 (matches openfl_geom_Point)
// ---------------------------------------------------------------------------
class Vec2 {
  constructor(
    public x: number = 0,
    public y: number = 0,
  ) {}

  add(v: Vec2): Vec2 {
    return new Vec2(this.x + v.x, this.y + v.y);
  }
  sub(v: Vec2): Vec2 {
    return new Vec2(this.x - v.x, this.y - v.y);
  }
  scale(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s);
  }
  dot(v: Vec2): number {
    return this.x * v.x + this.y * v.y;
  }
  cross(v: Vec2): number {
    return this.x * v.y - this.y * v.x;
  }
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /** Normalize in place and set to given length (matches openfl normalize) */
  normalize(len: number = 1): Vec2 {
    const l = this.length();
    if (l < 1e-9) return new Vec2(0, 0);
    return new Vec2((this.x / l) * len, (this.y / l) * len);
  }

  rotate(angle: number): Vec2 {
    const c = Math.cos(angle),
      s = Math.sin(angle);
    return new Vec2(this.x * c - this.y * s, this.y * c + this.x * s);
  }

  perpCCW(): Vec2 {
    return new Vec2(-this.y, this.x);
  }

  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  equals(v: Vec2): boolean {
    return this.x === v.x && this.y === v.y;
  }

  static polar(len: number, angle: number): Vec2 {
    return new Vec2(Math.cos(angle) * len, Math.sin(angle) * len);
  }

  static lerp(a: Vec2, b: Vec2, t: number): Vec2 {
    return new Vec2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }

  static dist(a: Vec2, b: Vec2): number {
    const dx = a.x - b.x,
      dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

// ---------------------------------------------------------------------------
// Field dimensions – original watabou values
// ---------------------------------------------------------------------------
const FIELD_WIDTH = 336;
const FIELD_HEIGHT = 558;
const FIELD_COLS = 18;
const FIELD_ROWS = 30;

// ---------------------------------------------------------------------------
// Field<T>
// ---------------------------------------------------------------------------
class Field<T> {
  values: T[][];

  constructor(defValue: T) {
    this.values = [];
    for (let i = 0; i < FIELD_ROWS; i++) {
      const row: T[] = [];
      for (let j = 0; j < FIELD_COLS; j++) {
        row.push(defValue);
      }
      this.values.push(row);
    }
  }

  /** Pixel coords to cell value (original: x / width * cols | 0) */
  get(p: Vec2): T {
    if (
      p.x >= 0 &&
      p.x < FIELD_WIDTH &&
      p.y >= 0 &&
      p.y < FIELD_HEIGHT
    ) {
      const x = (p.x / FIELD_WIDTH) * FIELD_COLS | 0;
      const y = (p.y / FIELD_HEIGHT) * FIELD_ROWS | 0;
      return this.values[y][x];
    }
    return this.values[0][0]; // defValue
  }

  set(p: Vec2, value: T): void {
    if (
      p.x >= 0 &&
      p.x < FIELD_WIDTH &&
      p.y >= 0 &&
      p.y < FIELD_HEIGHT
    ) {
      const x = (p.x / FIELD_WIDTH) * FIELD_COLS | 0;
      const y = (p.y / FIELD_HEIGHT) * FIELD_ROWS | 0;
      this.values[y][x] = value;
    }
  }

  /** Cell rectangle at column i, row j (matching original cell(i,j)) */
  cell(i: number, j: number): { x: number; y: number; w: number; h: number } {
    const cw = FIELD_WIDTH / FIELD_COLS;
    const ch = FIELD_HEIGHT / FIELD_ROWS;
    return { x: i * cw, y: j * ch, w: cw, h: ch };
  }

  /**
   * Cell center. Original: cellCenter(i, j) where i = column, j = row
   * Returns ((i+0.5)*cellWidth, (j+0.5)*cellHeight)
   */
  cellCenter(i: number, j: number): Vec2 {
    return new Vec2(
      (i + 0.5) * (FIELD_WIDTH / FIELD_COLS),
      (j + 0.5) * (FIELD_HEIGHT / FIELD_ROWS),
    );
  }

  fill(value: T): void {
    for (let i = 0; i < FIELD_ROWS; i++)
      for (let j = 0; j < FIELD_COLS; j++) this.values[i][j] = value;
  }
}

// ---------------------------------------------------------------------------
// PerlinNoise
// ---------------------------------------------------------------------------
const BASE_PERM = [
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140,
  36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120,
  234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
  88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71,
  134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133,
  230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161,
  1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130,
  116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250,
  124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227,
  47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44,
  154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98,
  108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34,
  242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14,
  239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121,
  50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243,
  141, 128, 195, 78, 66, 215, 61, 156, 180,
];

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}
function lerp1(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad2(hash: number, x: number, y: number): number {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return (h & 1 ? -u : u) + (h & 2 ? -v : v);
}

class PerlinNoise {
  private perm: number[];

  constructor(seed: number) {
    const offset = ((seed * 1234567) & 0x7fffffff) % 256;
    this.perm = [];
    for (let i = 0; i < 512; i++) {
      this.perm.push(BASE_PERM[(i + offset) & 255]);
    }
  }

  noise(x: number, y: number): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf),
      v = fade(yf);
    const aa = this.perm[this.perm[xi] + yi];
    const ab = this.perm[this.perm[xi] + yi + 1];
    const ba = this.perm[this.perm[xi + 1] + yi];
    const bb = this.perm[this.perm[xi + 1] + yi + 1];
    return lerp1(
      lerp1(grad2(aa, xf, yf), grad2(ba, xf - 1, yf), u),
      lerp1(grad2(ab, xf, yf - 1), grad2(bb, xf - 1, yf - 1), u),
      v,
    );
  }

  noiseMapHigh(w: number, h: number, octaves: number): number[][] {
    const map: number[][] = [];
    for (let y = 0; y < h; y++) {
      map.push([]);
      for (let x = 0; x < w; x++) {
        let v = 0,
          amp = 1,
          freq = 1,
          max = 0;
        for (let o = 0; o < octaves; o++) {
          v += this.noise((x * freq) / w, (y * freq) / h) * amp;
          max += amp;
          amp *= 0.5;
          freq *= 2;
        }
        map[y].push(v / max);
      }
    }
    return map;
  }
}

// ---------------------------------------------------------------------------
// Mask extends Field<boolean>
// ---------------------------------------------------------------------------
class Mask extends Field<boolean> {
  constructor() {
    super(false);
  }

  clone(): Mask {
    const m = new Mask();
    for (let r = 0; r < FIELD_ROWS; r++) m.values[r] = [...this.values[r]];
    return m;
  }

  /** Fill rows from level downward (level=-1 -> height/2) */
  land(level: number = -1): void {
    if (level < 0) level = FIELD_HEIGHT / 2;
    const row = (FIELD_ROWS * level / FIELD_HEIGHT) | 0;
    for (let i = row; i < FIELD_ROWS; i++)
      for (let j = 0; j < FIELD_COLS; j++) this.values[i][j] = true;
  }

  halfPlane(p: Vec2, d: Vec2): void {
    for (let i = 0; i < FIELD_ROWS; i++)
      for (let j = 0; j < FIELD_COLS; j++) {
        const c = this.cellCenter(j, i); // col j, row i
        const diff = c.sub(p);
        if (d.x * diff.x + d.y * diff.y > 0) {
          this.values[i][j] = true;
        }
      }
  }

  /** Additive ellipse (only sets true, never clears) */
  ellipse(c: Vec2, w: number, h: number = 0): void {
    const w2 = w * w;
    const h2 = h > 0 ? h * h : w2;
    for (let i = 0; i < FIELD_ROWS; i++)
      for (let j = 0; j < FIELD_COLS; j++) {
        const p = this.cellCenter(j, i).sub(c);
        if ((p.x * p.x) / w2 + (p.y * p.y) / h2 <= 1) {
          this.values[i][j] = true;
        }
      }
  }

  rect(c: Vec2, w: number, h: number = 0): void {
    for (let i = 0; i < FIELD_ROWS; i++)
      for (let j = 0; j < FIELD_COLS; j++) {
        const p = this.cellCenter(j, i).sub(c);
        if (Math.abs(p.x) < w && Math.abs(p.y) < h) {
          this.values[i][j] = true;
        }
      }
  }

  /** Binary-search perlin noise threshold (matches original) */
  perlin(ratio: number, rng: RNG): void {
    const noise = new PerlinNoise(Math.floor(rng.float() * 256));
    const octaves =
      (Math.log(Math.max(FIELD_COLS, FIELD_ROWS)) / Math.log(2)) | 0;
    const map = noise.noiseMapHigh(FIELD_COLS, FIELD_ROWS, octaves);

    let level: number;
    if (ratio < 0) {
      level = 0;
    } else {
      const target = (ratio * FIELD_COLS * FIELD_ROWS) | 0;
      let min = -1.0;
      let max = 1.0;
      while (max - min > 0.01) {
        const l = (min + max) / 2;
        let c = 0;
        for (let i = 0; i < FIELD_ROWS; i++)
          for (let j = 0; j < FIELD_COLS; j++) if (map[i][j] > l) c++;
        if (c < target) max = l;
        else if (c > target) min = l;
        else break;
      }
      level = (min + max) / 2;
    }

    for (let i = 0; i < FIELD_ROWS; i++)
      for (let j = 0; j < FIELD_COLS; j++)
        this.values[i][j] = map[i][j] > level;
  }

  /** Union: only adds true values */
  union(other: Mask): void {
    for (let r = 0; r < FIELD_ROWS; r++)
      for (let c = 0; c < FIELD_COLS; c++)
        if (other.values[r][c]) this.values[r][c] = true;
  }
}

// ---------------------------------------------------------------------------
// Density extends Field<number>
// ---------------------------------------------------------------------------
class Density extends Field<number> {
  available: number[] = []; // flat indices (row * cols + col)

  constructor() {
    super(0);
  }

  static fromMask(mask: Mask, density: number = 1): Density {
    const d = new Density();
    for (let i = 0; i < FIELD_ROWS; i++)
      for (let j = 0; j < FIELD_COLS; j++)
        d.values[i][j] = mask.values[i][j] ? density : 0;
    return d;
  }

  init(): void {
    this.available = [];
    for (let i = 0; i < FIELD_ROWS; i++)
      for (let j = 0; j < FIELD_COLS; j++)
        if (this.values[i][j] > 0) this.available.push(i * FIELD_COLS + j);
  }

  drain(p: Vec2): void {
    if (
      p.x >= 0 &&
      p.x < FIELD_WIDTH &&
      p.y >= 0 &&
      p.y < FIELD_HEIGHT
    ) {
      const x = (p.x / (FIELD_WIDTH / FIELD_COLS)) | 0;
      const y = (p.y / (FIELD_HEIGHT / FIELD_ROWS)) | 0;
      if (--this.values[y][x] <= 0) {
        const idx = y * FIELD_COLS + x;
        const pos = this.available.indexOf(idx);
        if (pos !== -1) this.available.splice(pos, 1);
      }
    }
  }

  randomAvailableCell(rng: RNG): {
    x: number;
    y: number;
    w: number;
    h: number;
  } {
    const index = rng.pick(this.available);
    const x = index % FIELD_COLS;
    const y = (index / FIELD_COLS) | 0;
    return this.cell(x, y);
  }

  /** Dilute: rate = chance to KEEP (original uses 1-rate as keep chance) */
  dilute(rate: number, rng: RNG): void {
    for (let i = 0; i < FIELD_ROWS; i++)
      for (let j = 0; j < FIELD_COLS; j++) {
        if (this.values[i][j] > 0 && rng.float() < 1 - rate) {
          this.values[i][j] = 0;
          const idx = i * FIELD_COLS + j;
          const pos = this.available.indexOf(idx);
          if (pos !== -1) this.available.splice(pos, 1);
        }
      }
  }
}

// ---------------------------------------------------------------------------
// FlowField
// ---------------------------------------------------------------------------
interface Flow {
  value: Vec2;
  opposite: Vec2;
  left: Vec2;
  right: Vec2;
}

function zeroFlow(): Flow {
  return {
    value: new Vec2(),
    opposite: new Vec2(),
    left: new Vec2(),
    right: new Vec2(),
  };
}

function flowIsZero(flow: Flow): boolean {
  return (
    flow.value.x === 0 && flow.value.y === 0 &&
    flow.opposite.x === 0 && flow.opposite.y === 0 &&
    flow.left.x === 0 && flow.left.y === 0 &&
    flow.right.x === 0 && flow.right.y === 0
  );
}

/** Convert a direction Vec2 into a full Flow (matches original getFlow) */
function makeFlow(dir: Vec2): Flow {
  const right = new Vec2(-dir.y, dir.x);
  return {
    value: dir,
    opposite: new Vec2(dir.x * -1, dir.y * -1),
    left: new Vec2(right.x * -1, right.y * -1),
    right: right,
  };
}

function addFlow(a: Flow, b: Flow): Flow {
  return {
    value: a.value.add(b.value),
    opposite: a.opposite.add(b.opposite),
    left: a.left.add(b.left),
    right: a.right.add(b.right),
  };
}

class FlowField extends Field<Flow> {
  constructor() {
    super(zeroFlow());
    // Fix: each cell must be a distinct object
    for (let i = 0; i < FIELD_ROWS; i++)
      for (let j = 0; j < FIELD_COLS; j++)
        this.values[i][j] = zeroFlow();
  }

  getFlow(dir: Vec2): Flow {
    return makeFlow(dir);
  }

  setValue(x: number, y: number, value: Vec2): void {
    this.values[y][x] = this.getFlow(value);
  }

  add(term: FlowField): void {
    for (let i = 0; i < FIELD_ROWS; i++)
      for (let j = 0; j < FIELD_COLS; j++)
        this.values[i][j] = addFlow(this.values[i][j], term.values[i][j]);
  }
}

// ---------------------------------------------------------------------------
// CircularFlow extends FlowField
// ---------------------------------------------------------------------------
class CircularFlow extends FlowField {
  init(
    center?: Vec2,
    power: number = 10,
    uniform: boolean = true,
    inverted: boolean = false,
    radius: number = 0,
  ): void {
    if (!center) center = new Vec2(FIELD_WIDTH / 2, FIELD_HEIGHT / 2);
    if (radius === 0) radius = Math.min(FIELD_WIDTH, FIELD_HEIGHT);

    for (let i = 0; i < FIELD_ROWS; i++) {
      for (let j = 0; j < FIELD_COLS; j++) {
        const pos = this.cellCenter(j, i);
        const p = pos.sub(center);
        let flow = new Vec2(-p.y, p.x).normalize(power);
        if (!uniform) {
          const distance = Math.min(
            1,
            Vec2.dist(pos, center) / radius,
          );
          flow = flow.normalize(inverted ? distance : 1 - distance);
        }
        this.setValue(j, i, flow);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// LinearFlow extends FlowField
// ---------------------------------------------------------------------------
class LinearFlow extends FlowField {
  init(dir: Vec2): void {
    this.fill(this.getFlow(dir));
  }

  initHorizontal(force: number): void {
    this.init(new Vec2(force, 0));
  }
}

// ---------------------------------------------------------------------------
// TensionField extends FlowField
// ---------------------------------------------------------------------------
class TensionField extends FlowField {
  /** Override getFlow: all four vectors point in the same direction */
  override getFlow(dir: Vec2): Flow {
    return { value: dir, opposite: dir, left: dir, right: dir };
  }

  initTension(mask: Mask, power: number, rng: RNG): void {
    const radius = Math.min(FIELD_WIDTH, FIELD_HEIGHT) / 4;
    const cw = FIELD_WIDTH / FIELD_COLS;
    const ch = FIELD_HEIGHT / FIELD_ROWS;

    for (let i = 0; i < FIELD_ROWS; i++) {
      for (let j = 0; j < FIELD_COLS; j++) {
        let fx = 0;
        let fy = 0;
        const m = mask.values[i][j];
        const posX = (j + 0.5) * cw;
        const posY = (i + 0.5) * ch;

        for (let k = 0; k < 100; k++) {
          const length = 0.5 + rng.normal() * radius;
          const angle = rng.float() * 2 * Math.PI;
          const ox = Math.cos(angle) * length;
          const oy = Math.sin(angle) * length;
          const sx = posX + ox;
          const sy = posY + oy;
          if (sx >= 0 && sx < FIELD_WIDTH && sy >= 0 && sy < FIELD_HEIGHT) {
            const cx = (sx / FIELD_WIDTH) * FIELD_COLS | 0;
            const cy = (sy / FIELD_HEIGHT) * FIELD_ROWS | 0;
            if (mask.values[cy][cx] !== m) {
              const f = 1 / length;
              fx += ox * f;
              fy += oy * f;
            }
          }
        }

        const f1 = (3 * (m ? -power : power)) / 100;
        fx *= f1;
        fy *= f1;
        this.setValue(j, i, new Vec2(fx * power, fy * power));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// TracerBehaviour
// ---------------------------------------------------------------------------
interface TracerBehaviour {
  wiggling: number;
  curvature: number;
  roughness: number;
  zigzag: number;
  align: number; // 0=value,1=opposite,2=both,3=left+right,4=left,5=right,6=all
  spawn: number; // 0=forces,1=+/-X,2=+/-Y,3=90deg snap,4=random
}

function defaultBehaviour(): TracerBehaviour {
  return {
    wiggling: 0,
    curvature: 0,
    roughness: 0,
    zigzag: 0,
    align: 2,
    spawn: 4,
  };
}

function behaviourRandom(rng: RNG): TracerBehaviour {
  return {
    wiggling: 0.5 * rng.small(),
    curvature: 2.0 * rng.normal(),
    roughness: 0.333 * rng.normal(),
    zigzag: rng.bool(0.1) ? rng.normal() : 0,
    align: rng.pick([0, 2, 6]),
    spawn: 4,
  };
}

function behaviourMesh(): TracerBehaviour {
  return {
    wiggling: 0,
    curvature: 0,
    roughness: 0,
    zigzag: 0.5,
    align: 6,
    spawn: 0,
  };
}

function _behaviourSprings(rng: RNG): TracerBehaviour {
  return {
    wiggling: rng.normal(),
    curvature: rng.normal(),
    roughness: 0,
    zigzag: rng.normal(),
    align: 2,
    spawn: 4,
  };
}

function _behaviourStainedGlass(rng: RNG): TracerBehaviour {
  return {
    wiggling: 0,
    curvature: 0.1 * rng.normal(),
    roughness: 0,
    zigzag: 0,
    align: 6,
    spawn: 0,
  };
}

function _behaviourFragments(rng: RNG): TracerBehaviour {
  return {
    wiggling: 0.2 * rng.normal(),
    curvature: 0,
    roughness: 1,
    zigzag: 0,
    align: 6,
    spawn: 0,
  };
}

function _behaviourFruits(rng: RNG): TracerBehaviour {
  return {
    wiggling: 0.1 * rng.normal(),
    curvature: 0.25 * rng.normal(),
    roughness: 0.1,
    zigzag: 0,
    align: 2,
    spawn: 4,
  };
}

// ---------------------------------------------------------------------------
// Stroke
// ---------------------------------------------------------------------------
class Stroke {
  constructor(
    public start: Vec2,
    public end: Vec2,
    public thickness: number,
  ) {}

  invert(): Stroke {
    return new Stroke(this.end, this.start, this.thickness);
  }

  mid(): Vec2 {
    return Vec2.lerp(this.start, this.end, 0.5);
  }
}

// ---------------------------------------------------------------------------
// Intersection helper – matches original GeomUtils.intersectLines
// ---------------------------------------------------------------------------
const _isect: [number, number] = [0, 0];

function intersectLines(
  x1: number,
  y1: number,
  dx1: number,
  dy1: number,
  x2: number,
  y2: number,
  dx2: number,
  dy2: number,
): [number, number] | null {
  const d = dx1 * dy2 - dy1 * dx2;
  if (d === 0) return null;
  const t2 = (dy1 * (x2 - x1) - dx1 * (y2 - y1)) / d;
  const t1 =
    Math.abs(dx1) > Math.abs(dy1)
      ? (x2 - x1 + dx2 * t2) / dx1
      : (y2 - y1 + dy2 * t2) / dy1;
  _isect[0] = t1;
  _isect[1] = t2;
  return _isect;
}

// ---------------------------------------------------------------------------
// Tracer
// ---------------------------------------------------------------------------
class Tracer {
  pos: Vec2;
  speed: Vec2;
  steering: number;
  zigzag: number;
  thickness: number;

  // Behaviour is stored as a static (class-level), matching original
  static behaviour: TracerBehaviour = defaultBehaviour();

  constructor(pos: Vec2, dir: Vec2, thickness: number = 1) {
    this.pos = pos;
    // Normalize direction to length 10 (original: UNIT = 10)
    this.speed = dir.clone().normalize(10);
    // steering = (normal() - 0.5) * curvature
    this.steering =
      (Tracer.rng.normal() - 0.5) * Tracer.behaviour.curvature;
    // zigzag = behaviour.zigzag * (bool(0.5) ? 1 : -1)
    this.zigzag =
      Tracer.behaviour.zigzag * (Tracer.rng.bool(0.5) ? 1 : -1);
    this.thickness = thickness;
  }

  // The shared RNG reference and art style
  static rng: RNG;
  static artStyle: ArtStyle;

  static forces(flow: Flow): Vec2[] {
    switch (Tracer.behaviour.align) {
      case 0:
        return [flow.value];
      case 1:
        return [flow.opposite];
      case 2:
        return [flow.value, flow.opposite];
      case 3:
        return [flow.left, flow.right];
      case 4:
        return [flow.left];
      case 5:
        return [flow.right];
      default:
        return [flow.value, flow.opposite, flow.left, flow.right];
    }
  }

  static spawn(
    pos: Vec2,
    flow: Flow,
    thickness: number,
  ): [Tracer, Tracer] {
    const rng = Tracer.rng;
    let dir: Vec2;
    switch (Tracer.behaviour.spawn) {
      case 0:
        dir = flowIsZero(flow)
          ? Vec2.polar(1, Math.PI * 2 * rng.float())
          : rng.pick(Tracer.forces(flow));
        break;
      case 1:
        dir = new Vec2(rng.bool(0.5) ? 1 : -1, 0);
        break;
      case 2:
        dir = new Vec2(0, rng.bool(0.5) ? 1 : -1);
        break;
      case 3:
        dir = Vec2.polar(
          1,
          (Math.PI / 2) * Math.floor(rng.float() * 4),
        );
        break;
      default:
        dir = Vec2.polar(1, Math.PI * 2 * rng.float());
    }
    const t1 = new Tracer(pos, dir, thickness);
    const t2 = new Tracer(pos, new Vec2(-dir.x, -dir.y), thickness);
    t2.steering = -t1.steering;
    return [t1, t2];
  }

  trace(flow: Flow, e: number = 0.5): Stroke {
    const rng = Tracer.rng;
    const bh = Tracer.behaviour;
    const spd = this.speed;

    // Find closest force
    const forces = Tracer.forces(flow);
    let closest = forces[0];
    let bestDot = spd.x * forces[0].x + spd.y * forces[0].y;
    for (let i = 1; i < forces.length; i++) {
      const d = spd.x * forces[i].x + spd.y * forces[i].y;
      if (d > bestDot) {
        bestDot = d;
        closest = forces[i];
      }
    }

    // Add closest force * e to speed
    spd.x += closest.x * e;
    spd.y += closest.y * e;

    // Add perpendicular steering (capture before mutation)
    const perpX = -spd.y;
    const perpY = spd.x;
    const f = this.steering * e;
    spd.x += perpX * f;
    spd.y += perpY * f;

    // Cap speed at 10
    const l = Math.sqrt(spd.x * spd.x + spd.y * spd.y);
    if (l > 10) {
      spd.x = (spd.x / l) * 10;
      spd.y = (spd.y / l) * 10;
    }

    // Wiggling chance
    const chance = 1 - Math.pow(1 - bh.wiggling, e);
    if (rng.float() < chance) {
      this.steering = (rng.normal() - 0.5) * bh.curvature;
      if (this.zigzag !== 0) {
        const a = this.zigzag * Math.PI;
        const sin = Math.sin(a);
        const cos = Math.cos(a);
        const rx = spd.x * cos - spd.y * sin;
        const ry = spd.y * cos + spd.x * sin;
        spd.x = rx;
        spd.y = ry;
        this.zigzag = -this.zigzag;
      } else {
        const chance1 = 1 - Math.pow(1 - bh.roughness, e);
        if (rng.float() < chance1) {
          const a1 = rng.normal2() * Math.PI;
          const sin1 = Math.sin(a1);
          const cos1 = Math.cos(a1);
          const rx1 = spd.x * cos1 - spd.y * sin1;
          const ry1 = spd.y * cos1 + spd.x * sin1;
          spd.x = rx1;
          spd.y = ry1;
        }
      }
    }

    // Step: pos + speed * e
    const newPos = new Vec2(
      this.pos.x + spd.x * e,
      this.pos.y + spd.y * e,
    );
    const s = new Stroke(this.pos, newPos, this.thickness);
    this.pos = s.end;
    return s;
  }
}

// ---------------------------------------------------------------------------
// ArtStyle
// ---------------------------------------------------------------------------
interface ArtStyle {
  palette: number[];
  paper: number;
  black: number;
  strokeColor: number;
  strokeAlpha: number;
  minThickness: number;
  maxThickness: number;
  lightness: number;
  curviness: number;
  variety: number;
}

function rgbf(r: number, g: number, b: number): number {
  return (
    (Math.min(255, Math.max(0, Math.round(r * 255))) << 16) |
    (Math.min(255, Math.max(0, Math.round(g * 255))) << 8) |
    Math.min(255, Math.max(0, Math.round(b * 255)))
  );
}

function _hexToRGB(n: number): [number, number, number] {
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgb2hsv(color: number): { x: number; y: number; z: number } {
  const r = ((color >> 16) & 0xff) / 255;
  const g = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  const s = max > 0 ? d / max : 0;
  return { x: h, y: s, z: max };
}

function hsv2rgb(h: number, s: number, v: number): number {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r: number, g: number, b: number;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  return rgbf(r + m, g + m, b + m);
}

function findBlack(palette: number[]): number {
  let black = palette[0];
  let blackV = 1.0;
  for (const color of palette) {
    const v = rgb2hsv(color).z;
    if (blackV > v) {
      blackV = v;
      black = color;
    }
  }
  return black;
}

function artGradient(
  style: ArtStyle,
  color: number,
  rng: RNG,
): [number, number, number] {
  if (style.curviness > 0) {
    if (style.variety > 0) {
      const hsvVal = rgb2hsv(color);
      const hue = hsvVal.x + rng.normal2() * 60 * style.variety;
      color = hsv2rgb(hue, hsvVal.y, hsvVal.z);
    }
    const o = rng.normal() * style.curviness;
    const r = (1 - o) * (((color >>> 16) & 0xff) / 255);
    const g = (1 - o) * (((color >>> 8) & 0xff) / 255);
    const b = (1 - o) * ((color & 0xff) / 255);
    const dark = rgbf(r, g, b);
    const light = rgbf(r + o, g + o, b + o);
    return [dark, color, light];
  } else {
    return [color, color, color];
  }
}

function makeArtStyle(palette: number[], paper: number): ArtStyle {
  const black = findBlack(palette);
  return {
    palette,
    paper,
    black,
    strokeColor: black,
    strokeAlpha: 1.0,
    minThickness: 1.0,
    maxThickness: 2.0,
    lightness: 0.5,
    curviness: 0.3,
    variety: 0.3,
  };
}

const PALETTES: Record<
  string,
  { palette: number[]; paper: number; customize: (s: ArtStyle) => void }
> = {
  RWS: {
    palette: [
      2235422, 16175105, 15261083, 6920637, 13228245, 8163628, 13659960,
      12525858, 14592886,
    ],
    paper: 15658728,
    customize: (s) => {
      s.lightness = 0.4;
      s.curviness = 0.15;
      s.minThickness = 1.0;
      s.maxThickness = 3.0;
    },
  },
  gobelin: {
    palette: [
      661523, 7166555, 8455957, 10375458, 11042597, 7038275, 6455759, 1191267,
      3223625, 13734770,
    ],
    paper: 15328210,
    customize: (s) => {
      s.minThickness = 0.5;
      s.maxThickness = 1.5;
    },
  },
  viscontiSforza: {
    palette: [
      15393210, 4204826, 10382144, 15611145, 13460224, 16557836, 6056742,
      4804982, 14394753,
    ],
    paper: 16445128,
    customize: (s) => {
      s.curviness = 0.2;
      s.strokeAlpha = 0.8;
      s.minThickness = 1.5;
      s.maxThickness = 2.5;
    },
  },
  wildwood: {
    palette: [
      3091760, 5399135, 14240534, 9722430, 12758050, 16110202, 6192969,
      3296050, 4739962, 14083045,
    ],
    paper: 15986675,
    customize: (s) => {
      s.minThickness = 0.0;
      s.maxThickness = 2.8;
      s.strokeAlpha = 0.7;
      s.lightness = 0.8;
      s.variety = 0.4;
      s.curviness = 0.4;
    },
  },
};

function intToHex(n: number): string {
  return "#" + ((n | 0) >>> 0).toString(16).padStart(6, "0");
}

function toRoman(n: number): string {
  if (n === 0) return "0";
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = [
    "M",
    "CM",
    "D",
    "CD",
    "C",
    "XC",
    "L",
    "XL",
    "X",
    "IX",
    "V",
    "IV",
    "I",
  ];
  let result = "";
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) {
      result += syms[i];
      n -= vals[i];
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// SVGBuilder
// ---------------------------------------------------------------------------
const MARGIN = 20;
const TITLE_HEIGHT = 36;
const CARD_WIDTH = FIELD_WIDTH + MARGIN * 2;
const CARD_HEIGHT = FIELD_HEIGHT + MARGIN * 2 + TITLE_HEIGHT;

class SVGBuilder {
  private paperEl = "";
  private bgElements: string[] = [];
  private fgElements: string[] = [];
  private strokeElements: string[] = [];
  private overlayElements: string[] = [];
  private defs: string[] = [];
  private gradientCount = 0;
  private _isFg = false;

  setForeground(fg: boolean): void {
    this._isFg = fg;
  }

  paper(color: number): void {
    this.paperEl =
      `<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="${MARGIN}" fill="${intToHex(color)}"/>`;
  }

  private get artTarget(): string[] {
    return this._isFg ? this.fgElements : this.bgElements;
  }

  background(color: number): void {
    this.bgElements.push(
      `<rect x="${MARGIN}" y="${MARGIN}" width="${FIELD_WIDTH}" height="${FIELD_HEIGHT}" fill="${intToHex(color)}"/>`,
    );
  }

  border(color: number, alpha: number, thickness: number): void {
    this.overlayElements.push(
      `<rect x="${MARGIN}" y="${MARGIN}" width="${FIELD_WIDTH}" height="${FIELD_HEIGHT}" ` +
        `fill="none" stroke="${intToHex(color)}" stroke-width="${thickness.toFixed(2)}" ` +
        `stroke-opacity="${alpha.toFixed(3)}" rx="${MARGIN}"/>`,
    );
  }

  cardText(
    name: string,
    majorNumber: number | undefined,
    color: number,
    paperColor: number,
  ): void {
    const hex = intToHex(color);
    const escapedName = name.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const font = "'Cormorant Garamond', Georgia, serif";
    const titleY = MARGIN + FIELD_HEIGHT + (MARGIN + TITLE_HEIGHT) / 2;
    this.overlayElements.push(
      `<text x="${CARD_WIDTH / 2}" y="${titleY}" ` +
        `text-anchor="middle" dominant-baseline="central" ` +
        `font-family="${font}" font-size="18" fill="${hex}" ` +
        `style="letter-spacing:0.05em">${escapedName}</text>`,
    );
    if (majorNumber !== undefined) {
      const roman = toRoman(majorNumber);
      const numY = MARGIN + 16;
      const numHex = intToHex(paperColor);
      this.overlayElements.push(
        `<text x="${CARD_WIDTH / 2}" y="${numY}" ` +
          `text-anchor="middle" font-family="${font}" font-size="18" fill="${numHex}">${roman}</text>`,
      );
    }
  }

  polygonStroke(points: Vec2[], color: number, alpha: number): void {
    const pts = points
      .map((p) => `${(p.x + MARGIN).toFixed(2)},${(p.y + MARGIN).toFixed(2)}`)
      .join(" ");
    this.artTarget.push(
      `<polygon points="${pts}" fill="none" stroke="${intToHex(color)}" ` +
        `stroke-width="1" stroke-opacity="${alpha.toFixed(3)}"/>`,
    );
  }

  stroke(s: Stroke, color: number, alpha: number): void {
    const x1 = (s.start.x + MARGIN).toFixed(2),
      y1 = (s.start.y + MARGIN).toFixed(2);
    const x2 = (s.end.x + MARGIN).toFixed(2),
      y2 = (s.end.y + MARGIN).toFixed(2);
    this.strokeElements.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ` +
        `stroke="${intToHex(color)}" stroke-width="${s.thickness.toFixed(2)}" ` +
        `stroke-opacity="${alpha.toFixed(3)}" stroke-linecap="round"/>`,
    );
  }

  polygon(
    points: Vec2[],
    fillColor: number,
    fillOpacity: number = 1,
    gradientColors?: [number, number, number],
    gradientType?: "linear" | "radial",
    gradientAngle?: number,
  ): void {
    const pts = points
      .map((p) => `${(p.x + MARGIN).toFixed(2)},${(p.y + MARGIN).toFixed(2)}`)
      .join(" ");
    let fill: string;

    if (gradientColors) {
      const id = `grad${this.gradientCount++}`;
      const [dark, mid, light] = gradientColors;

      if (gradientType === "radial") {
        const xs = points.map((p) => p.x + MARGIN),
          ys = points.map((p) => p.y + MARGIN);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        this.defs.push(
          `<radialGradient id="${id}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" ` +
            `r="${(Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2).toFixed(1)}" gradientUnits="userSpaceOnUse">` +
            `<stop offset="0%" stop-color="${intToHex(light)}"/>` +
            `<stop offset="60%" stop-color="${intToHex(mid)}"/>` +
            `<stop offset="100%" stop-color="${intToHex(dark)}"/>` +
            `</radialGradient>`,
        );
      } else {
        const angle = gradientAngle ?? 0;
        const cos = Math.cos(angle),
          sin = Math.sin(angle);
        const xs = points.map((p) => p.x + MARGIN),
          ys = points.map((p) => p.y + MARGIN);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        const len =
          Math.max(
            Math.max(...xs) - Math.min(...xs),
            Math.max(...ys) - Math.min(...ys),
          ) / 2;
        this.defs.push(
          `<linearGradient id="${id}" x1="${(cx - cos * len).toFixed(1)}" y1="${(cy - sin * len).toFixed(1)}" ` +
            `x2="${(cx + cos * len).toFixed(1)}" y2="${(cy + sin * len).toFixed(1)}" gradientUnits="userSpaceOnUse">` +
            `<stop offset="0%" stop-color="${intToHex(dark)}"/>` +
            `<stop offset="50%" stop-color="${intToHex(mid)}"/>` +
            `<stop offset="100%" stop-color="${intToHex(light)}"/>` +
            `</linearGradient>`,
        );
      }
      fill = `url(#${id})`;
    } else {
      fill = intToHex(fillColor);
    }

    this.artTarget.push(
      `<polygon points="${pts}" fill="${fill}" fill-opacity="${fillOpacity.toFixed(3)}"/>`,
    );
  }

  build(): string {
    this.defs.push(
      `<clipPath id="art-clip"><rect x="${MARGIN}" y="${MARGIN}" width="${FIELD_WIDTH}" height="${FIELD_HEIGHT}"/></clipPath>`,
    );
    const defsBlock = `<defs>${this.defs.join("")}</defs>`;
    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" ` +
      `viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">\n` +
      defsBlock + "\n" +
      this.paperEl + "\n" +
      `<g clip-path="url(#art-clip)">\n` +
      `<g data-layer="bg">\n` + this.bgElements.join("\n") + `\n</g>\n` +
      `<g data-layer="fg">\n` + this.fgElements.join("\n") + `\n</g>\n` +
      `<g data-layer="strokes">\n` + this.strokeElements.join("\n") + `\n</g>\n` +
      `</g>\n` +
      `<g data-layer="border">\n` + (this.overlayElements[0] ?? "") + `\n</g>\n` +
      `<g data-layer="text">\n` + this.overlayElements.slice(1).join("\n") + `\n</g>\n` +
      `</svg>`
    );
  }
}

// ---------------------------------------------------------------------------
// Painter – shape-finding and polygon filling
// ---------------------------------------------------------------------------
class Painter {
  private strokes: Stroke[];
  private pt2stroke: Map<Vec2, Stroke[]> = new Map();
  private svgBuilder: SVGBuilder;
  private palette: number[];
  private masks: Mask[];
  private objColors: number[][];
  private artStyle: ArtStyle;
  private rng: RNG;
  private fgFlags: boolean[] = [];
  regions: { shape: Vec2[]; area: number; colors?: number[]; type?: number | null; fg?: boolean }[] = [];

  private static readonly RAY_BUCKET_SIZE = 20;
  private static readonly RAY_BUCKET_COUNT = Math.ceil(
    FIELD_HEIGHT / Painter.RAY_BUCKET_SIZE,
  );
  private rayBuckets: Stroke[][] = [];

  constructor(
    svgBuilder: SVGBuilder,
    strokes: Stroke[],
    sketchers: Sketcher[],
    palette: number[],
    artStyle: ArtStyle,
    rng: RNG,
  ) {
    this.svgBuilder = svgBuilder;
    this.strokes = strokes;
    this.palette = palette;
    this.artStyle = artStyle;
    this.rng = rng;

    // Per-layer colors and masks
    this.objColors = sketchers.map((s) =>
      s.colors != null
        ? s.colors
        : shuffle(palette.slice(), rng).slice(0, 2),
    );
    this.masks = sketchers.map((s) => s.mask);
    this.fgFlags = sketchers.map((s) => s.foreground);

    // Build pt2stroke using object identity (like original)
    for (const s of strokes) {
      if (!this.pt2stroke.has(s.start)) this.pt2stroke.set(s.start, []);
      this.pt2stroke.get(s.start)!.push(s);
      if (!this.pt2stroke.has(s.end)) this.pt2stroke.set(s.end, []);
      this.pt2stroke.get(s.end)!.push(s);
    }

    // Build Y-bucket spatial index for ray casting
    for (let i = 0; i < Painter.RAY_BUCKET_COUNT; i++) this.rayBuckets.push([]);
    for (const s of strokes) {
      const minY = Math.min(s.start.y, s.end.y);
      const maxY = Math.max(s.start.y, s.end.y);
      const r0 = Math.max(0, Math.floor(minY / Painter.RAY_BUCKET_SIZE));
      const r1 = Math.min(
        Painter.RAY_BUCKET_COUNT - 1,
        Math.floor(maxY / Painter.RAY_BUCKET_SIZE),
      );
      for (let r = r0; r <= r1; r++) this.rayBuckets[r].push(s);
    }
  }

  private findShape(p: Vec2): Vec2[] | null {
    // Cast ray rightward from p, find closest stroke via Y-bucket index
    const x = p.x;
    const y = p.y;

    let bestStroke: Stroke | null = null;
    let bestT = Infinity;

    const bucketIdx = Math.max(
      0,
      Math.min(
        Painter.RAY_BUCKET_COUNT - 1,
        Math.floor(y / Painter.RAY_BUCKET_SIZE),
      ),
    );
    const bucket = this.rayBuckets[bucketIdx];
    for (let si = 0; si < bucket.length; si++) {
      const s = bucket[si];
      const t = intersectLines(
        x,
        y,
        1,
        0,
        s.start.x,
        s.start.y,
        s.end.x - s.start.x,
        s.end.y - s.start.y,
      );
      if (t !== null && t[0] > 0 && t[1] >= 0 && t[1] <= 1) {
        if (t[0] < bestT) {
          bestT = t[0];
          bestStroke = s;
        }
      }
    }

    if (!bestStroke) return null;

    let s = bestStroke;
    if (s.end.y - s.start.y < 0) {
      s = s.invert();
    }

    const shape: Vec2[] = [s.start];

    while (true) {
      let next: Stroke | null = null;
      let minAngle = Infinity;

      const candidates = this.pt2stroke.get(s.end) || [];
      for (let ci = 0; ci < candidates.length; ci++) {
        let s1 = candidates[ci];
        if (s1 !== s) {
          if (s1.end === s.end) {
            s1 = s1.invert();
          }
          if (s1.start === s.end) {
            if (next === null) {
              next = s1;
            } else {
              if (minAngle === Infinity) {
                const a = s.end.sub(s.start);
                const b = next.end.sub(next.start);
                const cosA = clamp(
                  (a.x * b.x + a.y * b.y) / a.length() / b.length(),
                  -1,
                  1,
                );
                const angle = Math.acos(cosA);
                minAngle = a.x * b.y - a.y * b.x > 0 ? -angle : angle;
              }
              const a1 = s.end.sub(s.start);
              const b1 = s1.end.sub(s1.start);
              const cos1 = clamp(
                (a1.x * b1.x + a1.y * b1.y) / a1.length() / b1.length(),
                -1,
                1,
              );
              const angle1 = Math.acos(cos1);
              const angle2 =
                a1.x * b1.y - a1.y * b1.x > 0 ? -angle1 : angle1;
              if (minAngle > angle2) {
                minAngle = angle2;
                next = s1;
              }
            }
          }
        }
      }

      if (!next) return shape.length >= 3 ? shape : null;

      s = next;
      shape.push(s.start);

      // Check for loop closure
      if (shape.length > this.strokes.length) {
        for (let i = 0; i < shape.length; i++) {
          for (let j = i + 1; j < shape.length; j++) {
            if (shape[i] === shape[j]) {
              return shape.slice(i, j);
            }
          }
        }
      }

      if (s.end === shape[0]) break;
    }

    return shape.length >= 3 ? shape : null;
  }

  private register(
    shape: Vec2[],
  ): { shape: Vec2[]; area: number; colors?: number[]; type?: number | null; fg?: boolean } | null {
    // Check for duplicate using Set for O(1) vertex lookup
    const shapeSet = new Set(shape);
    for (const region of this.regions) {
      const filled = region.shape;
      let duplicate = true;
      for (const v of filled) {
        if (!shapeSet.has(v)) {
          duplicate = false;
          break;
        }
      }
      if (duplicate) return null;
    }
    const area = Math.abs(polygonArea(shape));
    const region: { shape: Vec2[]; area: number; colors?: number[]; type: number | null; fg?: boolean } = { shape, area, type: null };
    this.regions.push(region);
    return region;
  }

  fillShape(p: Vec2): void {
    const shape = this.findShape(p);
    if (!shape || shape.length < 3) return;
    const region = this.register(shape);
    if (!region) return;

    // Pick palette and determine foreground/background
    let palette = this.palette;
    let isFg = false;
    for (let i = 0; i < this.masks.length; i++) {
      if (this.masks[i].get(p)) {
        palette = this.objColors[i];
        isFg = this.fgFlags[i];
        break;
      }
    }
    region.fg = isFg;

    // Select color: iterate palette, chance = sqrt(area / totalArea) per color
    let color = palette[palette.length - 1];
    const chance = Math.sqrt(
      region.area / (FIELD_WIDTH * FIELD_HEIGHT),
    );
    for (const c of palette) {
      if (this.rng.float() < chance) {
        color = c;
        break;
      }
    }

    region.colors = artGradient(this.artStyle, color, this.rng);

    const compactness = polygonCompactness(shape);
    if (compactness > 0.8) {
      region.type = 1;
    } else {
      region.type = 0;
    }
  }

  private drawRegion(region: {
    shape: Vec2[];
    colors?: number[];
    type?: number | null;
    fg?: boolean;
  }): void {
    const colors = region.colors as [number, number, number];
    if (!colors) return;
    this.svgBuilder.setForeground(!!region.fg);
    if (region.type === 1) {
      this.svgBuilder.polygon(region.shape, colors[1], 1, colors, "radial");
    } else {
      const obb = computeOBB(region.shape);
      this.svgBuilder.polygon(
        region.shape,
        colors[1],
        1,
        colors,
        "linear",
        obb.angle,
      );
    }
    this.svgBuilder.polygonStroke(region.shape, colors[1], 0.6);
    this.svgBuilder.setForeground(false);
  }

  drawAll(): void {
    this.regions.sort((a, b) => b.area - a.area);
    for (const region of this.regions) {
      this.drawRegion(region);
    }
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function polygonArea(pts: Vec2[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return a / 2;
}

function polygonCompactness(pts: Vec2[]): number {
  const area = Math.abs(polygonArea(pts));
  let perim = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    perim += Vec2.dist(pts[i], pts[j]);
  }
  if (perim < 1e-9) return 0;
  return (4 * Math.PI * area) / (perim * perim);
}

function computeOBB(pts: Vec2[]): { angle: number } {
  // Simplified OBB: use longest edge direction
  if (pts.length < 2) return { angle: 0 };
  let maxDist = 0;
  let angle = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const d = Vec2.dist(pts[i], pts[j]);
    if (d > maxDist) {
      maxDist = d;
      angle = Math.atan2(pts[j].y - pts[i].y, pts[j].x - pts[i].x);
    }
  }
  return { angle };
}

function shuffle(arr: number[], rng: RNG): number[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.int0(i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Sketcher
// ---------------------------------------------------------------------------
class Sketcher {
  mask: Mask;
  flow: FlowField;
  density: Density;
  tracers: Tracer[] = [];
  strokes: Stroke[] = [];
  fillPoints: Vec2[] = [];
  tracing: TracerBehaviour | null = null;
  colors: number[] | null = null;
  foreground = false;

  // Spatial bucket optimization
  private static readonly BUCKET_SIZE = 20;
  private static readonly BUCKET_COLS = Math.ceil(
    FIELD_WIDTH / Sketcher.BUCKET_SIZE,
  );
  private static readonly BUCKET_ROWS = Math.ceil(
    FIELD_HEIGHT / Sketcher.BUCKET_SIZE,
  );
  private buckets: number[][][] = [];
  private needsRebucket = false;

  constructor(
    mask: Mask,
    flow: FlowField,
    tightness: number = 3,
    nSeeds: number = 1,
    rng?: RNG,
  ) {
    this.mask = mask;
    this.flow = flow;

    if (tightness > 0 && rng) {
      const tension = new TensionField();
      tension.initTension(mask, tightness, rng);
      flow.add(tension);
    }

    this.density = Density.fromMask(mask, nSeeds);
    this.density.init();

    this.initBuckets();
  }

  private initBuckets(): void {
    this.buckets = [];
    for (let r = 0; r < Sketcher.BUCKET_ROWS; r++) {
      this.buckets.push([]);
      for (let c = 0; c < Sketcher.BUCKET_COLS; c++) {
        this.buckets[r].push([]);
      }
    }
  }

  private addToBuckets(idx: number, s: Stroke): void {
    const minX = Math.min(s.start.x, s.end.x);
    const maxX = Math.max(s.start.x, s.end.x);
    const minY = Math.min(s.start.y, s.end.y);
    const maxY = Math.max(s.start.y, s.end.y);
    const c0 = Math.max(0, Math.floor(minX / Sketcher.BUCKET_SIZE));
    const c1 = Math.min(
      Sketcher.BUCKET_COLS - 1,
      Math.floor(maxX / Sketcher.BUCKET_SIZE),
    );
    const r0 = Math.max(0, Math.floor(minY / Sketcher.BUCKET_SIZE));
    const r1 = Math.min(
      Sketcher.BUCKET_ROWS - 1,
      Math.floor(maxY / Sketcher.BUCKET_SIZE),
    );
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) this.buckets[r][c].push(idx);
  }

  private candidatesNear(s: Stroke): Set<number> {
    const minX = Math.min(s.start.x, s.end.x);
    const maxX = Math.max(s.start.x, s.end.x);
    const minY = Math.min(s.start.y, s.end.y);
    const maxY = Math.max(s.start.y, s.end.y);
    const c0 = Math.max(0, Math.floor(minX / Sketcher.BUCKET_SIZE));
    const c1 = Math.min(
      Sketcher.BUCKET_COLS - 1,
      Math.floor(maxX / Sketcher.BUCKET_SIZE),
    );
    const r0 = Math.max(0, Math.floor(minY / Sketcher.BUCKET_SIZE));
    const r1 = Math.min(
      Sketcher.BUCKET_ROWS - 1,
      Math.floor(maxY / Sketcher.BUCKET_SIZE),
    );
    const result = new Set<number>();
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) {
        const bucket = this.buckets[r][c];
        for (let k = 0; k < bucket.length; k++) result.add(bucket[k]);
      }
    return result;
  }

  draw(): boolean {
    if (this.needsRebucket) {
      this.rebuildBuckets();
      this.needsRebucket = false;
    }
    const newList: Tracer[] = [];
    for (const t of this.tracers) {
      const s = t.trace(this.flow.get(t.pos));
      const alive = this.validate(s);
      this.addStroke(s);
      if (alive) {
        newList.push(t);
      } else {
        // Generate fill points on both sides (matches original: perp * 0.01)
        const m = Vec2.lerp(s.start, s.end, 0.5);
        const dir = s.end.sub(s.start);
        const perp = new Vec2(-dir.y, dir.x);
        const f = 0.01;
        this.fillPoints.push(m.add(new Vec2(perp.x * f, perp.y * f)));
        this.fillPoints.push(m.sub(new Vec2(perp.x * f, perp.y * f)));
      }
    }
    this.tracers = newList;

    if (this.tracers.length > 0) return true;
    if (this.density.available.length > 0) {
      const cell = this.density.randomAvailableCell(Tracer.rng);
      // Random point in cell (original: RectExtender.random)
      const px = cell.x + Tracer.rng.float() * cell.w;
      const py = cell.y + Tracer.rng.float() * cell.h;
      this.spawn(new Vec2(px, py));
      return true;
    }
    return false;
  }

  validate(stroke: Stroke): boolean {
    const x1 = stroke.start.x;
    const y1 = stroke.start.y;
    const dx1 = stroke.end.x - stroke.start.x;
    const dy1 = stroke.end.y - stroke.start.y;

    let closest: Stroke | null = null;
    let tx = 1.0;
    let ty = 0.0;

    const candidates = this.candidatesNear(stroke);
    for (const idx of candidates) {
      const another = this.strokes[idx];
      const t = intersectLines(
        x1,
        y1,
        dx1,
        dy1,
        another.start.x,
        another.start.y,
        another.end.x - another.start.x,
        another.end.y - another.start.y,
      );
      if (t !== null && t[0] > 0 && t[0] <= tx && t[1] >= 0 && t[1] <= 1) {
        closest = another;
        tx = t[0];
        ty = t[1];
      }
    }

    if (closest !== null) {
      if (ty === 0) {
        stroke.end = closest.start;
      } else if (ty === 1) {
        stroke.end = closest.end;
      } else {
        const p = new Vec2(x1 + tx * dx1, y1 + tx * dy1);
        stroke.end = p;
        this.strokes.push(new Stroke(closest.start, p, closest.thickness));
        this.strokes.push(new Stroke(p, closest.end, closest.thickness));
        const oldIdx = this.strokes.indexOf(closest);
        if (oldIdx !== -1) this.strokes.splice(oldIdx, 1);
        this.needsRebucket = true;
      }
      return false;
    }
    return true;
  }

  spawn(p: Vec2): void {
    const min = Tracer.artStyle.minThickness;
    const max = Tracer.artStyle.maxThickness;
    const thickness = min + Tracer.rng.normal() * (max - min);
    const pair = Tracer.spawn(p, this.flow.get(p), thickness);
    this.tracers.push(pair[0], pair[1]);
    this.density.drain(p);
  }

  addStroke(s: Stroke): void {
    const idx = this.strokes.length;
    this.strokes.push(s);
    this.addToBuckets(idx, s);
    this.density.drain(s.end);
  }

  behind(another: Sketcher): void {
    const toRemove = new Set<number>();
    for (let i = 0; i < FIELD_ROWS; i++) {
      for (let j = 0; j < FIELD_COLS; j++) {
        if (another.mask.values[i][j]) {
          this.mask.values[i][j] = false;
          toRemove.add(i * FIELD_COLS + j);
        }
      }
    }
    if (toRemove.size > 0) {
      this.density.available = this.density.available.filter(
        (idx) => !toRemove.has(idx),
      );
    }
  }

  isDrawing(): boolean {
    return this.tracers.length > 0;
  }

  rebuildBuckets(): void {
    this.initBuckets();
    for (let i = 0; i < this.strokes.length; i++) {
      this.addToBuckets(i, this.strokes[i]);
    }
  }

  run(maxIter: number = 5000): void {
    for (let i = 0; i < maxIter; i++) {
      if (!this.draw()) break;
    }
  }

  // ---- Factory methods ----

  static figure(rng: RNG, height: number = 1, pos?: Vec2): Sketcher {
    const h = FIELD_HEIGHT * height;
    const w = h * (0.25 + rng.normal() / 4);
    if (!pos) {
      pos = new Vec2(FIELD_WIDTH / 2, FIELD_HEIGHT / 2).add(
        new Vec2(0, h / 4),
      );
    }

    const mask = new Mask();
    mask.ellipse(pos, w / 2, h / 2);

    // Offset position for "head" part
    const qx = rng.normal2() * w * 0.5;
    const qy = -rng.float() * h * 0.25;
    pos = new Vec2(pos.x + qx, pos.y + qy);

    // Resize for second ellipse
    const h2 = h * rng.normal() * 0.5;
    const w2 = w * (1 + rng.normal());
    mask.ellipse(pos, w2 / 2, h2 / 2);

    const tracing = behaviourRandom(rng);
    tracing.align = rng.pick([3, 6]);

    const flow = new CircularFlow();
    // Random point in field rect
    const cx = rng.float() * FIELD_WIDTH;
    const cy = rng.float() * FIELD_HEIGHT;
    flow.init(new Vec2(cx, cy), rng.normal() * 20);

    const layer = new Sketcher(mask, flow, 4, 1, rng);
    layer.tracing = tracing;
    layer.foreground = true;
    return layer;
  }

  static sun(
    rng: RNG,
    pos?: Vec2,
    radius: number = 0,
  ): Sketcher {
    if (radius === 0) {
      radius = FIELD_WIDTH * rng.normal();
    }
    if (!pos) {
      pos = new Vec2(
        FIELD_WIDTH * rng.normal(),
        (FIELD_HEIGHT / 2) * rng.normal(),
      );
    }

    const mask = new Mask();
    mask.ellipse(pos, radius, radius);

    const tracing = defaultBehaviour();
    const f = rng.float();
    tracing.wiggling = (f * f * f) / 2;
    tracing.curvature = rng.normal();
    tracing.align = rng.pick([2, 0, 1]);
    tracing.spawn = tracing.align === 2 ? 0 : 4;

    const flow = new CircularFlow();
    flow.init(pos, rng.normal() * 20);

    const layer = new Sketcher(mask, flow, rng.normal() * 2, 1, rng);
    layer.tracing = tracing;
    layer.foreground = true;
    return layer;
  }

  static star(
    rng: RNG,
    pos?: Vec2,
    radius: number = 0,
  ): Sketcher {
    if (radius === 0) {
      radius = FIELD_WIDTH / 4;
    }
    if (!pos) {
      pos = new Vec2(
        FIELD_WIDTH * rng.normal(),
        (FIELD_HEIGHT / 2) * rng.normal(),
      );
    }

    const mask = new Mask();
    mask.ellipse(pos, radius, radius);

    const tracing = defaultBehaviour();
    tracing.curvature = rng.normal();
    tracing.align = rng.pick([4, 3]);
    tracing.spawn = tracing.align === 4 ? 4 : 0;

    const flow = new CircularFlow();
    flow.init(pos, rng.normal() * 20);

    const layer = new Sketcher(mask, flow, 0, 5, rng);
    layer.tracing = tracing;
    layer.foreground = true;
    return layer;
  }

  static clumps(
    rng: RNG,
    level: number = 0,
    density: number = 10,
  ): Sketcher {
    const mask = new Mask();
    mask.perlin(
      level > 0 ? level : 0.1 + rng.normal() * 0.2,
      rng,
    );

    const tracing = behaviourRandom(rng);
    tracing.wiggling *= 2;

    let flow: FlowField;
    const choice = Math.floor(rng.float() * 3);
    switch (choice) {
      case 0: {
        tracing.align = rng.pick([0, 2, 3]);
        const circular = new CircularFlow();
        const cx = rng.float() * FIELD_WIDTH;
        const cy = rng.float() * FIELD_HEIGHT;
        circular.init(
          new Vec2(cx, cy),
          10 * rng.normal() * (rng.bool(0.5) ? 1 : -1),
        );
        flow = circular;
        break;
      }
      case 1: {
        tracing.align = rng.pick([0, 2]);
        const linear = new LinearFlow();
        linear.init(
          Vec2.polar(10 * rng.normal(), rng.float() * Math.PI * 2),
        );
        flow = linear;
        break;
      }
      default:
        tracing.align = 0;
        flow = new FlowField();
    }

    const layer = new Sketcher(mask, flow, 3, density, rng);
    layer.tracing = tracing;
    layer.foreground = true;
    return layer;
  }

  static sky(rng: RNG): Sketcher {
    const mask = new Mask();
    const nCells = FIELD_ROWS * FIELD_COLS;
    for (let i = 0; i < FIELD_ROWS; i++)
      for (let j = 0; j < FIELD_COLS; j++)
        mask.values[i][j] = rng.float() < i / nCells;

    const flow = new LinearFlow();
    flow.initHorizontal(
      (rng.bool(0.5) ? 1 : -1) * rng.normal() * 20,
    );

    const tracing = defaultBehaviour();
    const f = rng.float();
    tracing.wiggling = f * f * f;
    tracing.curvature = rng.normal() * 2;
    tracing.roughness = rng.normal() / 6;
    tracing.align = rng.bool(2 / 3) ? 2 : 0;
    tracing.spawn = 2;

    const layer = new Sketcher(mask, flow, 0, 1, rng);
    layer.tracing = tracing;
    return layer;
  }

  static city(rng: RNG): Sketcher {
    const mask = new Mask();
    mask.land(Math.sqrt(rng.normal()) * FIELD_HEIGHT);

    const flow = new LinearFlow();
    flow.initHorizontal(rng.normal2());

    const layer = new Sketcher(mask, flow, 0, 1, rng);
    layer.tracing = behaviourMesh();
    layer.tracing.wiggling = rng.normal() * 0.2;
    layer.tracing.curvature = rng.normal() * 0.05;
    return layer;
  }

  static sea(rng: RNG): Sketcher {
    const mask = new Mask();
    mask.land(Math.sqrt(rng.normal()) * FIELD_HEIGHT);

    const flow = new LinearFlow();
    flow.initHorizontal(
      (rng.bool(0.5) ? 1 : -1) * rng.normal() * 40,
    );

    const tracing = defaultBehaviour();
    const f = rng.float();
    tracing.wiggling = f * f * f;
    tracing.curvature = rng.normal();
    tracing.roughness = rng.normal() / 20;
    // align and spawn stay at defaults: 2 and 4

    const layer = new Sketcher(mask, flow, 2, 1, rng);
    layer.tracing = tracing;
    return layer;
  }

  static mountains(rng: RNG): Sketcher {
    const mask = new Mask();
    mask.land(rng.normal() * FIELD_HEIGHT);

    const flow = new LinearFlow();
    flow.initHorizontal(
      (rng.bool(0.5) ? 1 : -1) * rng.normal() * 5,
    );

    const tracing = defaultBehaviour();
    const f = rng.float();
    tracing.wiggling = f * f * f;
    tracing.curvature = rng.normal();
    tracing.roughness = rng.normal() / 5;
    // align and spawn stay at defaults: 2 and 4

    const layer = new Sketcher(mask, flow, 2, 1, rng);
    layer.tracing = tracing;
    return layer;
  }

  static symbol(rng: RNG, pos?: Vec2, r: number = 1): Sketcher {
    r *= (FIELD_WIDTH * (1 + rng.normal())) / 4;
    if (!pos) {
      pos = new Vec2(
        r + (FIELD_WIDTH - 2 * r) * rng.normal(),
        r + (FIELD_HEIGHT - 2 * r) * rng.normal(),
      );
    }

    const mask = new Mask();
    if (rng.bool(0.5)) {
      const f = rng.float();
      mask.ellipse(pos, r, r * (1 + f * f * f * 0.5));
    } else {
      const f = rng.float();
      mask.rect(pos, r, r * (1 + f * f * f * 0.5));
    }

    const tracing = behaviourRandom(rng);
    let flow: FlowField;
    const choice = Math.floor(rng.float() * 3);
    switch (choice) {
      case 0: {
        tracing.align = rng.pick([0, 2, 3]);
        const circular = new CircularFlow();
        const cx = rng.float() * FIELD_WIDTH;
        const cy = rng.float() * FIELD_HEIGHT;
        circular.init(
          new Vec2(cx, cy),
          10 * rng.normal() * (rng.bool(0.5) ? 1 : -1),
        );
        flow = circular;
        break;
      }
      case 1: {
        tracing.align = rng.pick([0, 2]);
        const linear = new LinearFlow();
        linear.init(
          Vec2.polar(10 * rng.normal(), rng.float() * Math.PI * 2),
        );
        flow = linear;
        break;
      }
      default:
        tracing.align = 0;
        flow = new FlowField();
    }

    const layer = new Sketcher(
      mask,
      flow,
      2 + rng.normal() * 2,
      1,
      rng,
    );
    layer.tracing = tracing;
    layer.density.dilute(0.3, rng);
    layer.foreground = true;
    return layer;
  }

  static pip(
    rng: RNG,
    pos: Vec2,
    r: number,
    suit: SuitProps,
    order: number,
  ): Sketcher {
    const mask = new Mask();
    mask.ellipse(pos, r, r);

    const circular = new CircularFlow();
    circular.init(
      pos.add(new Vec2(suit.focus.x * r, suit.focus.y * r)),
      suit.torsion,
    );

    const nSeeds = (Math.sqrt(order) * suit.density) | 0;
    const layer = new Sketcher(
      mask,
      circular,
      suit.tension,
      nSeeds,
      rng,
    );
    layer.tracing = suit.tracing;
    layer.colors = [suit.color];
    layer.foreground = true;
    return layer;
  }
}

// ---------------------------------------------------------------------------
// Suit properties
// ---------------------------------------------------------------------------
interface SuitProps {
  focus: Vec2;
  torsion: number;
  tension: number;
  density: number;
  tracing: TracerBehaviour;
  color: number;
}

function createSuit(rng: RNG, palette: number[]): SuitProps {
  const color = rng.pick(palette);
  const tension = rng.normal() * 2 + 1;
  const density = Math.floor(1 + rng.float() * 3);
  const torsion = 10 * rng.normal() * (rng.bool(0.5) ? 1 : -1);
  const focus = Vec2.polar(rng.float(), rng.float() * 2 * Math.PI);
  const tracing = behaviourRandom(rng);
  tracing.align = rng.pick([0, 2, 3, 4, 6]);
  tracing.spawn = 4;
  return { focus, torsion, tension, density, tracing, color };
}

// ---------------------------------------------------------------------------
// Card concept tags for major arcana
// ---------------------------------------------------------------------------
const MAJOR_CONCEPTS: Record<number, string[]> = {
  0: ["outdoors", "people"],
  1: ["artifact", "virtue"],
  2: ["people", "indoors"],
  3: ["people", "outdoors"],
  4: ["people", "archetype", "indoors"],
  5: ["people", "indoors"],
  6: ["people", "outdoors"],
  7: ["people", "outdoors"],
  8: ["people", "virtue"],
  9: ["people", "outdoors"],
  10: ["celestial", "event"],
  11: ["people", "virtue", "indoors"],
  12: ["people", "archetype"],
  13: ["archetype", "outdoors"],
  14: ["people", "celestial"],
  15: ["people", "archetype"],
  16: ["event", "outdoors"],
  17: ["celestial", "outdoors"],
  18: ["celestial", "moon", "outdoors"],
  19: ["celestial", "sun", "outdoors"],
  20: ["people", "archetype"],
  21: ["people", "archetype"],
};

// ---------------------------------------------------------------------------
// Card data
// ---------------------------------------------------------------------------
interface CardInfo {
  id: number;
  name: string;
  arcana: "major" | "minor";
  suit?: string;
  number: number;
}

const CARD_DATA: CardInfo[] = [
  ...[
    "The Fool",
    "The Magician",
    "The High Priestess",
    "The Empress",
    "The Emperor",
    "The Hierophant",
    "The Lovers",
    "The Chariot",
    "Strength",
    "The Hermit",
    "Wheel of Fortune",
    "Justice",
    "The Hanged Man",
    "Death",
    "Temperance",
    "The Devil",
    "The Tower",
    "The Star",
    "The Moon",
    "The Sun",
    "Judgement",
    "The World",
  ].map((name, i) => ({ id: i, name, arcana: "major" as const, number: i })),
  ...["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"].map(
    (n, i) => ({
      id: 22 + i,
      name: `${n} of Wands`,
      arcana: "minor" as const,
      suit: "wands",
      number: i + 1,
    }),
  ),
  ...["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"].map(
    (n, i) => ({
      id: 36 + i,
      name: `${n} of Cups`,
      arcana: "minor" as const,
      suit: "cups",
      number: i + 1,
    }),
  ),
  ...["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"].map(
    (n, i) => ({
      id: 50 + i,
      name: `${n} of Swords`,
      arcana: "minor" as const,
      suit: "swords",
      number: i + 1,
    }),
  ),
  ...["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"].map(
    (n, i) => ({
      id: 64 + i,
      name: `${n} of Pentacles`,
      arcana: "minor" as const,
      suit: "pentacles",
      number: i + 1,
    }),
  ),
];

export type GenOptions = {
  palette?: string;
  minThickness?: number;
  maxThickness?: number;
};

// ---------------------------------------------------------------------------
// Layer pipeline
// ---------------------------------------------------------------------------
function runLayers(layers: Sketcher[], rng: RNG): void {
  if (layers.length === 0) return;

  // Set tracing behaviour on first layer
  Tracer.behaviour =
    layers[0].tracing != null
      ? layers[0].tracing
      : behaviourRandom(rng);

  // Add boundary strokes
  const tl = new Vec2(0, 0);
  const tr = new Vec2(FIELD_WIDTH, 0);
  const bl = new Vec2(0, FIELD_HEIGHT);
  const br = new Vec2(FIELD_WIDTH, FIELD_HEIGHT);
  layers[0].addStroke(new Stroke(tl, tr, 0));
  layers[0].addStroke(new Stroke(tr, br, 0));
  layers[0].addStroke(new Stroke(br, bl, 0));
  layers[0].addStroke(new Stroke(bl, tl, 0));

  // Draw first layer
  layers[0].run();

  // Draw subsequent layers
  for (let i = 1; i < layers.length; i++) {
    const layer = layers[i];
    for (let j = 0; j < i; j++) layer.behind(layers[j]);
    layer.strokes = layers[i - 1].strokes;
    layer.fillPoints = layers[i - 1].fillPoints;
    layer.rebuildBuckets();
    Tracer.behaviour =
      layer.tracing != null ? layer.tracing : behaviourRandom(rng);
    layer.run();
  }
}

// ---------------------------------------------------------------------------
// Pip position generation
// ---------------------------------------------------------------------------
function generatePipPositions(
  n: number,
  r: number,
  d: number,
  rng: RNG,
): Vec2[] {
  // Original uses an infinite loop until ok
  for (let attempt = 0; attempt < 1000; attempt++) {
    const positions: Vec2[] = [];
    for (let i = 0; i < n; i++) {
      positions.push(
        new Vec2(
          r + rng.float() * (FIELD_WIDTH - d),
          r + rng.float() * (FIELD_HEIGHT - d),
        ),
      );
    }
    let ok = true;
    for (let i = 0; i < n - 1 && ok; i++) {
      for (let j = i + 1; j < n && ok; j++) {
        if (Vec2.dist(positions[i], positions[j]) < d) {
          ok = false;
        }
      }
    }
    if (ok) return positions;
  }
  // Fallback: grid
  const positions: Vec2[] = [];
  const cols = Math.ceil(Math.sqrt(n));
  for (let i = 0; i < n; i++) {
    const col = i % cols,
      row = Math.floor(i / cols);
    positions.push(
      new Vec2(
        r + ((FIELD_WIDTH - d) * (col + 0.5)) / cols,
        r + ((FIELD_HEIGHT - d) * (row + 0.5)) / Math.ceil(n / cols),
      ),
    );
  }
  return positions;
}

// ---------------------------------------------------------------------------
// generateCard
// ---------------------------------------------------------------------------
function generateCard(
  cardId: number,
  deckSeed: number,
  opts: GenOptions = {},
): string {
  const seed = deckSeed + cardId * 1000;
  const rng = new RNG(seed);

  const card = CARD_DATA[cardId];
  if (!card) throw new Error(`Unknown card id ${cardId}`);

  // Select palette — always consume the RNG roll for consistency
  const paletteNames = Object.keys(PALETTES);
  rng.int0(paletteNames.length);
  const paletteName =
    opts.palette && PALETTES[opts.palette]
      ? opts.palette
      : "RWS";
  const pal = PALETTES[paletteName];

  // Build art style
  const artStyle = makeArtStyle(pal.palette, pal.paper);
  pal.customize(artStyle);

  // Apply overrides
  if (opts.minThickness !== undefined) artStyle.minThickness = opts.minThickness;
  if (opts.maxThickness !== undefined) artStyle.maxThickness = opts.maxThickness;

  // Set up shared RNG reference and art style on Tracer
  Tracer.rng = rng;
  Tracer.artStyle = artStyle;

  const svg = new SVGBuilder();
  svg.paper(artStyle.paper);
  svg.background(artStyle.paper);

  const layers: Sketcher[] = [];

  if (card.arcana === "major") {
    const concepts = MAJOR_CONCEPTS[card.id] || ["outdoors"];
    const indoors = concepts.includes("indoors");
    const outdoors = concepts.includes("outdoors");
    const hasSun =
      concepts.includes("sun") ||
      concepts.includes("moon");
    const hasStar = concepts.includes("celestial") && !hasSun;
    const people =
      indoors ||
      concepts.includes("event") ||
      concepts.includes("virtue");

    if (concepts.includes("artifact")) {
      layers.push(Sketcher.symbol(rng));
    }

    if (
      concepts.includes("archetype") ||
      concepts.includes("virtue")
    ) {
      layers.push(
        Sketcher.figure(
          rng,
          0.8 + rng.normal() * 0.2,
          new Vec2(
            FIELD_WIDTH * rng.normal(),
            FIELD_HEIGHT * (0.5 + rng.normal() * 0.2),
          ),
        ),
      );
    }

    if (people) {
      layers.push(
        Sketcher.figure(
          rng,
          rng.normal(),
          new Vec2(
            FIELD_WIDTH * rng.float(),
            FIELD_HEIGHT * (0.5 + rng.normal() * 0.2),
          ),
        ),
      );
      layers.push(
        Sketcher.figure(
          rng,
          rng.normal(),
          new Vec2(
            FIELD_WIDTH * rng.float(),
            FIELD_HEIGHT * (0.5 + rng.normal() * 0.2),
          ),
        ),
      );
    } else {
      if (rng.bool(0.5)) {
        layers.push(Sketcher.clumps(rng));
      }
    }

    if (indoors || (!outdoors && rng.float() < 0.5)) {
      layers.push(Sketcher.city(rng));
    } else if (outdoors || (!indoors && rng.float() < 0.5)) {
      layers.push(
        rng.float() < 0.5
          ? Sketcher.mountains(rng)
          : Sketcher.sea(rng),
      );
    }

    if (hasSun) layers.push(Sketcher.sun(rng));
    if (hasStar) layers.push(Sketcher.star(rng));

    if (!indoors) {
      if (!hasSun && !hasStar && rng.float() < 1 / layers.length) {
        layers.push(
          rng.bool(1 / 3)
            ? Sketcher.star(rng)
            : Sketcher.sun(rng),
        );
      }
      if (rng.float() < 1 / layers.length) {
        layers.push(Sketcher.sky(rng));
      }
    }
  } else {
    const suit = card.suit!;
    const order = card.number;

    // Create suit properties (shared per suit in original; we create per-card)
    const suitProps = createSuit(rng, artStyle.palette);

    if (order > 10) {
      // Face card
      const numPips = Math.floor(2 + rng.float() * 4);
      const r =
        (0.5 *
          Math.sqrt((FIELD_HEIGHT * FIELD_WIDTH) / numPips)) /
        2;
      const pipPos = new Vec2(
        rng.float() * FIELD_WIDTH,
        rng.float() * FIELD_HEIGHT,
      );
      layers.push(Sketcher.pip(rng, pipPos, r, suitProps, numPips));
      layers.push(
        Sketcher.figure(
          rng,
          0.8 + rng.normal() * 0.2,
          new Vec2(
            FIELD_WIDTH * rng.normal(),
            FIELD_HEIGHT * (0.5 + rng.normal() * 0.2),
          ),
        ),
      );
      if (rng.bool(0.2)) {
        layers.push(Sketcher.clumps(rng, rng.normal() / 5));
      }
      if (rng.float() < 1 / layers.length) {
        switch (Math.floor(rng.float() * 4)) {
          case 0:
            layers.push(Sketcher.sky(rng));
            break;
          case 1:
            layers.push(Sketcher.mountains(rng));
            break;
          case 2:
            layers.push(Sketcher.city(rng));
            break;
          case 3:
            layers.push(Sketcher.sea(rng));
            break;
        }
      }
    } else {
      // Pip card
      const d =
        Math.sqrt((FIELD_HEIGHT * FIELD_WIDTH) / order) / 2;
      const r = 0.5 * d;
      const positions = generatePipPositions(order, r, d, rng);
      for (const pipPos of positions) {
        layers.push(
          Sketcher.pip(rng, pipPos, r, suitProps, order),
        );
      }
      layers.push(
        rng.float() < 0.5
          ? Sketcher.sky(rng)
          : Sketcher.sea(rng),
      );
    }

    // Store suit name for potential use
    void suit;
  }

  runLayers(layers, rng);

  const lastLayer = layers[layers.length - 1];
  const allStrokes = lastLayer.strokes;
  const allFillPoints = lastLayer.fillPoints;

  // Paint shapes
  const painter = new Painter(
    svg,
    allStrokes,
    layers,
    artStyle.palette,
    artStyle,
    rng,
  );
  for (const fp of allFillPoints) painter.fillShape(fp);
  painter.drawAll();

  // Draw strokes
  for (const s of allStrokes) {
    if (s.thickness > 0) {
      svg.stroke(s, artStyle.strokeColor, artStyle.strokeAlpha);
    }
  }

  // Border and text
  svg.border(artStyle.black, 1, artStyle.maxThickness);
  svg.cardText(
    card.name,
    card.arcana === "major" ? card.number : undefined,
    artStyle.black,
    artStyle.paper,
  );

  return svg.build();
}

export { generateCard, CARD_DATA };
export type { CardInfo };
