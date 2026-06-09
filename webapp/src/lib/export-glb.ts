import type * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

export async function exportGLB(object: THREE.Object3D, filename: string) {
	const exporter = new GLTFExporter();
	const result = await exporter.parseAsync(object, { binary: true });
	const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename.endsWith('.glb') ? filename : `${filename}.glb`;
	a.click();
	URL.revokeObjectURL(url);
}
