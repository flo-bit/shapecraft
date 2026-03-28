// STUB for v0 — procedural textures
export function checkerboard(size: number = 8): (u: number, v: number) => [number, number, number] {
  return function checker(u: number, v: number): [number, number, number] {
    const x = Math.floor(u * size)
    const y = Math.floor(v * size)
    return (x + y) % 2 === 0 ? [1, 1, 1] : [0, 0, 0]
  }
}
