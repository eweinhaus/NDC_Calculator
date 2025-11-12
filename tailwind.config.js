/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				teal: {
					'soft-bg': '#E6F7F7',
					'lighter-bg': '#F0FDFA',
					'light': '#5EEAD4',
					'default': '#14B8A6',
					'dark': '#0D9488',
					'darker': '#0F766E',
					'primary': '#14B8A6',
					'secondary': '#0D9488'
				}
			}
		}
	},
	plugins: []
};

