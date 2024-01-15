import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
    plugins: [
        solidPlugin(),
        (<any>monacoEditorPlugin).default({
            languageWorkers: ['editorWorkerService']
        }),
        viteStaticCopy({
            targets: [{ src: 'node_modules/nois/dist/std', dest: 'public' }]
        })
    ],
    server: {
        port: 3000
    },
    build: {
        target: 'esnext',
        rollupOptions: {
            output: {
                manualChunks: { 'monaco-editor': ['monaco-editor'] }
            }
        }
    }
})
