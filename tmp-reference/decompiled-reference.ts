/**
 * Decompiled reference from watabou's Procgen Tarot (Haxe → JS → readable TS pseudocode)
 * Source: https://html-classic.itch.zone/html/4350344/bin/Tarot.js
 *
 * NOT runnable — this is a reference for understanding the original architecture.
 * The original uses OpenFL (Flash-like display list), global mutable RNG, and
 * object-identity-based point lookups that don't translate directly.
 */

// ============================================================================
// ARCHITECTURE OVERVIEW
// ============================================================================
//
// Card.getImage() → Sketcher[]        (list of "layers", each with mask+flow+behaviour)
// CardView.start():
//   1. Take first layer, add 4 border strokes (thickness=0) to form card rect
//   2. Call nextLayer() which runs layer.draw() until tracers exhaust
//   3. For each subsequent layer:
//      a. newLayer.behind(previousLayers) — mask out occupied cells
//      b. **newLayer.strokes = currentLayer.strokes** — SHARE stroke array
//      c. **newLayer.fillPoints = currentLayer.fillPoints** — SHARE fill points
//      d. Set Tracer.behaviour from layer.tracing
//      e. Call layer.draw()
//   4. When all layers done:
//      a. Painter receives the SINGLE shared stroke array + all sketcher masks
//      b. For each fillPoint, Painter.findShape() walks the planar graph to find polygon
//      c. Painter.drawAll() sorts regions by area (largest first) and fills with gradients
//      d. Strokes drawn on top
//      e. Border + title + number overlaid
//
// KEY INSIGHT: All layers share ONE stroke network. When a tracer from layer N
// hits a stroke from layer N-1, it stops — creating clean partition boundaries.
// Our port runs each Sketcher independently with its own strokes. That's the
// primary cause of the chaotic overlapping output.

// ============================================================================
// CONSTANTS
// ============================================================================
const FIELD_WIDTH = 300;
const FIELD_HEIGHT = 500;
const FIELD_COLS = 30;
const FIELD_ROWS = 50;
const CELL_W = 10; // FIELD_WIDTH / FIELD_COLS
const CELL_H = 10; // FIELD_HEIGHT / FIELD_ROWS

// ============================================================================
// RNG (global mutable seed — Park-Miller LCG)
// ============================================================================
// Random.seed is a GLOBAL. Every call mutates it.
// seed = seed * 48271.0 % 2147483647 | 0
// float() = seed / 2147483647
// normal() = (float() + float() + float()) / 3          → bell 0..1
// normal2() = normal() * 2 - 1                            → bell -1..1
// small() = abs((float()+float()+float()+float())/2 - 1)  → clustered near 0

// ============================================================================
// Stroke
// ============================================================================
interface Stroke {
  start: Point;
  end: Point;
  thickness: number;
  invert(): Stroke; // returns new Stroke(end, start, thickness)
}

// ============================================================================
// TracerBehaviour
// ============================================================================
interface TracerBehaviour {
  wiggling: number;    // 0..1, chance of direction change per step
  curvature: number;   // magnitude of steering changes
  roughness: number;   // noise in step direction
  zigzag: number;      // alternating offset
  align: AlignMode;    // how tracer aligns to flow: value/opposite/left/right/random/none
  spawn: SpawnMode;    // how tracer pair spawns: random from flow / along flow
}
// Presets:
// random()       → wiggling=float(), curvature=float()*2, roughness=small(), zigzag=0, align=RANDOM_FROM_SET, spawn=0
// mesh()         → wiggling=0, curvature=0, roughness=small()*0.2, zigzag=0, align=VALUE, spawn=VALUE
// springs()      → wiggling=float()*0.8, curvature=float(), roughness=small()*0.5, zigzag=float()*PI, align=RANDOM, spawn=0
// stainedGlass() → wiggling=0, curvature=float()*2, roughness=small(), zigzag=0, align=VALUE, spawn=VALUE
// fragments()    → wiggling=float()*0.8, curvature=float()*2, roughness=0.5+small()*0.5, zigzag=0, align=RANDOM, spawn=RANDOM
// fruits()       → wiggling=float(), curvature=float(), roughness=0, zigzag=0, align=OPPOSITE, spawn=0

