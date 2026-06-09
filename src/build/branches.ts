import { tube, merge } from '../ops'
import { createRng } from '../core/rng'
import { Mesh } from '../core/mesh'
import type { Vec3 } from '../core/types'

export interface BranchTip {
  /** End point of a terminal limb — where foliage/leaves/fruit can attach. */
  position: Vec3
  /** Growth direction at the tip. */
  direction: Vec3
  /** Radius at the tip. */
  radius: number
  /** Recursion depth remaining when this tip was emitted (0 = outermost). */
  depth: number
}

export interface BranchResult {
  /** Merged tapered limbs (uncolored — apply your own vertexColor/faceColor). */
  mesh: Mesh
  /** Attachment points at the end of every terminal limb. */
  tips: BranchTip[]
}

export interface BranchesOptions {
  /** RNG to draw from (pass a generator stream for determinism). Falls back to `seed`. */
  rng?: () => number
  seed?: number
  /** Base of the trunk. Default origin. */
  start?: Vec3
  /** Initial growth direction. Default up. */
  direction?: Vec3
  /** Length of the root limb. */
  length: number
  /** Base radius of the root limb. */
  radius: number
  /** Recursion levels (number of limb generations). */
  depth: number
  /** Children spawned at each split. Default 2. */
  children?: number | [number, number]
  /** Child length = parent length × this. Default 0.72. */
  lengthFalloff?: number
  /** Child radius = parent radius at the attach point × this. Default 0.82. */
  radiusFalloff?: number
  /** Angle (radians) children diverge from the parent. Default 0.7. */
  spread?: number
  /** Pull of each limb toward world-up, 0..1. Default 0.25. */
  upBias?: number
  /** Random meander of a limb (radians, total). Default 0.4. */
  wander?: number
  /** Path points per limb. Default 5. */
  segments?: number
  /** Taper-curve exponent for a strand's radius (radius·(1−t)^taper). Lower keeps the body thick (sharpening only near the tip); higher thins sooner. Default 0.5. */
  taper?: number
  /** Tube radial sides. Default 5. */
  sides?: number
  /** Fraction up a limb where side branches begin sprouting. Default 0.3. */
  splitStart?: number
}

function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}
function perpendicular(d: Vec3): Vec3 {
  const a: Vec3 = Math.abs(d[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]
  return normalize(cross(d, a))
}
/** Rotate direction `d` by `angle` away from itself, in azimuth `az` around `d`. */
function diverge(d: Vec3, angle: number, az: number): Vec3 {
  const p = perpendicular(d)
  const q = cross(d, p) // second perpendicular
  const pr: Vec3 = [
    p[0] * Math.cos(az) + q[0] * Math.sin(az),
    p[1] * Math.cos(az) + q[1] * Math.sin(az),
    p[2] * Math.cos(az) + q[2] * Math.sin(az),
  ]
  const c = Math.cos(angle), s = Math.sin(angle)
  return normalize([d[0] * c + pr[0] * s, d[1] * c + pr[1] * s, d[2] * c + pr[2] * s])
}
function towardUp(d: Vec3, t: number): Vec3 {
  return normalize([d[0] * (1 - t), d[1] * (1 - t) + t, d[2] * (1 - t)])
}

/**
 * Grow a recursive tapered branch skeleton — the engine behind dead trees, bare
 * limbs, coral, and (with foliage attached at the returned tips) leafy trees.
 */
export function branches(options: BranchesOptions): BranchResult {
  const rng = options.rng ?? createRng(options.seed ?? 0)
  const childrenOpt = options.children ?? 3
  const lengthFalloff = options.lengthFalloff ?? 0.7
  const radiusFalloff = options.radiusFalloff ?? 0.82
  const spread = options.spread ?? 0.8
  const upBias = options.upBias ?? 0.22
  const wander = options.wander ?? 0.5
  const segments = options.segments ?? 6
  const taperExp = options.taper ?? 0.5
  const sides = options.sides ?? 5
  const splitStart = options.splitStart ?? 0.2

  const limbs: Mesh[] = []
  const tips: BranchTip[] = []

  // Each strand is ONE continuous axis (trunk or branch), built as a single tube that
  // tapers smoothly from its base to a twig point. Laterals branch off along it; each
  // lateral is itself a strand. There are no per-segment trunk joints to gap.
  function strand(start: Vec3, dir: Vec3, length: number, radius: number, depth: number) {
    let d = normalize(dir)
    let pos = start
    const path: Vec3[] = [pos]
    const stepLen = length / segments
    for (let s = 0; s < segments; s++) {
      d = diverge(d, (wander / segments) * (0.5 + rng()), rng() * Math.PI * 2)
      d = towardUp(d, upBias * 0.15)
      pos = [pos[0] + d[0] * stepLen, pos[1] + d[1] * stepLen, pos[2] + d[2] * stepLen]
      path.push(pos)
    }
    // Smooth taper from base to a point at the tip; the top is naturally a thin twig.
    const radiusAt = (t: number) => radius * Math.pow(Math.max(0, 1 - t), taperExp)
    limbs.push(tube(path, radiusAt, sides, false))
    tips.push({ position: pos, direction: d, radius: radius * 0.25, depth })

    if (depth <= 1) return

    const n = Array.isArray(childrenOpt)
      ? Math.round(childrenOpt[0] + rng() * (childrenOpt[1] - childrenOpt[0]))
      : childrenOpt

    // Laterals sprout from points along the strand, each starting on the parent axis so
    // its base is buried inside the parent tube → connected joints, no caps, no gaps.
    for (let c = 0; c < n; c++) {
      const f = splitStart + (0.9 - splitStart) * ((c + 0.5 + (rng() - 0.5) * 0.6) / n)
      const fi = Math.max(0, Math.min(segments - 1e-6, f * segments))
      const i0 = Math.floor(fi)
      const ft = fi - i0
      const a = path[i0], b = path[i0 + 1]
      const apos: Vec3 = [a[0] + (b[0] - a[0]) * ft, a[1] + (b[1] - a[1]) * ft, a[2] + (b[2] - a[2]) * ft]
      const adir = normalize([b[0] - a[0], b[1] - a[1], b[2] - a[2]])
      const arad = radiusAt(f)

      let cd = diverge(adir, spread * (0.6 + rng() * 0.7), rng() * Math.PI * 2)
      cd = towardUp(cd, upBias)
      strand(apos, cd, length * lengthFalloff * (0.7 + rng() * 0.4), arad * radiusFalloff, depth - 1)
    }
  }

  strand(options.start ?? [0, 0, 0], options.direction ?? [0, 1, 0], options.length, options.radius, options.depth)

  return { mesh: merge(...limbs), tips }
}
