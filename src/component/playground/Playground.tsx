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
import { editor, languages, MarkerSeverity, Range } from 'monaco-editor/esm/vs/editor/editor.api'
import logo from '../../assets/logo_full.svg'
import { A, useSearchParams } from '@solidjs/router'
import { LangError } from '../lang-error/LangError'
import { AstTreePreview, destructureAstNode } from '../ast-tree-preview/AstTreePreview'
import { ParseTreePreview } from '../parse-tree-preview/ParseTreePreview'
import { noisLanguageConfiguration, noisMonarchLanguage } from '../../lang/syntax'
import { noisDarkTheme, noisLightTheme } from '../../lang/theme'
import { Source } from 'nois/dist/source'
import { Toolbar } from '../toolbar/Toolbar'
import { FatalError } from '../fatal-error/FatalError'
import { decode, encode } from '../../encode'
import { showTooltip } from '../../tooltip'

type Tab = 'parse-tree' | 'ast-tree'

export const defaultCode = `\
use std::math

kind Area {
    fn area(self): Num
}

type Shape {
    Rect(width: Num, height: Num),
    Circle(radius: Num),
}

impl Area for Shape {
    fn area(self): Num {
        match self {
            Rect(width, height) -> width * height,
            Circle(radius) -> math::pi * radius ^ 2
        }
    }
}

fn main() {
    let shapes: List<Shape> = [
        Rect(width: 4, height: 2),
        Circle(radius: 12.34),
    ]
    println(shapes)
}`

export const [hovered, setHovered] = createSignal<RefLocationPair>()
export const [showGroups, setShowGroups] = createSignal(false)
export const [tab, setTab] = createSignal<Tab>('ast-tree')
const [code, setCode] = createSignal(defaultCode)