// ============================================================================
// FlowField
// ============================================================================
// Field<Vec4> where each cell stores { value, opposite, left, right } directions.
// Base types:
//   CircularFlow(center, radius) — swirl around center
//   LinearFlow(angle)            — uniform direction
//   TensionField(mask, tightness) — repulsion from mask boundary
//     init: for each cell, sample 100 random neighbor cells; average the vectors
//     from those NOT in mask to those IN mask. This pushes tracers away from edges.
// FlowField.add(another) — composite: adds vectors component-wise
// FlowField.get(p) → Vec4 at cell(p)

// ============================================================================
// Tracer
// ============================================================================
// Spawned in pairs (pos, dir) and (pos, -dir).
// trace(flow):
//   1. Get flow at pos → pick closest of the 4 flow vectors to current dir
//   2. Wiggle: chance = 1 - (1 - behaviour.wiggling)^e where e = dot(closestFlow, dir)
//      If triggered, resample steering from normal2() * curvature
//   3. dir = rotate(dir, steering * 0.1)
//   4. Add roughness: dir += random perpendicular offset * roughness
//   5. Add zigzag: dir += perpendicular * zigzag (alternating sign)
//   6. newPos = pos + dir * CELL_W
//   7. Return Stroke(oldPos, newPos, thickness)

// ============================================================================
// Sketcher (= one "layer")
// ============================================================================
class Sketcher {
  mask: Mask;
  flow: FlowField;
  density: Density;
  tracers: Tracer[];
  strokes: Stroke[];       // ← SHARED across layers during generation
  fillPoints: Point[];     // ← SHARED across layers during generation
  tracing: TracerBehaviour | null;
  // graphics: reference to the OpenFL Graphics context (for live drawing)

  constructor(mask, flow, tightness = 3, nSeeds = 1) {
    this.mask = mask;
    if (tightness > 0) {
      const tension = new TensionField();
      tension.init(mask, tightness);
      flow.add(tension);
    }
    this.flow = flow;
    this.density = Density.fromMask(mask, nSeeds);
    this.density.init();
    this.tracing = null;
    this.tracers = [];
    this.strokes = [];
    this.fillPoints = [];
  }

  draw(): boolean {
    // Advance all tracers one step
    const alive: Tracer[] = [];
    for (const t of this.tracers) {
      const stroke = t.trace(this.flow.get(t.pos));
      const stillAlive = this.validate(stroke);
      this.addStroke(stroke);
      if (stillAlive) {
        alive.push(t);
      } else {
        // Dead tracer → push midpoint±perp as fill seeds
        const mid = lerp(stroke.start, stroke.end, 0.5);
        const perp = perpendicular(stroke.end - stroke.start) * 0.01;
        this.fillPoints.push(mid + perp);
        this.fillPoints.push(mid - perp);
      }
    }
    this.tracers = alive;

    if (this.tracers.length > 0) return true;
    if (this.density.available.length > 0) {
      this.spawn(randomPointInCell(this.density.randomAvailableCell()));
      return true;
    }
    return false;
  }

  validate(stroke: Stroke): boolean {
    // Find earliest intersection with ANY existing stroke
    let closest = null, tx = 1.0, ty = 0;
    for (const other of this.strokes) {
      const t = intersectLines(stroke, other);
      if (t && t.x > 0 && t.x <= tx && t.y >= 0 && t.y <= 1) {
        closest = other;
        tx = t.x;
        ty = t.y;
      }
    }
    if (closest) {
      if (ty === 0) {
        stroke.end = closest.start;
      } else if (ty === 1) {
        stroke.end = closest.end;
      } else {
        // Split the intersected stroke at intersection point
        const ip = stroke.end = lerp(stroke.start, stroke.end, tx); // actually: start + dx*tx
        this.strokes.push(new Stroke(closest.start, ip, closest.thickness));
        this.strokes.push(new Stroke(ip, closest.end, closest.thickness));
        remove(this.strokes, closest);
      }
      return false; // tracer dies
    }
    return true; // tracer survives
  }

