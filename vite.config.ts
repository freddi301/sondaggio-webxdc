import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'

// https://vite.dev/config/
export default defineConfig({
  // Webxdc apps can't assume they're served from an origin root (e.g. a
  // file:// or custom-scheme host) — relative asset paths only.
  base: './',
  plugins: [
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      emitTsDeclarations: true,
      // No manual switcher: detect from the webview's navigator.language,
      // falling back to English. Omitting cookie/url/localStorage/globalVariable
      // lets the bundler tree-shake their code out entirely.
      strategy: ['preferredLanguage', 'baseLocale'],
    }),
    tailwindcss(),
    svelte(),
  ],
})
