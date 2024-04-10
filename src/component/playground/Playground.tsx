import { Diagnostic } from '@codemirror/lint'
import { A, useSearchParams } from '@solidjs/router'
import { EditorView } from 'codemirror'
import { js_beautify } from 'js-beautify'
import { Module, buildModuleAst } from 'nois/ast'
import { emitDeclaration } from 'nois/codegen/declaration'
import { emitModule } from 'nois/codegen/js'
import { makeConfig } from 'nois/config'
import { SyntaxError, prettyLexerError, prettySyntaxError } from 'nois/error'
import { LexerToken, erroneousTokenKinds, tokenize } from 'nois/lexer/lexer'
import { useColoredOutput } from 'nois/output'
import { Package } from 'nois/package'
import { Parser, getSpan } from 'nois/parser'
import { parseModule } from 'nois/parser/fns'
import { Context } from 'nois/scope'
import { buildInstanceRelations } from 'nois/scope/trait'
import { checkModule, checkTopLevelDefinition, prepareModule } from 'nois/semantic'
import { SemanticError } from 'nois/semantic/error'
import { Source } from 'nois/source'
import { foldEmitTree } from 'nois/sourcemap'
import { stdModuleVids } from 'nois/std-index'
import { Component } from 'solid-js'
import { For, Match, Switch, createEffect, createSignal, onMount } from 'solid-js'
import logo from '../../assets/logo_full.svg'
import {
    CodeExample,
    code,
    createEditor,
    exampleMap,
    formatError,
    highlightDecoration,
    highlightEffect,
    linterCompartment,
    makeLinter,
    rmHighlightEffect,
    setCode,
    setDiagnostics
} from '../../editor'
import { decode, encode } from '../../encode'
import { buildPackageFromVids } from '../../package'
import { Tab, example, hovered, setExample, setShowGroups, setStd, setTab, showGroups, std, tab } from '../../state'
import { showTooltip } from '../../tooltip'
import { AstTreePreview, destructureAstNode } from '../ast-tree-preview/AstTreePreview'
import { FatalError } from '../fatal-error/FatalError'
import { LangError } from '../lang-error/LangError'
import { ParseTreePreview } from '../parse-tree-preview/ParseTreePreview'
import { Toolbar } from '../toolbar/Toolbar'
import styles from './Playground.module.scss'