  spawn(p: Point) {
    const thickness = minThickness + normal() * (maxThickness - minThickness);
    const [t1, t2] = Tracer.spawn(p, this.flow.get(p), thickness);
    this.tracers.push(t1, t2);
    this.density.drain(p);
  }

  addStroke(stroke: Stroke) {
    this.strokes.push(stroke);
    this.density.drain(stroke.end);
  }

  behind(another: Sketcher) {
    // Mask out cells occupied by another layer
    for (let i = 0; i < FIELD_ROWS; i++) {
      for (let j = 0; j < FIELD_COLS; j++) {
        if (another.mask.values[i][j]) {
          this.mask.values[i][j] = false;
          remove(this.density.available, i * FIELD_COLS + j);
        }
      }
    }
  }

  // ---- Factory methods ----

  static figure(height = 1, pos?: Point): Sketcher {
    const h = FIELD_HEIGHT * height;
    const w = h * (0.25 + normal() / 4);
    if (!pos) pos = center(field).add(0, h / 4);

    const mask = new Mask();
    mask.ellipse(pos, w/2, h/2);
    // Head offset
    const q = new Point(normal2() * w * 0.5, -float() * h * 0.25);
    pos = pos.add(q);
    h *= normal() * 0.5;
    w *= 1 + normal();
    mask.ellipse(pos, w/2, h/2); // head

    const tracing = TracerBehaviour.random();
    tracing.align = pick([LEFT, RANDOM]); // [3, 6]
    const flow = new CircularFlow(randomPoint(field), normal() * 20);
    return new Sketcher(mask, flow, /*tightness=*/4);
  }

  static sun(pos?, radius?): Sketcher {
    if (!pos) pos = new Point(float() * FIELD_WIDTH, float() * FIELD_HEIGHT * 0.35);
    if (!radius) radius = 20 + normal() * 40;
    const mask = new Mask(); mask.circle(pos, radius);
    const flow = new CircularFlow(pos, radius);
    const tracing = new TracerBehaviour();
    tracing.wiggling = 0.5 + float() * 0.5;
    tracing.curvature = float() * 2;
    tracing.roughness = small();
    tracing.align = RANDOM; // 6
    tracing.spawn = RANDOM; // 1
    return new Sketcher(mask, flow, normal() * 2);
  }

  static star(pos?, radius?): Sketcher {
    if (!pos) pos = new Point(float() * FIELD_WIDTH, float() * FIELD_HEIGHT * 0.35);
    if (!radius) radius = 5 + float() * 50;
    const mask = new Mask(); mask.circle(pos, radius);
    const flow = new LinearFlow(float() * PI * 2);
    const tracing = new TracerBehaviour();
    tracing.wiggling = float();
    tracing.curvature = float() * 2;
    tracing.roughness = small();
    tracing.align = VALUE; // 0
    tracing.spawn = VALUE; // 0
    return new Sketcher(mask, flow, 0, /*nSeeds=*/5);
  }

  static clumps(level?, density?): Sketcher {
    // level and density default to normal()/5 and int(3..8)
    const mask = new Mask();
    mask.perlin(0, level || normal() / 5);
    const d = density || int(3, 8);
    const tracing = TracerBehaviour.random();
    const flow: FlowField;
    if (bool()) {
      flow = new CircularFlow(randomPoint(field), normal() * 20);
    } else {
      flow = new FlowField(); // default/empty
    }
    return new Sketcher(mask, flow, 3, d);
  }

  static sky(): Sketcher {
    const mask = new Mask();
    // Gradient mask: probability increases toward top
    for (let r = 0; r < FIELD_ROWS; r++) {
      for (let c = 0; c < FIELD_COLS; c++) {
        const chance = 1 - r / FIELD_ROWS;
        mask.values[r][c] = float() < chance * chance;
      }
    }
    // Subtract some random circles
    const nHoles = int(2, 5);
    for (let i = 0; i < nHoles; i++) {
      mask.cutCircle(randomPoint(field), 20 + float() * 60);
    }
    const flow = new LinearFlow(float() * PI * 2);
    const tracing = new TracerBehaviour();
    tracing.wiggling = 0;
    tracing.curvature = float() * 2;
    tracing.roughness = small();
    tracing.align = pick([VALUE, OPPOSITE]); // [0, 1]
    tracing.spawn = VALUE;
    return new Sketcher(mask, flow, 0);
  }

