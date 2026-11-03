// Illustrated fly-through of a Neelakurinji ridge country, drawn on a canvas.
// The world is a stack of ridge silhouettes at increasing depth, with banks of mist between them,
// ending at Illikkal Kallu: a green mountain with a sheer rock face and a knob on its summit.
// Scroll progress (0–1) moves the camera forward through the stack and up the slope.

type RGB = [number, number, number];
type Ridge = { z: number; heights: number[]; crest: RGB; foot: RGB; flowers: Flower[]; peak?: boolean };
type Flower = { x: number; drop: number; size: number; color: string };
type Bank = { z: number; x: number; y: number; w: number; h: number; alpha: number; drift: number; puffs: number[][] };
type Cloud = { x: number; y: number; w: number; h: number; drift: number; alpha: number };

const SPAN = 70; // Ridges run from -SPAN to +SPAN in world x.
const SAMPLES = 180;
const GAP = 3; // World depth between ridges.
const COUNT = 24;
const SUMMIT_Z = 4 + COUNT * GAP + 6;
const TRAVEL = SUMMIT_Z - 14; // The camera stops short of the summit so the whole mountain stands in view.
const FOG_DEPTH = 34;

// Seeded random so the landscape is the same on every visit.
const rand = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noise1d = (r: () => number) => {
  const pts = Array.from({ length: 64 }, r);
  return (x: number) => {
    const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f);
    const a = pts[((i % 64) + 64) % 64], b = pts[(((i + 1) % 64) + 64) % 64];
    return a + (b - a) * s;
  };
};

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const wrap = (v: number, lo: number, hi: number) => lo + ((((v - lo) % (hi - lo)) + (hi - lo)) % (hi - lo));

// Sky through the climb: dawn at the trailhead, clear lavender mid-way, gold at the summit.
const SKY: { at: number; top: RGB; horizon: RGB }[] = [
  { at: 0, top: hex('#17133a'), horizon: hex('#e9a0b4') },
  { at: 0.5, top: hex('#243a86'), horizon: hex('#c7b9ff') },
  { at: 1, top: hex('#1d1238'), horizon: hex('#ffb26b') },
];
const skyAt = (t: number) => {
  const i = t < 0.5 ? 0 : 1;
  const k = (t - SKY[i].at) / (SKY[i + 1].at - SKY[i].at);
  return { top: mix(SKY[i].top, SKY[i + 1].top, k), horizon: mix(SKY[i].horizon, SKY[i + 1].horizon, k) };
};

const BLOOM = { crest: hex('#8c6cf0'), foot: hex('#2a1d55') };
const GRASS = { crest: hex('#6f8f5a'), foot: hex('#1f2f22') };
const PETALS = ['#a38bff', '#7d63e6', '#c3b2ff', '#6a4fd1', '#b79cf5'];
const MIST: RGB = hex('#f4f1f8');

const baseAt = (z: number) => 0.4 + z * 0.06; // The land rises as you go deeper.

// A river falls off the mountain and winds back toward the trailhead through notches in each ridge.
const WATER = hex('#bfe3ff');
// It leaves the waterfall's foot (x≈8.8) and settles into a meander along the camera's path.
const riverX = (z: number) => {
  const k = clamp01((z - (SUMMIT_Z - 12)) / 11);
  const settle = k * k * (3 - 2 * k);
  const meander = 1.5 + Math.sin(z * 0.16) * 3.2 + Math.sin(z * 0.43) * 0.8;
  return meander + (8.8 - meander) * settle;
};
const riverY = (z: number) => baseAt(z) - 0.25;
// Half-width in world units: a stream at the waterfall's foot, widening downstream.
const riverHalf = (z: number) => 0.32 + 0.55 * clamp01((SUMMIT_Z - z) / 14);

