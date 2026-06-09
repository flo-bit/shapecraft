import { styles } from 'shapecraft/style';
import type { GeneratorEntry } from './registry';

/**
 * Editor state, kept at module level keyed by generator id so parameter
 * tweaks survive switching between generators within a session.
 */
const overridesById: Record<string, Record<string, unknown>> = $state({});
const presetById: Record<string, string> = $state({});

// The style is app-wide, not per-generator: browsing the catalog in a chosen
// style is the point of the style system.
const styleState = $state({ name: 'lowpoly' });

export function getStyle(): string {
	return styleState.name;
}

export function setStyle(name: string) {
	if (!styles[name]) return;
	styleState.name = name;
}

export function getOverrides(id: string): Record<string, unknown> {
	if (!overridesById[id]) overridesById[id] = {};
	return overridesById[id];
}

export function getPreset(id: string): string {
	return presetById[id] ?? 'default';
}

export function setPreset(id: string, preset: string) {
	presetById[id] = preset;
	// A preset is a fresh baseline: drop manual overrides so its values show through.
	overridesById[id] = {};
}

export function setParam(id: string, key: string, value: unknown) {
	getOverrides(id);
	overridesById[id][key] = value;
}

export function resetParams(id: string) {
	overridesById[id] = {};
	presetById[id] = 'default';
}

/**
 * The value the UI should display for a param: override → preset → style
 * palette (for role-tagged color options) → schema default. Mirrors the
 * precedence in the library's resolveOptions, so the panel never lies about
 * what the generator will use.
 */
export function displayValue(entry: GeneratorEntry, key: string): unknown {
	const override = overridesById[entry.id]?.[key];
	if (override !== undefined) return override;
	const preset = entry.presets[getPreset(entry.id)];
	if (preset && preset[key] !== undefined) return preset[key];
	const def = entry.schema[key];
	if (def.type === 'color' || def.type === 'color-array') {
		const palette = def.role ? styles[styleState.name]?.palettes[def.role] : undefined;
		if (palette) return def.type === 'color' ? palette[0] : palette;
	}
	return def.default;
}

/** Options object passed to the generator function. */
export function buildOptions(entry: GeneratorEntry): Record<string, unknown> {
	return { ...overridesById[entry.id], preset: getPreset(entry.id), style: styleState.name };
}

export function randomizeSeed(entry: GeneratorEntry) {
	const def = entry.schema.seed;
	if (!def || (def.type !== 'integer' && def.type !== 'range')) return;
	const seed = Math.floor(def.min + Math.random() * (def.max - def.min + 1));
	setParam(entry.id, 'seed', seed);
}