  static city(): Sketcher {
    const mask = new Mask();
    // Skyline: random height per column, filled from bottom
    for (let c = 0; c < FIELD_COLS; c++) {
      const h = int(FIELD_ROWS / 4, FIELD_ROWS);
      for (let r = h; r < FIELD_ROWS; r++) {
        mask.values[r][c] = true;
      }
    }
    const flow = new FlowField(); // default (no force)
    const layer = new Sketcher(mask, flow, 0);
    layer.tracing = TracerBehaviour.mesh();
    return layer;
  }

  static sea(): Sketcher {
    const mask = new Mask();
    // Gradient toward bottom
    for (let r = 0; r < FIELD_ROWS; r++) {
      for (let c = 0; c < FIELD_COLS; c++) {
        const chance = r / FIELD_ROWS;
        mask.values[r][c] = float() < chance * chance;
      }
    }
    const flow = new LinearFlow(/*angle near horizontal*/ small() * 0.3);
    const tracing = new TracerBehaviour();
    tracing.wiggling = float() * 0.3;
    tracing.curvature = float();
    tracing.roughness = small() * 0.3;
    tracing.align = VALUE;
    tracing.spawn = VALUE;
    return new Sketcher(mask, flow, 2);
  }

  static mountains(): Sketcher {
    const mask = new Mask();
    // Mountain silhouette
    for (let c = 0; c < FIELD_COLS; c++) {
      const peak = int(FIELD_ROWS / 3, FIELD_ROWS * 2 / 3);
      for (let r = peak; r < FIELD_ROWS; r++) {
        mask.values[r][c] = true;
      }
    }
    const flow = new LinearFlow(PI / 2 + small() * 0.5);
    const tracing = new TracerBehaviour();
    tracing.wiggling = float() * 0.5;
    tracing.curvature = float();
    tracing.roughness = small() * 0.5;
    tracing.align = VALUE;
    tracing.spawn = VALUE;
    return new Sketcher(mask, flow, 2);
  }

  static symbol(pos?, r?): Sketcher {
    if (!pos) pos = new Point(
      FIELD_WIDTH * (0.2 + float() * 0.6),
      FIELD_HEIGHT * (0.2 + float() * 0.6)
    );
    if (!r) r = 15 + float() * 45;
    const mask = new Mask();
    const shapeType = int(0, 3); // 0=circle, 1=triangle, 2=rect
    switch (shapeType) {
      case 0: mask.circle(pos, r); break;
      case 1: mask.polygon(pos, r, 3); break; // triangle
      case 2: mask.rect(pos, r); break;
    }
    const tracing = TracerBehaviour.random();
    const flow: FlowField;
    if (bool()) {
      flow = new CircularFlow(pos, normal() * r);
    } else {
      flow = new FlowField();
    }
    return new Sketcher(mask, flow, 2 + normal() * 2);
  }

  static pip(pos, r, suit, order): Sketcher {
    const mask = new Mask();
    mask.circle(pos, r);
    const circular = new CircularFlow(pos, normal() * r);
    return new Sketcher(mask, circular, suit.tension, Math.floor(Math.sqrt(order)) * suit.density);
  }
}

// ============================================================================
// Painter
// ============================================================================
class Painter {
  g: Graphics;
  strokes: Stroke[];
  palette: number[];
  objColors: number[][];   // per-layer color sets
  masks: Mask[];           // per-layer masks
  regions: Region[];
  pt2stroke: Map<Point, Stroke[]>; // OBJECT IDENTITY map

  constructor(g, strokes, sketchers, palette) {
    this.g = g;
    this.strokes = strokes;
    this.palette = palette;
    this.objColors = sketchers.map(s => s.colors || shuffle(palette).slice(0, 2));
    this.masks = sketchers.map(s => s.mask);
    this.regions = [];

    // Build point→stroke adjacency (by OBJECT IDENTITY of Point instances)
    this.pt2stroke = new Map();
    for (const s of strokes) {
      getOrCreate(this.pt2stroke, s.start).push(s);
      getOrCreate(this.pt2stroke, s.end).push(s);
    }
  }

