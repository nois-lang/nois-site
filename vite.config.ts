import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
    plugins: [
        solidPlugin(),
        viteStaticCopy({
            targets: [{ src: 'node_modules/nois/std', dest: '.' }]
        })
    ],
    server: {
        port: 3000
    },
    build: {
        target: 'esnext'
    }
})
