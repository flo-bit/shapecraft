import type { GeneratorEntry } from './registry';

/**
 * Editor state, kept at module level keyed by generator id so parameter
 * tweaks survive switching between generators within a session.
 */
const overridesById: Record<string, Record<string, unknown>> = $state({});
const presetById: Record<string, string> = $state({});

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

/** The value the UI should display for a param: override → preset → schema default. */
export function displayValue(entry: GeneratorEntry, key: string): unknown {
	const override = overridesById[entry.id]?.[key];
	if (override !== undefined) return override;
	const preset = entry.presets[getPreset(entry.id)];
	if (preset && preset[key] !== undefined) return preset[key];
	return entry.schema[key].default;
}

/** Options object passed to the generator function. */
export function buildOptions(entry: GeneratorEntry): Record<string, unknown> {
	return { ...overridesById[entry.id], preset: getPreset(entry.id) };
}

export function randomizeSeed(entry: GeneratorEntry) {
	const def = entry.schema.seed;
	if (!def || (def.type !== 'integer' && def.type !== 'range')) return;
	const seed = Math.floor(def.min + Math.random() * (def.max - def.min + 1));
	setParam(entry.id, 'seed', seed);
}
