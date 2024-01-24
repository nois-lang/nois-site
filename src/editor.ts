import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { rust } from '@codemirror/lang-rust'
import { HighlightStyle, bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { Diagnostic, lintKeymap, linter } from '@codemirror/lint'

import { Compartment, StateEffect, StateField } from '@codemirror/state'
import {
    Decoration,
    EditorView,
    drawSelection,
    highlightActiveLine,
    highlightActiveLineGutter,
    keymap,
    lineNumbers
} from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { indentationMarkers } from '@replit/codemirror-indentation-markers'
import { createSignal } from 'solid-js'

export const exampleMap = {
    helloWorld: `\
fn main() {
    println("Hello, world!")
}`,
    welcome: `\
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
            Shape::Rect(width, height) { width * height },
            Shape::Circle(radius) { math::pi * radius ^ 2. }
        }
    }
}

fn main() {
    let shapes: List<Shape> = [
        Shape::Rect(width: 4., height: 2.),
        Shape::Circle(radius: 12.34),
    ]
    println(shapes.iter().map(Area::area).collect<List<_>>())
}`
}

export type CodeExample = keyof typeof exampleMap

export const [code, setCode] = createSignal(exampleMap.welcome)
export const [diagnostics, setDiagnostics] = createSignal<Diagnostic[]>([])

export const linterCompartment = new Compartment()
export const makeLinter = linter(diagnostics, { delay: 0 })

export const formatError = (error: Error, code: string): string => {
    const errorMsg = error.stack ?? `${error.name}: ${error.message}`
    return `Code: ${JSON.stringify(code)}\n${errorMsg}`
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

        for (let effect of transaction.effects) {
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

export const createEditor = (container: HTMLDivElement, value: string): EditorView => {
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
            rust(),
            EditorView.updateListener.of(e => {
                setCode(e.state.doc.toString())
            }),
            indentUnit.of(' '.repeat(4)),
            indentationMarkers({
                hideFirstIndent: true,
                highlightActiveBlock: false,
                colors: { light: 'var(--bg2)', activeLight: 'var(--bg2)', dark: 'var(--bg2)', activeDark: 'var(--bg2)' }
            }),
            linterCompartment.of(linter(diagnostics, { delay: 100 })),
            highlightExtension
        ],
        parent: container,
        doc: value
    })
    return ed
}
