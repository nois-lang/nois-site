import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

export default defineConfig({
    plugins: [
        solidPlugin(),
        monacoEditorPlugin({ languageWorkers: ['editorWorkerService'] })
    ],
    server: {
        port: 3000,
    },
    build: {
        target: 'esnext',
    },
})
