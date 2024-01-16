import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { rust } from '@codemirror/lang-rust'
import { HighlightStyle, bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { Diagnostic, lintKeymap, linter } from '@codemirror/lint'
import { Compartment, StateEffect, StateField } from '@codemirror/state'
import {
    Decoration,
    drawSelection,
    highlightActiveLine,
    highlightActiveLineGutter,
    keymap,
    lineNumbers
} from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { indentationMarkers } from '@replit/codemirror-indentation-markers'
import { A, useSearchParams } from '@solidjs/router'
import { EditorView } from 'codemirror'
import { Module, buildModuleAst } from 'nois/ast'
import { defaultConfig } from 'nois/config'
import { SyntaxError, prettyLexerError, prettySyntaxError } from 'nois/error'
import { ParseToken, erroneousTokenKinds, tokenize } from 'nois/lexer/lexer'
import { LocationRange } from 'nois/location'
import { useColoredOutput } from 'nois/output'
import { Package } from 'nois/package'
import { getLocationRange } from 'nois/parser'
import { parseModule } from 'nois/parser/fns'
import { Parser } from 'nois/parser/parser'
import { Context } from 'nois/scope'
import { buildInstanceRelations } from 'nois/scope/trait'
import { checkModule, prepareModule } from 'nois/semantic'
import { Source } from 'nois/source'
import { stdModuleVids } from 'nois/std-index'
import type { Component } from 'solid-js'
import { For, Match, Switch, createEffect, createSignal, onMount } from 'solid-js'
import logo from '../../assets/logo_full.svg'
import { decode, encode } from '../../encode'
import { buildPackageFromVids } from '../../package'
import { showTooltip } from '../../tooltip'
import { AstTreePreview, destructureAstNode } from '../ast-tree-preview/AstTreePreview'
import { FatalError } from '../fatal-error/FatalError'
import { LangError } from '../lang-error/LangError'
import { ParseTreePreview } from '../parse-tree-preview/ParseTreePreview'
import { Toolbar } from '../toolbar/Toolbar'
import styles from './Playground.module.scss'

type Tab = 'parse-tree' | 'ast-tree'

export const defaultCode = `\
trait Area {
    fn area(self): Num
}

type Shape {
    Rect(width: Num, height: Num),
    Circle(radius: Num),
}

impl Area for Shape {
    fn area(self): Num {
        match self {
            Shape::Rect(width, height) { width * height },
            Shape::Circle(radius) { math::pi * radius ^ 2 }
        }
    }
}

fn main() {
    let shapes: List<Shape> = [
        Shape::Rect(width: 4, height: 2),
        Shape::Circle(radius: 12.34),
    ]
    println(shapes.iter().map(Area::area).into<List>())
}`

export const [hovered, setHovered] = createSignal<RefLocationPair>()
export const [showGroups, setShowGroups] = createSignal(false)
export const [tab, setTab] = createSignal<Tab>('ast-tree')
const [code, setCode] = createSignal(defaultCode)
const [diagnostics, setDiagnostics] = createSignal<Diagnostic[]>([])
const [std, setStd] = createSignal<Package>()

const linterCompartment = new Compartment()
const makeLinter = linter(diagnostics, { delay: 0 })

export const Playground: Component = () => {
    const source = (): Source => ({ code: code(), filepath: 'playground.no' })
    const vid = { names: ['playground'] }

    const [module, setModule] = createSignal<Module>()
    const [errorTokens, setErrorTokens] = createSignal<ParseToken[]>()
    const [syntaxErrors, setSyntaxErrors] = createSignal<SyntaxError[]>()
    const [fatalError, setFatalError] = createSignal<Error>()

    const [searchParams, setSearchParams] = useSearchParams()

    let editorContainer: HTMLDivElement | undefined
    let ed: EditorView | undefined

    onMount(() => {
        const startCode = searchParams.code ? decode(searchParams.code) : defaultCode
        setSearchParams({ code: undefined })
        setCode(startCode)
        ed = createEditor(editorContainer!, startCode)
        ed.focus()
        buildPackageFromVids('std', stdModuleVids).then(pkg => {
            setStd(pkg)
            // force diagnostics to appear once std is set
            ed?.dispatch({ effects: linterCompartment.reconfigure(makeLinter) })
        })
    })

    createEffect(() => {
        if (!ed) return

        ed.dispatch({ effects: rmHighlightEffect.of() })

        const location = hovered()?.location
        if (!location) return

        ed.dispatch({ effects: highlightEffect.of([highlightDecoration.range(location.start, location.end + 1)]) })
    })

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

            const ds: Diagnostic[] = []
            if (errorTs.length === 0 && parser.errors.length === 0) {
                const mod = buildModuleAst(parseTree, vid, source())
                setModule(mod)
                const stdPkg = std()
                if (stdPkg) {
                    const ctx = check(stdPkg, mod)
                    ds.push(
                        ...ctx.errors
                            .filter(e => e.module === mod)
                            .map(e => {
                                const range = getLocationRange(e.node.parseNode)
                                return {
                                    from: range.start,
                                    to: range.end + 1,
                                    severity: 'error' as const,
                                    message: e.message
                                }
                            })
                    )
                    ds.push(
                        ...ctx.warnings
                            .filter(e => e.module === mod)
                            .map(e => {
                                const range = getLocationRange(e.node.parseNode)
                                return {
                                    from: range.start,
                                    to: range.end + 1,
                                    severity: 'warning' as const,
                                    message: e.message
                                }
                            })
                    )
                }
            } else {
                setModule(undefined)

                ds.push(
                    ...errorTs.map(t => ({
                        from: t.location.start,
                        to: t.location.end + 1,
                        severity: 'error' as const,
                        message: prettyLexerError(t)
                    }))
                )
                ds.push(
                    ...parser.errors.map(e => ({
                        from: e.got.location.start,
                        to: e.got.location.end + 1,
                        severity: 'error' as const,
                        message: prettySyntaxError(e)
                    }))
                )
            }

            setDiagnostics(ds)
            setFatalError(undefined)
        } catch (e) {
            if (e instanceof Error) {
                setFatalError(e)
                console.warn(e)
            }
            setModule(undefined)
        }
    }
    createEffect(updateCode)

    const allErrors = () => [
        ...(errorTokens()?.map(t => ({
            message: prettyLexerError(t),
            location: t.location
        })) || []),
        ...(syntaxErrors()?.map(e => ({
            message: prettySyntaxError(e),
            location: e.got.location
        })) || [])
    ]

    return (
        <div class={styles.Playground}>
            <Header />
            <div ref={editorContainer} class={styles.editorContainer} />
            <div class={styles.container}>
                <div class={styles.rightPanel}>
                    <Switch>
                        <Match when={module()}>
                            <Switch>
                                <Match when={tab() === 'parse-tree'}>
                                    <ParseTreePreview node={module()!.parseNode} />
                                </Match>
                                <Match when={tab() === 'ast-tree'}>
                                    <Toolbar>
                                        <button
                                            type={'button'}
                                            title={'Toggle AST groups'}
                                            onClick={() => setShowGroups(!showGroups())}
                                        >
                                            <i class="fa-solid fa-layer-group" />
                                        </button>
                                    </Toolbar>
                                    <AstTreePreview node={destructureAstNode(module()!)} />
                                </Match>
                            </Switch>
                        </Match>
                        <Match when={fatalError()}>
                            <FatalError message={formatError(fatalError()!, code())} />
                        </Match>
                        <Match when={true}>
                            {
                                <div class={styles.errors}>
                                    <For each={allErrors()}>
                                        {({ message, location }) => (
                                            <LangError message={message} location={location} source={source()} />
                                        )}
                                    </For>
                                </div>
                            }
                        </Match>
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
    return (
        <div class={styles.header}>
            <div>
                <A href={'/'} class={styles.logo}>
                    <img src={logo} alt={'Nois logo'} />
                </A>
            </div>
            <div>
                <select onChange={e => setTab(e.target.value as Tab)} value={tab()}>
                    <option value={'parse-tree'}>{'Parse tree'}</option>
                    <option value={'ast-tree'}>{'AST tree'}</option>
                </select>
                <div class={styles.right}>
                    <a ref={shareButton} title={'Copy playground link'} onClick={copyLinkToClipboard}>
                        <i class="fa-solid fa-arrow-up-from-bracket" />
                    </a>
                    <A href={'https://github.com/nois-lang'}>
                        <i class="fa-brands fa-github"></i>
                    </A>
                </div>
            </div>
        </div>
    )
}

interface RefLocationPair {
    ref: HTMLDivElement
    location: LocationRange
}

const createEditor = (container: HTMLDivElement, value: string): EditorView => {
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

const formatError = (error: Error, code: string): string => {
    const errorMsg = error.stack ?? `${error.name}: ${error.message}`
    return `Code: ${JSON.stringify(code)}\n${errorMsg}`
}

const highlightEffect = StateEffect.define<any>()
const rmHighlightEffect = StateEffect.define<void>()

const highlightExtension = StateField.define({
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

const check = (std: Package, module: Module): Context => {
    const pkg: Package = { path: 'playground', name: 'playground', modules: [module] }
    const ctx: Context = {
        config: defaultConfig(),
        moduleStack: [],
        packages: [std, pkg],
        impls: [],
        errors: [],
        warnings: [],
        check: false
    }
    ctx.packages.forEach(p => {
        p.modules.forEach(m => {
            prepareModule(m)
        })
    })
    ctx.impls = buildInstanceRelations(ctx)
    ctx.check = true
    ctx.packages.flatMap(p => p.modules).forEach(m => checkModule(m, ctx!))
    return ctx
}

const highlightDecoration = Decoration.mark({
    class: 'highlight'
})
