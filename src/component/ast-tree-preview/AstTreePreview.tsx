import { Component, Match, Switch } from 'solid-js'
import { getLocationRange, ParseNode } from 'nois/dist/parser'
import { hovered, setHovered, showGroups } from '../playground/Playground'
import styles from './AstTreePreview.module.sass'
import { AstNode } from 'nois/dist/ast'

export interface DestructuredAstNode {
    kind: string,
    parseNode?: ParseNode,
    value?: string
    children?: DestructuredAstNode[]
}

export const destructureAstNode = (node: AstNode<any>): DestructuredAstNode => {
    if (typeof node !== 'object' || !('parseNode' in node)) {
        throw Error('not an object')
    }
    const kind = node.kind
    const parseNode = node.parseNode
    const value = ('value' in node && typeof node.value === 'string') ? node.value : undefined
    if (value !== undefined) {
        return { kind, parseNode, value }
    }
    const children: DestructuredAstNode[] =
        Object.entries(node)
            .filter(([p,]) => !['parseNode', 'kind', 'value'].includes(p))
            .flatMap(([p, v]) => {
                if (v === undefined) {
                    return [{ kind: p }]
                }
                if ('parseNode' in v) {
                    return [{ kind: p, children: [destructureAstNode(v)] }]
                }
                if (Array.isArray(v)) {
                    return [{ kind: p, children: v.filter(c => 'parseNode' in c).map(destructureAstNode) }]
                }
                return []
            })
    return { kind, parseNode, children }
}

type AstTreePreviewProps = { node: DestructuredAstNode }

export const AstTreePreview: Component<AstTreePreviewProps> = p => {
    let ref: HTMLDivElement | undefined = undefined

    const isGroup = !p.node.value && !p.node.parseNode
    return (
        <Switch>
            <Match when={isGroup && !showGroups()}>
                <div class={styles.children}>{
                    p.node.children !== undefined
                        ? p.node.children.map(c => <AstTreePreview node={c}/>)
                        : ''
                }</div>
            </Match>
            <Match when={true}>
                <div ref={ref} class={styles.node}
                     classList={{ [styles.hover]: hovered()?.ref === ref }}
                     onPointerOver={e => {
                         if (!ref?.contains(e.target)) return
                         if (!p.node.parseNode) return
                         setHovered({ ref, location: getLocationRange(p.node.parseNode) })
                         e.stopPropagation()
                     }}
                     onPointerLeave={e => {
                         if (!ref?.contains(e.target)) return
                         setHovered(undefined)
                     }}
                >
                    <p class={styles.kind} classList={{ [styles.group]: isGroup }}>{p.node.kind}{
                        p.node.value !== undefined
                            ? <code class={styles.value}>{formatValue(p.node.value)}</code>
                            : ''
                    }</p>
                    <div class={styles.children}>{
                        p.node.children !== undefined
                            ? p.node.children.map(c => <AstTreePreview node={c}/>)
                            : ''
                    }</div>
                </div>
            </Match>
        </Switch>
    )
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
