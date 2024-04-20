import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { rust } from '@codemirror/lang-rust'
import { HighlightStyle, bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { Diagnostic, lintKeymap, linter } from '@codemirror/lint'

import { Compartment, StateEffect, StateField } from '@codemirror/state'
import {
    Decoration,
    EditorView,
    ViewUpdate,
    drawSelection,
    highlightActiveLine,
    highlightActiveLineGutter,
    keymap,
    lineNumbers
} from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { indentationMarkers } from '@replit/codemirror-indentation-markers'
import { vim } from '@replit/codemirror-vim'
import { createSignal } from 'solid-js'

export const exampleMap = {
    helloWorld: `\
fn main() {
    println("Hello, world!")
}`,
    welcome: `\
use std::{ math::pi, iter::MapAdapter }

trait Area {
    fn area(self): Float
}

type Shape {
    Rect(width: Float, height: Float),
    Circle(radius: Float),
}

impl Area for Shape {
    fn area(self): Float {
        match self {
            Shape::Rect(width, height) { width * height }
            Shape::Circle(radius) { pi * radius ^ 2. }
        }
    }
}

pub fn main() {
    let shapes: List<Shape> = [
        Shape::Rect(width: 4., height: 2.),
        Shape::Circle(radius: 12.34),
    ]
    println(
        shapes
            .iter()
            .map(|s| s.area())
            .collect<List<_>>()
            .show()
    )
}`
}

export type CodeExample = keyof typeof exampleMap

export type Mode = 'default' | 'vim'
export const [mode, setMode] = createSignal<Mode>('default')

export const [code, setCode] = createSignal(exampleMap.welcome)
export const [diagnostics, setDiagnostics] = createSignal<Diagnostic[]>([])

export const linterCompartment = new Compartment()
export const makeLinter = linter(diagnostics, { delay: 0 })

export const vimCompartment = new Compartment()

export const formatError = (error: Error, code: string): string => {
    const errorMsg = `${error.name}: ${error.message}${
        error.stack
            ? `\n${error.stack
                  .split('\n')
                  .map(l => `    ${l}`)
                  .join('\n')}`
            : ''
    }`
    return `${errorMsg}\ncode: ${JSON.stringify(code)}`
}

export const highlightEffect = StateEffect.define<any>()

export const rmHighlightEffect = StateEffect.define<void>()

export const highlightDecoration = Decoration.mark({
    class: 'highlight'
})

export const highlightExtension = StateField.define({
    create() {
        return Decoration.none
    },
    update(value, transaction) {
        value = value.map(transaction.changes)

        for (const effect of transaction.effects) {
            if (effect.is(highlightEffect)) {
                value = value.update({ add: effect.value })
            }
            if (effect.is(rmHighlightEffect)) {
                value = Decoration.none
            }
        }

        return value
    },
    provide: f => EditorView.decorations.from(f)
})

export interface CreateEditorOptions {
    container?: HTMLDivElement
    value?: string
    onChange?: (update: ViewUpdate) => void
    lang?: 'nois' | 'js'
}

export const createEditor = (options: CreateEditorOptions): EditorView => {
    const style = HighlightStyle.define([
        { tag: tags.comment, color: 'var(--hl-comment)' },
        { tag: tags.keyword, color: 'var(--hl-keyword)' },
        { tag: tags.number, color: 'var(--hl-number)' },
        { tag: tags.string, color: 'var(--hl-string)' },
        { tag: tags.character, color: 'var(--hl-string)' }
    ])
    const ed = new EditorView({
        extensions: [
            lineNumbers(),
            highlightActiveLineGutter(),
            history(),
            drawSelection(),
            indentOnInput(),
            bracketMatching(),
            closeBrackets(),
            autocompletion(),
            highlightActiveLine(),
            keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...completionKeymap, ...lintKeymap]),
            syntaxHighlighting(style),
            options.lang === 'js' ? javascript() : rust(),
            EditorView.updateListener.of(options.onChange ?? (() => {})),
            indentUnit.of(' '.repeat(4)),
            indentationMarkers({
                hideFirstIndent: true,
                highlightActiveBlock: false,
                colors: { light: 'var(--bg2)', activeLight: 'var(--bg2)', dark: 'var(--bg2)', activeDark: 'var(--bg2)' }
            }),
            linterCompartment.of(linter(diagnostics, { delay: 100 })),
            highlightExtension,
            vimCompartment.of([]),
        ],
        parent: options.container,
        doc: options.value ?? ''
    })
    return ed
}
