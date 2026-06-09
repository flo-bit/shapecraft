# Shapecraft — 6-Month Roadmap (v1)

> The original v0 build plan lives in [`plan-v0.md`](./plan-v0.md). This document is the
> forward-looking strategy: improving the models we have, making many more, and growing the
> library to support them.

**Team & horizon:** 4 people, full-time, 6 months (~24 person-months).

---

## Where we are

Shapecraft is a procedural 3D model generation library for the browser: an immutable,
functional `Mesh` API over Three.js, with a stylized low-poly toolbox (noise, palettes,
face/vertex color, loft/tube/thicken, adaptive subdivision, jitter) and a **schema-driven
editor** — each generator declares its options and gets a live UI, presets, and
range-randomization for free.

We ship **three models** today: common tree, pine, palm. All vegetation, all flat-shaded
vertex-colored.

**The core tension:** every model is ~200 lines of bespoke, copy-pasted code. Trunk warp,
snow logic, face-shading, and the fragile "call `rand()` to keep the sequence stable" pattern
are duplicated across all three. This does not scale to 20+ models. The ambition goes into the
framework that makes each new model cheap.

---

## North star

**All four scopes at once** — best-in-class vegetation, a full stylized environment kit, an
asset-pipeline product, and a great general-purpose library. **All four consumers** — web/
Three.js scenes, game engines, no-code designers, and developers using the API.

### The "all four" insight

These don't pull in four directions; they share one spine. The non-negotiable shared platform
is: generator framework + CSG/bevel + curves + weld/LOD + AO/wind + instancing + glTF export +
workers + playground + npm publish. Build that once and all four audiences are served.

So "all four" resolves to a strict order: **engine-first, then catalog, then platform polish —
with the quality bar (LOD, AO, wind, export) baked into the shared pipeline from the start so
it is free for every model.**

The one risk is shipping four half-products. The mitigation is the sequencing below: the
foundation serves all four scopes simultaneously, and we don't branch into audience-specific
polish until the substrate is real.

---

## Thesis: build the multiplier before the models

The highest-leverage work is not more models — it's the substrate that makes every subsequent
model cheap. Spend the first third of the project there, then flood the catalog.

---

## Two things to fix in week one (regardless of everything else)

1. **Determinism model.** Replace the single RNG with **named independent streams**
   (`rng.stream('canopy')`, `rng.stream('snow')`). The current "consume a `rand()` to keep the
   sequence stable" hack is a latent bug farm — change one branch and every downstream model
   shifts. Fix it before it spreads into 20 more files.
2. **Packaging gap.** Today `package.json` `main` points at raw `.ts` — shapecraft is not
   actually consumable as a package. Decide now that it ships as a real built npm package with
   **stable seeds as a compatibility guarantee**. This changes how we test (golden snapshots)
   and how we version from day one.

---

## Workstreams

### A. Generator framework (the model multiplier)
- Extract repeated patterns into reusable building blocks: a `trunk()` / tapered-limb builder,
  a `canopyShade()` color helper, a `snow()` modifier.
- **Anchor / socket points** on meshes (canopy top, ground contact, attachment rings) for
  composition.
- **Skeleton / L-system branching engine**: recursive tapered branches with leaf/attachment
  slots. One engine yields oak, birch, willow, dead tree, bush, fern, coral, and vines from
  parameters instead of bespoke files.
- RNG named streams + **golden-snapshot test harness** (vertex counts, bounds, hashes) so
  "seed 5 looks like X" is locked across versions.

### B. Library capability gaps (unlock new model classes)
- **CSG booleans** (union / subtract / intersect) — windows in walls, holes, carved props,
  hard-surface.
- **Bevel / inset / extrude-faces** — architecture, crates, furniture, crisp edges.
- First-class **Curve / Path type with parallel-transport frames** — fixes twist artifacts in
  `tube`/`loft` and cleans up every stalk/branch/vine.
- **Vertex weld + decimation + automatic LOD generation** — today `faceColor` un-indexes
  everything (×3 vertices) with no way to weld back or produce LODs. Required for any real use
  at scale and for game-engine export.

### C. Quality lift across all models (cheap, high-impact, on-brand)
- **Baked vertex ambient occlusion / cavity shading** — instantly makes everything read as 3D
  instead of flat.
- **Per-vertex wind weights** — trees sway in a shader, models ship game-ready.
- **Real branches** on the trees (currently trunk-plus-blobs).
- Poly-budget / triangle-count targets per model.

### D. Product surface (make output usable)
- **Instancing**: `scatter → THREE.InstancedMesh` (the forest demo builds 15 unique meshes
  today — critical perf win).
- **glTF / GLB export** (plus OBJ) — the asset pipeline for game engines and designers.
- **Real Web Worker pool** — the pool is a synchronous stub; `serialize()`/Transferable are
  already in place to make it real.
- **Biome / scatter scene generator** — Poisson-disk, noise density maps, slope/altitude rules
  (the forest demo is the seed).
- **Hosted playground + gallery** — the schema editor is the unfair advantage; one-click glTF
  export for the no-code crowd.
- **npm publish pipeline** — real build, `.d.ts`, dual ESM. Docs, perf benchmarks, visual
  regression (the `screenshot.cjs` scripts are the seed).

---

## Timeline

### Months 1–2 — Foundation (all 4 people; the whole ballgame, nothing skippable)
- RNG named streams + golden-snapshot test harness.
- Shared model primitives + skeleton/L-system branch engine.
- CSG booleans + bevel/inset/extrude.
- First-class Curve/Path with parallel-transport frames.
- Weld + decimate + automatic LOD generation.

### Months 2–4 — Catalog explosion + quality baked in (split: 2 on models, 2 on platform)
- **Models team:** ride the framework through vegetation (bush, grass, fern, dead tree, cactus,
  birch, willow, mushroom, bamboo, flower) + rocks/cliffs + the prop/architecture set CSG now
  enables (crates, fences, walls, simple buildings, furniture — chair/table already in the demo).
- **Platform team:** bake AO/cavity shading + per-vertex wind weights into the shared pipeline
  (every model above ships better-looking and game-ready automatically); add instancing and the
  glTF/GLB exporter.

### Months 4–6 — Platform & product (split: scene/biome + playground)
- Real Web Worker pool.
- Biome/scatter scene generator.
- Hosted playground + gallery with one-click glTF export.
- npm publish pipeline (build, `.d.ts`, dual ESM).
- Docs, perf benchmarks, visual regression harness.

---

## Definition of success

- 20+ models spanning vegetation, rocks, props, and basic architecture — each with presets,
  LODs, baked AO, and wind data.
- Shapecraft installable from npm with stable, versioned seeds.
- One-click glTF/GLB export from a hosted playground.
- Forests/biomes rendered via instancing + workers without blocking the main thread.
- A general-purpose, documented, benchmarked procedural-mesh library others can build on.