  fillShape(p: Point): Region | null {
    const shape = this.findShape(p);
    const region = this.register(shape);
    if (!region) return null;

    // Pick colors: if p is inside a layer's mask, use that layer's colors
    let palette = this.palette;
    for (let i = 0; i < this.masks.length; i++) {
      if (this.masks[i].get(p)) {
        palette = this.objColors[i];
        break;
      }
    }

    // Pick color: chance proportional to sqrt(area / totalArea)
    let color = palette[palette.length - 1];
    const chance = Math.sqrt(area(shape) / (FIELD_WIDTH * FIELD_HEIGHT));
    for (const c of palette) {
      if (float() < chance) { color = c; break; }
    }

    region.colors = gradient(color); // [dark, mid, light]

    // Gradient: radial if compact (compactness > 0.8), else linear oriented along OBB
    if (compactness(shape) > 0.8) {
      region.type = RADIAL;
      region.matrix = gradientBox(boundingRect(shape));
    } else {
      region.type = LINEAR;
      region.matrix = obbGradientMatrix(shape); // oriented bounding box
    }

    this.draw(region);
    return region;
  }

  findShape(p: Point): Point[] {
    // Cast ray rightward from p, find nearest stroke intersection
    let nearestStroke = minBy(this.strokes, s => {
      const t = intersectRay(p, rightward, s);
      return (t && t.x > 0 && t.y >= 0 && t.y <= 1) ? t.x : Infinity;
    });

    // Orient stroke so it goes downward (end.y >= start.y)
    if (nearestStroke.end.y - nearestStroke.start.y < 0) {
      nearestStroke = nearestStroke.invert();
    }

    // Walk the planar graph boundary: always pick minimum-angle next stroke
    const shape = [nearestStroke.start];
    let s = nearestStroke;
    while (true) {
      let next = null;
      let minAngle = Infinity;

      // Get all strokes connected at s.end (by OBJECT IDENTITY)
      for (const candidate of this.pt2stroke.get(s.end)) {
        if (candidate === s) continue; // skip self
        // Orient candidate so it starts at s.end
        let c = candidate;
        if (c.end === s.end) c = c.invert(); // flip direction
        if (c.start !== s.end) continue;     // not connected

        if (next === null) {
          next = c;
        } else {
          // Compute signed angle between s→ and next→ / candidate→
          if (minAngle === Infinity) {
            minAngle = signedAngle(s, next);
          }
          const angle = signedAngle(s, c);
          if (minAngle > angle) {
            minAngle = angle;
            next = c;
          }
        }
      }

      s = next;
      shape.push(s.start);

      // Safety: if shape is too long, find a loop within it
      if (shape.length > this.strokes.length) {
        for (let i = 0; i < shape.length; i++) {
          const loop = shape.indexOf(shape[i], i + 1);
          if (loop !== -1) return shape.slice(i, loop);
        }
      }

      if (s.end === shape[0]) break; // closed polygon
    }
    return shape;
  }

  register(shape: Point[]): Region | null {
    // Check for duplicate: if all vertices of an existing region are in this shape, skip
    for (const existing of this.regions) {
      if (existing.shape.every(v => shape.includes(v))) return null;
    }
    const region = { shape, area: Math.abs(polyArea(shape)) };
    this.regions.push(region);
    return region;
  }

  drawAll() {
    // Sort regions largest-first, redraw all
    this.regions.sort((a, b) => b.area - a.area);
    for (const r of this.regions) this.draw(r);
  }
}