export const Playground: Component = () => {
    const source = (): Source => ({ code: code(), filepath: 'playground.no' })
    const vid = { names: ['playground'] }

    const [module, setModule] = createSignal<Module>()
    const [errorTokens, setErrorTokens] = createSignal<LexerToken[]>()
    const [syntaxErrors, setSyntaxErrors] = createSignal<SyntaxError[]>()
    const [semanticErrors, setSemanticErrors] = createSignal<SemanticError[]>()
    const [fatalError, setFatalError] = createSignal<Error>()
    const [outputEmit, setOutputEmit] = createSignal<string | undefined>()
    const [declarationEmit, setDeclarationEmit] = createSignal<string | undefined>()

    const [searchParams, setSearchParams] = useSearchParams()

    let editorContainer: HTMLDivElement | undefined
    let ed: EditorView | undefined
    let declarationEd: EditorView | undefined
    let outputEd: EditorView | undefined
    let declarationEditorContainer: HTMLDivElement | undefined
    let outputEditorContainer: HTMLDivElement | undefined

    onMount(() => {
        const startCode = searchParams.code ? decode(searchParams.code) : exampleMap.welcome
        setSearchParams({ code: undefined })
        setCode(startCode)
        ed = createEditor({
            container: editorContainer!,
            value: startCode,
            onChange: e => setCode(e.state.doc.toString()),
            lang: 'nois'
        })
        ed.focus()
        buildPackageFromVids('std', stdModuleVids).then(pkg => {
            pkg.compiled = true
            setStd(pkg)
            // force diagnostics to appear once std is set
            ed?.dispatch({ effects: linterCompartment.reconfigure(makeLinter) })
        })
    })

    createEffect(() => {
        if (!ed) return

        ed.dispatch({ effects: rmHighlightEffect.of() })

        const span = hovered()?.span
        if (!span) return

        ed.dispatch({ effects: highlightEffect.of([highlightDecoration.range(span.start, span.end)]) })
    })

    createEffect(() => {
        const newCode = exampleMap[example()]
        setCode(newCode)
        ed?.dispatch({ changes: { from: 0, to: ed.state.doc.length, insert: newCode } })
    })

    createEffect(() => {
        if (tab() === 'emitted-declaration' && declarationEmit() && declarationEditorContainer) {
            if (declarationEd) {
                declarationEd.dispatch({
                    changes: { from: 0, to: declarationEd.state.doc.length, insert: declarationEmit() }
                })
            } else {
                declarationEd = createEditor({
                    container: declarationEditorContainer,
                    value: declarationEmit(),
                    lang: 'nois'
                })
            }
        } else {
            declarationEd = undefined
        }
        if (tab() === 'emitted-output' && outputEmit() && outputEditorContainer) {
            if (outputEd) {
                outputEd.dispatch({
                    changes: { from: 0, to: outputEd.state.doc.length, insert: outputEmit() }
                })
            } else {
                outputEd = createEditor({ container: outputEditorContainer, value: outputEmit(), lang: 'js' })
            }
        } else {
            outputEd = undefined
        }
    })

    const updateCode = async () => {
        const stdPkg = std()
        if (!stdPkg) return
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
                const mod = buildModuleAst(parseTree, vid, source(), true)
                setModule(mod)
                const ctx = await new Promise<Context>(done => done(check(stdPkg, mod)))
                ds.push(
                    ...ctx.errors
                        .filter(e => e.module === mod)
                        .map(e => {
                            const range = getSpan(e.node.parseNode)
                            return {
                                from: range.start,
                                to: range.end,
                                severity: 'error' as const,
                                message: e.message
                            }
                        })
                )
                ds.push(
                    ...ctx.warnings
                        .filter(e => e.module === mod)
                        .map(e => {
                            const range = getSpan(e.node.parseNode)
                            return {
                                from: range.start,
                                to: range.end,
                                severity: 'warning' as const,
                                message: e.message
                            }
                        })
                )
                setSemanticErrors(ctx.errors.length !== 0 ? ctx.errors : undefined)

                setDeclarationEmit(ctx.errors.length === 0 ? emitDeclaration(mod) : undefined)

                if (ctx.errors.length === 0) {
                    ctx.moduleStack.push(mod)
                    const jsOutput = foldEmitTree(emitModule(mod, ctx, true)).emit
                    const prettyOutput = js_beautify(jsOutput)
                    const out = prettyOutput.replace(/import\s*{[^}]*}[^;]*;/g, match =>
                        match.replace(/\n/g, ' ').replace(/ +/g, ' ')
                    )
                    setOutputEmit(out)
                } else {
                    setOutputEmit(undefined)
                }
            } else {
                setModule(undefined)
                setSemanticErrors(undefined)
                setDeclarationEmit(undefined)
                setOutputEmit(undefined)

                ds.push(
                    ...errorTs.map(t => ({
                        from: t.span.start,
                        to: t.span.end,
                        severity: 'error' as const,
                        message: prettyLexerError(t)
                    }))
                )
                ds.push(
                    ...parser.errors.map(e => ({
                        from: e.got.span.start,
                        to: e.got.span.end,
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
            span: t.span
        })) || []),
        ...(syntaxErrors()?.map(e => ({
            message: prettySyntaxError(e),
            span: e.got.span
        })) || []),
        ...(semanticErrors()?.map(e => {
            return { message: e.message, span: getSpan(e.node.parseNode) }
        }) || [])
    ]

    return (
        <div class={styles.Playground}>
            <Header />
            <div ref={editorContainer} class={`${styles.mainEditor} ${styles.editorContainer}`} />
            <div class={styles.container}>
                <div class={styles.rightPanel}>
                    <Switch>
                        <Match when={fatalError()}>
                            <FatalError message={formatError(fatalError()!, code())} />
                        </Match>
                        <Match when={tab() === 'parse-tree' && module()}>
                            <ParseTreePreview node={module()!.parseNode} />
                        </Match>
                        <Match when={tab() === 'ast-tree' && module()}>
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
                        <Match when={tab() === 'diagnostics' || !module() || semanticErrors()}>
                            <div class={styles.errors}>
                                <For each={allErrors()}>
                                    {({ message, span }) => (
                                        <LangError message={message} span={span} source={source()} />
                                    )}
                                </For>
                            </div>
                        </Match>
                        <Match when={tab() === 'emitted-declaration' && declarationEmit() !== undefined}>
                            <div
                                ref={declarationEditorContainer}
                                class={`${styles.secondaryEditor} ${styles.editorContainer}`}
                            />
                        </Match>
                        <Match when={tab() === 'emitted-output' && outputEmit() !== undefined}>
                            <div
                                ref={outputEditorContainer}
                                class={`${styles.secondaryEditor} ${styles.editorContainer}`}
                            />
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
            <div class={styles.left}>
                <A href={'/'} class={styles.logo}>
                    <img src={logo} alt={'Nois logo'} />
                </A>
                <select onChange={e => setExample(e.target.value as CodeExample)} value={example()}>
                    <option value={'welcome'}>{'Welcome'}</option>
                    <option value={'helloWorld'}>{'Hello world'}</option>
                </select>
            </div>
            <div class={styles.right}>
                <select onChange={e => setTab(e.target.value as Tab)} value={tab()}>
                    <option value={'parse-tree'}>{'Parse tree'}</option>
                    <option value={'ast-tree'}>{'AST tree'}</option>
                    <option value={'diagnostics'}>{'Diagnostics'}</option>
                    <option value={'emitted-declaration'}>{'Declaration file'}</option>
                    <option value={'emitted-output'}>{'Compiler output'}</option>
                </select>
                <div class={styles.right}>
                    <a ref={shareButton} title={'Copy playground link'} onClick={copyLinkToClipboard}>
                        <i class="fa-solid fa-arrow-up-from-bracket" />
                    </a>
                    <A href={'https://github.com/nois-lang'}>
                        <i class="fa-brands fa-github" />
                    </A>
                </div>
            </div>
        </div>
    )
}

const check = (std: Package, module: Module): Context => {
    const pkg: Package = { path: 'playground', name: 'playground', modules: [module], compiled: false }
    const ctx: Context = {
        config: makeConfig(pkg.name, pkg.path),
        moduleStack: [],
        packages: [std, pkg],
        prelude: std.modules.find(m => m.identifier.names.at(-1)! === 'prelude')!,
        impls: [],
        errors: [],
        warnings: [],
        check: false,
        silent: false,
        variableCounter: 0,
        relChainsMemo: new Map()
    }
    ctx.packages.forEach(p => p.modules.forEach(m => prepareModule(m)))
    ctx.impls = buildInstanceRelations(ctx)
    ctx.impls.forEach(impl => checkTopLevelDefinition(impl.module, impl.instanceDef, ctx))
    ctx.check = true
    pkg.modules.forEach(m => checkModule(m, ctx!))
    return ctx
}