// Illikkal Kallu, traced from a front-on reference photo. Points are in its pixels (585×341, y down,
// mountain foot at y=300, summit knob at x≈308) and mapped to world units around PEAK_X.
const PEAK_X = 6;
const PEAK_K = 0.026; // World units per photo pixel.
const MOUNTAIN = [
  [-250, 340], [0, 262], [60, 232], [110, 178], [150, 122], [185, 74], [205, 58], [228, 55], [242, 62], [262, 50],
  [290, 40], [300, 28], [316, 26], [324, 42], [334, 52], [348, 78], [364, 112], [392, 150], [432, 190],
  [482, 230], [540, 268], [620, 300], [850, 345],
];
// Shadowed cliff on the left shoulder.
const CLIFF = [[188, 78], [206, 60], [228, 56], [244, 66], [246, 110], [236, 160], [222, 200], [204, 215], [194, 170], [190, 120]];
// The sheer rock face running down from the summit.
const SLAB = [
  [240, 110], [250, 70], [275, 52], [296, 42], [300, 30], [316, 27], [324, 44], [344, 66], [352, 100], [346, 145],
  [336, 195], [325, 240], [305, 285], [285, 270], [270, 225], [258, 170], [248, 135],
];
const KNOB = [[296, 42], [299, 30], [307, 22], [318, 25], [324, 40], [312, 46]];
const SLAB_MOSS = [[240, 110], [250, 70], [275, 52], [296, 44], [286, 62], [262, 82], [252, 110]];
// Rust streaks down the face: x1, y1, x2, y2, width (photo pixels).
const STREAKS = [[258, 128, 264, 162, 7], [272, 198, 280, 240, 8], [298, 232, 306, 264, 6], [326, 118, 320, 160, 5], [287, 88, 291, 122, 4]];
// Forest gullies down the green slopes.
const GULLIES = [[150, 130, 120, 230], [180, 90, 160, 210], [205, 70, 196, 250], [372, 120, 400, 230], [410, 165, 445, 260], [350, 90, 360, 200]];
// Waterfall from a spring beside the rock face down to the mountain's foot (photo pixels). Near the
// bottom it turns out toward the viewer, the way the river leaves the foot in perspective. It ends
// exactly where the river starts: riverX/riverY at SUMMIT_Z, mapped back into photo pixels.
const FALL_FOOT = [308 + (8.8 - PEAK_X) / PEAK_K, 300 + 0.25 / PEAK_K];
const FALL = [[355, 118], [357, 128], [359, 139], [361, 150], [369, 180], [380, 212], [388, 240], [393, 264], [397, 284], [403, 298], [409, 305], FALL_FOOT];
const ROCK_LIT = hex('#d6cdbf'), ROCK_MID = hex('#a19890'), ROCK_DARK = hex('#5a5560');
const RUST = hex('#c4542e');
const FOREST = hex('#7fae3e'), FOREST_DARK = hex('#1f3a18'), CLIFF_TONE = hex('#3e4a3a'), CAP = hex('#4c6a2a');