export const Playground: Component = () => {
    const source = (): Source => ({ code: code(), filepath: 'playground.no' })
    const vid = { scope: [], name: 'test' }

    const [module, setModule] = createSignal<Module>()
    const [errorTokens, setErrorTokens] = createSignal<ParseToken[]>()
    const [syntaxErrors, setSyntaxErrors] = createSignal<SyntaxError[]>()
    const [fatalError, setFatalError] = createSignal<Error>()

    const [searchParams, setSearchParams] = useSearchParams()

    let editorContainer: HTMLDivElement | undefined = undefined
    let ed: editor.IStandaloneCodeEditor | undefined

    onMount(() => {
        const startCode = searchParams.code ? decode(searchParams.code) : defaultCode
        setSearchParams({ code: undefined })
        setCode(startCode)
        ed = createEditor(editorContainer!, startCode)
        ed.getModel()?.onDidChangeContent(() => { setCode(ed!.getValue()) })
    })

    const updateParseTreeHighlight = () => {
        ed!.removeDecorations(
            ed!.getModel()!.getAllDecorations()
                .filter(d => d.options.inlineClassName === styles.region)
                .map(d => d.id)
        )

        if (!hovered()) return

        ed!.createDecorationsCollection([{
            range: locationRangeToRange(hovered()!.location, source()),
            options: { inlineClassName: styles.region },
        }])
    }
    createEffect(updateParseTreeHighlight)

    const updateCode = () => {
        try {
            useColoredOutput(false)
            const tokens = tokenize(source().code)
            const errorTs = tokens.filter(t => erroneousTokenKinds.includes(t.kind))
            setErrorTokens(errorTs.length !== 0 ? errorTs : undefined)

            const parser = new Parser(tokens)
            parseModule(parser)
            const parseTree = parser.buildTree()
            setSyntaxErrors(parser.errors.length !== 0 ? parser.errors : undefined)

            if (errorTs.length === 0 && parser.errors.length === 0) {
                setModule(buildModuleAst(parseTree, vid, source()))
            } else {
                setModule(undefined)
            }

            ed!.removeDecorations(
                ed!.getModel()!.getAllDecorations()
                    .filter(d => d.options.inlineClassName === styles.unknownToken)
                    .map(d => d.id)
            )
            errorTs.forEach(t => {
                ed!.createDecorationsCollection([{
                    range: locationRangeToRange(t.location, source()),
                    options: { inlineClassName: styles.unknownToken },
                }])
            })

            const errorMarkers: editor.IMarkerData[] = parser.errors.map(e => {
                const range = locationRangeToRange(e.got.location, source())
                return {
                    startLineNumber: range.startLineNumber,
                    startColumn: range.startColumn,
                    endLineNumber: range.endLineNumber,
                    endColumn: range.endColumn,
                    message: prettySyntaxError(e),
                    severity: MarkerSeverity.Error
                }
            })
            editor.setModelMarkers(ed!.getModel()!, 'nois', errorMarkers)

            setFatalError(undefined)
        } catch (e) {
            if (e instanceof Error) {
                setFatalError(e)
                console.warn(formatError(e, code()))
            }
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
            <div class={styles.container}>
                <div class={styles.rightPanel}>
                    <Switch>
                        <Match when={module()}>
                            <Switch>
                                <Match when={tab() === 'parse-tree'}>
                                    <ParseTreePreview node={module()!.parseNode}/>
                                </Match>
                                <Match when={tab() === 'ast-tree'}>
                                    <Toolbar>
                                        <button type={'button'}
                                                title={'Toggle AST groups'}
                                                onClick={() => setShowGroups(!showGroups())}
                                        >
                                            <i class="fa-solid fa-layer-group"/>
                                        </button>
                                    </Toolbar>
                                    <AstTreePreview node={destructureAstNode(module()!)}/>
                                </Match>
                            </Switch>
                        </Match>
                        <Match when={fatalError()}>
                            <FatalError message={formatError(fatalError()!, code())}/>
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
        </div>
    )
}

const Header: Component = () => {
    let shareButton: HTMLAnchorElement | undefined

    const copyLinkToClipboard = async () => {
        const url = window.location.href + '?code=' + encode(code())
        await navigator.clipboard.writeText(url)
        showTooltip(shareButton!, 'copied!')
    }
    return <div class={styles.header}>
        <div>
            <A href={'/'} class={styles.logo}><img src={logo} alt={'Nois logo'}/></A>
        </div>
        <div>
            <select onChange={e => setTab(e.target.value as Tab)} value={tab()}>
                <option value={'parse-tree'}>{'Parse tree'}</option>
                <option value={'ast-tree'}>{'AST tree'}</option>
            </select>
            <div class={styles.right}>
                <a ref={shareButton} title={'Copy playground link'} onClick={copyLinkToClipboard}>
                    <i class="fa-solid fa-arrow-up-from-bracket"/>
                </a>
                <A href={'https://github.com/nois-lang'}><i class="fa-brands fa-github"></i></A>
            </div>
        </div>
    </div>
}

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
        lineNumbersMinChars: 3,
        padding: { top: 16, bottom: 16 },
        scrollbar: { alwaysConsumeMouseWheel: false },
        // @ts-ignore
        'bracketPairColorization.enabled': false,
    })

    const setTheme = (dark: boolean) => editor.setTheme(dark ? 'nois-dark' : 'nois-light')
    setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => setTheme(event.matches))

    return ed
}

const locationRangeToRange = (locationRange: LocationRange, source: Source): Range => {
    const start = indexToLocation(locationRange.start, source)!
    const end = indexToLocation(locationRange.end, source)!
    // + 1 because location is 0 indexed, + 2 because location.end is inclusive
    return new Range(start.line + 1, start.column + 1, end.line + 1, end.column + 2)
}

const formatError = (error: Error, code: string): string => {
    const errorMsg = error.stack ?? `${error.name}: ${error.message}`
    return `Code: ${JSON.stringify(code)}\n${errorMsg}`
}
