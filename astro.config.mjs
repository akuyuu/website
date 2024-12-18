// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	site: 'https://amechan.rip',
	// base: 'website',
	integrations: [mdx(), sitemap()],
	vite: {
		assetsInclude: ['**/*.ttf', '**/*.png'],
	},
	markdown: {
		syntaxHighlight: 'prism',
		// shikiConfig: {
		// 	theme: 'catppuccin-frappe',
		// },
	},
});
