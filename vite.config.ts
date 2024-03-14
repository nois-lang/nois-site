import terser from '@rollup/plugin-terser'
import { RenderedChunk } from 'rollup'
import { MinifyOptions } from 'terser'
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const chunkMap = [
    { pattern: 'nois/dist/', dest: 'nois', mangle: false },
    { pattern: '@codemirror', dest: 'codemirror', mangle: true }
]

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
        target: 'esnext',
        rollupOptions: {
            plugins: [
                {
                    name: 'terser',
                    renderChunk: (code: string, chunk: RenderedChunk, outputOptions: any) => {
                        const terserOptions: MinifyOptions = { format: { comments: false } }
                        const opts = chunkMap.find(c => c.dest === chunk.name)
                        if (opts && !opts.mangle) {
                            terserOptions.keep_fnames = true
                        }
                        return (<any>terser(terserOptions)).renderChunk(code, chunk, outputOptions)
                    }
                }
            ],
            output: {
                manualChunks: id => {
                    return chunkMap.find(({ pattern }) => id.includes(pattern))?.dest
                }
            }
        },
        minify: false,
        sourcemap: true
    }
})