function buildWorld() {
  const r = rand(2640);
  const ridges: Ridge[] = [];
  for (let i = 0; i < COUNT; i++) {
    const z = 4 + i * GAP;
    const n1 = noise1d(r), n2 = noise1d(r);
    const amp = 1.4 + r() * 1.6;
    const heights = Array.from({ length: SAMPLES }, (_, s) => {
      const x = -SPAN + (2 * SPAN * s) / (SAMPLES - 1);
      const h = baseAt(z) + amp * (0.7 * n1(x * 0.08 + i * 7) + 0.3 * n2(x * 0.3 + i * 3));
      // Carve the river's valley so the water shows through each ridge.
      // Flat across the water's full width, then sloping up into the ridge.
      const g = Math.exp(-((Math.max(0, Math.abs(x - riverX(z)) - 1.2) / 3.2) ** 2));
      return h - (h - riverY(z)) * g;
    });
    const tone = i % 3 === 1 ? GRASS : BLOOM;
    const flowers = tone === BLOOM
      ? Array.from({ length: 260 }, () => ({
          x: -SPAN * 0.6 + r() * SPAN * 1.2,
          drop: r() ** 1.6 * 2.6,
          size: 0.012 + r() * 0.03,
          color: PETALS[(r() * PETALS.length) | 0],
        }))
      : [];
    ridges.push({ z, heights, crest: mix(tone.crest, hex('#ffffff'), r() * 0.08), foot: tone.foot, flowers });
  }
  // The summit is drawn as the landmark, not as a height profile.
  ridges.push({ z: SUMMIT_Z, heights: [], crest: FOREST, foot: FOREST_DARK, flowers: [], peak: true });

  // Mist banks hanging between the ridges, plus a band of cloud wrapped round the mountain.
  const bank = (z: number, x: number, y: number, w: number, h: number, alpha: number): Bank => ({
    z, x, y, w, h, alpha, drift: (r() - 0.5) * 0.5,
    puffs: Array.from({ length: 4 }, () => [(r() - 0.5) * w * 1.2, (r() - 0.5) * h * 0.6, 0.5 + r() * 0.6]),
  });
  const banks: Bank[] = [];
  for (let z = 7; z < SUMMIT_Z - 3; z += 1.6 + r() * 1.4) {
    banks.push(bank(z, (r() - 0.5) * 40, baseAt(z) + 1 + r() * 2.5, 5 + r() * 10, 1 + r() * 1.6, 0.25 + r() * 0.3));
  }
  const peakBase = baseAt(SUMMIT_Z);
  for (let k = 0; k < 6; k++) {
    banks.push(bank(SUMMIT_Z - 1.2 - r() * 1.5, PEAK_X + (r() - 0.5) * 18, peakBase + 1.2 + r() * 2.4, 4 + r() * 5, 0.8 + r() * 0.8, 0.45 + r() * 0.2));
  }
  for (let k = 0; k < 4; k++) {
    banks.push(bank(SUMMIT_Z + 1.5 + r() * 2, PEAK_X + (r() - 0.5) * 22, peakBase + 3 + r() * 2.5, 6 + r() * 6, 1 + r(), 0.35 + r() * 0.2));
  }

  // Overcast cloud deck across the top of the sky, in screen fractions.
  const clouds: Cloud[] = Array.from({ length: 9 }, () => ({
    x: r() * 1.4 - 0.2, y: r() * 0.22, w: 0.25 + r() * 0.35, h: 0.06 + r() * 0.08, drift: 0.004 + r() * 0.008, alpha: 0.25 + r() * 0.3,
  }));
  return { ridges, banks, clouds };
}

const heightAt = (ridge: Ridge, x: number) => {
  const f = ((x + SPAN) / (2 * SPAN)) * (SAMPLES - 1);
  const i = Math.max(0, Math.min(SAMPLES - 2, Math.floor(f)));
  return ridge.heights[i] + (ridge.heights[i + 1] - ridge.heights[i]) * (f - i);
};

