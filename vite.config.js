import { defineConfig } from 'vite'
import restart from 'vite-plugin-restart'
import glsl from 'vite-plugin-glsl'

export default defineConfig({
    base: '/t2-hubit/', // GitHub Pages için repo adıyla uyumlu base path

    root: './', // Genellikle "index.html" burada bulunur
    publicDir: './static/', // Statik dosyalar için klasör

    server: {
        host: true,
        open: !('SANDBOX_URL' in process.env || 'CODESANDBOX_HOST' in process.env)
    },

    build: {
        outDir: './dist',
        emptyOutDir: true,
        sourcemap: true
    },

    plugins: [
        glsl(),
        restart({ restart: ['./static/**'] })
    ]
})
