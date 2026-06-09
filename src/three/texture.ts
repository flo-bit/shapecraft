import * as THREE from 'three'
import type { TextureData } from '../texture/types'

export interface ToDataTextureOptions {
  /**
   * 'srgb' for color/albedo maps (default), 'linear' for data maps
   * (normal, roughness, AO, masks).
   */
  colorSpace?: 'srgb' | 'linear'
}

/** Convert rasterized TextureData to a repeat-wrapped THREE.DataTexture. */
export function toDataTexture(tex: TextureData, options: ToDataTextureOptions = {}): THREE.DataTexture {
  const texture = new THREE.DataTexture(
    new Uint8Array(tex.data),
    tex.width,
    tex.height,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  )
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = options.colorSpace === 'linear' ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace
  if (tex.filter === 'nearest') {
    // Keep texels crisp at all distances — no mips, no blending
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.generateMipmaps = false
  } else {
    texture.magFilter = THREE.LinearFilter
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.generateMipmaps = true
  }
  texture.needsUpdate = true
  return texture
}