export function startFlight(canvas: HTMLCanvasElement, opts: { reduced: boolean }) {
  const ctx = canvas.getContext('2d')!;
  const { ridges, banks, clouds } = buildWorld();
  // Ridges and mist banks drawn together, far to near.
  const items = [...ridges.map((ridge) => ({ z: ridge.z, ridge })), ...banks.map((bank) => ({ z: bank.z, bank }))].sort((a, b) => b.z - a.z);
  let W = 0, H = 0, dpr = 1;
  let target = 0, current = 0;
  const t0 = performance.now();

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 1.75);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(current, 0);
  };

  // A soft elliptical puff, centred at (x, y) with radii (rx, ry).
  const puff = (x: number, y: number, rx: number, ry: number, color: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, color);
    g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const draw = (t: number, time: number) => {
    const camZ = t * TRAVEL;
    // Fly just above the ridges ahead, drifting side to side as if following the trail.
    const camY = baseAt(camZ + GAP) + 3.6 + t * 1.2;
    const horizon = H * (0.46 - t * 0.06);
    const focal = Math.max(W, H) * 0.75;
    // Near the end the camera swings round so the summit stands right of centre, clear of the text.
    const sway = Math.sin(t * Math.PI * 2.4) * 5;
    const frameX = PEAK_X - (W * 0.2 * (SUMMIT_Z - TRAVEL)) / focal;
    const e = clamp01((t - 0.7) / 0.3);
    const camX = sway + (frameX - sway) * e * e * (3 - 2 * e);
    const { top, horizon: haze } = skyAt(t);
    const mistColor = mix(MIST, haze, 0.35);

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, css(top));
    sky.addColorStop(horizon / H, css(haze));
    sky.addColorStop(1, css(haze));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Sun glow low on the horizon.
    const sx = W * (0.68 - t * 0.2), sy = horizon - H * 0.05;
    const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(W, H) * 0.45);
    sun.addColorStop(0, 'rgba(255,244,230,0.85)');
    sun.addColorStop(0.08, 'rgba(255,226,200,0.45)');
    sun.addColorStop(1, 'rgba(255,220,200,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, W, H);

    // Overcast deck: drifts on its own and shifts slightly as the camera turns.
    const deck = css(mix(top, hex('#c9c6d6'), 0.45), 1);
    for (const c of clouds) {
      const x = wrap(c.x + time * c.drift - camX * 0.01, -0.3, 1.3) * W;
      puff(x, c.y * H, c.w * W, c.h * H, deck.replace(/1\)$/, `${c.alpha})`));
    }

    const project = (x: number, y: number, dz: number) => [W / 2 + ((x - camX) * focal) / dz, horizon + ((camY - y) * focal) / dz];

    // A smooth path through points, curving through the midpoints between them.
    const curve = (pts: number[][], start = true) => {
      if (start) ctx.moveTo(pts[0][0], pts[0][1]); else ctx.lineTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) {
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
      }
      ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    };

    // The waterfall's banks and a painter for its surface. The river draws the waterfall and its own
    // first stretch as one outline, then paints the waterfall on top, so there is no seam between them.
    type Fall = { left: number[][]; right: number[][]; paint: () => void };
    let fallStream: Fall | null = null;

    const landmark = (dz: number, fog: number) => {
      const pt = ([px, py]: number[]) => project(PEAK_X + (px - 308) * PEAK_K, baseAt(SUMMIT_Z) + (300 - py) * PEAK_K, dz);
      const tint = (c: RGB, a = 1) => css(mix(c, haze, fog), a);
      const trace = (pts: number[][]) => {
        ctx.beginPath();
        pts.forEach((p, i) => { const [x, y] = pt(p); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      };
      const unit = (focal / dz) * PEAK_K; // Screen pixels per photo pixel.

      // Forested mountain body, lit from above.
      trace(MOUNTAIN);
      ctx.lineTo(W + 10, H + 10);
      ctx.lineTo(-10, H + 10);
      ctx.closePath();
      const [, peakTop] = pt([308, 26]);
      const body = ctx.createLinearGradient(0, peakTop, 0, H);
      body.addColorStop(0, tint(FOREST));
      body.addColorStop(1, tint(FOREST_DARK));
      ctx.fillStyle = body;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.lineCap = 'round';
      ctx.strokeStyle = tint(FOREST_DARK, 0.35);
      for (const [x1, y1, x2, y2] of GULLIES) {
        const [ax, ay] = pt([x1, y1]), [bx, by] = pt([x2, y2]);
        ctx.lineWidth = Math.max(1, unit * 6);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
      ctx.restore();

      ctx.fillStyle = tint(CLIFF_TONE, 0.8);
      trace(CLIFF); ctx.closePath(); ctx.fill();

      // The rock face, lit from the left, with rust streaks and moss along its top.
      trace(SLAB);
      ctx.closePath();
      const [lx] = pt([240, 0]), [rx] = pt([352, 0]);
      const rock = ctx.createLinearGradient(lx, 0, rx, 0);
      rock.addColorStop(0, tint(ROCK_DARK));
      rock.addColorStop(0.35, tint(ROCK_LIT));
      rock.addColorStop(1, tint(ROCK_MID));
      ctx.fillStyle = rock;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = tint(RUST, 0.45);
      ctx.lineCap = 'round';
      for (const [x1, y1, x2, y2, w] of STREAKS) {
        const [ax, ay] = pt([x1, y1]), [bx, by] = pt([x2, y2]);
        ctx.lineWidth = Math.max(1, unit * w);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
      ctx.fillStyle = tint(CAP);
      trace(SLAB_MOSS); ctx.closePath(); ctx.fill();
      ctx.restore();

      ctx.fillStyle = tint(ROCK_DARK);
      trace(KNOB); ctx.closePath(); ctx.fill();

      // Waterfall: a tapered stream that widens as it falls, with streaks flowing at different
      // speeds inside it, a glow at the spring and churning foam where it meets the river.
      const fall = FALL.map(pt);
      const n = fall.length;
      const footHalf = (riverHalf(SUMMIT_Z) / PEAK_K) * unit;
      // Widths are measured level across the screen, the same way the river's are, so the two sets of
      // banks continue into each other without a notch at the hand-over.
      const edges = fall.map(([x, y], i) => {
        const hw = footHalf * Math.min(1, i / (n - 2)) ** 0.75; // A point at the spring, full width just above the foot.
        return { x, y, nx: 1, ny: 0, hw };
      });
      // The banks stop one cross-section short of the foot; the river's outline carries on from there.
      const side = (k: number) => edges.slice(0, n - 1).map((e) => [e.x + e.nx * e.hw * k, e.y + e.ny * e.hw * k]);
      const paint = () => {
      ctx.beginPath();
      curve(side(-1));
      curve(side(1).reverse(), false);
      ctx.closePath();
      const [, topY] = fall[0], [, footY] = fall[n - 2];
      const sheet = ctx.createLinearGradient(0, topY, 0, footY);
      // Fade in from the rock so the water seeps out of the slope rather than starting on an edge.
      sheet.addColorStop(0, tint([236, 247, 255], 0));
      sheet.addColorStop(0.12, tint([236, 247, 255], 0.9));
      sheet.addColorStop(1, css(mix(mix(WATER, haze, 0.2), haze, fog * 0.8), 1)); // Same as the river.
      ctx.fillStyle = sheet;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.lineCap = 'butt';
      for (const [k, dash, gap, speed, a, w] of [[-0.45, 6, 10, 90, 0.75, 1.4], [0, 14, 8, 130, 0.95, 2.2], [0.5, 4, 12, 70, 0.6, 1.2]]) {
        ctx.beginPath();
        curve(side(k));
        ctx.setLineDash([unit * dash, unit * gap]);
        ctx.lineDashOffset = -time * unit * speed;
        const streak = ctx.createLinearGradient(0, topY, 0, footY);
        streak.addColorStop(0, 'rgba(255,255,255,0)');
        streak.addColorStop(0.2, `rgba(255,255,255,${a * (1 - fog)})`);
        ctx.strokeStyle = streak;
        ctx.lineWidth = Math.max(0.8, unit * w);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
      // A faint wet glint where the spring breaks out of the slope.
      puff(fall[1][0], fall[1][1], unit * 4, unit * 6, `rgba(255,255,255,${0.35 * (1 - fog)})`);
      const [fx, fy] = fall[n - 1];
      for (let i = 0; i < 3; i++) {
        const beat = 1 + 0.18 * Math.sin(time * 3.2 + i * 2.1);
        puff(fx + (i - 1) * footHalf * 0.6, fy - unit * 2, footHalf * 1.4 * beat, unit * 5 * beat, `rgba(255,255,255,${0.45 * (1 - fog)})`);
      }
      puff(fx, fy - unit * 6, footHalf * 3, unit * 12, css(mix(MIST, haze, fog), 0.35 * (1 - fog)));
      };
      fallStream = { left: side(-1), right: side(1), paint };
    };

    // One stretch of river between two depths, with glints drifting toward the camera.
    const river = (zFar: number, zNear: number, fog: number, alpha: number, fall: Fall | null = null) => {
      zNear = Math.max(zNear, camZ + 0.8);
      if (zFar <= zNear || alpha < 0.01) return;
      const steps = fall ? 40 : 10; // Finer below the waterfall so the hand-over is smooth.
      const left: number[][] = [], right: number[][] = [];
      for (let k = 0; k <= steps; k++) {
        const z = zFar + ((zNear - zFar) * k) / steps;
        const dz = z - camZ;
        left.push(project(riverX(z) - riverHalf(z), riverY(z), dz));
        right.push(project(riverX(z) + riverHalf(z), riverY(z), dz));
      }
      const water = css(mix(mix(WATER, haze, 0.2), haze, fog * 0.8), fall ? alpha : alpha * 0.95);
      ctx.beginPath();
      if (fall) {
        // Waterfall and river as one smooth outline (skipping the river's level first edge).
        curve([...fall.left, ...left.slice(1)]);
        curve([...fall.right, ...right.slice(1)].reverse(), false);
      } else {
        left.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        for (let k = right.length - 1; k >= 0; k--) ctx.lineTo(right[k][0], right[k][1]);
      }
      ctx.closePath();
      ctx.fillStyle = water;
      ctx.fill();
      fall?.paint();
      // A bright line along the far bank, where the water catches the sky.
      ctx.beginPath();
      (fall ? right.slice(2) : right).forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * alpha * (1 - fog)})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      const len = zFar - zNear;
      for (let i = 0; i < 5; i++) {
        const z = zFar - wrap(time * 1.1 + i * 0.73 + zFar * 0.37, 0, len);
        const dz = z - camZ;
        const [gx, gy] = project(riverX(z) + Math.sin(i * 2.1 + zFar) * riverHalf(z) * 0.45, riverY(z), dz);
        const rx = Math.min(40, (riverHalf(z) * 0.55 * focal) / dz);
        if (rx < 0.6) continue;
        ctx.fillStyle = `rgba(255,255,255,${0.55 * alpha * (1 - fog)})`;
        ctx.beginPath();
        ctx.ellipse(gx, gy, rx, Math.max(0.5, rx * 0.16), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const mistBank = (b: Bank, dz: number) => {
      // Banks fade in from the haze, peak as you reach them, and thin out as you fly through.
      const far = 1 - clamp01((dz - 6) / FOG_DEPTH);
      const through = clamp01((dz - 0.25) / 1.6);
      const a = b.alpha * far * through;
      if (a < 0.01) return;
      const x = b.x + wrap(time * b.drift, -6, 6);
      // Right at the camera a bank is bigger than the screen: show it as a white-out over the
      // view instead of drawing puffs tens of thousands of pixels wide.
      if (dz < 1.2) {
        const [px] = project(x, b.y, dz);
        if (Math.abs(px - W / 2) < (b.w * focal) / dz) {
          ctx.fillStyle = css(mistColor, a * 0.6 * (1 - clamp01((dz - 0.6) / 0.6)));
          ctx.fillRect(0, 0, W, H);
        }
        return;
      }
      const cap = Math.max(W, H) * 2.5;
      for (const [ox, oy, s] of b.puffs) {
        const [px, py] = project(x + ox, b.y + oy, dz);
        const rx = Math.min(cap, (b.w * s * focal) / dz), ry = Math.min(cap, (b.h * s * focal) / dz);
        if (px + rx < 0 || px - rx > W || py + ry < 0 || py - ry > H) continue;
        puff(px, py, rx, ry, css(mistColor, a));
      }
    };

    for (const item of items) {
      const dz = item.z - camZ;
      if ('bank' in item) { if (dz > 0.25) mistBank(item.bank!, dz); continue; }
      const ridge = item.ridge!;
      if (dz < 0.6) continue; // Already flown over.
      const fog = ridge.peak ? clamp01((dz - 10) / 60) * 0.7 : clamp01((dz - 2) / FOG_DEPTH);
      if (fog >= 0.995) continue;
      if (ridge.peak) {
        landmark(dz, fog);
        river(SUMMIT_Z, 4 + (COUNT - 1) * GAP, fog, 1, fallStream);
        continue;
      }
      // Ridges very close to the camera fade out instead of popping.
      const near = clamp01((dz - 0.6) / 1.4);

      ctx.beginPath();
      ctx.moveTo(-10, H + 10);
      let crestY = H;
      for (let s = 0; s < SAMPLES; s++) {
        const x = -SPAN + (2 * SPAN * s) / (SAMPLES - 1);
        const [px, py] = project(x, ridge.heights[s], dz);
        if (px < -200 || px > W + 200) continue;
        ctx.lineTo(px, py);
        crestY = Math.min(crestY, py);
      }
      ctx.lineTo(W + 10, H + 10);
      ctx.closePath();

      const g = ctx.createLinearGradient(0, crestY, 0, H);
      g.addColorStop(0, css(mix(ridge.crest, haze, fog), near));
      g.addColorStop(1, css(mix(ridge.foot, haze, fog * 0.85), near));
      ctx.fillStyle = g;
      ctx.fill();

      // Mist settling in the valley in front of each ridge.
      if (fog < 0.9) {
        const [, baseY] = project(0, baseAt(ridge.z) + 0.3, dz);
        const mist = ctx.createLinearGradient(0, baseY - H * 0.08, 0, baseY + H * 0.04);
        mist.addColorStop(0, css(mistColor, 0));
        mist.addColorStop(1, css(mistColor, 0.3 * (1 - fog) * near));
        ctx.fillStyle = mist;
        ctx.fillRect(0, baseY - H * 0.08, W, H * 0.12);
      }

      // The river runs over the valley mist so each stretch joins the next without a band across it.
      river(ridge.z, ridge.z - GAP, fog, near);

      // Neelakurinji flowers on the slopes that are close enough to see.
      if (ridge.flowers.length && dz < 12) {
        ctx.globalAlpha = near * (1 - clamp01((dz - 6) / 6));
        for (const f of ridge.flowers) {
          const [px, py] = project(f.x, heightAt(ridge, f.x) - f.drop, dz);
          if (px < -10 || px > W + 10 || py > H + 10) continue;
          const r = Math.min(4.5, (f.size * focal) / dz);
          if (r < 0.4) continue;
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.ellipse(px, py, r, r * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
  };

  // The camera eases toward the scroll position, so wheel steps glide. The mist keeps drifting
  // while the tab is visible (the browser pauses animation frames otherwise); with reduced
  // motion the scene only redraws when the view changes.
  let pending = false;
  const tick = (now: number) => {
    pending = false;
    current += (target - current) * (opts.reduced ? 1 : 0.08);
    if (Math.abs(target - current) < 0.0002) current = target;
    draw(current, opts.reduced ? 0 : (now - t0) / 1000);
    if (!opts.reduced || current !== target) schedule();
  };
  const schedule = () => {
    if (!pending) { pending = true; requestAnimationFrame(tick); }
  };

  addEventListener('resize', resize);
  resize();
  schedule();

  return {
    setProgress(p: number) {
      target = clamp01(p);
      schedule();
    },
  };
}
