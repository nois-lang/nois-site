import { AstNode } from 'nois/ast'
import { ParseNode, getSpan } from 'nois/parser'
import { Typed } from 'nois/semantic'
import { virtualTypeToString } from 'nois/typecheck'
import { Component, Match, Switch } from 'solid-js'
import { hovered, setHovered, showGroups } from '../playground/Playground'
import styles from './AstTreePreview.module.scss'

export interface DestructuredAstNode {
    kind: string
    parseNode?: ParseNode
    value?: string
    children?: DestructuredAstNode[]
    type?: string
    pub?: boolean
}

export const destructureAstNode = (node: AstNode<any> & Partial<Typed>): DestructuredAstNode => {
    if (typeof node !== 'object' || !('parseNode' in node)) {
        throw Error('not an object')
    }
    const kind = node.kind
    const parseNode = node.parseNode
    const type = node.type ? virtualTypeToString(node.type) : undefined
    const pub = 'pub' in node ? node.pub === true : undefined
    const value = 'value' in node && typeof node.value === 'string' ? node.value : undefined
    if (value !== undefined) {
        return { kind, parseNode, value, type, pub }
    }
    const children: DestructuredAstNode[] = Object.entries(node)
        .filter(([p]) => !['parseNode', 'kind', 'value'].includes(p))
        .flatMap(([p, v]) => {
            if (v === undefined) {
                return [{ kind: p }]
            }
            const type = v.type ? virtualTypeToString(v.type) : undefined
            if (typeof v === 'object' && 'parseNode' in v) {
                return [{ kind: p, children: [destructureAstNode(v)], type }]
            }
            if (Array.isArray(v)) {
                return [{ kind: p, children: v.filter(c => 'parseNode' in c).map(destructureAstNode), type }]
            }
            return []
        })
    return { kind, parseNode, children, type, pub }
}

type AstTreePreviewProps = { node: DestructuredAstNode }

export const AstTreePreview: Component<AstTreePreviewProps> = p => {
    const ref: HTMLDivElement | undefined = undefined

    const isGroup = !p.node.value && !p.node.parseNode
    return (
        <Switch>
            <Match when={isGroup && !showGroups()}>
                {p.node.children !== undefined ? p.node.children.map(c => <AstTreePreview node={c} />) : ''}
            </Match>
            <Match when={true}>
                <div
                    ref={ref}
                    class={styles.node}
                    classList={{ [styles.hover]: hovered()?.ref === ref }}
                    onPointerOver={e => {
                        if (!ref?.contains(e.target)) return
                        if (!p.node.parseNode) return
                        setHovered({ ref, span: getSpan(p.node.parseNode) })
                        e.stopPropagation()
                    }}
                    onPointerLeave={e => {
                        if (!ref?.contains(e.target)) return
                        setHovered(undefined)
                    }}
                >
                    <p class={styles.kind} classList={{ [styles.group]: isGroup }}>
                        {p.node.kind}
                        {p.node.value !== undefined ? (
                            <code class={styles.value}>{formatValue(p.node.value)}</code>
                        ) : (
                            ''
                        )}
                        {p.node.pub === true ? <code class={styles.pub}>pub</code> : ''}
                        {p.node.type !== undefined ? <code class={styles.type}>{p.node.type}</code> : ''}
                    </p>
                    <div class={styles.children}>
                        {p.node.children !== undefined ? p.node.children.map(c => <AstTreePreview node={c} />) : ''}
                    </div>
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
