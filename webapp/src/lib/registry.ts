import type { OptionSchema } from 'shapecraft/core/schema';
import type { Mesh } from 'shapecraft/core/mesh';
import type { Asset } from 'shapecraft/core/asset';
import {
	tree,
	treeSchema,
	treePresets,
	pine,
	pineSchema,
	pinePresets,
	palm,
	palmSchema,
	palmPresets,
	bush,
	bushSchema,
	bushPresets,
	grass,
	grassSchema,
	grassPresets,
	fern,
	fernSchema,
	fernPresets,
	flower,
	flowerSchema,
	flowerPresets,
	deadTree,
	deadTreeSchema,
	deadTreePresets,
	leafyTree,
	leafyTreeSchema,
	leafyTreePresets,
	mushroom,
	mushroomSchema,
	mushroomPresets,
	rock,
	rockSchema,
	rockPresets,
	sharpRock,
	sharpRockSchema,
	sharpRockPresets,
	blockRock,
	blockRockSchema,
	blockRockPresets
} from 'shapecraft/generators';

export type CategoryId = 'trees' | 'plants' | 'rocks';

export interface Category {
	id: CategoryId;
	label: string;
}

export const CATEGORIES: Category[] = [
	{ id: 'trees', label: 'Trees' },
	{ id: 'plants', label: 'Plants' },
	{ id: 'rocks', label: 'Rocks' }
];

export interface GeneratorEntry {
	id: string;
	label: string;
	category: CategoryId;
	// Generators are migrating from single Mesh to multi-part Asset; toThreeMesh handles both.
	gen: (opts: Record<string, unknown>) => Mesh | Asset;
	schema: OptionSchema;
	presets: Record<string, Record<string, unknown>>;
	/** Rough camera distance that frames the default model nicely */
	viewDistance: number;
}

export const GENERATORS: GeneratorEntry[] = [
	{
		id: 'common',
		label: 'Common Tree',
		category: 'trees',
		gen: tree,
		schema: treeSchema,
		presets: treePresets,
		viewDistance: 7
	},
	{
		id: 'leafy',
		label: 'Leafy Tree',
		category: 'trees',
		gen: leafyTree,
		schema: leafyTreeSchema,
		presets: leafyTreePresets,
		viewDistance: 7
	},
	{
		id: 'pine',
		label: 'Pine',
		category: 'trees',
		gen: pine,
		schema: pineSchema,
		presets: pinePresets,
		viewDistance: 8
	},
	{
		id: 'palm',
		label: 'Palm',
		category: 'trees',
		gen: palm,
		schema: palmSchema,
		presets: palmPresets,
		viewDistance: 9
	},
	{
		id: 'dead',
		label: 'Dead Tree',
		category: 'trees',
		gen: deadTree,
		schema: deadTreeSchema,
		presets: deadTreePresets,
		viewDistance: 8
	},
	{
		id: 'bush',
		label: 'Bush',
		category: 'plants',
		gen: bush,
		schema: bushSchema,
		presets: bushPresets,
		viewDistance: 3
	},
	{
		id: 'grass',
		label: 'Grass',
		category: 'plants',
		gen: grass,
		schema: grassSchema,
		presets: grassPresets,
		viewDistance: 2.5
	},
	{
		id: 'fern',
		label: 'Fern',
		category: 'plants',
		gen: fern,
		schema: fernSchema,
		presets: fernPresets,
		viewDistance: 3.5
	},
	{
		id: 'flower',
		label: 'Flower',
		category: 'plants',
		gen: flower,
		schema: flowerSchema,
		presets: flowerPresets,
		viewDistance: 2.5
	},
	{
		id: 'mushroom',
		label: 'Mushroom',
		category: 'plants',
		gen: mushroom,
		schema: mushroomSchema,
		presets: mushroomPresets,
		viewDistance: 1.6
	},
	{
		id: 'rock',
		label: 'Rock',
		category: 'rocks',
		gen: rock,
		schema: rockSchema,
		presets: rockPresets,
		viewDistance: 3
	},
	{
		id: 'sharp',
		label: 'Sharp Rock',
		category: 'rocks',
		gen: sharpRock,
		schema: sharpRockSchema,
		presets: sharpRockPresets,
		viewDistance: 4
	},
	{
		id: 'block',
		label: 'Block Rock',
		category: 'rocks',
		gen: blockRock,
		schema: blockRockSchema,
		presets: blockRockPresets,
		viewDistance: 3.5
	}
];

export function getGenerator(id: string): GeneratorEntry | undefined {
	return GENERATORS.find((g) => g.id === id);
}

export function generatorsInCategory(category: CategoryId): GeneratorEntry[] {
	return GENERATORS.filter((g) => g.category === category);
}
