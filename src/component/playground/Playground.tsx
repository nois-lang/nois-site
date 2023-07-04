import type { Accessor, Component, Setter } from 'solid-js'
import { createEffect, createSignal, For, JSX, Match, onMount, Switch } from 'solid-js'

import styles from './Playground.module.sass'
import { getLocationRange, ParseNode } from 'nois/dist/parser'
import { erroneousTokenKinds, ParseToken, tokenize } from 'nois/dist/lexer/lexer'
import { prettyLexerError, prettySyntaxError, SyntaxError } from 'nois/dist/error'
import { indexToLocation } from 'nois/dist/location'
import { Parser } from 'nois/dist/parser/parser'
import { parseModule } from 'nois/dist/parser/fns'
import { buildModuleAst, Module } from 'nois/dist/ast'
import { useColoredOutput } from 'nois/dist/output'
import 'monaco-editor/esm/vs/basic-languages/rust/rust.contribution'
import { editor, Range } from 'monaco-editor/esm/vs/editor/editor.api'
import logo from '../../assets/logo_full.svg'
import { A } from '@solidjs/router'
import { LangError } from '../lang-error/LangError'

export const Playground: Component = () => {
    const defaultCode = `\
fn main() {
    println("Hello, World!")
}`
    const source = () => ({ str: code(), filename: 'test.no' })
    const vid = { scope: [], name: 'test' }

    const [code, setCode] = createSignal(defaultCode)
    const [module, setModule] = createSignal<Module>()
    const [errorTokens, setErrorTokens] = createSignal<ParseToken[]>()
    const [syntaxErrors, setSyntaxErrors] = createSignal<SyntaxError[]>()
    const [hovered, setHovered] = createSignal<RefNodePair>()

    let editorContainer: HTMLDivElement | undefined = undefined
    let ed: editor.IStandaloneCodeEditor | undefined

    onMount(() => {
        ed = createEditor(editorContainer!, defaultCode)
        ed.getModel()?.onDidChangeContent(() => setCode(ed!.getValue()))
    })

    const updateParseTreeHighlight = () => {
        ed!.removeDecorations(ed!.getModel()!.getAllDecorations().map(d => d.id))

        if (!hovered()) return

        const { node } = hovered()!
        const range = getLocationRange(node)
        const start = indexToLocation(range.start, source())!
        const end = indexToLocation(range.end, source())!
        ed!.createDecorationsCollection([{
            // + 1 because location is 0 indexed, + 2 because location.end is inclusive
            range: new Range(start.line + 1, start.column + 1, end.line + 1, end.column + 2),
            options: { inlineClassName: styles.region }
        }])
    }
    createEffect(updateParseTreeHighlight)

    const updateCode = () => {
        useColoredOutput(false)
        const tokens = tokenize(source().str)
        const errorTs = tokens.filter(t => erroneousTokenKinds.includes(t.kind))
        setErrorTokens(errorTs.length !== 0 ? errorTs : undefined)

        const parser = new Parser(tokens)
        parseModule(parser)
        const parseTree = parser.buildTree()

        setSyntaxErrors(parser.errors.length !== 0 ? parser.errors : undefined)

        if (errorTs.length === 0 && parser.errors.length === 0) {
            setModule(buildModuleAst(parseTree, vid))
        } else {
            setModule(undefined)
        }
    }
    createEffect(updateCode)

    const allErrors = () => [
        ...(
            errorTokens()?.map(t => ({
                message: prettyLexerError(t),
                location: t.location.start
            }))
            || []),
        ...(
            syntaxErrors()?.map(e => ({
                message: prettySyntaxError(e),
                location: e.got.location.start
            }))
            || [])
    ]
    const errors = <div class={styles.errors}>
        <For each={allErrors()}>{({ message, location }) =>
            <LangError message={message} location={indexToLocation(location, source())!} source={source()}/>
        }</For>
    </div>

    return (
        <div class={styles.Playground}>
            <Header/>
            <div ref={editorContainer} class={styles.editorContainer}/>
            <div class={styles.rightPanel}>
                <Switch>
                    <Match when={module()}>
                        <div class={styles.parseTreeViewer}>
                            {parseNodeToHtml(module()!.parseNode, hovered, setHovered)}
                        </div>
                    </Match>
                    <Match when={true}>{errors}</Match>
                </Switch>
            </div>
        </div>
    )
}

const Header: Component = () => <div class={styles.header}>
    <A href={'/'} class={styles.logo}><img src={logo} alt={'Nois logo'}/></A>
    <div class={styles.right}>
        <A href={'https://github.com/nois-lang'}><i class="fa-brands fa-github"></i></A>
    </div>
</div>

interface RefNodePair {
    ref: HTMLDivElement,
    node: ParseNode
}

const formatValue = (value: string): string => {
    return value
        .replace('\b', '\\b')
        .replace('\t', '\\t')
        .replace('\n', '\\n')
        .replace('\v', '\\v')
        .replace('\f', '\\f')
        .replace('\r', '\\r')
}

const parseNodeToHtml = (node: ParseNode,
                         hovered: Accessor<RefNodePair | undefined>,
                         setHovered: Setter<RefNodePair | undefined>): JSX.Element => {
    let ref: HTMLDivElement | undefined = undefined
    return (
        <div ref={ref} class={styles.parseNode}
             classList={{ [styles.hover]: hovered()?.ref === ref }}
             onpointerover={e => {
                 if (!ref?.contains(e.target)) return
                 setHovered({ ref, node })
                 e.stopPropagation()
             }}
             onpointerleave={e => {
                 if (!ref?.contains(e.target)) return
                 setHovered(undefined)
             }}
        >
            <p class={styles.kind}>{node.kind}{
                'value' in node
                    ? <code class={styles.value}>{formatValue(node.value)}</code>
                    : ''
            }</p>
            <div class={styles.children}>
                {'nodes' in node ? node.nodes.map(n => parseNodeToHtml(n, hovered, setHovered)) : ''}
            </div>
        </div>
    )
}

const createEditor = (container: HTMLDivElement, value: string): editor.IStandaloneCodeEditor => {

    editor.defineTheme('nois-dark', {
        base: 'vs-dark', inherit: true, rules: [], colors: {
            'editor.background': '#222222',
            'editor.foreground': '#ffffff',
        }
    })
    editor.defineTheme('nois-light', { base: 'vs', inherit: true, rules: [], colors: {} })

    const ed = editor.create(container, {
        language: 'rust',
        value,
        automaticLayout: true,
        fontSize: 16,
        contextmenu: false,
        scrollBeyondLastLine: false,
        minimap: { enabled: false },
        overviewRulerLanes: 0,
        folding: false,
        renderWhitespace: 'all',
        lineNumbersMinChars: 2
    })

    const setTheme = (dark: boolean) => editor.setTheme(dark ? 'nois-dark' : 'nois-light')
    setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => setTheme(event.matches))

    return ed
}
