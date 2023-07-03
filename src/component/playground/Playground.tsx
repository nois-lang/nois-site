import type { Component } from 'solid-js'
import { createEffect, createSignal, For, JSX, Match, onMount, Switch } from 'solid-js'

import styles from './Playground.module.sass'
import { getLocationRange, ParseNode } from 'nois/dist/parser'
import { erroneousTokenKinds, ParseToken, tokenize } from 'nois/dist/lexer/lexer'
import { prettyLexerError, prettySourceMessage, prettySyntaxError, SyntaxError } from 'nois/dist/error'
import { indexToLocation } from 'nois/dist/location'
import { Parser } from 'nois/dist/parser/parser'
import { parseModule } from 'nois/dist/parser/fns'
import { buildModuleAst, Module } from 'nois/dist/ast'
import { useColoredOutput } from 'nois/dist/output'
import { editor, Range } from 'monaco-editor'
import logo from '../../assets/logo_full.svg'
import { A } from '@solidjs/router'

const formatValue = (value: string): string => {
    return value
        .replace('\b', '\\b')
        .replace('\t', '\\t')
        .replace('\n', '\\n')
        .replace('\v', '\\v')
        .replace('\f', '\\f')
        .replace('\r', '\\r')
}

export const Playground: Component = () => {
    const defaultCode = `\
fn main() {
    println("Hello, World!")
}`
    const [code, setCode] = createSignal(defaultCode)
    const source = () => ({ str: code(), filename: 'test.no' })
    const vid = { scope: [], name: 'test' }
    const [module, setModule] = createSignal<Module>()
    const [errorTokens, setErrorTokens] = createSignal<ParseToken[]>()
    const [syntaxErrors, setSyntaxErrors] = createSignal<SyntaxError[]>()
    const [hovered, setHovered] = createSignal<{ ref: HTMLDivElement, node: ParseNode }>()
    let editorContainer: HTMLDivElement | undefined = undefined
    let ed: editor.IStandaloneCodeEditor | undefined

    onMount(() => {
        ed = editor.create(editorContainer!, {
            value: code(),
            language: 'rust',
            automaticLayout: true,
            theme: 'vs-dark',
            fontSize: 16,
            fontFamily: 'JetBrains Mono',
            contextmenu: false,
            scrollBeyondLastLine: false,
            minimap: { enabled: false },
            overviewRulerLanes: 0,
            folding: false,
            renderWhitespace: 'all',
            lineNumbersMinChars: 2
        })

        editor.defineTheme('nois-dark', {
            base: 'vs-dark', inherit: true, rules: [], colors: {
                'editor.background': '#222222',
                'editor.foreground': '#ffffff',
            }
        })
        editor.defineTheme('nois-light', { base: 'vs', inherit: true, rules: [], colors: {} })

        const setTheme = (dark: boolean) => editor.setTheme(dark ? 'nois-dark' : 'nois-light')
        setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches)
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => setTheme(event.matches))

        ed.getModel()?.onDidChangeContent(() => setCode(ed!.getValue()))
    })

    createEffect(() => {
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
    })

    createEffect(() => {
        useColoredOutput(false)
        const tokens = tokenize(source().str)
        const errorTs = tokens.filter(t => erroneousTokenKinds.includes(t.kind))
        if (errorTs.length > 0) {
            setErrorTokens(errorTs)
            setModule(undefined)
            setSyntaxErrors(undefined)
            return
        }

        const parser = new Parser(tokens)
        parseModule(parser)
        const root = parser.buildTree()

        if (parser.errors.length > 0) {
            setSyntaxErrors(parser.errors)
            setErrorTokens(undefined)
            setModule(undefined)
            return
        }

        setModule(buildModuleAst(root, vid))
        setErrorTokens(undefined)
        setSyntaxErrors(undefined)
    })

    const parseNodeToHtml = (node: ParseNode): JSX.Element => {
        let ref: HTMLDivElement | undefined = undefined
        return <div ref={ref} class={styles.parseNode}
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
                {'nodes' in node ? node.nodes.map(parseNodeToHtml) : ''}
            </div>
        </div>
    }

    return (
        <div class={styles.Playground}>
            <div class={styles.header}>
                <A href={'/'} class={styles.logo}><img src={logo} alt={'Nois logo'}/></A>
                <div class={styles.right}>
                    <A href={'https://github.com/nois-lang'}><i class="fa-brands fa-github"></i></A>
                </div>
            </div>
            <div ref={editorContainer} class={styles.editorContainer}/>
            <div class={styles.rightPanel}>
                <Switch>
                    <Match when={module()}>
                        <div class={styles.parseTreeViewer}>{parseNodeToHtml(module()!.parseNode)}</div>
                    </Match>
                    <Match when={errorTokens()}>
                        <div class={styles.lexerErrorViewer}>
                            <For each={errorTokens()}>{t =>
                                <pre>
                                {prettySourceMessage(
                                    prettyLexerError(t),
                                    indexToLocation(t.location.start, source())!,
                                    source()
                                )}
                                </pre>}
                            </For>
                        </div>
                    </Match>
                    <Match when={syntaxErrors()}>
                        <div class={styles.syntaxErrorViewer}>
                            <For each={syntaxErrors()}>{e =>
                                <pre>
                                {prettySourceMessage(
                                    prettySyntaxError(e),
                                    indexToLocation(e.got.location.start, source())!,
                                    source()
                                )}
                            </pre>
                            }</For>
                        </div>
                    </Match>
                </Switch>
            </div>
        </div>
    )
}