// ============================================================================
// CardView.start() — the main generation orchestrator
// ============================================================================
function startGeneration(card: Card): void {
  const layers: Sketcher[] = card.getImage();

  // Assign graphics context to all layers
  for (const layer of layers) {
    layer.graphics = strokesGraphics;
  }

  // Start with first layer
  let currentLayer = layers[0];

  // Add boundary strokes (invisible, thickness=0) to the FIRST layer
  const tl = new Point(0, 0);
  const tr = new Point(FIELD_WIDTH, 0);
  const bl = new Point(0, FIELD_HEIGHT);
  const br = new Point(FIELD_WIDTH, FIELD_HEIGHT);
  currentLayer.addStroke(new Stroke(tl, tr, 0));
  currentLayer.addStroke(new Stroke(tr, br, 0));
  currentLayer.addStroke(new Stroke(br, bl, 0));
  currentLayer.addStroke(new Stroke(bl, tl, 0));

  // Draw first layer
  Tracer.behaviour = currentLayer.tracing || TracerBehaviour.random();
  while (currentLayer.draw()) { /* keep going */ }

  // Process remaining layers
  for (let i = 1; i < layers.length; i++) {
    const newLayer = layers[i];

    // Mask out cells occupied by all previous layers
    for (let j = 0; j < i; j++) {
      newLayer.behind(layers[j]);
    }

    // *** CRITICAL: Share stroke array and fillPoints ***
    newLayer.strokes = currentLayer.strokes;
    newLayer.fillPoints = currentLayer.fillPoints;

    currentLayer = newLayer;

    // Set tracer behaviour for this layer
    Tracer.behaviour = currentLayer.tracing || TracerBehaviour.random();

    // Draw until exhausted
    while (currentLayer.draw()) { /* keep going */ }
  }

  // Now paint: Painter gets the SINGLE shared strokes array
  const painter = new Painter(
    shapesGraphics,
    currentLayer.strokes,  // shared strokes from all layers
    layers,                // all sketchers (for masks + colors)
    card.colors            // card-level palette
  );

  // Fill shapes from accumulated fillPoints
  while (currentLayer.fillPoints.length > 0) {
    const point = currentLayer.fillPoints.shift();
    painter.fillShape(point);
  }

  // Final render: sort and draw all filled regions
  painter.drawAll();
}

// ============================================================================
// Card.major() — Major Arcana composition logic
// ============================================================================
function majorArcana(concept: Concept): Sketcher[] {
  const indoors = concept.hasTag("setting") && concept.hasTag("indoors");
  const outdoors = concept.hasTag("setting") && !concept.hasTag("indoors");
  const symbol = concept.hasTag("artifact");
  const figure = concept.hasTag("archetype") || concept.hasTag("virtue");
  const sun = concept.name === "sun" || concept.name === "moon" || concept.name === "rainbow";
  const star = concept.hasTag("celestial") && !sun;
  const people = indoors || concept.hasTag("event") || concept.hasTag("virtue");

  const list: Sketcher[] = [];

  if (symbol) list.push(Sketcher.symbol());

  if (figure) {
    list.push(Sketcher.figure(
      0.8 + normal() * 0.2,
      new Point(FIELD_WIDTH * normal(), FIELD_HEIGHT * (0.5 + normal() * 0.2))
    ));
  }

  if (people) {
    // Always TWO figures for people cards
    list.push(Sketcher.figure(
      normal(),  // height 0..1
      new Point(FIELD_WIDTH * float(), FIELD_HEIGHT * (0.5 + normal() * 0.2))
    ));
    list.push(Sketcher.figure(
      normal(),
      new Point(FIELD_WIDTH * float(), FIELD_HEIGHT * (0.5 + normal() * 0.2))
    ));
  } else {
    if (bool(0.5)) list.push(Sketcher.clumps());
  }

  // Landscape: indoors→city, outdoors→mountains/sea, else random
  if (indoors || (!outdoors && bool(0.5))) {
    list.push(Sketcher.city());
  } else if (outdoors || (!indoors && bool(0.5))) {
    list.push(bool(0.5) ? Sketcher.mountains() : Sketcher.sea());
  }

  if (sun) list.push(Sketcher.sun());
  if (star) list.push(Sketcher.star());

  // Random celestial body if not indoors and no existing sun/star
  if (!indoors) {
    if (!sun && !star && bool(1 / list.length)) {
      list.push(bool(1/3) ? Sketcher.star() : Sketcher.sun());
    }
    if (bool(1 / list.length)) {
      list.push(Sketcher.sky());
    }
  }

  return list;
}

