import { error } from '@sveltejs/kit';
import { getGenerator } from '$lib/registry';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	if (!getGenerator(params.id)) error(404, `Unknown generator "${params.id}"`);
};
