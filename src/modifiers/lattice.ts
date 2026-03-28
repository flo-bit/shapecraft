import { Mesh } from '../mesh'

// STUB for v0 — lattice deformation placeholder
export interface LatticeOptions {
  divisions?: [number, number, number]
}

export function lattice(_mesh: Mesh, _options?: LatticeOptions): Mesh {
  return _mesh.clone()
}