// ============================================================================
// Card.face() — Face cards (Page/Knight/Queen/King)
// ============================================================================
function faceCard(suit, order): Sketcher[] {
  const numPips = Math.floor(2 + float() * 4); // 2..5
  const r = 0.5 * Math.sqrt(FIELD_HEIGHT * FIELD_WIDTH / numPips) / 2;

  const list = [
    Sketcher.pip(randomPoint(fullRect), r, suit, numPips),
    Sketcher.figure(
      0.8 + normal() * 0.2,
      new Point(FIELD_WIDTH * normal(), FIELD_HEIGHT * (0.5 + normal() * 0.2))
    ),
  ];

  if (bool(0.2)) {
    list.push(Sketcher.clumps(normal() / 5));
  }

  if (bool(1 / list.length)) {
    switch (Math.floor(float() * 4)) {
      case 0: list.push(Sketcher.sky()); break;
      case 1: list.push(Sketcher.mountains()); break;
      case 2: list.push(Sketcher.city()); break;
      case 3: list.push(Sketcher.sea()); break;
    }
  }

  return list;
}

// ============================================================================
// Card.pips() — Pip cards (Ace through 10)
// ============================================================================
function pipCard(suit, order): Sketcher[] {
  const d = Math.sqrt(FIELD_HEIGHT * FIELD_WIDTH / order) / 2;
  const r = 0.5 * d;

  // Random placement with collision-retry loop
  let positions: Point[];
  while (true) {
    positions = [];
    for (let i = 0; i < order; i++) {
      positions.push(new Point(
        r + float() * (FIELD_WIDTH - d),
        r + float() * (FIELD_HEIGHT - d)
      ));
    }
    // Check all pairs for minimum distance
    let ok = true;
    for (let i = 0; i < order - 1 && ok; i++) {
      for (let j = i + 1; j < order && ok; j++) {
        if (distance(positions[i], positions[j]) < d) ok = false;
      }
    }
    if (ok) break;
  }

  const list = positions.map(p => Sketcher.pip(p, r, suit, order));
  list.push(bool(0.5) ? Sketcher.sky() : Sketcher.sea());
  return list;
}

// ============================================================================
// ModernView overlay — card name and number text
// ============================================================================
// After generation:
// - Rounded rect border drawn with maxThickness lineStyle, black color
// - Title text: card name, 24px, centered at bottom (y = FIELD_HEIGHT)
// - Number text: roman numeral (major) or empty (minor), centered at top (y = 4)
// - Number color: if background at that point is dark (brightness < 0.5), use paper color

// ============================================================================
// ArtStyle / Palette system
// ============================================================================
// Styles have: palette (array of named colors), paper, black, strokeColor, strokeAlpha,
// minThickness, maxThickness, lightness.
// gradient(color) → [darken(color, -0.2), color, lighten(color, 0.2)]
// complement(exclude, n) → pick n colors from palette that aren't in exclude
// findByName(name) → lookup color by name string

// ============================================================================
// Key differences from our port (bugs to fix)
// ============================================================================
// 1. STROKES SHARED: All layers share ONE stroke array. Our port gives each its own.
// 2. BEHIND MASKING: Later layers call behind(earlier) to avoid overlap. We skip this.
// 3. BORDER STROKES: 4 invisible boundary strokes added first. We don't add them.
// 4. FILL POINTS SHARED: fillPoints accumulate across all layers into one array.
// 5. PAINTER RECEIVES ALL: Painter gets masks[] + objColors[] from all layers.
//    Our port creates a separate Painter that doesn't know about per-layer masks.
// 6. OBJECT IDENTITY: Original uses Point object identity for pt2stroke map.
//    Our port uses string keys, which should work but needs exact coordinate matching.
// 7. PIP POSITIONS: Original uses random + collision retry. We use hardcoded grids.
// 8. CARD TEXT: Original renders title + number as text overlay. We don't.
// 9. PEOPLE LOGIC: Original always adds 2 figures for "people" concept.
//    Our port conditionally adds 1 or 2.
// 10. FIGURE POSITION: Original passes Point(x, y) including vertical offset.
//     Our port only passes posX, fixing y to center.
