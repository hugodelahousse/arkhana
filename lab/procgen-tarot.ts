#!/usr/bin/env node
/**
 * Procedural tarot card SVG generator
 * TypeScript port of watabou's Tarot.js (compiled Haxe 4.0.3)
 * Generates all 78 cards as self-contained SVGs
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// PRNG – Park-Miller LCG
// ---------------------------------------------------------------------------
class RNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed | 0;
    if (this.seed === 0) this.seed = 1;
  }

  private next(): void {
    this.seed = ((this.seed * 48271.0) % 2147483647) | 0;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  float(): number {
    this.next();
    return this.seed / 2147483647;
  }

  /** Bell curve 0..1 */
  normal(): number {
    return (this.float() + this.float() + this.float()) / 3;
  }

  /** Bell curve -1..1 */
  normal2(): number {
    return this.normal() * 2 - 1;
  }

  /** Small positive values clustered near 0 */
  small(): number {
    return Math.abs((this.float() + this.float() + this.float() + this.float()) / 2 - 1);
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
// Vec2
// ---------------------------------------------------------------------------
class Vec2 {
  constructor(public x: number = 0, public y: number = 0) {}

  add(v: Vec2): Vec2 { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v: Vec2): Vec2 { return new Vec2(this.x - v.x, this.y - v.y); }
  scale(s: number): Vec2 { return new Vec2(this.x * s, this.y * s); }
  dot(v: Vec2): number { return this.x * v.x + this.y * v.y; }
  cross(v: Vec2): number { return this.x * v.y - this.y * v.x; }
  length(): number { return Math.sqrt(this.x * this.x + this.y * this.y); }
  lengthSq(): number { return this.x * this.x + this.y * this.y; }

  normalize(): Vec2 {
    const l = this.length();
    if (l < 1e-9) return new Vec2(0, 0);
    return new Vec2(this.x / l, this.y / l);
  }

  rotate(angle: number): Vec2 {
    const c = Math.cos(angle), s = Math.sin(angle);
    return new Vec2(this.x * c - this.y * s, this.x * s + this.y * c);
  }

  perpCCW(): Vec2 { return new Vec2(-this.y, this.x); }
  perpCW(): Vec2 { return new Vec2(this.y, -this.x); }

  clone(): Vec2 { return new Vec2(this.x, this.y); }

  static lerp(a: Vec2, b: Vec2, t: number): Vec2 {
    return new Vec2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }

  static dist(a: Vec2, b: Vec2): number { return a.sub(b).length(); }
}

// ---------------------------------------------------------------------------
// Field<T>
// ---------------------------------------------------------------------------
const FIELD_WIDTH = 300;
const FIELD_HEIGHT = 500;
const FIELD_COLS = 30;
const FIELD_ROWS = 50;
const CELL_W = FIELD_WIDTH / FIELD_COLS;   // 10
const CELL_H = FIELD_HEIGHT / FIELD_ROWS;  // 10

class Field<T> {
  values: T[][];

  constructor(fill: T) {
    this.values = [];
    for (let r = 0; r < FIELD_ROWS; r++) {
      this.values.push(new Array(FIELD_COLS).fill(fill));
    }
  }

  /** Pixel coords → cell value */
  get(p: Vec2): T {
    const col = Math.floor(p.x / CELL_W);
    const row = Math.floor(p.y / CELL_H);
    const c = Math.max(0, Math.min(FIELD_COLS - 1, col));
    const r = Math.max(0, Math.min(FIELD_ROWS - 1, row));
    return this.values[r][c];
  }

  set(p: Vec2, value: T): void {
    const col = Math.floor(p.x / CELL_W);
    const row = Math.floor(p.y / CELL_H);
    if (col >= 0 && col < FIELD_COLS && row >= 0 && row < FIELD_ROWS) {
      this.values[row][col] = value;
    }
  }

  /** Pixel coords of center of cell (row i, col j) */
  cellCenter(i: number, j: number): Vec2 {
    return new Vec2((j + 0.5) * CELL_W, (i + 0.5) * CELL_H);
  }
}

// ---------------------------------------------------------------------------
// PerlinNoise
// ---------------------------------------------------------------------------
const BASE_PERM = [
  151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,
  69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,
  94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,
  171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,
  60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,
  1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,
  164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,
  255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,
  119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,
  19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,
  238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,
  181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,
  222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
];

function fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp1(a: number, b: number, t: number): number { return a + t * (b - a); }

function grad2(hash: number, x: number, y: number): number {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
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
    const u = fade(xf), v = fade(yf);
    const aa = this.perm[this.perm[xi] + yi];
    const ab = this.perm[this.perm[xi] + yi + 1];
    const ba = this.perm[this.perm[xi + 1] + yi];
    const bb = this.perm[this.perm[xi + 1] + yi + 1];
    return lerp1(
      lerp1(grad2(aa, xf, yf), grad2(ba, xf - 1, yf), u),
      lerp1(grad2(ab, xf, yf - 1), grad2(bb, xf - 1, yf - 1), u),
      v
    );
  }

  noiseMapHigh(w: number, h: number, octaves: number): number[][] {
    const map: number[][] = [];
    for (let y = 0; y < h; y++) {
      map.push([]);
      for (let x = 0; x < w; x++) {
        let v = 0, amp = 1, freq = 1, max = 0;
        for (let o = 0; o < octaves; o++) {
          v += this.noise(x * freq / w, y * freq / h) * amp;
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
  constructor() { super(false); }

  clone(): Mask {
    const m = new Mask();
    for (let r = 0; r < FIELD_ROWS; r++)
      m.values[r] = [...this.values[r]];
    return m;
  }

  /** Fill rows from level downward (level=-1 → height/2) */
  land(level: number = -1): void {
    const lv = level < 0 ? FIELD_HEIGHT / 2 : level;
    for (let r = 0; r < FIELD_ROWS; r++)
      for (let c = 0; c < FIELD_COLS; c++)
        if (this.cellCenter(r, c).y >= lv)
          this.values[r][c] = true;
  }

  halfPlane(p: Vec2, d: Vec2): void {
    for (let r = 0; r < FIELD_ROWS; r++)
      for (let c = 0; c < FIELD_COLS; c++) {
        const cc = this.cellCenter(r, c);
        this.values[r][c] = cc.sub(p).dot(d) > 0;
      }
  }

  ellipse(center: Vec2, w: number, h: number): void {
    for (let r = 0; r < FIELD_ROWS; r++)
      for (let c = 0; c < FIELD_COLS; c++) {
        const cc = this.cellCenter(r, c);
        const dx = cc.x - center.x, dy = cc.y - center.y;
        this.values[r][c] = (dx * dx) / (w * w) + (dy * dy) / (h * h) <= 1;
      }
  }

  rect(center: Vec2, w: number, h: number): void {
    for (let r = 0; r < FIELD_ROWS; r++)
      for (let c = 0; c < FIELD_COLS; c++) {
        const cc = this.cellCenter(r, c);
        this.values[r][c] = Math.abs(cc.x - center.x) < w && Math.abs(cc.y - center.y) < h;
      }
  }

  perlin(ratio: number, rng: RNG): void {
    const pn = new PerlinNoise(rng.int0(256));
    const map = pn.noiseMapHigh(FIELD_COLS, FIELD_ROWS, 4);
    // Sort all noise values and pick threshold at (1-ratio) quantile
    const flat = map.flat().sort((a, b) => a - b);
    const threshold = flat[Math.floor(flat.length * (1 - ratio))];
    for (let r = 0; r < FIELD_ROWS; r++)
      for (let c = 0; c < FIELD_COLS; c++)
        this.values[r][c] = map[r][c] >= threshold;
  }

  /** Union with another mask */
  union(other: Mask): void {
    for (let r = 0; r < FIELD_ROWS; r++)
      for (let c = 0; c < FIELD_COLS; c++)
        this.values[r][c] = this.values[r][c] || other.values[r][c];
  }
}

// ---------------------------------------------------------------------------
// Density extends Field<number>
// ---------------------------------------------------------------------------
class CellRect {
  constructor(
    public x: number, public y: number,
    public w: number, public h: number
  ) {}

  get randomPoint(): Vec2 {
    // Return center (deterministic for density drain usage)
    return new Vec2(this.x + this.w / 2, this.y + this.h / 2);
  }

  randomPointRng(rng: RNG): Vec2 {
    return new Vec2(this.x + rng.float() * this.w, this.y + rng.float() * this.h);
  }
}

class Density extends Field<number> {
  available: number[] = []; // flat indices (compact array rebuilt on init/dilute)
  private availSet = new Set<number>();

  constructor() { super(0); }

  static fromMask(mask: Mask, density: number = 1): Density {
    const d = new Density();
    for (let r = 0; r < FIELD_ROWS; r++)
      for (let c = 0; c < FIELD_COLS; c++)
        d.values[r][c] = mask.values[r][c] ? density : 0;
    return d;
  }

  init(): void {
    this.availSet.clear();
    for (let r = 0; r < FIELD_ROWS; r++)
      for (let c = 0; c < FIELD_COLS; c++)
        if (this.values[r][c] > 0)
          this.availSet.add(r * FIELD_COLS + c);
    this.available = Array.from(this.availSet);
  }

  drain(p: Vec2): void {
    const col = Math.floor(p.x / CELL_W);
    const row = Math.floor(p.y / CELL_H);
    if (col < 0 || col >= FIELD_COLS || row < 0 || row >= FIELD_ROWS) return;
    this.values[row][col]--;
    if (this.values[row][col] <= 0) {
      const idx = row * FIELD_COLS + col;
      if (this.availSet.delete(idx)) {
        // Rebuild available array lazily from set when needed
        this.available = Array.from(this.availSet);
      }
    }
  }

  dilute(rate: number, rng: RNG): void {
    for (let r = 0; r < FIELD_ROWS; r++)
      for (let c = 0; c < FIELD_COLS; c++)
        if (this.values[r][c] > 0 && rng.float() < rate)
          this.values[r][c] = 0;
    this.init();
  }

  randomAvailableCell(rng: RNG): CellRect {
    const idx = this.available[rng.int0(this.available.length)];
    const row = Math.floor(idx / FIELD_COLS);
    const col = idx % FIELD_COLS;
    return new CellRect(col * CELL_W, row * CELL_H, CELL_W, CELL_H);
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
  return { value: new Vec2(), opposite: new Vec2(), left: new Vec2(), right: new Vec2() };
}

function makeFlow(dir: Vec2): Flow {
  const norm = dir.normalize();
  return {
    value: norm.clone(),
    opposite: norm.scale(-1),
    left: new Vec2(-norm.y, norm.x),
    right: new Vec2(norm.y, -norm.x),
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
  constructor() { super(zeroFlow()); }

  add(term: FlowField): void {
    for (let r = 0; r < FIELD_ROWS; r++)
      for (let c = 0; c < FIELD_COLS; c++)
        this.values[r][c] = addFlow(this.values[r][c], term.values[r][c]);
  }

  /** CircularFlow: tangent to center */
  static circular(center: Vec2, power: number): FlowField {
    const f = new FlowField();
    for (let r = 0; r < FIELD_ROWS; r++)
      for (let c = 0; c < FIELD_COLS; c++) {
        const pos = f.cellCenter(r, c);
        const d = pos.sub(center);
        const len = d.length();
        if (len < 1e-9) continue;
        const tangent = new Vec2(-d.y, d.x).normalize().scale(power);
        f.values[r][c] = makeFlow(tangent);
      }
    return f;
  }

  /** LinearFlow: constant direction */
  static linear(dir: Vec2): FlowField {
    const f = new FlowField();
    const flow = makeFlow(dir);
    for (let r = 0; r < FIELD_ROWS; r++)
      for (let c = 0; c < FIELD_COLS; c++)
        f.values[r][c] = { ...flow, value: flow.value.clone(), opposite: flow.opposite.clone(), left: flow.left.clone(), right: flow.right.clone() };
    return f;
  }
}

// ---------------------------------------------------------------------------
// TensionField
// ---------------------------------------------------------------------------
class TensionField extends FlowField {
  constructor(mask: Mask, power: number, rng: RNG) {
    super();
    // Precompute flat mask array for fast sampling without Vec2 allocation
    const flatMask: boolean[] = new Array(FIELD_ROWS * FIELD_COLS);
    for (let r = 0; r < FIELD_ROWS; r++)
      for (let c = 0; c < FIELD_COLS; c++)
        flatMask[r * FIELD_COLS + c] = mask.values[r][c];

    const radius = Math.min(FIELD_WIDTH, FIELD_HEIGHT) * 0.3;
    const TAU = Math.PI * 2;

    for (let r = 0; r < FIELD_ROWS; r++) {
      for (let c = 0; c < FIELD_COLS; c++) {
        const px = (c + 0.5) * CELL_W;
        const py = (r + 0.5) * CELL_H;
        const m = flatMask[r * FIELD_COLS + c];
        let fx = 0, fy = 0;
        for (let k = 0; k < 40; k++) {
          const angle = rng.float() * TAU;
          const dist = 0.5 + rng.normal() * radius;
          const sx = px + Math.cos(angle) * dist;
          const sy = py + Math.sin(angle) * dist;
          if (sx < 0 || sx >= FIELD_WIDTH || sy < 0 || sy >= FIELD_HEIGHT) continue;
          // Inline mask lookup without Vec2
          const sc = Math.floor(sx / CELL_W);
          const sr = Math.floor(sy / CELL_H);
          const sampleMask = flatMask[sr * FIELD_COLS + sc];
          if (sampleMask !== m) {
            const ox = sx - px, oy = sy - py;
            const l2 = ox * ox + oy * oy;
            if (l2 > 0) {
              fx += ox / l2;
              fy += oy / l2;
            }
          }
        }
        const pwr = 3 * (m ? -power : power) / 40;
        fx *= pwr; fy *= pwr;
        const dir = new Vec2(fx, fy);
        // TensionField: all 4 vectors point the same direction
        this.values[r][c] = { value: dir, opposite: dir, left: dir, right: dir };
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
  align: number;  // 0=value,1=opposite,2=both,3=left+right,4=left,5=right,6=all
  spawn: number;  // 0=forces,1=±X,2=±Y,3=90°snap,4=random
}

function behaviourRandom(rng: RNG): TracerBehaviour {
  return {
    wiggling: 0.5 * rng.small(),
    curvature: 2 * rng.normal(),
    roughness: 0.333 * rng.normal(),
    zigzag: rng.bool(0.1) ? rng.normal() : 0,
    align: rng.pick([0, 2, 6]),
    spawn: 4,
  };
}

function behaviourMesh(rng: RNG): TracerBehaviour {
  return { wiggling: 0, curvature: 0, roughness: 0, zigzag: 0.5, align: 6, spawn: 0 };
}

function behaviourSprings(rng: RNG): TracerBehaviour {
  return {
    wiggling: rng.normal(),
    curvature: rng.normal(),
    roughness: 0,
    zigzag: rng.normal(),
    align: 2,
    spawn: 4,
  };
}

function behaviourStainedGlass(rng: RNG): TracerBehaviour {
  return { wiggling: 0, curvature: 0.1 * rng.normal(), roughness: 0, zigzag: 0, align: 6, spawn: 0 };
}

function behaviourFragments(rng: RNG): TracerBehaviour {
  return { wiggling: 0.2 * rng.normal(), curvature: 0, roughness: 1, zigzag: 0, align: 6, spawn: 0 };
}

function behaviourFruits(rng: RNG): TracerBehaviour {
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
    public thickness: number
  ) {}

  invert(): Stroke {
    return new Stroke(this.end.clone(), this.start.clone(), this.thickness);
  }

  /** Midpoint */
  mid(): Vec2 { return Vec2.lerp(this.start, this.end, 0.5); }
}

// ---------------------------------------------------------------------------
// Intersection helpers
// ---------------------------------------------------------------------------
/**
 * Returns t.x (param on seg AB), t.y (param on seg CD), or null if no hit.
 * t.x ∈ (0,1], t.y ∈ [0,1]
 */
function segIntersect(a: Vec2, b: Vec2, c: Vec2, d: Vec2): { x: number, y: number } | null {
  const r = b.sub(a);
  const s = d.sub(c);
  const denom = r.cross(s);
  if (Math.abs(denom) < 1e-10) return null;
  const t = c.sub(a).cross(s) / denom;
  const u = c.sub(a).cross(r) / denom;
  if (t > 0 && t <= 1 && u >= 0 && u <= 1) return { x: t, y: u };
  return null;
}

// ---------------------------------------------------------------------------
// Tracer
// ---------------------------------------------------------------------------
class Tracer {
  pos: Vec2;
  speed: Vec2;
  steering: number;
  zigzagSign: number;
  thickness: number;
  behaviour: TracerBehaviour;

  constructor(pos: Vec2, speed: Vec2, thickness: number, behaviour: TracerBehaviour) {
    this.pos = pos.clone();
    this.speed = speed.clone();
    this.thickness = thickness;
    this.behaviour = behaviour;
    this.steering = 0;
    this.zigzagSign = 1;
  }

  /** Pick force vectors based on align setting */
  private forces(flow: Flow): Vec2[] {
    switch (this.behaviour.align) {
      case 0: return [flow.value];
      case 1: return [flow.opposite];
      case 2: return [flow.value, flow.opposite];
      case 3: return [flow.left, flow.right];
      case 4: return [flow.left];
      case 5: return [flow.right];
      default: return [flow.value, flow.opposite, flow.left, flow.right];
    }
  }

  trace(flow: Flow, rng: RNG, e: number = 0.5): Stroke {
    const forceVecs = this.forces(flow);

    // Steer toward most aligned force
    let best = forceVecs[0];
    let bestDot = this.speed.dot(forceVecs[0]);
    for (let i = 1; i < forceVecs.length; i++) {
      const d = this.speed.dot(forceVecs[i]);
      if (d > bestDot) { bestDot = d; best = forceVecs[i]; }
    }

    this.speed = this.speed.add(best.scale(e));
    // Perpendicular steering bias
    const perp = this.speed.perpCCW().normalize();
    this.speed = this.speed.add(perp.scale(this.steering * e));

    // Clamp speed to 10
    const l = this.speed.length();
    if (l > 10) this.speed = this.speed.scale(10 / l);
    if (l < 1e-9) this.speed = new Vec2(1, 0);

    // Possibly resample steering
    const wigglingProb = 1 - Math.pow(1 - Math.min(this.behaviour.wiggling, 1), e);
    if (rng.float() < wigglingProb) {
      this.steering = rng.normal2() * this.behaviour.curvature;
      if (this.behaviour.zigzag !== 0) {
        this.zigzagSign *= -1;
        this.speed = this.speed.rotate(this.zigzagSign * this.behaviour.zigzag * Math.PI);
      } else {
        const roughProb = 1 - Math.pow(1 - Math.min(this.behaviour.roughness, 1), e);
        if (rng.float() < roughProb) {
          this.speed = this.speed.rotate(rng.float() * Math.PI * 2);
        }
      }
    }

    const newPos = this.pos.add(this.speed.scale(e));
    const s = new Stroke(this.pos.clone(), newPos, this.thickness);
    this.pos = newPos.clone();
    return s;
  }

  /** Spawn a pair of tracers from a seed point */
  static spawn(
    pos: Vec2,
    flow: Flow,
    thickness: number,
    behaviour: TracerBehaviour,
    rng: RNG
  ): [Tracer, Tracer] {
    let dir: Vec2;
    switch (behaviour.spawn) {
      case 0: {
        // Pick from forces or random if zero
        const forces: Vec2[] = [];
        [flow.value, flow.opposite, flow.left, flow.right].forEach(v => {
          if (v.lengthSq() > 1e-9) forces.push(v);
        });
        dir = forces.length > 0 ? rng.pick(forces).normalize() : new Vec2(Math.cos(rng.float() * Math.PI * 2), Math.sin(rng.float() * Math.PI * 2));
        break;
      }
      case 1: dir = new Vec2(rng.bool() ? 1 : -1, 0); break;
      case 2: dir = new Vec2(0, rng.bool() ? 1 : -1); break;
      case 3: {
        const angle = Math.round(rng.float() * 4) * Math.PI / 2;
        dir = new Vec2(Math.cos(angle), Math.sin(angle));
        break;
      }
      default: {
        const angle = rng.float() * Math.PI * 2;
        dir = new Vec2(Math.cos(angle), Math.sin(angle));
      }
    }
    const speed = dir.scale(10);
    const t1 = new Tracer(pos, speed, thickness, behaviour);
    const t2 = new Tracer(pos, speed.scale(-1), thickness, behaviour);
    t1.steering = rng.normal2() * behaviour.curvature;
    t2.steering = rng.normal2() * behaviour.curvature;
    return [t1, t2];
  }
}

// ---------------------------------------------------------------------------
// ArtStyle / color palettes
// ---------------------------------------------------------------------------
interface ArtStyle {
  palette: number[];
  paper: number;
  minThickness: number;
  maxThickness: number;
  strokeAlpha: number;
}

const PALETTES: Record<string, { palette: number[], paper: number }> = {
  RWS: {
    palette: [2235422, 16175105, 15261083, 6920637, 13228245, 8163628, 13659960, 12525858, 14592886],
    paper: 15658728,
  },
  gobelin: {
    palette: [661523, 7166555, 8455957, 10375458, 11042597, 7038275, 6455759, 1191267, 3223625, 13734770],
    paper: 15328210,
  },
  viscontiSforza: {
    palette: [15393210, 4204826, 10382144, 15611145, 13460224, 16557836, 6056742, 4804982, 14394753],
    paper: 16445128,
  },
  wildwood: {
    palette: [3091760, 5399135, 14240534, 9722430, 12758050, 16110202, 6192969, 3296050, 4739962, 14083045],
    paper: 15986675,
  },
};

function intToHex(n: number): string {
  return "#" + ((n | 0) >>> 0).toString(16).padStart(6, "0");
}

function hexToRGB(n: number): [number, number, number] {
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgbToHex(r: number, g: number, b: number): number {
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

function adjustLightness(color: number, factor: number): number {
  let [r, g, b] = hexToRGB(color);
  r = Math.min(255, Math.max(0, Math.round(r + (factor > 0 ? (255 - r) : r) * Math.abs(factor))));
  g = Math.min(255, Math.max(0, Math.round(g + (factor > 0 ? (255 - g) : g) * Math.abs(factor))));
  b = Math.min(255, Math.max(0, Math.round(b + (factor > 0 ? (255 - b) : b) * Math.abs(factor))));
  return rgbToHex(r, g, b);
}

function gradient(color: number): [number, number, number] {
  return [adjustLightness(color, -0.2), color, adjustLightness(color, 0.2)];
}

function colorDistance(a: number, b: number): number {
  const [ar, ag, ab] = hexToRGB(a);
  const [br, bg, bb] = hexToRGB(b);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}

function medianDarkColor(palette: number[]): number {
  // Sort by lightness, pick one in the lower half
  const withLuminance = palette.map(c => {
    const [r, g, b] = hexToRGB(c);
    return { c, lum: 0.299 * r + 0.587 * g + 0.114 * b };
  });
  withLuminance.sort((a, b) => a.lum - b.lum);
  return withLuminance[Math.floor(withLuminance.length * 0.4)].c;
}

// ---------------------------------------------------------------------------
// SVGBuilder
// ---------------------------------------------------------------------------
class SVGBuilder {
  private elements: string[] = [];
  private defs: string[] = [];
  private gradientCount = 0;

  background(color: number): void {
    this.elements.push(
      `<rect width="${FIELD_WIDTH}" height="${FIELD_HEIGHT}" fill="${intToHex(color)}"/>`
    );
  }

  border(color: number): void {
    this.elements.push(
      `<rect x="8" y="8" width="${FIELD_WIDTH - 16}" height="${FIELD_HEIGHT - 16}" ` +
      `fill="none" stroke="${intToHex(color)}" stroke-width="3" rx="4"/>`
    );
  }

  stroke(s: Stroke, color: number, alpha: number): void {
    const x1 = s.start.x.toFixed(2), y1 = s.start.y.toFixed(2);
    const x2 = s.end.x.toFixed(2), y2 = s.end.y.toFixed(2);
    this.elements.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ` +
      `stroke="${intToHex(color)}" stroke-width="${s.thickness.toFixed(2)}" ` +
      `stroke-opacity="${alpha.toFixed(3)}" stroke-linecap="round"/>`
    );
  }

  polygon(
    points: Vec2[],
    fillColor: number,
    fillOpacity: number = 1,
    gradientColors?: [number, number, number],
    gradientType?: "linear" | "radial",
    gradientAngle?: number
  ): void {
    const pts = points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
    let fill: string;

    if (gradientColors) {
      const id = `grad${this.gradientCount++}`;
      const [dark, mid, light] = gradientColors;

      if (gradientType === "radial") {
        // Compute bounding box for radial gradient center
        const xs = points.map(p => p.x), ys = points.map(p => p.y);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        this.defs.push(
          `<radialGradient id="${id}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" ` +
          `r="${Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2}" gradientUnits="userSpaceOnUse">` +
          `<stop offset="0%" stop-color="${intToHex(mid)}"/>` +
          `<stop offset="60%" stop-color="${intToHex(dark)}"/>` +
          `<stop offset="100%" stop-color="${intToHex(light)}"/>` +
          `</radialGradient>`
        );
      } else {
        const angle = gradientAngle ?? 0;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const xs = points.map(p => p.x), ys = points.map(p => p.y);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        const len = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2;
        this.defs.push(
          `<linearGradient id="${id}" x1="${(cx - cos * len).toFixed(1)}" y1="${(cy - sin * len).toFixed(1)}" ` +
          `x2="${(cx + cos * len).toFixed(1)}" y2="${(cy + sin * len).toFixed(1)}" gradientUnits="userSpaceOnUse">` +
          `<stop offset="0%" stop-color="${intToHex(dark)}"/>` +
          `<stop offset="50%" stop-color="${intToHex(mid)}"/>` +
          `<stop offset="100%" stop-color="${intToHex(light)}"/>` +
          `</linearGradient>`
        );
      }
      fill = `url(#${id})`;
    } else {
      fill = intToHex(fillColor);
    }

    this.elements.push(
      `<polygon points="${pts}" fill="${fill}" fill-opacity="${fillOpacity.toFixed(3)}"/>`
    );
  }

  build(): string {
    const defsBlock = this.defs.length > 0 ? `<defs>${this.defs.join("")}</defs>` : "";
    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${FIELD_WIDTH}" height="${FIELD_HEIGHT}" ` +
      `viewBox="0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}">\n` +
      defsBlock +
      this.elements.join("\n") +
      `\n</svg>`
    );
  }
}

// ---------------------------------------------------------------------------
// Painter – shape-finding and polygon filling
// ---------------------------------------------------------------------------
class Painter {
  private allStrokes: Stroke[] = [];
  private pt2stroke: Map<string, Stroke[]> = new Map();
  private filled = new Set<string>();
  private svgBuilder: SVGBuilder;
  private palette: number[];
  private totalArea: number;
  private sketchers: Sketcher[] = [];

  constructor(svgBuilder: SVGBuilder, palette: number[]) {
    this.svgBuilder = svgBuilder;
    this.palette = palette;
    this.totalArea = FIELD_WIDTH * FIELD_HEIGHT;
  }

  addSketcher(sk: Sketcher): void {
    this.sketchers.push(sk);
    for (const s of sk.strokes) {
      this.allStrokes.push(s);
      this.addToPt2Stroke(s.start, s);
      this.addToPt2Stroke(s.end, s);
    }
  }

  private ptKey(p: Vec2): string {
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }

  private addToPt2Stroke(p: Vec2, s: Stroke): void {
    const k = this.ptKey(p);
    if (!this.pt2stroke.has(k)) this.pt2stroke.set(k, []);
    this.pt2stroke.get(k)!.push(s);
  }

  private findShape(startP: Vec2): Vec2[] | null {
    // Cast ray rightward from startP, find first stroke
    let bestStroke: Stroke | null = null;
    let bestT = Infinity;

    for (const s of this.allStrokes) {
      const sa = s.start, sb = s.end;
      // Ray: startP + (t, 0) for t > 0
      // Intersect with segment sa→sb
      const dy = sb.y - sa.y;
      if (Math.abs(dy) < 1e-9) continue;
      const t = (sa.y - startP.y) / dy;
      if (t < 0 || t > 1) continue;
      const ix = sa.x + t * (sb.x - sa.x);
      if (ix <= startP.x) continue;
      const tx = ix - startP.x;
      if (tx < bestT) { bestT = tx; bestStroke = s; }
    }

    if (!bestStroke) return null;

    // Normalize so that end.y >= start.y
    let cur = bestStroke;
    if (cur.end.y < cur.start.y) cur = cur.invert();

    const shape: Vec2[] = [cur.start.clone()];

    for (let iter = 0; iter < this.allStrokes.length + 1; iter++) {
      // At cur.end, find next stroke by minimum signed angle (rightmost turn)
      const endKey = this.ptKey(cur.end);
      const candidates = (this.pt2stroke.get(endKey) || []).filter(s => {
        const k1 = this.ptKey(s.start), k2 = this.ptKey(s.end);
        const curStartKey = this.ptKey(cur.start);
        return k1 !== curStartKey && k2 !== curStartKey;
      });

      if (candidates.length === 0) break;

      const dir = cur.end.sub(cur.start);
      let bestNext: Stroke | null = null;
      let bestAngle = Infinity;

      for (const cand of candidates) {
        let s = cand;
        // Normalize so s.start == cur.end
        if (this.ptKey(s.end) === endKey) s = s.invert();
        const d = s.end.sub(s.start);
        let angle = Math.atan2(dir.cross(d), dir.dot(d));
        if (angle < 0) angle += Math.PI * 2;
        if (angle < bestAngle) { bestAngle = angle; bestNext = s; }
      }

      if (!bestNext) break;

      let next = bestNext;
      if (this.ptKey(next.end) === endKey) next = next.invert();
      shape.push(cur.end.clone());
      cur = next;

      if (this.ptKey(cur.end) === this.ptKey(shape[0])) break;

      // Detect loop: find innermost loop if shape visits same point twice
      if (shape.length > this.allStrokes.length) {
        // Return what we have
        break;
      }
    }

    if (shape.length < 3) return null;
    return shape;
  }

  private polygonArea(pts: Vec2[]): number {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    return Math.abs(a) / 2;
  }

  private polygonCentroid(pts: Vec2[]): Vec2 {
    let cx = 0, cy = 0;
    for (const p of pts) { cx += p.x; cy += p.y; }
    return new Vec2(cx / pts.length, cy / pts.length);
  }

  private compactness(pts: Vec2[]): number {
    const area = this.polygonArea(pts);
    let perim = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      perim += Vec2.dist(pts[i], pts[j]);
    }
    if (perim < 1e-9) return 0;
    return 4 * Math.PI * area / (perim * perim);
  }

  fillShape(p: Vec2, rng: RNG): void {
    const key = `${Math.floor(p.x / CELL_W)},${Math.floor(p.y / CELL_H)}`;
    if (this.filled.has(key)) return;
    this.filled.add(key);

    const shape = this.findShape(p);
    if (!shape || shape.length < 3) return;

    const area = this.polygonArea(shape);
    if (area < 1) return;

    // Choose color: probability based on sqrt(area / totalArea)
    const prob = Math.sqrt(area / this.totalArea);
    let colorIdx: number;
    if (rng.float() < prob) {
      colorIdx = rng.int0(this.palette.length);
    } else {
      colorIdx = 0; // darkest / first
    }
    const color = this.palette[colorIdx];

    const compact = this.compactness(shape);
    const gradColors = gradient(color) as [number, number, number];

    if (compact > 0.8) {
      this.svgBuilder.polygon(shape, color, 0.7, gradColors, "radial");
    } else {
      // Compute OBB major axis angle
      const centroid = this.polygonCentroid(shape);
      let angle = 0;
      if (shape.length >= 2) {
        const first = shape[0].sub(centroid);
        angle = Math.atan2(first.y, first.x);
      }
      this.svgBuilder.polygon(shape, color, 0.7, gradColors, "linear", angle);
    }
  }

  fillAll(rng: RNG): void {
    // Sample fill points across the canvas
    for (let r = 1; r < FIELD_ROWS - 1; r += 2) {
      for (let c = 1; c < FIELD_COLS - 1; c += 2) {
        const p = new Vec2((c + 0.5) * CELL_W, (r + 0.5) * CELL_H);
        this.fillShape(p, rng);
      }
    }
    // Also fill from explicit fill points from tracers
    for (const sk of this.sketchers) {
      for (const fp of sk.fillPoints) {
        this.fillShape(fp, rng);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Sketcher
// ---------------------------------------------------------------------------
interface SketcherStyle {
  minThickness: number;
  maxThickness: number;
  colors: number[];
}

// Spatial bucket for O(1) stroke neighborhood lookups
const BUCKET_SIZE = 20; // pixels per bucket cell
const BUCKET_COLS = Math.ceil(FIELD_WIDTH / BUCKET_SIZE);
const BUCKET_ROWS = Math.ceil(FIELD_HEIGHT / BUCKET_SIZE);

class Sketcher {
  mask: Mask;
  flow: FlowField;
  density: Density;
  tracers: Tracer[] = [];
  strokes: Stroke[] = [];
  fillPoints: Vec2[] = [];
  behaviour: TracerBehaviour;
  style: SketcherStyle;
  private rng: RNG;
  // Spatial bucket index: bucket cell → stroke indices
  private buckets: Set<number>[][] = [];

  constructor(
    mask: Mask,
    flow: FlowField,
    behaviour: TracerBehaviour,
    style: SketcherStyle,
    rng: RNG,
    tightness: number = 3,
    nSeeds: number = 1
  ) {
    this.mask = mask;
    this.rng = rng;
    this.behaviour = behaviour;
    this.style = style;

    if (tightness > 0) {
      const tension = new TensionField(mask, tightness, rng);
      flow.add(tension);
    }
    this.flow = flow;

    this.density = Density.fromMask(mask, nSeeds);
    this.density.init();

    // Init spatial buckets
    for (let r = 0; r < BUCKET_ROWS; r++) {
      this.buckets.push([]);
      for (let c = 0; c < BUCKET_COLS; c++) {
        this.buckets[r].push(new Set<number>());
      }
    }
  }

  private bucketFor(x: number, y: number): Set<number> | null {
    const bc = Math.floor(x / BUCKET_SIZE);
    const br = Math.floor(y / BUCKET_SIZE);
    if (bc < 0 || bc >= BUCKET_COLS || br < 0 || br >= BUCKET_ROWS) return null;
    return this.buckets[br][bc];
  }

  private addToBuckets(idx: number, s: Stroke): void {
    const minX = Math.min(s.start.x, s.end.x);
    const maxX = Math.max(s.start.x, s.end.x);
    const minY = Math.min(s.start.y, s.end.y);
    const maxY = Math.max(s.start.y, s.end.y);
    const c0 = Math.max(0, Math.floor(minX / BUCKET_SIZE));
    const c1 = Math.min(BUCKET_COLS - 1, Math.floor(maxX / BUCKET_SIZE));
    const r0 = Math.max(0, Math.floor(minY / BUCKET_SIZE));
    const r1 = Math.min(BUCKET_ROWS - 1, Math.floor(maxY / BUCKET_SIZE));
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        this.buckets[r][c].add(idx);
  }

  private candidatesNear(s: Stroke): Set<number> {
    const minX = Math.min(s.start.x, s.end.x);
    const maxX = Math.max(s.start.x, s.end.x);
    const minY = Math.min(s.start.y, s.end.y);
    const maxY = Math.max(s.start.y, s.end.y);
    const c0 = Math.max(0, Math.floor(minX / BUCKET_SIZE));
    const c1 = Math.min(BUCKET_COLS - 1, Math.floor(maxX / BUCKET_SIZE));
    const r0 = Math.max(0, Math.floor(minY / BUCKET_SIZE));
    const r1 = Math.min(BUCKET_ROWS - 1, Math.floor(maxY / BUCKET_SIZE));
    const result = new Set<number>();
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        this.buckets[r][c].forEach(i => result.add(i));
    return result;
  }

  draw(): boolean {
    // Advance all tracers
    const dead: number[] = [];
    for (let i = 0; i < this.tracers.length; i++) {
      const t = this.tracers[i];
      const flow = this.flow.get(t.pos);
      const s = t.trace(flow, this.rng);
      const alive = this.validate(s);
      this.addStroke(s);
      if (!alive) {
        // Push midpoint + perp to fillPoints
        const mid = s.mid();
        const dir = s.end.sub(s.start);
        if (dir.lengthSq() > 1e-9) {
          const perp = dir.perpCCW().normalize().scale(5);
          this.fillPoints.push(mid.add(perp));
        }
        dead.push(i);
      }
      // Kill tracers that leave bounds
      if (
        t.pos.x < 0 || t.pos.x >= FIELD_WIDTH ||
        t.pos.y < 0 || t.pos.y >= FIELD_HEIGHT
      ) {
        if (!dead.includes(i)) dead.push(i);
      }
    }
    for (let i = dead.length - 1; i >= 0; i--) {
      this.tracers.splice(dead[i], 1);
    }

    if (this.tracers.length > 0) return true;
    if (this.density.available.length > 0) {
      const cell = this.density.randomAvailableCell(this.rng);
      this.spawn(cell.randomPointRng(this.rng));
      return true;
    }
    return false;
  }

  private validate(s: Stroke): boolean {
    let closestT = Infinity;
    let closestU = 0;
    let closestIdx = -1;

    const candidates = this.candidatesNear(s);
    for (const i of candidates) {
      const other = this.strokes[i];
      const hit = segIntersect(s.start, s.end, other.start, other.end);
      if (hit && hit.x < closestT) {
        closestT = hit.x;
        closestU = hit.y;
        closestIdx = i;
      }
    }

    if (closestIdx >= 0) {
      const other = this.strokes[closestIdx];
      if (closestU < 0.01) {
        s.end = other.start.clone();
      } else if (closestU > 0.99) {
        s.end = other.end.clone();
      } else {
        // Split other stroke at intersection
        const ip = Vec2.lerp(other.start, other.end, closestU);
        s.end = ip.clone();
        const newIdx = this.strokes.length; // will be added as strokes[newIdx] after splice... actually needs careful handling
        const second = new Stroke(ip.clone(), other.end.clone(), other.thickness);
        other.end = ip.clone();
        this.strokes.splice(closestIdx + 1, 0, second);
        // Re-bucket the split stroke (other was mutated, re-add new stroke)
        this.addToBuckets(closestIdx + 1, second);
        // closestIdx bucket is stale but small error, acceptable
      }
      return false;
    }
    return true;
  }

  spawn(p: Vec2): void {
    const thickness = this.rng.float() < 0.5
      ? this.style.minThickness
      : this.style.minThickness + (this.style.maxThickness - this.style.minThickness) * this.rng.normal();
    const flow = this.flow.get(p);
    const [t1, t2] = Tracer.spawn(p, flow, thickness, this.behaviour, this.rng);
    this.tracers.push(t1, t2);
    this.density.drain(p);
  }

  addStroke(s: Stroke): void {
    const idx = this.strokes.length;
    this.strokes.push(s);
    this.addToBuckets(idx, s);
    this.density.drain(s.end);
  }

  /** Run until complete */
  run(maxIter: number = 2000): void {
    for (let i = 0; i < maxIter; i++) {
      if (!this.draw()) break;
    }
  }

  // ---- Factory methods ----

  static figure(
    rng: RNG,
    style: SketcherStyle,
    height: number = 1,
    posX?: number
  ): Sketcher {
    const h = FIELD_HEIGHT * height;
    const w = h * (0.25 + rng.normal() / 4);
    const cx = posX !== undefined ? posX : FIELD_WIDTH / 2 + rng.normal2() * 20;
    const cy = FIELD_HEIGHT / 2 + h / 4;
    const pos = new Vec2(cx, cy);

    const mask = new Mask();
    // Body ellipse
    const bodyMask = new Mask();
    bodyMask.ellipse(pos, w / 2, h / 2);
    // Head ellipse (displaced upward)
    const headMask = new Mask();
    const headR = w * (0.2 + rng.normal() * 0.1);
    headMask.ellipse(new Vec2(cx + rng.normal2() * headR * 0.3, cy - h / 2 - headR * 0.5), headR, headR);
    mask.union(bodyMask);
    mask.union(headMask);

    const behaviour = behaviourRandom(rng);
    behaviour.align = rng.pick([3, 6]);
    const center = new Vec2(cx + rng.normal2() * 30, cy + rng.normal2() * 30);
    const flow = FlowField.circular(center, rng.normal() * 20);

    return new Sketcher(mask, flow, behaviour, style, rng, 4, 1);
  }

  static sun(
    rng: RNG,
    style: SketcherStyle,
    posX?: number,
    posY?: number,
    radius: number = 0
  ): Sketcher {
    const r = radius > 0 ? radius : FIELD_WIDTH * rng.normal() * 0.3 + 20;
    const cx = posX !== undefined ? posX : FIELD_WIDTH * (0.2 + rng.float() * 0.6);
    const cy = posY !== undefined ? posY : FIELD_HEIGHT * (0.1 + rng.float() * 0.5);
    const pos = new Vec2(cx, cy);

    const mask = new Mask();
    mask.ellipse(pos, r, r);

    const align = rng.pick([2, 0, 1]);
    const wiggling = Math.pow(rng.float(), 3) / 2;
    const curvature = rng.normal();
    const spawn = align === 2 ? 0 : 4;

    const behaviour: TracerBehaviour = {
      wiggling, curvature, roughness: 0, zigzag: 0, align, spawn,
    };
    const flow = FlowField.circular(pos, rng.normal() * 20);
    return new Sketcher(mask, flow, behaviour, style, rng, rng.normal() * 2, 1);
  }

  static star(
    rng: RNG,
    style: SketcherStyle,
    posX?: number,
    posY?: number,
    radius: number = FIELD_WIDTH / 4
  ): Sketcher {
    const cx = posX !== undefined ? posX : FIELD_WIDTH * (0.1 + rng.float() * 0.8);
    const cy = posY !== undefined ? posY : FIELD_HEIGHT * (0.05 + rng.float() * 0.4);
    const pos = new Vec2(cx, cy);
    const r = radius * (0.3 + rng.normal() * 0.4);

    const mask = new Mask();
    mask.ellipse(pos, r, r);

    const align = rng.pick([4, 3]);
    const behaviour: TracerBehaviour = {
      wiggling: 0, curvature: rng.normal(), roughness: 0, zigzag: 0,
      align, spawn: align === 4 ? 4 : 0,
    };
    const flow = FlowField.circular(pos, rng.normal() * 10);
    return new Sketcher(mask, flow, behaviour, style, rng, 0, 5);
  }

  static clumps(
    rng: RNG,
    style: SketcherStyle,
    level: number = 0,
    density: number = 10
  ): Sketcher {
    const mask = new Mask();
    const ratio = level <= 0 ? 0.1 + rng.normal() * 0.2 : level;
    mask.perlin(Math.max(0.05, Math.min(0.5, ratio)), rng);

    const behaviour = behaviourRandom(rng);
    behaviour.wiggling *= 2;

    const choice = rng.int0(3);
    let flow: FlowField;
    if (choice === 0) {
      const cx = FIELD_WIDTH / 2 + rng.normal2() * FIELD_WIDTH * 0.3;
      const cy = FIELD_HEIGHT / 2 + rng.normal2() * FIELD_HEIGHT * 0.3;
      flow = FlowField.circular(new Vec2(cx, cy), rng.normal() * 20);
    } else if (choice === 1) {
      flow = FlowField.linear(new Vec2(rng.normal2(), rng.normal2()));
    } else {
      flow = new FlowField();
    }

    return new Sketcher(mask, flow, behaviour, style, rng, 3, 1);
  }

  static sky(rng: RNG, style: SketcherStyle): Sketcher {
    const mask = new Mask();
    // Probability of cell being set increases downward
    for (let r = 0; r < FIELD_ROWS; r++)
      for (let c = 0; c < FIELD_COLS; c++)
        mask.values[r][c] = rng.float() < r / FIELD_ROWS;

    const sign = rng.bool() ? 1 : -1;
    const speed = sign * rng.normal() * 20;
    const flow = FlowField.linear(new Vec2(speed, 0));

    const wiggling = Math.pow(rng.float(), 3);
    const align = rng.bool(0.667) ? 2 : 0;
    const behaviour: TracerBehaviour = {
      wiggling, curvature: rng.normal() * 2, roughness: rng.normal() / 6,
      zigzag: 0, align, spawn: 2,
    };

    return new Sketcher(mask, flow, behaviour, style, rng, 0, 1);
  }

  static city(rng: RNG, style: SketcherStyle): Sketcher {
    const mask = new Mask();
    const level = Math.sqrt(rng.normal()) * FIELD_HEIGHT;
    mask.land(FIELD_HEIGHT - level);

    const flow = FlowField.linear(new Vec2(rng.normal2(), 0));
    const behaviour = behaviourMesh(rng);
    behaviour.wiggling = rng.normal() * 0.2;
    behaviour.curvature = rng.normal() * 0.05;

    return new Sketcher(mask, flow, behaviour, style, rng, 0, 1);
  }

  static sea(rng: RNG, style: SketcherStyle): Sketcher {
    const mask = new Mask();
    const level = Math.sqrt(rng.normal()) * FIELD_HEIGHT;
    mask.land(FIELD_HEIGHT - level);

    const sign = rng.bool() ? 1 : -1;
    const speed = sign * rng.normal() * 40;
    const flow = FlowField.linear(new Vec2(speed, 0));

    const wiggling = Math.pow(rng.float(), 3);
    const behaviour: TracerBehaviour = {
      wiggling, curvature: rng.normal(), roughness: rng.normal() / 20,
      zigzag: 0, align: rng.bool(0.667) ? 2 : 0, spawn: 2,
    };

    return new Sketcher(mask, flow, behaviour, style, rng, 2, 1);
  }

  static mountains(rng: RNG, style: SketcherStyle): Sketcher {
    const mask = new Mask();
    const level = rng.normal() * FIELD_HEIGHT;
    mask.land(FIELD_HEIGHT - level);

    const sign = rng.bool() ? 1 : -1;
    const speed = sign * rng.normal() * 5;
    const flow = FlowField.linear(new Vec2(speed, 0));

    const wiggling = Math.pow(rng.float(), 3);
    const behaviour: TracerBehaviour = {
      wiggling, curvature: rng.normal(), roughness: rng.normal() / 5,
      zigzag: 0, align: rng.bool(0.667) ? 2 : 0, spawn: 2,
    };

    return new Sketcher(mask, flow, behaviour, style, rng, 2, 1);
  }

  static symbol(
    rng: RNG,
    style: SketcherStyle,
    posX?: number,
    posY?: number,
    r: number = 1
  ): Sketcher {
    r *= FIELD_WIDTH * (1 + rng.normal()) / 4;
    r = Math.max(10, r);
    const cx = posX !== undefined ? posX : FIELD_WIDTH * (0.2 + rng.float() * 0.6);
    const cy = posY !== undefined ? posY : FIELD_HEIGHT * (0.2 + rng.float() * 0.5);
    const pos = new Vec2(cx, cy);

    const mask = new Mask();
    if (rng.bool()) {
      mask.ellipse(pos, r, r);
    } else {
      mask.rect(pos, r, r);
    }

    const behaviour = behaviourRandom(rng);
    const choice = rng.int0(3);
    let flow: FlowField;
    if (choice === 0) {
      flow = FlowField.circular(pos, rng.normal() * 15);
    } else if (choice === 1) {
      flow = FlowField.linear(new Vec2(rng.normal2(), rng.normal2()));
    } else {
      flow = new FlowField();
    }

    const sk = new Sketcher(mask, flow, behaviour, style, rng, 2 + rng.normal() * 2, 1);
    sk.density.dilute(0.3, rng);
    return sk;
  }

  static pip(
    rng: RNG,
    style: SketcherStyle,
    pos: Vec2,
    r: number,
    suitProps: SuitProps
  ): Sketcher {
    const mask = new Mask();
    mask.ellipse(pos, r, r);

    const focusOffset = suitProps.focus.scale(r);
    const circCenter = pos.add(focusOffset);
    const flow = FlowField.circular(circCenter, suitProps.torsion);

    const nSeeds = Math.max(1, Math.round(Math.sqrt(suitProps.order) * suitProps.density));
    return new Sketcher(mask, flow, suitProps.tracing, style, rng, suitProps.tension, nSeeds);
  }
}

// ---------------------------------------------------------------------------
// Suit properties for pip cards
// ---------------------------------------------------------------------------
interface SuitProps {
  focus: Vec2;
  torsion: number;
  tension: number;
  density: number;
  tracing: TracerBehaviour;
  color: number;
  order: number;
}

function getSuitProps(suit: string, order: number, rng: RNG, palette: number[]): SuitProps {
  const colorMap: Record<string, number> = {
    wands: palette[Math.min(6, palette.length - 1)],
    cups: palette[Math.min(3, palette.length - 1)],
    swords: palette[Math.min(1, palette.length - 1)],
    pentacles: palette[Math.min(4, palette.length - 1)],
  };

  const props: Record<string, Omit<SuitProps, "color" | "order">> = {
    wands: {
      focus: new Vec2(0.2, -0.3),
      torsion: 15,
      tension: 2,
      density: 1.5,
      tracing: behaviourFruits(rng),
    },
    cups: {
      focus: new Vec2(0, 0.1),
      torsion: 5,
      tension: 3,
      density: 2,
      tracing: behaviourSprings(rng),
    },
    swords: {
      focus: new Vec2(0, -0.5),
      torsion: 20,
      tension: 1,
      density: 1,
      tracing: behaviourFragments(rng),
    },
    pentacles: {
      focus: new Vec2(0, 0),
      torsion: 8,
      tension: 4,
      density: 3,
      tracing: behaviourStainedGlass(rng),
    },
  };

  return {
    ...(props[suit] || props.wands),
    color: colorMap[suit] || palette[0],
    order,
  };
}

// ---------------------------------------------------------------------------
// Card concept tags for major arcana
// ---------------------------------------------------------------------------
const MAJOR_CONCEPTS: Record<number, string[]> = {
  0: ["outdoors", "people"],          // The Fool
  1: ["artifact", "virtue"],           // The Magician
  2: ["people", "indoors"],            // The High Priestess
  3: ["people", "outdoors"],           // The Empress
  4: ["people", "archetype", "indoors"], // The Emperor
  5: ["people", "indoors"],            // The Hierophant
  6: ["people", "outdoors"],           // The Lovers
  7: ["people", "outdoors"],           // The Chariot
  8: ["people", "virtue"],             // Strength
  9: ["people", "outdoors"],           // The Hermit
  10: ["celestial", "event"],          // Wheel of Fortune
  11: ["people", "virtue", "indoors"], // Justice
  12: ["people", "archetype"],         // The Hanged Man
  13: ["archetype", "outdoors"],       // Death
  14: ["people", "celestial"],         // Temperance
  15: ["people", "archetype"],         // The Devil
  16: ["event", "outdoors"],           // The Tower
  17: ["celestial", "outdoors"],       // The Star
  18: ["celestial", "moon", "outdoors"], // The Moon
  19: ["celestial", "sun", "outdoors"], // The Sun
  20: ["people", "archetype"],         // Judgement
  21: ["people", "archetype"],         // The World
};

// ---------------------------------------------------------------------------
// Card generation
// ---------------------------------------------------------------------------
interface CardInfo {
  id: number;
  name: string;
  arcana: "major" | "minor";
  suit?: string;
  number: number;
}

const CARD_DATA: CardInfo[] = [
  // Major Arcana
  ...[
    "The Fool","The Magician","The High Priestess","The Empress","The Emperor",
    "The Hierophant","The Lovers","The Chariot","Strength","The Hermit",
    "Wheel of Fortune","Justice","The Hanged Man","Death","Temperance",
    "The Devil","The Tower","The Star","The Moon","The Sun","Judgement","The World"
  ].map((name, i) => ({ id: i, name, arcana: "major" as const, number: i })),
  // Wands 22-35
  ...["Ace","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Page","Knight","Queen","King"]
    .map((n, i) => ({ id: 22 + i, name: `${n} of Wands`, arcana: "minor" as const, suit: "wands", number: i + 1 })),
  // Cups 36-49
  ...["Ace","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Page","Knight","Queen","King"]
    .map((n, i) => ({ id: 36 + i, name: `${n} of Cups`, arcana: "minor" as const, suit: "cups", number: i + 1 })),
  // Swords 50-63
  ...["Ace","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Page","Knight","Queen","King"]
    .map((n, i) => ({ id: 50 + i, name: `${n} of Swords`, arcana: "minor" as const, suit: "swords", number: i + 1 })),
  // Pentacles 64-77
  ...["Ace","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Page","Knight","Queen","King"]
    .map((n, i) => ({ id: 64 + i, name: `${n} of Pentacles`, arcana: "minor" as const, suit: "pentacles", number: i + 1 })),
];

function generateCard(cardId: number, deckSeed: number): string {
  const seed = deckSeed + cardId * 1000;
  const rng = new RNG(seed);

  const card = CARD_DATA[cardId];
  if (!card) throw new Error(`Unknown card id ${cardId}`);

  // Pick palette
  const paletteNames = Object.keys(PALETTES);
  const paletteName = paletteNames[rng.int0(paletteNames.length)];
  const { palette, paper } = PALETTES[paletteName];

  const strokeColor = medianDarkColor(palette);

  const style: SketcherStyle = {
    minThickness: 1,
    maxThickness: 3,
    colors: palette,
  };

  const svg = new SVGBuilder();
  svg.background(paper);

  const sketchers: Sketcher[] = [];

  if (card.arcana === "major") {
    const concepts = MAJOR_CONCEPTS[card.id] || ["outdoors"];
    const len = concepts.length;

    // Artifact → symbol
    if (concepts.includes("artifact")) {
      const sk = Sketcher.symbol(rng, style);
      sk.run();
      sketchers.push(sk);
    }

    // Archetype/virtue → figure
    if (concepts.includes("archetype") || concepts.includes("virtue")) {
      const h = 0.8 + rng.normal() * 0.2;
      const posX = FIELD_WIDTH * (0.3 + rng.float() * 0.4);
      const sk = Sketcher.figure(rng, style, h, posX);
      sk.run();
      sketchers.push(sk);
    }

    // People → always add figure; indoors/event/virtue → 2+ figures
    if (concepts.includes("people")) {
      const sk1 = Sketcher.figure(rng, style, 0.7 + rng.normal() * 0.2);
      sk1.run();
      sketchers.push(sk1);
      if (concepts.includes("indoors") || concepts.includes("event")) {
        const sk2 = Sketcher.figure(rng, style, 0.6 + rng.normal() * 0.15, FIELD_WIDTH * (0.2 + rng.float() * 0.6));
        sk2.run();
        sketchers.push(sk2);
      }
    }

    // No people → 50% clumps
    if (!concepts.includes("people") && rng.bool()) {
      const sk = Sketcher.clumps(rng, style);
      sk.run();
      sketchers.push(sk);
    }

    // Landscape
    if (concepts.includes("indoors") || rng.bool()) {
      const sk = Sketcher.city(rng, style);
      sk.run();
      sketchers.push(sk);
    }
    if (concepts.includes("outdoors") || rng.bool()) {
      if (rng.bool()) {
        const sk = Sketcher.mountains(rng, style);
        sk.run();
        sketchers.push(sk);
      } else {
        const sk = Sketcher.sea(rng, style);
        sk.run();
        sketchers.push(sk);
      }
    }

    // Celestial sun
    if (concepts.includes("sun")) {
      const sk = Sketcher.sun(rng, style);
      sk.run();
      sketchers.push(sk);
    }

    // Celestial moon/star (not sun)
    if (concepts.includes("celestial") && !concepts.includes("sun")) {
      const sk = Sketcher.star(rng, style);
      sk.run();
      sketchers.push(sk);
    }

    // Random star/sun
    if (rng.float() < 1 / Math.max(1, len)) {
      if (rng.bool()) {
        const sk = Sketcher.star(rng, style);
        sk.run();
        sketchers.push(sk);
      } else {
        const sk = Sketcher.sun(rng, style);
        sk.run();
        sketchers.push(sk);
      }
    }

    // Random sky
    if (rng.float() < 1 / Math.max(1, len)) {
      const sk = Sketcher.sky(rng, style);
      sk.run();
      sketchers.push(sk);
    }

  } else {
    // Minor arcana
    const suit = card.suit!;
    const order = card.number;

    if (order > 10) {
      // Face cards: pip + figure
      const r = 25 + rng.normal() * 10;
      const pos = new Vec2(
        FIELD_WIDTH * (0.2 + rng.float() * 0.6),
        FIELD_HEIGHT * (0.2 + rng.float() * 0.4)
      );
      const suitProps = getSuitProps(suit, Math.min(5, order - 8), rng, palette);
      const pip = Sketcher.pip(rng, style, pos, r, suitProps);
      pip.run();
      sketchers.push(pip);

      const fig = Sketcher.figure(rng, style, 0.7 + rng.normal() * 0.2);
      fig.run();
      sketchers.push(fig);

      // 20% chance clumps
      if (rng.bool(0.2)) {
        const sk = Sketcher.clumps(rng, style);
        sk.run();
        sketchers.push(sk);
      }

      // 1/4 chance landscape
      if (rng.bool(0.25)) {
        if (rng.bool()) {
          const sk = Sketcher.sky(rng, style);
          sk.run();
          sketchers.push(sk);
        } else {
          const sk = Sketcher.sea(rng, style);
          sk.run();
          sketchers.push(sk);
        }
      }

    } else {
      // Pip cards: N pips
      const n = order;
      const positions = generatePipPositions(n, rng);
      const baseR = Math.max(12, Math.min(35, FIELD_WIDTH / (Math.sqrt(n) + 1) * 0.6));

      for (const pos of positions) {
        const suitProps = getSuitProps(suit, n, rng, palette);
        const sk = Sketcher.pip(rng, style, pos, baseR * (0.7 + rng.normal() * 0.3), suitProps);
        sk.run();
        sketchers.push(sk);
      }

      // 50% sky or sea
      if (rng.bool(0.5)) {
        if (rng.bool()) {
          const sk = Sketcher.sky(rng, style);
          sk.run();
          sketchers.push(sk);
        } else {
          const sk = Sketcher.sea(rng, style);
          sk.run();
          sketchers.push(sk);
        }
      }
    }
  }

  // Paint filled regions
  const painter = new Painter(svg, palette);
  for (const sk of sketchers) painter.addSketcher(sk);
  painter.fillAll(rng);

  // Draw strokes on top
  for (const sk of sketchers) {
    for (const s of sk.strokes) {
      svg.stroke(s, strokeColor, 0.8);
    }
  }

  // Border
  svg.border(palette[0]);

  return svg.build();
}

// ---------------------------------------------------------------------------
// Pip position layouts
// ---------------------------------------------------------------------------
function generatePipPositions(n: number, rng: RNG): Vec2[] {
  const positions: Vec2[] = [];
  const margin = 50;
  const w = FIELD_WIDTH - margin * 2;
  const h = FIELD_HEIGHT - margin * 2;

  // Layout: distribute n pips in a grid-like arrangement
  if (n === 1) {
    positions.push(new Vec2(FIELD_WIDTH / 2, FIELD_HEIGHT / 2));
  } else if (n === 2) {
    positions.push(new Vec2(FIELD_WIDTH / 2, margin + h * 0.25));
    positions.push(new Vec2(FIELD_WIDTH / 2, margin + h * 0.75));
  } else if (n === 3) {
    positions.push(new Vec2(FIELD_WIDTH / 2, margin + h * 0.15));
    positions.push(new Vec2(FIELD_WIDTH / 2, margin + h * 0.5));
    positions.push(new Vec2(FIELD_WIDTH / 2, margin + h * 0.85));
  } else if (n === 4) {
    positions.push(new Vec2(margin + w * 0.25, margin + h * 0.25));
    positions.push(new Vec2(margin + w * 0.75, margin + h * 0.25));
    positions.push(new Vec2(margin + w * 0.25, margin + h * 0.75));
    positions.push(new Vec2(margin + w * 0.75, margin + h * 0.75));
  } else if (n === 5) {
    positions.push(new Vec2(margin + w * 0.25, margin + h * 0.2));
    positions.push(new Vec2(margin + w * 0.75, margin + h * 0.2));
    positions.push(new Vec2(FIELD_WIDTH / 2, margin + h * 0.5));
    positions.push(new Vec2(margin + w * 0.25, margin + h * 0.8));
    positions.push(new Vec2(margin + w * 0.75, margin + h * 0.8));
  } else if (n === 6) {
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 2; col++)
        positions.push(new Vec2(margin + w * (col === 0 ? 0.25 : 0.75), margin + h * (0.15 + row * 0.35)));
  } else if (n === 7) {
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 2; col++)
        positions.push(new Vec2(margin + w * (col === 0 ? 0.25 : 0.75), margin + h * (0.12 + row * 0.3)));
    positions.push(new Vec2(FIELD_WIDTH / 2, margin + h * 0.5));
  } else if (n === 8) {
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 2; col++)
        positions.push(new Vec2(margin + w * (col === 0 ? 0.25 : 0.75), margin + h * (0.1 + row * 0.265)));
  } else if (n === 9) {
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3; col++)
        positions.push(new Vec2(margin + w * (0.1 + col * 0.4), margin + h * (0.15 + row * 0.35)));
  } else { // 10
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 2; col++)
        positions.push(new Vec2(margin + w * (col === 0 ? 0.25 : 0.75), margin + h * (0.08 + row * 0.245)));
    positions.push(new Vec2(margin + w * 0.25, margin + h * 0.96));
    positions.push(new Vec2(margin + w * 0.75, margin + h * 0.96));
  }

  // Add slight random jitter
  return positions.map(p => new Vec2(
    p.x + rng.normal2() * 8,
    p.y + rng.normal2() * 8
  ));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main(): void {
  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const deckSeed = 12345;
  const total = 78;

  console.log(`Generating ${total} tarot cards with seed ${deckSeed}...`);
  const t0 = Date.now();

  for (let id = 0; id < total; id++) {
    const card = CARD_DATA[id];
    const svgContent = generateCard(id, deckSeed);
    const filename = `card-${String(id).padStart(2, "0")}.svg`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, svgContent, "utf8");

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    process.stdout.write(`\r[${String(id + 1).padStart(2)}/${total}] ${card.name.padEnd(25)} ${elapsed}s`);
  }

  const total_time = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nDone! ${total} SVGs written to ${outputDir} in ${total_time}s`);
}

main();
