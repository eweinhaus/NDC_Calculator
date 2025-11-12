/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				teal: {
					'soft-bg': '#E0F2FE',
					'lighter-bg': '#E6F7FB',
					'light': '#67E8F9',
					'default': '#06B6D4',
					'dark': '#0891B2',
					'darker': '#0E7490',
					'primary': '#06B6D4',
					'secondary': '#6366F1'
				},
				red: {
					'50': '#FEF2F2',
					'100': '#FEE2E2',
					'200': '#FECACA',
					'300': '#FCA5A5',
					'400': '#F87171',
					'500': '#EF4444',
					'600': '#DC2626',
					'700': '#B91C1C',
					'800': '#991B1B',
					'900': '#7F1D1D',
					'light': '#FEE2E2',
					'default': '#EF4444',
					'dark': '#DC2626',
					'accent': '#F87171'
				},
				offwhite: {
					'warm': '#F7F2EA',
					'cool': '#F0E8E0',
					'cream': '#EBE3DB'
				}
			}
		}
	},
	plugins: []
};

