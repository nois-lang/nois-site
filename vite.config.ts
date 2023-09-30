import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

export default defineConfig({
    plugins: [
        solidPlugin(),
        (<any>monacoEditorPlugin).default({ languageWorkers: ['editorWorkerService'] })
    ],
    server: {
        port: 3000,
    },
    build: {
        target: 'esnext',
        rollupOptions: {
            output: {
                manualChunks: { 'monaco-editor': ['monaco-editor'] }
            }
        }
    },
})
