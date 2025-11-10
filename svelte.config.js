import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		alias: {
			$lib: './src/lib',
			'$lib/types': './src/lib/types',
			'$lib/utils': './src/lib/utils',
			'$lib/core': './src/lib/core',
			'$lib/services': './src/lib/services'
		}
	}
};

export default config;

