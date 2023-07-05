import type { Component } from 'solid-js'
import { createEffect, createSignal, For, Match, onMount, Switch } from 'solid-js'

import styles from './Playground.module.sass'
import { erroneousTokenKinds, ParseToken, tokenize } from 'nois/dist/lexer/lexer'
import { prettyLexerError, prettySyntaxError, SyntaxError } from 'nois/dist/error'
import { indexToLocation, LocationRange } from 'nois/dist/location'
import { Parser } from 'nois/dist/parser/parser'
import { parseModule } from 'nois/dist/parser/fns'
import { buildModuleAst, Module } from 'nois/dist/ast'
import { useColoredOutput } from 'nois/dist/output'
import { editor, languages, Range } from 'monaco-editor/esm/vs/editor/editor.api'
import logo from '../../assets/logo_full.svg'
import { A } from '@solidjs/router'
import { LangError } from '../lang-error/LangError'
import { AstTreePreview, destructureAstNode } from '../ast-tree-preview/AstTreePreview'
import { ParseTreePreview } from '../parse-tree-preview/ParseTreePreview'
import { noisLanguageConfiguration, noisMonarchLanguage } from '../../lang/syntax'
import { noisDarkTheme, noisLightTheme } from '../../lang/theme'

export const [hovered, setHovered] = createSignal<RefLocationPair>()
export const [showGroups, setShowGroups] = createSignal(false)
export const [tab, setTab] = createSignal<Tab>('ast-tree')

type Tab = 'parse-tree' | 'ast-tree'

const defaultCode = `\
kind Area {
    fn area(self): Float
}

type Shape {
    Rect(width: Num, height: Num),
    Circle(side: Num),
}

impl Area for Shape {
    fn area(self): Float {
        match self {
            Rect(w) -> w ^ 2,
            Circle(r) -> Math.pi * r ^ 2
        }
    }
}

fn main() {
    let shape: Shape = Rect(2)
    println(shape.area())
}`

export const Playground: Component = () => {
    const source = () => ({ str: code(), filename: 'test.no' })
    const vid = { scope: [], name: 'test' }

    const [code, setCode] = createSignal(defaultCode)
    const [module, setModule] = createSignal<Module>()
    const [errorTokens, setErrorTokens] = createSignal<ParseToken[]>()
    const [syntaxErrors, setSyntaxErrors] = createSignal<SyntaxError[]>()

    let editorContainer: HTMLDivElement | undefined = undefined
    let ed: editor.IStandaloneCodeEditor | undefined

    onMount(() => {
        ed = createEditor(editorContainer!, defaultCode)
        ed.getModel()?.onDidChangeContent(() => { setCode(ed!.getValue()) })
    })

    const updateParseTreeHighlight = () => {
        ed!.removeDecorations(ed!.getModel()!.getAllDecorations().map(d => d.id))

        if (!hovered()) return

        const { location } = hovered()!
        const start = indexToLocation(location.start, source())!
        const end = indexToLocation(location.end, source())!
        ed!.createDecorationsCollection([{
            // + 1 because location is 0 indexed, + 2 because location.end is inclusive
            range: new Range(start.line + 1, start.column + 1, end.line + 1, end.column + 2),
            options: { inlineClassName: styles.region },
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
    return (
        <div class={styles.Playground}>
            <Header/>
            <div ref={editorContainer} class={styles.editorContainer}/>
            <div class={styles.rightPanel}>
                <Switch>
                    <Match when={module()}>
                        <Switch>
                            <Match when={tab() === 'parse-tree'}>
                                <ParseTreePreview node={module()!.parseNode}/>
                            </Match>
                            <Match when={tab() === 'ast-tree'}>
                                <button type={'button'}
                                        class={styles.groupsToggle}
                                        title={'Toggle AST groups'}
                                        onClick={() => setShowGroups(!showGroups())}
                                >
                                    <i class="fa-solid fa-layer-group"/>
                                </button>
                                <AstTreePreview node={destructureAstNode(module()!)}/>
                            </Match>
                        </Switch>
                    </Match>
                    <Match when={true}>{
                        <div class={styles.errors}>
                            <For each={allErrors()}>{({ message, location }) =>
                                <LangError message={message} location={indexToLocation(location, source())!}
                                           source={source()}/>
                            }</For>
                        </div>
                    }</Match>
                </Switch>
            </div>
        </div>
    )
}

const Header: Component = () => <div class={styles.header}>
    <div>
        <A href={'/'} class={styles.logo}><img src={logo} alt={'Nois logo'}/></A>
    </div>
    <div>
        <select onChange={e => setTab(e.target.value as Tab)} value={tab()}>
            <option value={'parse-tree'}>{'Parse tree'}</option>
            <option value={'ast-tree'}>{'AST tree'}</option>
        </select>
        <div class={styles.right}>
            <A href={'https://github.com/nois-lang'}><i class="fa-brands fa-github"></i></A>
        </div>
    </div>
</div>

interface RefLocationPair {
    ref: HTMLDivElement,
    location: LocationRange
}

const createEditor = (container: HTMLDivElement, value: string): editor.IStandaloneCodeEditor => {

    editor.defineTheme('nois-light', noisLightTheme)
    editor.defineTheme('nois-dark', noisDarkTheme)

    languages.register({ id: 'nois' })
    languages.setMonarchTokensProvider('nois', noisMonarchLanguage)
    languages.setLanguageConfiguration('nois', noisLanguageConfiguration)

    const ed = editor.create(container, {
        language: 'nois',
        value,
        automaticLayout: true,
        fontSize: 16,
        contextmenu: false,
        scrollBeyondLastLine: false,
        minimap: { enabled: false },
        overviewRulerLanes: 0,
        folding: false,
        lineNumbersMinChars: 2,
        // @ts-ignore
        'bracketPairColorization.enabled': false,
    })

    const setTheme = (dark: boolean) => editor.setTheme(dark ? 'nois-dark' : 'nois-light')
    setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => setTheme(event.matches))

    return ed
}
